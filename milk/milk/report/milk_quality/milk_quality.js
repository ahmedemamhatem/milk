frappe.query_reports["Milk Quality"] = {
"filters": [
        {
            "fieldname": "driver",
            "label": __("الخط"),
            "fieldtype": "Link",
            "options": "Driver"
        },
        {
            "fieldname": "village",
            "label": __("القرية"),
            "fieldtype": "Link",
            "options": "Village"
        },
        {
            "fieldname": "supplier",
            "label": __("المورد"),
            "fieldtype": "Link",
            "options": "Supplier"
        },
        {
            "fieldname": "milk_type",
            "label": __("نوع اللبن"),
            "fieldtype": "Select",
            "options": "\nجاموسي\nبقري"
        },
        {
            "fieldname": "from_date",
            "label": __("من تاريخ"),
            "fieldtype": "Date",
            "default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
            "reqd": 1
        },
        {
            "fieldname": "to_date",
            "label": __("إلى تاريخ"),
            "fieldtype": "Date",
            "default": frappe.datetime.get_today(),
            "reqd": 1
        },
        {
            "fieldname": "report_type",
            "label": __("نوع التقرير"),
            "fieldtype": "Select",
            "options": "كل السجلات\nمتوسط",
            "default": "كل السجلات",
            "reqd": 1
        }
    ]
};