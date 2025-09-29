import frappe
from frappe.utils import nowdate, flt
from typing import Optional


def _get_company(company: Optional[str] = None) -> str:
    """Infer company from argument, user default, or Global Defaults."""
    if company:
        return company
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.throw("لم يتم ضبط الشركة الافتراضية")
    )


def _resolve_account(company: str, expense_category: str) -> Optional[str]:
    """
    Resolve the expense account for this Expense Category.
    Assumes Expense Category has a field 'expense_account'.
    Validates the account belongs to the same company.
    """
    acc = frappe.db.get_value("Expense Category", expense_category, "expense_account")
    if not acc:
        return None

    acc_company = frappe.db.get_value("Account", acc, "company")
    if acc_company != company:
        # Category points to an account from a different company
        return None
    return acc


def _resolve_payment_account(mode_of_payment: str, company: str) -> Optional[str]:
    """
    Get the default account mapped for the Mode of Payment in the given company.
    """
    return frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": mode_of_payment, "company": company},
        "default_account",
    )


def _validate_cost_center(cost_center: Optional[str], company: str) -> Optional[str]:
    """
    If provided, ensure Cost Center exists, is not a group, and belongs to the same company.
    Return a valid cost center or None.
    """
    if not cost_center:
        return None
    exists = frappe.db.exists("Cost Center", cost_center)
    if not exists:
        frappe.throw(f"مركز التكلفة غير موجود: {frappe.utils.escape_html(cost_center)}")

    row = frappe.db.get_value(
        "Cost Center", cost_center, ["company", "is_group"], as_dict=True
    )
    if not row:
        frappe.throw("تعذر قراءة مركز التكلفة")
    if row.company != company:
        frappe.throw("مركز التكلفة لا ينتمي إلى نفس الشركة")
    if row.is_group:
        frappe.throw("لا يمكن استخدام مركز تكلفة من النوع مجموعة (Group)")

    return cost_center


@frappe.whitelist()
def peek_expense_account(expense_category: str, company: Optional[str] = None):
    """
    Return which account would be used for the given category.
    Company is inferred unless provided.
    """
    company = _get_company(company)
    acc = _resolve_account(company, expense_category)
    return {"account": acc}


def _make_journal_entry(
    *,
    posting_date: str,
    company: str,
    expense_account: str,
    payment_account: str,
    amount: float,
    remarks: str = "",
    cost_center: Optional[str] = None,
) -> str:
    """
    Create and submit a Journal Entry:
      Dr Expense Account (with cost_center if provided)
      Cr Payment Account (from Mode of Payment mapping)
    Returns JE name.
    """
    je = frappe.new_doc("Journal Entry")
    je.company = company
    je.posting_date = posting_date or nowdate()
    je.voucher_type = "Journal Entry"
    if remarks:
        je.user_remark = remarks

    # Debit (Expense)
    je.append(
        "accounts",
        {
            "account": expense_account,
            "debit_in_account_currency": amount,
            "debit": amount,
            "cost_center": cost_center or None,
            "user_remark": remarks or "",
        },
    )
    # Credit (Payment)
    je.append(
        "accounts",
        {
            "account": payment_account,
            "credit_in_account_currency": amount,
            "credit": amount,
            # Typically cost center not set on balance-sheet accounts; omit for clarity.
            "user_remark": remarks or "",
        },
    )

    je.insert(ignore_permissions=True)
    je.submit()
    return je.name


@frappe.whitelist()
def make_fast_expense(
    posting_date: Optional[str] = None,
    mode_of_payment: Optional[str] = None,
    expense_category: Optional[str] = None,
    amount: float | int = 0,
    remarks: Optional[str] = "",
    company: Optional[str] = None,  # UI can omit it; inferred if not provided.
    cost_center: Optional[str] = None,  # New: optional cost center from UI
):
    """
    Create an Expense and its Journal Entry in one go.
    - Validates inputs and mappings.
    - Resolves Expense Account from Expense Category.
    - Resolves Payment Account from Mode of Payment for the selected company.
    - Creates and submits a Journal Entry.
    - Links JE back to the Expense (if the Expense doctype has such a field).
    Returns minimal details for the success dialog.
    """
    company = _get_company(company)
    posting_date = posting_date or nowdate()
    amount = flt(amount)

    # Basic validations
    if not mode_of_payment:
        frappe.throw("يجب تحديد طريقة الدفع")
    if not expense_category:
        frappe.throw("يجب تحديد تصنيف المصروف")
    if amount <= 0:
        frappe.throw("المبلغ يجب أن يكون أكبر من صفر")

    # Resolve and validate accounts
    expense_account = _resolve_account(company, expense_category)
    if not expense_account:
        frappe.throw(
            f"تعذر تحديد حساب المصروف للشركة '{frappe.utils.escape_html(company)}'. "
            f"يرجى ضبط 'حساب المصروف' على تصنيف المصروف '{frappe.utils.escape_html(expense_category)}'."
        )

    payment_account = _resolve_payment_account(mode_of_payment, company)
    if not payment_account:
        frappe.throw(
            f"لا يوجد حساب مرتبط بطريقة الدفع '{frappe.utils.escape_html(mode_of_payment)}' "
            f"للشركة '{frappe.utils.escape_html(company)}'. يرجى ضبطه من 'Mode of Payment Account'."
        )

    # Validate Cost Center if provided; otherwise try company default
    cc = _validate_cost_center(cost_center, company) if cost_center else None
    if not cc:
        # try company default cost center (optional)
        default_cc = frappe.db.get_value("Company", company, "cost_center")
        if default_cc:
            try:
                cc = _validate_cost_center(default_cc, company)
            except Exception:
                # default invalid; ignore
                cc = None

    # Create Journal Entry
    je_name = _make_journal_entry(
        posting_date=posting_date,
        company=company,
        expense_account=expense_account,
        payment_account=payment_account,
        amount=amount,
        remarks=remarks or "",
        cost_center=cc,
    )

    # Create Expense document (adjust fieldnames to your schema)
    exp = frappe.new_doc("Expense")
    if frappe.db.has_column("Expense", "company"):
        exp.company = company
    exp.posting_date = posting_date
    exp.mode_of_payment = mode_of_payment
    exp.cost_center = cost_center
    exp.expense_category = expense_category
    # If Expense has an 'account' field, set it
    if frappe.db.has_column("Expense", "account"):
        exp.account = expense_account
    exp.amount = amount
    exp.remarks = remarks or ""
    # Link JE back to Expense if field exists
    if frappe.db.has_column("Expense", "journal_entry"):
        exp.journal_entry = je_name
    # Save cost center on Expense if field exists
    if frappe.db.has_column("Expense", "cost_center"):
        exp.cost_center = cc

    exp.insert(ignore_permissions=True)
    # If your Expense is submittable, submit it; otherwise this will raise and we’ll just keep it saved
    try:
        exp.submit()
    except Exception:
        frappe.db.commit()

    return {
        "name": exp.name,
        "posting_date": exp.posting_date,
        "mode_of_payment": getattr(exp, "mode_of_payment", mode_of_payment),
        "expense_category": getattr(exp, "expense_category", expense_category),
        "amount": exp.amount,
        "cost_center": getattr(exp, "cost_center", cc),
        "journal_entry": je_name,
    }