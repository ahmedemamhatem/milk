from typing import Union
import json
import frappe
from frappe import _
from frappe.utils import nowdate
from frappe import _
from frappe.utils import nowdate

@frappe.whitelist()
def get_available_qty(item_code: str, warehouse: str):
    """
    Devuelve la cantidad disponible (actual_qty) desde Bin para un item y un almacén.
    """
    if not (item_code and warehouse):
        return 0
    qty = frappe.db.get_value(
        "Bin",
        {"item_code": item_code, "warehouse": warehouse},
        "actual_qty",
    ) or 0
    return float(qty)

@frappe.whitelist()
def make_stock_transfer(data: Union[dict, str]):
    # Normaliza a dict
    if isinstance(data, str):
        try:
            data = json.loads(data or "{}")
        except Exception:
            frappe.throw(_("Invalid payload. Expected dict or JSON object."))

    posting_date = data.get("posting_date") or nowdate()
    from_wh = data.get("from_warehouse")
    to_wh = data.get("to_warehouse")
    rows = data.get("rows") or []

    if not from_wh:
        frappe.throw(_("From Warehouse is required"))
    if not to_wh:
        frappe.throw(_("To Warehouse is required"))
    if from_wh == to_wh:
        frappe.throw(_("From and To Warehouse cannot be the same"))
    if not rows:
        frappe.throw(_("No rows to transfer"))

    for r in rows:
        if not r.get("item_code"):
            frappe.throw(_("Item is required in all rows"))
        qty = float(r.get("qty") or 0)
        if qty <= 0:
            frappe.throw(_("Quantity must be greater than zero"))

    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Transfer"
    se.posting_date = posting_date
    se.posting_time = "00:00"
    se.set_posting_time = 1

    for r in rows:
        se.append("items", {
            "item_code": r["item_code"],
            "s_warehouse": from_wh,
            "t_warehouse": to_wh,
            "qty": float(r["qty"]),
            "uom": frappe.db.get_value("Item", r["item_code"], "stock_uom"),
            "conversion_factor": 1,
        })

    se.insert(ignore_permissions=False)
    se.submit()
    return se.name
