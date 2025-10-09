import frappe
from frappe import _
from frappe.utils import flt
from erpnext.accounts.utils import get_balance_on

@frappe.whitelist()
def get_customer_balance(customer: str, company: str | None = None):
    """Return AR balance for a single customer."""
    if not customer:
        frappe.throw(_("Customer is required"))
    if not company:
        company = frappe.defaults.get_user_default("Company")

    try:
        bal = get_balance_on(party_type="Customer", party=customer, company=company)
        return {"customer": customer, "balance": float(flt(bal))}
    except Exception:
        # Fallback to 0 if any issue (permissions, missing GL, etc.)
        return {"customer": customer, "balance": 0.0}

@frappe.whitelist()
def get_customer_balances(customers: None | list | tuple | str = None, company: str | None = None):
    """Batch balances. 'customers' can be JSON string, list, or tuple.
    Returns a plain dict: { customer_name: balance_float }"""
    # Normalize input (could be a JSON string)
    if isinstance(customers, str):
        try:
            customers = frappe.parse_json(customers)
        except Exception:
            customers = []
    # Ensure it's a list of strings
    if isinstance(customers, tuple):
        customers = list(customers)
    if not isinstance(customers, list):
        customers = []

    # Remove falsy entries and ensure strings
    customers = [c for c in (str(c).strip() for c in customers) if c]

    if not company:
        company = frappe.defaults.get_user_default("Company")

    out = {}
    if not customers:
        return out  # return plain dict

    for name in customers:
        try:
            bal = get_balance_on(party_type="Customer", party=name, company=company)
            val = float(flt(bal))
            # Guard against NaN
            out[name] = val if val == val else 0.0
        except Exception:
            out[name] = 0.0

    return out