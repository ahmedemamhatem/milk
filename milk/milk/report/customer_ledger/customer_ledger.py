import frappe
from frappe.utils import getdate


def execute(filters=None):
    f = frappe._dict(filters or {})
    validate_filters(f)

    mode = (f.mode or "Detail").strip()

    if mode.startswith("Summary"):
        columns = get_summary_columns()
        data = get_summary_data(f)
        return columns, data
    else:
        columns = get_detail_columns()
        data = get_detail_data(f)
        return columns, data


def validate_filters(f):
    if not f.company:
        frappe.throw("Company is required")
    if not f.from_date or not f.to_date:
        frappe.throw("From Date and To Date are required")
    if getdate(f.from_date) > getdate(f.to_date):
        frappe.throw("From Date must be on or before To Date")


# -------------------- Detail (ledger-like) --------------------

def get_detail_columns():
    return [
        {"label": "Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 95},
        {"label": "Voucher Type", "fieldname": "voucher_type", "fieldtype": "Data", "width": 130},
        {"label": "Voucher No", "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 150},
        {"label": "Account", "fieldname": "account", "fieldtype": "Link", "options": "Account", "width": 200},
        {"label": "Against", "fieldname": "against", "fieldtype": "Data", "width": 160},
        {"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 110},
        {"label": "Credit", "fieldname": "credit", "fieldtype": "Currency", "width": 110},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "width": 120},
        {"label": "Customer", "fieldname": "party", "fieldtype": "Link", "options": "Customer", "width": 200},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Small Text", "width": 220},
    ]


def get_detail_data(f):
    params = {
        "company": f.company,
        "from_date": f.from_date,
        "to_date": f.to_date,
    }
    party_condition = ""
    if f.get("customer"):
        params["customer"] = f.customer
        party_condition = "and gle.party = %(customer)s"

    # Opening per party
    opening_rows = frappe.db.sql(
        f"""
        select
            gle.party,
            coalesce(sum(gle.debit),0) - coalesce(sum(gle.credit),0) as opening
        from `tabGL Entry` gle
        where gle.company = %(company)s
          and gle.party_type = 'Customer'
          and gle.posting_date < %(from_date)s
          and gle.is_cancelled = 0
          {party_condition}
        group by gle.party
        """,
        params,
        as_dict=True,
    )
    opening_map = {r.party: r.opening for r in opening_rows}

    # Period transactions
    txns = frappe.db.sql(
        f"""
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
          and gle.party_type = 'Customer'
          and gle.posting_date between %(from_date)s and %(to_date)s
          and gle.is_cancelled = 0
          {party_condition}
        order by gle.party asc, gle.posting_date asc, gle.creation asc
        """,
        params,
        as_dict=True,
    )

    data = []
    current_party = None
    running = 0

    # Parties that have opening but no transactions in the period
    parties_seen = set([t.party for t in txns])
    for p, opening in opening_map.items():
        if p not in parties_seen:
            data.append({
                "posting_date": f.from_date,
                "voucher_type": "Opening",
                "voucher_no": "",
                "account": "",
                "against": "",
                "debit": 0,
                "credit": 0,
                "balance": opening,
                "party": p,
                "remarks": "Opening Balance",
            })

    for r in txns:
        if r.party != current_party:
            current_party = r.party
            running = opening_map.get(current_party, 0) or 0
            data.append({
                "posting_date": f.from_date,
                "voucher_type": "Opening",
                "voucher_no": "",
                "account": "",
                "against": "",
                "debit": 0,
                "credit": 0,
                "balance": running,
                "party": current_party,
                "remarks": "Opening Balance",
            })

        running += (r.debit or 0) - (r.credit or 0)
        r["balance"] = running
        data.append(r)

    return data


# -------------------- Summary (final balance per party) --------------------

def get_summary_columns():
    return [
        {"label": "Customer", "fieldname": "party", "fieldtype": "Link", "options": "Customer", "width": 220},
        {"label": "Opening", "fieldname": "opening", "fieldtype": "Currency", "width": 120},
        {"label": "Period Debit", "fieldname": "period_debit", "fieldtype": "Currency", "width": 120},
        {"label": "Period Credit", "fieldname": "period_credit", "fieldtype": "Currency", "width": 120},
        {"label": "Closing Balance", "fieldname": "closing", "fieldtype": "Currency", "width": 130},
    ]


def get_summary_data(f):
    params = {
        "company": f.company,
        "from_date": f.from_date,
        "to_date": f.to_date,
    }
    party_condition = ""
    if f.get("customer"):
        params["customer"] = f.customer
        party_condition = "and gle.party = %(customer)s"

    # Opening per party
    opening = frappe.db.sql(
        f"""
        select
            gle.party,
            coalesce(sum(gle.debit),0) - coalesce(sum(gle.credit),0) as opening
        from `tabGL Entry` gle
        where gle.company = %(company)s
          and gle.party_type = 'Customer'
          and gle.posting_date < %(from_date)s
          and gle.is_cancelled = 0
          {party_condition}
        group by gle.party
        """,
        params,
        as_dict=True,
    )
    opening_map = {r.party: r.opening for r in opening}

    # Period movement per party
    movement = frappe.db.sql(
        f"""
        select
            gle.party,
            coalesce(sum(gle.debit),0) as period_debit,
            coalesce(sum(gle.credit),0) as period_credit
        from `tabGL Entry` gle
        where gle.company = %(company)s
          and gle.party_type = 'Customer'
          and gle.posting_date between %(from_date)s and %(to_date)s
          and gle.is_cancelled = 0
          {party_condition}
        group by gle.party
        """,
        params,
        as_dict=True,
    )
    move_map = {r.party: r for r in movement}

    parties = set(opening_map.keys()) | set(move_map.keys())

    data = []
    for party in sorted(parties):
        op = opening_map.get(party, 0) or 0
        dv = (move_map.get(party, {}).get("period_debit", 0) if isinstance(move_map.get(party), dict) else 0) or 0
        cr = (move_map.get(party, {}).get("period_credit", 0) if isinstance(move_map.get(party), dict) else 0) or 0
        closing = op + dv - cr
        data.append({
            "party": party,
            "opening": op,
            "period_debit": dv,
            "period_credit": cr,
            "closing": closing,
        })

    if data:
        total = {
            "party": "Total",
            "opening": sum(d["opening"] or 0 for d in data),
            "period_debit": sum(d["period_debit"] or 0 for d in data),
            "period_credit": sum(d["period_credit"] or 0 for d in data),
        }
        total["closing"] = total["opening"] + total["period_debit"] - total["period_credit"]
        data.append(total)

    return data