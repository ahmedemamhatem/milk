frappe.query_reports["Stock Details"] = {
    "filters": [
        {
            "fieldname": "warehouse",
            "label": __("Warehouse"),
            "fieldtype": "Link",
            "options": "Warehouse",
            "reqd": 0,
        },
        {
            "fieldname": "item",
            "label": __("Item"),
            "fieldtype": "Link",
            "options": "Item",
            "reqd": 0,
        },
        {
            "fieldname": "show_zero_balance",
            "label": __("Show Zero Balance"),
            "fieldtype": "Check",
            "default": 0,
        }
    ],
};