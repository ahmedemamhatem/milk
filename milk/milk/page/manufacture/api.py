# milk/milk/page/manufacture/api.py

import json
import frappe
from frappe import _
from frappe.utils import flt

def _as_list(rows):
    if isinstance(rows, str):
        try:
            return json.loads(rows)
        except Exception:
            frappe.throw(_("Invalid rows payload"))
    return rows or []

def _validate(args):
    required = ["posting_date", "from_warehouse", "to_warehouse", "new_item", "new_qty", "rows"]
    for k in required:
        if not args.get(k):
            frappe.throw(_("Missing required input: {0}").format(k))

    if args["from_warehouse"] == args["to_warehouse"]:
        frappe.throw(_("From and To Warehouse cannot be the same"))

    if flt(args.get("new_qty")) <= 0:
        frappe.throw(_("New Qty must be greater than 0"))

    rows = args["rows"]
    if not rows:
        frappe.throw(_("Add at least one used item row"))

    for i, r in enumerate(rows, start=1):
        if not r.get("item_code"):
            frappe.throw(_("Row {0}: Item is required").format(i))
        if flt(r.get("qty")) <= 0:
            frappe.throw(_("Row {0}: Qty must be greater than 0").format(i))


@frappe.whitelist()
def make_repack_entry(
    posting_date: str,
    from_warehouse: str,
    to_warehouse: str,
    new_item: str,
    new_qty: float,
    rows: list | str
):
    """
    Create and submit a Stock Entry (Repack).
    - New item goes to 'to_warehouse'
    - All rows are consumed from 'from_warehouse'
    """
    rows = _as_list(rows)
    args = {
        "posting_date": posting_date,
        "from_warehouse": from_warehouse,
        "to_warehouse": to_warehouse,
        "new_item": new_item,
        "new_qty": new_qty,
        "rows": rows,
    }
    _validate(args)

    # Build items:
    items = []
    # Components (issue from From Warehouse)
    for r in rows:
        items.append({
            "item_code": r["item_code"],
            "s_warehouse": from_warehouse,
            "qty": flt(r.get("qty")) or 0
        })
    # Finished good (receive in To Warehouse)
    items.append({
        "item_code": new_item,
        "t_warehouse": to_warehouse,
        "qty": flt(new_qty) or 0
    })

    doc = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Repack",
        "posting_date": posting_date,
        "items": items
    })
    doc.insert(ignore_permissions=False)
    doc.submit()
    frappe.db.commit()
    return doc.name