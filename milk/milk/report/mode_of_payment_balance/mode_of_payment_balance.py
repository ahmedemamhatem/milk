import frappe
from frappe.utils import flt

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    """Define the columns for the report."""
    return [
        {"label": "Mode of Payment", "fieldname": "mode_of_payment", "fieldtype": "Link", "options": "Mode of Payment", "width": 200},
        {"label": "Account", "fieldname": "account", "fieldtype": "Link", "options": "Account", "width": 200},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "width": 200},
        {"label": "Currency", "fieldname": "currency", "fieldtype": "Link", "options": "Currency", "width": 200},
    ]

def get_data(filters):
    """Fetch the data for the report."""
    if not filters:
        filters = {}

    # Fetch all active modes of payment
    modes_of_payment = frappe.get_all(
        "Mode of Payment",
        fields=["name", "enabled"],
        filters={"enabled": 1},  # Only include active modes of payment
        order_by="name"
    )

    data = []

    for mop in modes_of_payment:
        # Fetch accounts linked to the current mode of payment
        accounts = frappe.get_all(
            "Mode of Payment Account",
            fields=["default_account", "company"],
            filters={"parent": mop.get("name"), "parenttype": "Mode of Payment"}
        )

        # Loop through accounts and calculate balances
        for account in accounts:
            if not account.get("default_account"):
                continue

            # Calculate balance using SQL
            balance = get_account_balance(account["default_account"], filters.get("from_date"), filters.get("to_date"))

            # Append data for the report (even if balance is zero)
            data.append({
                "mode_of_payment": mop["name"],
                "account": account["default_account"],
                "balance": balance,
                "currency": frappe.db.get_value("Account", account["default_account"], "account_currency") or "Unknown",
            })

        # Handle modes of payment with no accounts linked
        if not accounts:
            data.append({
                "mode_of_payment": mop["name"],
                "account": None,
                "balance": 0,
                "currency": None,
            })

    return data

def get_account_balance(account, from_date, to_date):
    """Calculate account balance for a given date range."""
    # Fetch the opening balance for the account
    opening_balance = frappe.db.sql("""
        SELECT SUM(debit - credit) AS balance
        FROM `tabGL Entry`
        WHERE account = %s AND posting_date < %s
    """, (account, from_date), as_dict=True)

    opening_balance = flt(opening_balance[0].get("balance", 0)) if opening_balance else 0

    # Fetch the transactions within the date range
    transaction_balance = frappe.db.sql("""
        SELECT SUM(debit - credit) AS balance
        FROM `tabGL Entry`
        WHERE account = %s AND posting_date BETWEEN %s AND %s
    """, (account, from_date, to_date), as_dict=True)

    transaction_balance = flt(transaction_balance[0].get("balance", 0)) if transaction_balance else 0

    # Total balance is the sum of opening balance and transactions
    return opening_balance + transaction_balance