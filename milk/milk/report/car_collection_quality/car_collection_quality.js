// Copyright (c) 2025, ahmed emam and contributors
// For license information, please see license.txt

/* eslint-disable */
frappe.query_reports["Car Collection Quality"] = {
   "filters": [
        {
            fieldname: "from_date",
            label: __("من تاريخ"),
            fieldtype: "Date",
            reqd: 1,
            default: frappe.datetime.add_days(frappe.datetime.get_today(), -7)
        },
        {
            fieldname: "to_date",
            label: __("إلى تاريخ"),
            fieldtype: "Date",
            reqd: 1,
            default: frappe.datetime.get_today()
        },
        {
            fieldname: "driver",
            label: __("الخط"),
            fieldtype: "Link",
            options: "Driver"
        },
        {
            fieldname: "report_type",
            label: __("نوع التقرير"),
            fieldtype: "Select",
            options: ["متوسط", "كل سجلات الجوده"],
            default: "متوسط"
        }
    ]
};