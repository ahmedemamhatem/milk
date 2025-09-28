// Client Script for: Weekly Supplier Payment

const CHILD_TABLE_FIELDNAME = "weekly_pay_table";

// Existing server methods
const SERVER_METHOD_REFRESH = "milk.milk.doctype.weekly_supplier_payment.weekly_supplier_payment.refresh_week_one_method";
const SERVER_METHOD_PDF = "milk.milk.doctype.weekly_supplier_payment.weekly_supplier_payment.print_weekly_payment_inline_pdf";
const SERVER_METHOD_JOURNALS = "milk.milk.doctype.weekly_supplier_payment.api.make_weekly_supplier_journals";

// Optional enhancements (set to true only if you implement these server methods)
const ENABLE_PREVIEW_BUTTON = false;
const SERVER_METHOD_PREVIEW = "milk.milk.doctype.weekly_supplier_payment.api.preview_weekly_supplier_journals";

const ENABLE_CANCEL_BUTTON = false;
const SERVER_METHOD_CANCEL_JES = "milk.milk.doctype.weekly_supplier_payment.api.cancel_weekly_supplier_journals";

frappe.ui.form.on("Weekly Supplier Payment", {
  onload(frm) {
    // Auto-set to_date = start_date + 6 if empty
    if (frm.doc.start_date && !frm.doc.to_date) {
      frm.set_value("to_date", add_days(frm.doc.start_date, 6));
    }

    // Warn if no driver while drafting
    if (frm.doc.docstatus === 0 && !frm.doc.driver) {
      frm.dashboard.set_headline(__("الرجاء اختيار السائق قبل الحساب."));
    }
  },

  start_date(frm) {
    // Keep to_date synced to +6 days
    if (frm.doc.start_date) {
      frm.set_value("to_date", add_days(frm.doc.start_date, 6));
    }
  },

  driver(frm) {
    // optional: hint to refresh data after changing driver
    if (frm.doc.docstatus === 0) {
      frm.dashboard.clear_headline();
      frm.dashboard.set_headline(__("قم بالنقر على 'حساب الأسبوع للموردين' لتحديث البيانات بعد تغيير السائق."));
    }
  },

  refresh(frm) {
    if (!frm.doc.name || frm.is_new()) return;

    // Clear dashboard and show a status summary
    frm.dashboard.clear_headline();
    render_status_banner(frm);

    // Always show PDF after save or submit (not when cancelled)
    if (frm.doc.docstatus !== 2) {
      frm.add_custom_button(__("طباعة PDF"), () => {
        const name = frm.docname || frm.doc.name;
        const url = `/api/method/${SERVER_METHOD_PDF}?name=${encodeURIComponent(name)}`;
        window.open(url, "_blank");
      }).addClass("btn-secondary");
    }

    // Button: Refresh weekly data (draft only)
    if (frm.doc.docstatus === 0) {
      frm.add_custom_button(__("حساب الأسبوع للموردين"), async () => {
        if (!frm.doc.start_date) return frappe.msgprint(__("من فضلك أدخل تاريخ البداية."));
        if (!frm.doc.to_date) return frappe.msgprint(__("من فضلك أدخل تاريخ النهاية."));
        if (!frm.doc.driver) return frappe.msgprint(__("من فضلك اختر السائق."));

        if (!validate_dates(frm)) return;

        try {
          frappe.dom.freeze(__("جاري التحديث وتجهيز بيانات الأسبوع..."));
          const r = await frappe.call({
            method: SERVER_METHOD_REFRESH,
            args: {
              docname: frm.doc.name,
              driver: frm.doc.driver,
              village: frm.doc.village,
              start_date: frm.doc.start_date,
              to_date: frm.doc.to_date,
            },
            freeze: true,
            freeze_message: __("جاري جلب وتجهيز بيانات الموردين...")
          });
          frappe.dom.unfreeze();

          const msg = r?.message;
          if (!msg) {
            frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("لم يتم استلام رد من الخادم.") });
            return;
          }

          if (msg.status === "success") {
            if (Array.isArray(msg.rows)) {
              // Replace child table from payload
              frm.doc[CHILD_TABLE_FIELDNAME] = msg.rows.map(row => ({ ...row }));
              frm.refresh_field(CHILD_TABLE_FIELDNAME);
            } else {
              // Fallback to pulling entire doc
              await refresh_child_table_from_server(frm);
            }

            // Sync header totals if returned
            sync_header_totals_from_message(frm, msg);

            frappe.show_alert({ message: msg.message || __("تم الحساب بنجاح."), indicator: "green" });
          } else {
            frappe.msgprint({ title: __("خطأ"), indicator: "red", message: msg.message || __("فشلت العملية.") });
          }
        } catch (e) {
          console.error(e);
          frappe.dom.unfreeze();
          frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("فشل الاتصال بالخادم.") });
        }
      }).addClass("btn-primary");
    }

    // Button: Create Journal Entries (submit only and not created before)
    if (frm.doc.docstatus === 1 && !frm.doc.invoice_entry) {
      frm.add_custom_button(__("إنشاء القيود المحاسبية"), () => {
        // Ask for Mode of Payment with prompt
        frappe.prompt(
          [{
            label: __("وسيلة الدفع"),
            fieldname: "mode_of_payment",
            fieldtype: "Link",
            options: "Mode of Payment",
            reqd: 1
          }],
          async (values) => {
            // Safety checks
            if (!has_any_row(frm)) {
              frappe.msgprint({ title: __("تنبيه"), indicator: "orange", message: __("لا توجد صفوف أسبوعية للمعالجة.") });
              return;
            }
            if (!confirm_basic_consistency(frm)) {
              return;
            }

            try {
              frappe.dom.freeze(__("جاري إنشاء القيود المحاسبية..."));
              const r = await frappe.call({
                method: SERVER_METHOD_JOURNALS,
                args: {
                  docname: frm.doc.name,
                  mode_of_payment: values.mode_of_payment
                },
                freeze: true,
                freeze_message: __("جاري إنشاء القيود المحاسبية...")
              });
              frappe.dom.unfreeze();

              const res = r?.message || {};
              if (res.status === "success") {
                const parts = [
                  { label: __("قيد الإثبات"), val: res.journal_entry_accrual },
                  { label: __("قيد خصومات المورد"), val: res.journal_entry_deduction },
                  { label: __("قيد استرداد القرض"), val: res.journal_entry_loan_refund },
                  { label: __("قيد الصرف"), val: res.journal_entry_payment },
                ];
                const html = parts.map(p => `<div>${frappe.utils.escape_html(p.label)}: <b>${frappe.utils.escape_html(p.val || "-")}</b></div>`).join("");
                frappe.msgprint({ title: __("نجاح"), indicator: "green", message: html });
                frm.reload_doc();
              } else {
                frappe.msgprint({
                  title: __("تنبيه"),
                  indicator: "orange",
                  message: frappe.utils.escape_html(res.message || __("لم يتم إنشاء أي قيود."))
                });
                frm.reload_doc();
              }
            } catch (err) {
              console.error(err);
              frappe.dom.unfreeze();
              frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("تعذر إنشاء القيود.") });
            }
          },
          __("إنشاء القيود المحاسبية"),
          __("تنفيذ")
        );
      }).addClass("btn-primary");
    }

    // Optional: Dry-run preview (requires implementing SERVER_METHOD_PREVIEW)
    if (ENABLE_PREVIEW_BUTTON && frm.doc.docstatus === 1 && !frm.doc.invoice_entry) {
      frm.add_custom_button(__("معاينة القيود (تجريبي)"), async () => {
        try {
          frappe.dom.freeze(__("جاري المعاينة..."));
          const r = await frappe.call({
            method: SERVER_METHOD_PREVIEW,
            args: { docname: frm.doc.name },
            freeze: true
          });
          frappe.dom.unfreeze();
          const m = r?.message;
          if (!m) return frappe.msgprint({ title: __("تنبيه"), indicator: "orange", message: __("لا توجد معاينة.") });

          const lines = []
            .concat(m.accrual?.map(x => `Dr/Cr ${x.account}: ${x.amount}`) || [])
            .concat(m.refund?.map(x => `Refund ${x.supplier}: ${x.amount}`) || [])
            .concat(m.deduction?.map(x => `Deduct ${x.supplier}: ${x.amount}`) || [])
            .concat(m.payment?.map(x => `Pay ${x.supplier}: ${x.amount}`) || []);
          frappe.msgprint({ title: __("معاينة"), indicator: "blue", message: `<pre style="white-space:pre-wrap">${(lines.join("\n"))}</pre>` });
        } catch (e) {
          console.error(e);
          frappe.dom.unfreeze();
          frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("فشل المعاينة.") });
        }
      }).addClass("btn-secondary");
    }

    // Optional: Cancel all linked JEs (requires implementing SERVER_METHOD_CANCEL_JES)
    if (ENABLE_CANCEL_BUTTON && frm.doc.docstatus === 1 && (frm.doc.invoice_entry || frm.doc.payment_entry || frm.doc.deduction_entry || frm.doc.loan_refund_entry)) {
      frm.add_custom_button(__("إلغاء كل القيود المرتبطة"), async () => {
        frappe.confirm(
          __("هل أنت متأكد من إلغاء جميع القيود المرتبطة بهذا الكشف؟"),
          async () => {
            try {
              frappe.dom.freeze(__("جاري الإلغاء..."));
              const r = await frappe.call({
                method: SERVER_METHOD_CANCEL_JES,
                args: { docname: frm.doc.name },
                freeze: true
              });
              frappe.dom.unfreeze();
              const msg = r?.message;
              if (msg?.status === "success") {
                frappe.msgprint({ title: __("نجاح"), indicator: "green", message: msg.message || __("تم الإلغاء.") });
                frm.reload_doc();
              } else {
                frappe.msgprint({ title: __("خطأ"), indicator: "red", message: msg?.message || __("تعذر الإلغاء.") });
              }
            } catch (e) {
              console.error(e);
              frappe.dom.unfreeze();
              frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("فشل الاتصال بالخادم.") });
            }
          }
        );
      }).addClass("btn-danger");
    }
  },
});

// ------ Utilities ------

function render_status_banner(frm) {
  const lines = [];

  // Date range
  if (frm.doc.start_date && frm.doc.to_date) {
    lines.push(`🗓️ ${frappe.utils.escape_html(frm.doc.start_date)} → ${frappe.utils.escape_html(frm.doc.to_date)}`);
  }

  // Totals overview (if present)
  const totalFields = [
    ["total_week_amount", __("إجمالي قيمة الأسبوع")],
    ["total_deduction_amount", __("إجمالي الخصومات")],
    ["total_loans", __("إجمالي القروض")],
    ["total_amount", __("الإجمالي قبل الخصم")],
    ["total_less_5", __("خصم أقل من 5")],
    ["total_payment", __("الصرف النهائي")],
    ["total_week_qty", __("إجمالي الكمية")],
  ];
  const totals = totalFields
    .filter(([f]) => frm.doc[f] !== undefined && frm.doc[f] !== null)
    .map(([f, label]) => `${label}: <b>${frappe.utils.fmt_money(frm.doc[f])}</b>`);

  if (totals.length) lines.push(totals.join(" | "));

  // Linked JEs (if any)
  const linkFields = [
    ["invoice_entry", __("قيد الإثبات")],
    ["deduction_entry", __("قيد الخصم")],
    ["loan_refund_entry", __("قيد استرداد القرض")],
    ["payment_entry", __("قيد الصرف")],
  ];
  const linked = linkFields
    .filter(([f]) => frm.doc[f])
    .map(([f, label]) => `${label}: <b>${frappe.utils.escape_html(frm.doc[f])}</b>`);
  if (linked.length) lines.push(linked.join(" | "));

  if (lines.length) {
    frm.dashboard.set_headline(lines.join("<br>"));
  }

  // Quick consistency check in banner (non-blocking)
  if (!frm.is_new() && frm.doc.docstatus !== 2) {
    const warn = quick_consistency_check(frm);
    if (warn) {
      frm.dashboard.set_headline_alert(warn, "orange");
    }
  }
}

function validate_dates(frm) {
  const s = frm.doc.start_date, e = frm.doc.to_date;
  if (!s || !e) return false;
  const sd = frappe.datetime.str_to_obj(s);
  const ed = frappe.datetime.str_to_obj(e);
  if (ed < sd) {
    frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("تاريخ النهاية لا يمكن أن يكون قبل البداية.") });
    return false;
  }
  return true;
}

function has_any_row(frm) {
  const rows = frm.doc[CHILD_TABLE_FIELDNAME] || [];
  return rows.length > 0;
}

function quick_consistency_check(frm) {
  try {
    const rows = frm.doc[CHILD_TABLE_FIELDNAME] || [];
    if (!rows.length) return __("لا توجد صفوف في الكشف.");
    // If totals exist, only hint mismatches (do not block)
    const sum_pay = rows.reduce((a, r) => a + Number(r.total_amount_to_pay || 0), 0);
    if (frm.doc.total_payment !== undefined && Math.abs(sum_pay - Number(frm.doc.total_payment || 0)) > 0.01) {
      return __("تنبيه: مجموع مبالغ الصرف بالصفوف لا يساوي إجمالي الصرف في الهيدر.");
    }
  } catch (e) {
    // ignore
  }
  return "";
}

function confirm_basic_consistency(frm) {
  if (!validate_dates(frm)) return false;

  // Soft warnings
  const rows = frm.doc[CHILD_TABLE_FIELDNAME] || [];
  if (!rows.length) {
    frappe.msgprint({ title: __("تنبيه"), indicator: "orange", message: __("لا توجد صفوف للمعالجة.") });
    return false;
  }
  return true;
}

async function refresh_child_table_from_server(frm) {
  try {
    const r = await frappe.call({
      method: "frappe.client.get",
      args: { doctype: "Weekly Supplier Payment", name: frm.doc.name },
    });
    const docFromServer = r?.message;
    if (!docFromServer) {
      frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("فشل في جلب المستند المحدّث.") });
      return;
    }

    // Replace child table completely
    frm.doc[CHILD_TABLE_FIELDNAME] = (docFromServer[CHILD_TABLE_FIELDNAME] || []).map(row => ({ ...row }));
    frm.refresh_field(CHILD_TABLE_FIELDNAME);

    // Sync header totals
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
    frappe.msgprint({ title: __("خطأ"), indicator: "red", message: __("تعذّر التحديث من الخادم.") });
  }
}

function sync_header_totals_from_message(frm, msg) {
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
    if (f in msg) {
      frm.set_value(f, msg[f]);
    }
  }
}

function add_days(dateStr, days) {
  if (!dateStr) return dateStr;
  const d = frappe.datetime.str_to_obj(dateStr);
  d.setDate(d.getDate() + Number(days || 0));
  return frappe.datetime.obj_to_str(d);
}