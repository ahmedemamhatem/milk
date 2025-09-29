frappe.query_reports["Supplier Ledger"] = {
  filters: [
    {
      fieldname: "company",
      label: __("Company"),
      fieldtype: "Link",
      options: "Company",
      reqd: 1,
      default: frappe.defaults.get_user_default("Company") || frappe.defaults.get_default("company")
    },
    {
      fieldname: "supplier",
      label: __("Supplier"),
      fieldtype: "Link",
      options: "Supplier",
      reqd: 0
    },
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      reqd: 1,
      default: (frappe.datetime.year_start ? frappe.datetime.year_start() : frappe.datetime.month_start())
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      reqd: 1,
      default: (frappe.datetime.year_end ? frappe.datetime.year_end() : frappe.datetime.get_today())
    },
    {
      fieldname: "mode",
      label: __("Mode"),
      fieldtype: "Select",
      options: ["Detail", "Summary (Final Balance for All)"],
      default: "Detail"
    },
    // Hidden toggles for parity/future use
    { fieldname: "ignore_cancelled", label: __("Ignore Cancelled"), fieldtype: "Check", default: 1, hidden: 1 },
    { fieldname: "group_by_voucher", label: __("Group by Voucher"), fieldtype: "Check", default: 0, hidden: 1 },
    { fieldname: "show_opening_entries", label: __("Show Opening Entries"), fieldtype: "Check", default: 1, hidden: 1 }
  ],

  onload(report) {
    const orig_refresh = report.refresh.bind(report);
    report.refresh = function () {
      const company = frappe.query_report.get_filter_value("company");
      const from_date = frappe.query_report.get_filter_value("from_date");
      const to_date = frappe.query_report.get_filter_value("to_date");

      if (!company) return frappe.msgprint({ message: __("Please select Company"), indicator: "orange" });
      if (!from_date || !to_date) return frappe.msgprint({ message: __("Please set From and To Date"), indicator: "orange" });

      return orig_refresh();
    };
  }
};