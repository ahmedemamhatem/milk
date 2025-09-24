import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 250},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 250},
        {"label": "Warehouse", "fieldname": "warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 250},
        {"label": "Balance Qty", "fieldname": "balance_qty", "fieldtype": "Float", "width": 250},
    ]

def get_data(filters):
    conditions = []
    values = {}

    if filters.get("warehouse"):
        conditions.append("bin.warehouse = %(warehouse)s")
        values["warehouse"] = filters["warehouse"]

    if filters.get("item"):
        conditions.append("bin.item_code = %(item)s")
        values["item"] = filters["item"]

    if not filters.get("show_zero_balance"):
        conditions.append("bin.actual_qty > 0")

    conditions = " AND ".join(conditions)

    query = f"""
        SELECT
            bin.item_code,
            item.item_name,
            bin.warehouse,
            bin.actual_qty AS balance_qty
        FROM
            `tabBin` AS bin
        INNER JOIN
            `tabItem` AS item ON bin.item_code = item.name
        {f"WHERE {conditions}" if conditions else ""}
        ORDER BY
            bin.item_code, bin.warehouse
    """

    return frappe.db.sql(query, values, as_dict=True)