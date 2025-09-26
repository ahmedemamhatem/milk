// Client Script for: Weekly Supplier Payment

const CHILD_TABLE_FIELDNAME = "weekly_pay_table";
const SERVER_METHOD_REFRESH = "milk.milk.doctype.weekly_supplier_payment.weekly_supplier_payment.refresh_week_one_method";
const SERVER_METHOD_PDF = "milk.milk.doctype.weekly_supplier_payment.weekly_supplier_payment.print_weekly_payment_inline_pdf";

frappe.ui.form.on("Weekly Supplier Payment", {
  onload(frm) {
    // Auto set 'to_date' to start_date + 6 if empty
    if (frm.doc.start_date && !frm.doc.to_date) {
      frm.set_value("to_date", add_days(frm.doc.start_date, 6));
    }
  },

  start_date(frm) {
    // Keep 'to_date' synced when start_date changes
    if (frm.doc.start_date) {
      frm.set_value("to_date", add_days(frm.doc.start_date, 6));
    }
  },

  refresh(frm) {
    // Buttons only in Draft
    if (frm.doc.docstatus === 0 && frm.doc.name) {
      // 1) Calculate weekly data
      frm.add_custom_button(__("حساب الاسبوع للموردين"), async () => {
        if (!frm.doc.start_date) return frappe.msgprint(__("Please set Start Date."));
        if (!frm.doc.to_date) return frappe.msgprint(__("Please set To Date."));
        if (!frm.doc.driver) return frappe.msgprint(__("Please select Driver."));

        try {
          frappe.dom.freeze(__("Refreshing suppliers and filling week..."));
          const r = await frappe.call({
            method: SERVER_METHOD_REFRESH,
            args: {
              docname: frm.doc.name,
              driver: frm.doc.driver,
              village: frm.doc.village,
              start_date: frm.doc.start_date,
              to_date: frm.doc.to_date,
            },
          });
          frappe.dom.unfreeze();

          const msg = r?.message;
          if (!msg) {
            frappe.msgprint({ title: __("Error"), indicator: "red", message: __("No response from server.") });
            return;
          }

          if (msg.status === "success") {
            // Prefer rows returned by server to avoid extra fetch
            if (Array.isArray(msg.rows)) {
              frm.doc[CHILD_TABLE_FIELDNAME] = msg.rows.map(row => ({ ...row }));
              frm.refresh_field(CHILD_TABLE_FIELDNAME);
            } else {
              await refresh_child_table_from_server(frm);
            }

            // Optionally update header totals from response by reloading doc fields
            // If you prefer to avoid a full reload, you can set header fields from msg.totals if you return them.
            frappe.show_alert({ message: msg.message || __("Done"), indicator: "green" });
          } else {
            frappe.msgprint({ title: __("Error"), indicator: "red", message: msg.message || __("Operation failed.") });
          }
        } catch (e) {
          console.error(e);
          frappe.dom.unfreeze();
          frappe.msgprint({ title: __("Error"), indicator: "red", message: __("Server call failed.") });
        }
      }).addClass("btn-primary");

      // 2) Print PDF
      frm.add_custom_button(__("طباعة PDF"), () => {
        const name = frm.docname || frm.doc.name;
        const url = `/api/method/${SERVER_METHOD_PDF}?name=${encodeURIComponent(name)}`;
        window.open(url, "_blank");
      }).addClass("btn-secondary");
    }
  },
});

// Utility to refresh child table by re-fetching the doc
async function refresh_child_table_from_server(frm) {
  try {
    const r = await frappe.call({
      method: "frappe.client.get",
      args: { doctype: "Weekly Supplier Payment", name: frm.doc.name },
    });
    const docFromServer = r?.message;
    if (!docFromServer) {
      frappe.msgprint({ title: __("Error"), indicator: "red", message: __("Failed to fetch updated document.") });
      return;
    }

    // Replace the child table entirely
    frm.doc[CHILD_TABLE_FIELDNAME] = (docFromServer[CHILD_TABLE_FIELDNAME] || []).map(row => ({ ...row }));
    frm.refresh_field(CHILD_TABLE_FIELDNAME);

    // If you want to sync header totals as well (recommended):
    const headerFields = [
      "total_week_amount",
      "total_deduction_amount",
      "total_loans",
      "total_amount",
      "total_less_5",
      "total_payment",
      "total_qty_morning",
      "total_qty_evening",
      "total_week_qty",
    ];
    for (const f of headerFields) {
      if (f in docFromServer) {
        frm.set_value(f, docFromServer[f]);
      }
    }
  } catch (err) {
    console.error("Failed to refresh child table from server:", err);
    frappe.msgprint({ title: __("Error"), indicator: "red", message: __("Failed to refresh from server.") });
  }
}

function add_days(dateStr, days) {
  if (!dateStr) return dateStr;
  const d = frappe.datetime.str_to_obj(dateStr);
  d.setDate(d.getDate() + Number(days || 0));
  return frappe.datetime.obj_to_str(d);
}