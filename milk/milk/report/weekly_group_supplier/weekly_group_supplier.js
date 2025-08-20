// Copyright (c) 2025, ahmed emam and contributors
// For license information, please see license.txt

frappe.query_reports["Weekly Group Supplier"] = {
	"filters": [
		{
			"fieldname": "date",
			"label": __("Start Date"),
			"fieldtype": "Date",
			"reqd": 1,
			"default": frappe.datetime.get_today(),
			"description": __("Select the start date for the weekly report.")
		},
		{
			"fieldname": "supplier",
			"label": __("Supplier"),
			"fieldtype": "Link",
			"options": "Supplier",
			"reqd": 0,
			"default": "",
			"description": __("Optional: Filter by supplier.")
		},
		{
			"fieldname": "driver",
			"label": __("Driver"),
			"fieldtype": "Link",
			"options": "Driver",
			"reqd": 0,
			"default": "",
			"description": __("Optional: Filter by driver.")
		},
		{
			"fieldname": "village",
			"label": __("Village"),
			"fieldtype": "Link",
			"options": "Village",
			"reqd": 0,
			"default": "",
			"description": __("Optional: Filter by village.")
		}
	]
};