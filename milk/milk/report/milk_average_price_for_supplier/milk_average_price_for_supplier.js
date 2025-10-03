// file: milk/milk/report/milk_average_price_for_supplier/milk_average_price_for_supplier.js

frappe.query_reports["Milk Average Price For supplier"] = {
    filters: [
        {
            fieldname: "from_date",
            label: __("من تاريخ"),
            fieldtype: "Date",
            default: frappe.datetime.month_start()
        },
        {
            fieldname: "to_date",
            label: __("إلى تاريخ"),
            fieldtype: "Date",
            default: frappe.datetime.month_end()
        },
        {
            fieldname: "supplier",
            label: __("المورد"),
            fieldtype: "Link",
            options: "Supplier"
        }
    ],
    formatter(value, row, column, data, default_formatter) {
        // إبراز اسم المورد
        if (column.fieldname === "supplier" && data && data.supplier) {
            value = `<b>${frappe.utils.escape_html(value || "")}</b>`;
        }
        return default_formatter(value, row, column, data);
    },
    get_datatable_options(options) {
        // دعم الاتجاه من اليمين لليسار إذا كانت الواجهة عربية
        options.direction = frappe.utils.is_rtl() ? "rtl" : "ltr";
        return options;
    }
};