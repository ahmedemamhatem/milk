import frappe
from frappe import _
from frappe.utils import flt


@frappe.whitelist()
def get_account_for_mode_of_payment(mode_of_payment: str, company: str | None = None):
	"""
	Return the default account for a Mode of Payment for the given or default company
	using the Mode of Payment Account child table.
	"""
	if not mode_of_payment:
		frappe.throw(_("Mode of Payment is required"))

	# Use provided company or fall back to user/system defaults
	if not company:
		company = (
			frappe.defaults.get_user_default("company")
			or frappe.db.get_single_value("Global Defaults", "default_company")
		)

	if not company:
		frappe.throw(_("Default Company is not set for this user or system"))

	account = frappe.db.get_value(
		"Mode of Payment Account",
		{"parent": mode_of_payment, "company": company},
		"default_account",
	)
	return {"account": account, "company": company}


@frappe.whitelist()
def make_fast_purchase_invoice(
	supplier,
	item_code,
	qty,
	rate,
	posting_date=None,
	set_warehouse=None,
	paid_amount=0,
	mode_of_payment=None,
	payment_account=None,
	submit=1,
):
	"""
	Create and submit a one-item Purchase Invoice in a single action.

	- If set_warehouse is provided:
	  - PI.set_warehouse = set_warehouse
	  - PI.update_stock = 1 (post stock from PI)
	  - PI.set_accepted_warehouse = set_warehouse (if field exists on your PI doctype)
	- If paid_amount > 0:
	  - require mode_of_payment
	  - validate paid_amount <= (qty * rate) (no overpayments)
	  - resolve default account from Mode of Payment Account if payment_account not passed
	  - set is_paid = 1, paid_amount, mode_of_payment on PI
	  - set cash_bank_account = resolved account
	- No Payment Entry is created.

	Returns: { "purchase_invoice": name }
	"""
	qty = flt(qty)
	rate = flt(rate)
	paid_amount = flt(paid_amount)
	submit = int(submit or 1)

	# Basic validations
	if not supplier:
		frappe.throw(_("Supplier is required"))
	if not item_code:
		frappe.throw(_("Item is required"))
	if qty <= 0:
		frappe.throw(_("Qty must be greater than 0"))

	# Overpayment guard (preview based on single line total)
	grand_total_preview = qty * rate
	if paid_amount > grand_total_preview + 1e-9:
		frappe.throw(_("Paid Amount cannot be greater than Grand Total"))

	# Build PI
	doc = frappe.new_doc("Purchase Invoice")
	doc.supplier = supplier

	if posting_date:
		doc.posting_date = posting_date

	# Warehouse and stock posting
	if set_warehouse:
		doc.set_warehouse = set_warehouse
		doc.update_stock = 1

	# One line item
	doc.append("items", {
		"item_code": item_code,
		"qty": qty,
		"rate": rate
	})

	# Inline payment on PI (no Payment Entry)
	if paid_amount > 0:
		if not mode_of_payment:
			frappe.throw(_("Mode of Payment is required when Paid Amount > 0"))

		if not payment_account:
			acc = get_account_for_mode_of_payment(mode_of_payment)
			payment_account = acc.get("account")
			if not payment_account:
				frappe.throw(_("No default account found for Mode of Payment {0} in company {1}").format(
					mode_of_payment, acc.get("company")
				))

		doc.is_paid = 1
		doc.paid_amount = paid_amount
		doc.mode_of_payment = mode_of_payment
		doc.cash_bank_account = payment_account

	# Insert and submit
	doc.insert(ignore_permissions=False)
	if submit and doc.docstatus == 0:
		doc.submit()

	return {"purchase_invoice": doc.name}