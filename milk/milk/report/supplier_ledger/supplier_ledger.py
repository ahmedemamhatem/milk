import frappe
from frappe.utils import getdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    validate_filters(filters)

    columns = get_columns()
    data = get_data(filters)
    chart = None
    message = None

    return columns, data, message, chart


def validate_filters(f):
    if not f.company:
        frappe.throw("Company is required")
    if not f.supplier:
        frappe.throw("Supplier is required")
    if not f.from_date or not f.to_date:
        frappe.throw("From Date and To Date are required")
    if getdate(f.from_date) > getdate(f.to_date):
        frappe.throw("From Date must be on or before To Date")


def get_columns():
    return [
        {"label": "Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 95},
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 120},
        {"label": "Voucher No", "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 150},
        {"label": "Account", "fieldname": "account", "fieldtype": "Link", "options": "Account", "width": 200},
        {"label": "Against", "fieldname": "against", "fieldtype": "Data", "width": 160},
        {"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 110},
        {"label": "Credit", "fieldname": "credit", "fieldtype": "Currency", "width": 110},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "width": 120},
        {"label": "Party", "fieldname": "party", "fieldtype": "Link", "options": "Supplier", "width": 180},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Small Text", "width": 220},
    ]


def get_data(f):
    # Opening balance up to the day before from_date
    opening = frappe.db.sql(
        """
        select
            sum(gle.debit) - sum(gle.credit)
        from `tabGL Entry` gle
        where gle.company = %(company)s
          and gle.party_type = 'Supplier'
          and gle.party = %(supplier)s
          and gle.posting_date < %(from_date)s
          and gle.is_cancelled = 0
        """,
        f,
    )[0][0] or 0

    data = []
    data.append({
        "posting_date": f.from_date,
        "voucher_type": "Opening",
        "voucher_no": "",
        "account": "",
        "against": "",
        "debit": 0,
        "credit": 0,
        "balance": opening,
        "party": f.supplier,
        "remarks": "Opening Balance",
    })

    rows = frappe.db.sql(
        """
        select
            gle.posting_date,
            gle.voucher_type,
            gle.voucher_no,
            gle.account,
            gle.against,
            gle.debit,
            gle.credit,
            gle.party,
            gle.remarks
        from `tabGL Entry` gle
        where gle.company = %(company)s
          and gle.party_type = 'Supplier'
          and gle.party = %(supplier)s
          and gle.posting_date between %(from_date)s and %(to_date)s
          and gle.is_cancelled = 0
        order by gle.posting_date asc, gle.creation asc
        """,
        f,
        as_dict=True,
    )

    running = opening
    for r in rows:
        running += (r.debit or 0) - (r.credit or 0)
        r["balance"] = running
        data.append(r)

    return data