import frappe
from frappe.utils import nowdate, flt

# Exchange rate import compatible across ERPNext versions
try:
    from erpnext.setup.utils import get_exchange_rate
except Exception:
    from erpnext.setup.doctype.currency_exchange.currency_exchange import get_exchange_rate  # type: ignore


def get_company() -> str:
    company = (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
    )
    if not company:
        frappe.throw("Default Company is not set")
    return company


def get_company_currency(company: str) -> str:
    cur = frappe.get_cached_value("Company", company, "default_currency")
    if not cur:
        frappe.throw("Company currency is not set")
    return cur


def get_party_account(company: str, party_type: str, party: str) -> str | None:
    # Prefer explicit Party Account
    acc = frappe.db.get_value(
        "Party Account",
        {"parenttype": party_type, "parent": party, "company": company},
        "account",
    )
    if acc:
        return acc

    # Fallback to generic
    acc_type = "Receivable" if party_type == "Customer" else "Payable"
    return frappe.db.get_value(
        "Account",
        {"company": company, "account_type": acc_type, "is_group": 0},
        "name",
    )


def get_mop_default_account(mode_of_payment: str, company: str) -> str | None:
    """
    Resolve Mode of Payment's account via child table (no dependency on internal helpers).
    """
    if not mode_of_payment or not company:
        return None

    # Newer fieldname
    account = frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": mode_of_payment, "company": company},
        "default_account",
    )
    if account:
        return account

    # Historical fieldname
    return frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": mode_of_payment, "company": company},
        "account",
    )


def get_any_bank_or_cash_account(company: str) -> str | None:
    return frappe.db.get_value(
        "Account",
        {"company": company, "is_group": 0, "account_type": ("in", ["Bank", "Cash"])},
        "name",
    )


def resolve_exchange_rate(from_currency: str, to_currency: str, posting_date: str) -> float:
    if not from_currency or not to_currency or from_currency == to_currency:
        return 1.0
    rate = flt(get_exchange_rate(from_currency, to_currency, posting_date) or 0)
    if rate <= 0:
        frappe.throw(
            f"Exchange rate not found: {from_currency} -> {to_currency} on {posting_date}"
        )
    return rate


@frappe.whitelist()
def make_fast_payment(
    payment_type: str,
    party_type: str,
    party: str,
    posting_date: str | None = None,
    mode_of_payment: str | None = None,
    paid_amount: float | int = 0,
    reference_no: str = "",
    require_mop_account: int | None = None,
):
    """
    Create and submit a Payment Entry quickly with minimal inputs.

    Args:
      payment_type: 'Receive' or 'Pay'
      party_type: 'Customer' or 'Supplier'
      party: Party name
      posting_date: yyyy-mm-dd (defaults to today)
      mode_of_payment: Link to Mode of Payment
      paid_amount: numeric > 0
      reference_no: optional text
      require_mop_account: if truthy, enforce that Mode of Payment has a company account (no fallback)
    Returns:
      { "payment_entry": name }
    """

    # Validate basics
    if payment_type not in ("Receive", "Pay"):
        frappe.throw("Invalid payment_type (must be 'Receive' or 'Pay')")
    if party_type not in ("Customer", "Supplier"):
        frappe.throw("Invalid party_type (must be 'Customer' or 'Supplier')")
    if not party:
        frappe.throw("Party is required")
    paid_amount = flt(paid_amount)
    if paid_amount <= 0:
        frappe.throw("Paid Amount must be greater than zero")
    posting_date = posting_date or nowdate()
    if not mode_of_payment:
        frappe.throw("Mode of Payment is required")

    company = get_company()
    company_currency = get_company_currency(company)

    # Resolve accounts
    party_account = get_party_account(company, party_type, party)
    if not party_account:
        kind = "Receivable" if party_type == "Customer" else "Payable"
        frappe.throw(
            f"Could not resolve a {kind} account for {party_type} {party} in {company}"
        )
    party_acc_currency = (
        frappe.get_cached_value("Account", party_account, "account_currency")
        or company_currency
    )

    mop_account = get_mop_default_account(mode_of_payment, company)
    if not mop_account:
        if require_mop_account:
            frappe.throw(
                f"Mode of Payment '{mode_of_payment}' has no account for company '{company}'. "
                f"Set it in Mode of Payment > Accounts."
            )
        # Fallback: any Bank/Cash account
        mop_account = get_any_bank_or_cash_account(company)
    if not mop_account:
        frappe.throw(
            f"Could not resolve a Bank/Cash account for Mode of Payment '{mode_of_payment}' in company '{company}'"
        )
    mop_acc_currency = (
        frappe.get_cached_value("Account", mop_account, "account_currency")
        or company_currency
    )

    # Build Payment Entry with correct mapping
    pe = frappe.new_doc("Payment Entry")
    pe.company = company
    pe.payment_type = "Receive" if payment_type == "Receive" else "Pay"
    pe.posting_date = posting_date
    pe.mode_of_payment = mode_of_payment
    pe.party_type = party_type
    pe.party = party

    # Correct account mapping to satisfy ERPNext validation:
    # - When party fields are set, the party-side account must be Receivable/Payable.
    # - The bank/cash account sits on the other side.
    if pe.payment_type == "Pay":
        # Money moves from bank/cash to party (Receivable decreases)
        pe.paid_from = mop_account
        pe.paid_from_account_currency = mop_acc_currency
        pe.paid_to = party_account
        pe.paid_to_account_currency = party_acc_currency
    else:  # Pay
        # Money moves from party (Payable decreases) to bank/cash
        pe.paid_from = party_account
        pe.paid_from_account_currency = party_acc_currency
        pe.paid_to = mop_account
        pe.paid_to_account_currency = mop_acc_currency

    pe.paid_amount = paid_amount
    pe.received_amount = paid_amount
    pe.reference_no = reference_no

    # Exchange rates relative to company currency to avoid "Source Exchange Rate is mandatory"
    pe.source_exchange_rate = resolve_exchange_rate(
        pe.paid_from_account_currency or company_currency, company_currency, posting_date
    )
    pe.target_exchange_rate = resolve_exchange_rate(
        pe.paid_to_account_currency or company_currency, company_currency, posting_date
    )

    # Let ERPNext compute further fields
    try:
        pe.set_missing_values()
        pe.set_amounts()
        pe.set_exchange_rate()
    except Exception:
        # Not fatal; critical fields are already set
        pass

    pe.insert()
    pe.submit()

    return {"payment_entry": pe.name}