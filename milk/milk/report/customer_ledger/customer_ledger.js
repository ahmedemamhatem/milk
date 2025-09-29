frappe.query_reports["Customer Ledger"] = {
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
      fieldname: "customer",
      label: __("Customer"),
      fieldtype: "Link",
      options: "Customer",
      reqd: 1
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

    // Optional toggles (safe, no server deps)
    {
      fieldname: "show_opening_entries",
      label: __("Show Opening Entries"),
      fieldtype: "Check",
      default: 1,
      hidden: 1
    },
    {
      fieldname: "group_by_voucher",
      label: __("Group by Voucher"),
      fieldtype: "Check",
      default: 0,
  	  hidden: 1
    },
    {
      fieldname: "ignore_cancelled",
      label: __("Ignore Cancelled"),
      fieldtype: "Check",
      default: 1,
  	  hidden: 1
    }
  ],

  onload: function (report) {
    // Enforce mandatory filters before running
    const orig_refresh = report.refresh.bind(report);
    report.refresh = function () {
      const company = frappe.query_report.get_filter_value("company");
      const customer = frappe.query_report.get_filter_value("customer");
      const from_date = frappe.query_report.get_filter_value("from_date");
      const to_date = frappe.query_report.get_filter_value("to_date");

      if (!company) return frappe.msgprint({ message: __("Please select Company"), indicator: "orange" });
      if (!customer) return frappe.msgprint({ message: __("Please select Customer"), indicator: "orange" });
      if (!from_date || !to_date) return frappe.msgprint({ message: __("Please set From and To Date"), indicator: "orange" });

      return orig_refresh();
    };
  }
};