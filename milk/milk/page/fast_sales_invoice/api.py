import frappe
from frappe import _
from frappe.utils import flt
from erpnext.accounts.utils import get_balance_on

@frappe.whitelist()
def get_customer_balance(customer: str):
    """Return AR balance for a single customer.
    Uses ERPNext's get_balance_on with party_type='Customer'."""
    if not customer:
        frappe.throw(_("Customer is required"))
    # You can pass company if you need company-wise balance; here we use default company
    company = frappe.defaults.get_user_default("Company")
    bal = get_balance_on(party_type="Customer", party=customer, company=company)
    return {"customer": customer, "balance": flt(bal)}

@frappe.whitelist()
def get_customer_balances(customers: list[str] | None = None):
    """Batch balances. 'customers' can be JSON list or Python list."""
    if isinstance(customers, str):
        customers = frappe.parse_json(customers)
    customers = customers or []
    out = {}
    if not customers:
        return out
    company = frappe.defaults.get_user_default("Company")
    for name in customers:
        try:
            out[name] = flt(get_balance_on(party_type="Customer", party=name, company=company))
        except Exception:
            out[name] = 0.0
    return out

@frappe.whitelist()
def make_fast_sales_invoices(posting_date, item_code, set_warehouse=None, mode_of_payment=None, rows=None):
	"""
	Create a separate Sales Invoice for each row (customer) using common page-level settings.

	Input:
	- posting_date (str: yyyy-mm-dd)
	- item_code (str)
	- set_warehouse (str | None)
	- mode_of_payment (str | None)  # common MoP applied only to rows with paid_amount > 0
	- rows: list[ { customer, qty, rate, paid_amount } ]

	Validations:
	- Customer required
	- qty > 0
	- paid_amount <= qty * rate
	- If any row has paid_amount > 0 then mode_of_payment must be provided (client enforces too)
	- If set_warehouse provided: update_stock = 1 and set_warehouse on SI

	Returns: { invoices: [ {name, customer, paid_amount, outstanding_amount} ] }
	"""
	if not posting_date:
		frappe.throw(_("Posting Date is required"))
	if not item_code:
		frappe.throw(_("Item is required"))
	if not rows:
		frappe.throw(_("No rows provided"))

	# Normalize rows
	if isinstance(rows, str):
		# when passed from JS, frappe may json-serialize; use frappe.parse_json
		rows = frappe.parse_json(rows)

	invoices = []
	for idx, r in enumerate(rows, start=1):
		customer = r.get("customer")
		qty = flt(r.get("qty")) or 0
		rate = flt(r.get("rate")) or 0
		paid_amount = flt(r.get("paid_amount")) or 0

		if not customer:
			frappe.throw(_("Row {0}: Customer is required").format(idx))
		if qty <= 0:
			frappe.throw(_("Row {0}: Qty must be greater than 0").format(idx))

		row_total = qty * rate
		if paid_amount > row_total + 1e-9:
			frappe.throw(_("Row {0}: Paid Amount cannot exceed row total").format(idx))

		# If this row is paid, require MoP at API layer too
		if paid_amount > 0 and not mode_of_payment:
			frappe.throw(_("Row {0}: Mode of Payment is required when Paid Amount > 0").format(idx))

		doc = frappe.new_doc("Sales Invoice")
		doc.customer = customer
		doc.posting_date = posting_date

		# Stock handling
		if set_warehouse:
			doc.set_warehouse = set_warehouse
			doc.update_stock = 1

		# Item line
		doc.append("items", {
			"item_code": item_code,
			"qty": qty,
			"rate": rate,
		})

		# Inline payment on SI (no Payment Entry)
		if paid_amount > 0:
			# Resolve default account for MoP
			account = _get_account_for_mode_of_payment(mode_of_payment)
			if not account:
				frappe.throw(_("No default account found for Mode of Payment {0}").format(mode_of_payment))

			doc.is_pos = 1  # POS-like inline payment
			doc.mode_of_payment = mode_of_payment
			doc.paid_amount = paid_amount
			# In Sales Invoice, cash_bank_account (v13+) or "payments" child table may be used.
			# We set payments child table to be safe.
			if "payments" in [cfield.fieldname for cfield in doc.meta.get("fields") if cfield.fieldtype == "Table"]:
				doc.set("payments", [])
				doc.append("payments", {
					"mode_of_payment": mode_of_payment,
					"account": account,
					"amount": paid_amount
				})
			# Some setups also accept 'cash_bank_account'
			if hasattr(doc, "cash_bank_account"):
				doc.cash_bank_account = account

		# Insert + Submit
		doc.insert(ignore_permissions=False)
		if doc.docstatus == 0:
			doc.submit()

		# Fetch outstanding after submit
		outstanding = flt(getattr(doc, "outstanding_amount", 0)) or 0

		invoices.append({
			"name": doc.name,
			"customer": customer,
			"paid_amount": paid_amount,
			"outstanding_amount": outstanding
		})

	return {"invoices": invoices}


def _get_account_for_mode_of_payment(mode_of_payment: str) -> str | None:
	"""Return default account linked to a Mode of Payment for the active/default company."""
	if not mode_of_payment:
		return None

	company = (
		frappe.defaults.get_user_default("company")
		or frappe.db.get_single_value("Global Defaults", "default_company")
	)

	if not company:
		return None

	return frappe.db.get_value(
		"Mode of Payment Account",
		{"parent": mode_of_payment, "company": company},
		"default_account"
	)