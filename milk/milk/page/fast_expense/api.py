import frappe
from frappe.utils import nowdate, flt


def _get_company(company: str | None = None) -> str:
    """Infer company from argument, user default, or Global Defaults."""
    if company:
        return company
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.throw("Default Company is not set")
    )


def _resolve_account(company: str, expense_category: str) -> str | None:
    """
    Resolve the expense account to use for this category and company.
    Your schema uses field `expense_account` on Expense Category.
    """
    acc = frappe.db.get_value("Expense Category", expense_category, "expense_account")

    # Validate the account belongs to the same company
    if acc:
        acc_company = frappe.db.get_value("Account", acc, "company")
        if acc_company != company:
            acc = None

    return acc


@frappe.whitelist()
def peek_expense_account(expense_category: str, company: str | None = None):
    """
    Return which account would be used for the given category.
    Company is inferred unless provided.
    """
    company = _get_company(company)
    acc = _resolve_account(company, expense_category)
    return {"account": acc}


@frappe.whitelist()
def make_fast_expense(
    posting_date: str | None = None,
    mode_of_payment: str | None = None,
    expense_category: str | None = None,
    amount: float | int = 0,
    remarks: str | None = "",
    company: str | None = None,  # optional; UI may omit it. We infer if not provided.
):
    posting_date = posting_date or nowdate()
    amount = flt(amount)
    company = _get_company(company)

    # Basic validations
    if not mode_of_payment:
        frappe.throw("Mode of Payment is required")
    if not expense_category:
        frappe.throw("Expense Category is required")
    if amount <= 0:
        frappe.throw("Amount must be greater than zero")

    # Resolve account from Expense Category
    account = _resolve_account(company, expense_category)
    if not account:
        frappe.throw(
            f"Could not resolve an Expense account for company '{company}'. "
            f"Please configure 'Expense Account' on Expense Category '{expense_category}'."
        )

    # Create Expense (adjust fieldnames if your doctype differs)
    doc = frappe.get_doc({
        "doctype": "Expense",
        "company": company if frappe.db.has_column("Expense", "company") else None,
        "posting_date": posting_date,
        "mode_of_payment": mode_of_payment,
        "expense_category": expense_category,
        "account": account,
        "amount": amount,
        "remarks": remarks or "",
    })
    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "posting_date": doc.posting_date,
        "mode_of_payment": doc.mode_of_payment,
        "expense_category": doc.expense_category,
        "amount": doc.amount,
        "journal_entry": getattr(doc, "journal_entry", None),
    }