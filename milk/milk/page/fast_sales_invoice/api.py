import frappe
from frappe import _
from frappe.utils import flt
from erpnext.accounts.utils import get_balance_on
from frappe.utils import flt, getdate

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
	"""

	if not posting_date:
		frappe.throw(_("Posting Date is required"))
	if not item_code:
		frappe.throw(_("Item is required"))
	if not rows:
		frappe.throw(_("No rows provided"))

	# Normalize rows
	if isinstance(rows, str):
		rows = frappe.parse_json(rows)

	# 🔹 Fetch default sales price from Item
	item_rate = frappe.db.get_value("Item", item_code, "custom_default_sales_price") or 0
	if item_rate <= 0:
		frappe.throw(_("Item {0}: Default Sales Price must be greater than 0").format(item_code))

	invoices = []
	for idx, r in enumerate(rows, start=1):
		customer = r.get("customer")
		qty = flt(r.get("qty")) or 0
		paid_amount = flt(r.get("paid_amount")) or 0

		# 🔹 Row validations
		if not customer:
			frappe.throw(_("Row {0}: Customer is required").format(idx))
		if qty <= 0:
			frappe.throw(_("Row {0}: Qty must be greater than 0").format(idx))

		row_total = qty * item_rate

		# 🔹 Paid amount validation
		if paid_amount > row_total:
			frappe.throw(_("Row {0}: Paid Amount ({1}) cannot exceed Row Total ({2})")
				.format(idx, paid_amount, row_total))
		if paid_amount < 0:
			frappe.throw(_("Row {0}: Paid Amount cannot be negative").format(idx))
		if paid_amount > 0 and not mode_of_payment:
			frappe.throw(_("Row {0}: Mode of Payment is required when Paid Amount > 0").format(idx))

		# 🔹 Create Sales Invoice
		doc = frappe.new_doc("Sales Invoice")
		doc.customer = customer
		doc.posting_date = posting_date

		# Stock handling
		if set_warehouse:
			doc.set_warehouse = set_warehouse
			doc.update_stock = 1

		# Always use item_rate from Item
		doc.append("items", {
			"item_code": item_code,
			"qty": qty,
			"rate": item_rate,
		})

		# Inline payment on SI
		if paid_amount > 0:
			account = _get_account_for_mode_of_payment(mode_of_payment)
			if not account:
				frappe.throw(_("No default account found for Mode of Payment {0}").format(mode_of_payment))

			doc.is_pos = 1
			doc.mode_of_payment = mode_of_payment
			doc.paid_amount = paid_amount

			# Payments table
			if "payments" in [cfield.fieldname for cfield in doc.meta.get("fields") if cfield.fieldtype == "Table"]:
				doc.set("payments", [])
				doc.append("payments", {
					"mode_of_payment": mode_of_payment,
					"account": account,
					"amount": paid_amount
				})

			if hasattr(doc, "cash_bank_account"):
				doc.cash_bank_account = account

		# Insert + Submit
		doc.insert(ignore_permissions=False)
		if doc.docstatus == 0:
			doc.submit()

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