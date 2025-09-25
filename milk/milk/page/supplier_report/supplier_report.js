frappe.pages["supplier-report"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("تقرير الموردين"),
    single_column: true,
  });

  // ترجمات نوع اللبن
  const milkTypeTranslations = {
    "Cow": "بقر",
    "Buffalo": "جاموس",
    "بقر": "Cow",
    "جاموس": "Buffalo",
  };
  function translateMilkType(type) {
    return milkTypeTranslations[type] || type;
  }

  // واجهة المرشحات + الأزرار
  const filter_container = $(`
    <div class="flex items-center gap-4 mb-4" style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
      <div id="filter-wrapper-date" style="flex:1 1 200px; min-width:220px;"></div>
      <div id="filter-wrapper-supplier" style="flex:1 1 200px; min-width:220px;"></div>
      <div id="filter-wrapper-driver" style="flex:1 1 200px; min-width:220px;"></div>
      <div id="filter-wrapper-village" style="flex:1 1 200px; min-width:220px;"></div>
      <div id="filter-wrapper-group" style="flex:0 0 auto;"></div>
      <div style="flex:1 1 100%; height:0;"></div>
      <button class="btn btn-primary" id="fetch-button" style="white-space:nowrap;">${__("جلب التقرير")}</button>
      <button class="btn btn-secondary" id="refresh-button" style="white-space:nowrap;">${__("إعادة التحميل")}</button>
      <button class="btn btn-success" id="print-button" style="white-space:nowrap;">${__("طباعة")}</button>
      <button class="btn btn-warning" id="pay-button" style="white-space:nowrap;">${__("إنشاء دفعات")}</button>
    </div>
  `).appendTo(page.body);

  const filters = {};
  filters.date = page.add_field({
    fieldname: "date",
    label: __("تاريخ البداية"),
    fieldtype: "Date",
    reqd: 1,
    container: filter_container.find("#filter-wrapper-date")[0],
  });
  filters.supplier = page.add_field({
    fieldname: "supplier",
    label: __("اسم المورد"),
    fieldtype: "Link",
    options: "Supplier",
    reqd: 0,
    placeholder: __("اختياري"),
    container: filter_container.find("#filter-wrapper-supplier")[0],
  });
  filters.driver = page.add_field({
    fieldname: "driver",
    label: __("اسم السائق"),
    fieldtype: "Link",
    options: "Driver",
    reqd: 0,
    placeholder: __("اختياري"),
    container: filter_container.find("#filter-wrapper-driver")[0],
  });
  filters.village = page.add_field({
    fieldname: "village",
    label: __("القرية"),
    fieldtype: "Link",
    options: "Village",
    reqd: 0,
    placeholder: __("اختياري"),
    container: filter_container.find("#filter-wrapper-village")[0],
  });
  filters.group = page.add_field({
    fieldname: "group",
    label: __("عرض مجمّع"),
    fieldtype: "Check",
    reqd: 0,
    description: __("تجميع حسب السائق والقرية"),
    container: filter_container.find("#filter-wrapper-group")[0],
  });

  // حاوية النتائج
  const results_container = $(`<div id="printable-content" class="results mt-4"></div>`).appendTo(page.body);

  // زر إنشاء الدفعات
  filter_container.find("#pay-button").on("click", function () {
    if (!results_container || results_container.children().length === 0) {
      frappe.msgprint(__("لا توجد بيانات لمعالجة الدفعات."));
      return;
    }

    const dialog = new frappe.ui.Dialog({
      title: __("اختر طريقة الدفع"),
      fields: [
        {
          fieldname: "mode_of_payment",
          label: __("طريقة الدفع"),
          fieldtype: "Link",
          options: "Mode of Payment",
          reqd: 1,
        },
      ],
      primary_action_label: __("إنشاء القيود"),
      primary_action(values) {
        if (!values || !values.mode_of_payment) {
          frappe.msgprint(__("يرجى اختيار طريقة الدفع."));
          return;
        }
        dialog.hide();

        frappe.confirm(
          __("هل أنت متأكد من إنشاء قيود اليومية (الإثبات والدفع)؟"),
          function () {
            const args = {
              selected_date: filters?.date?.get_value ? filters.date.get_value() : null,
              mode_of_payment: values.mode_of_payment,
              supplier: filters?.supplier?.get_value ? (filters.supplier.get_value() || null) : null,
              driver: filters?.driver?.get_value ? (filters.driver.get_value() || null) : null,
              village: filters?.village?.get_value ? (filters.village.get_value() || null) : null,
              is_grouped: filters?.group?.get_value ? (filters.group.get_value() || false) : false,
            };

            frappe.call({
              method: "milk.milk.utils.create_accrual_and_payment_journal_entries",
              args,
              freeze: true,
              freeze_message: __("جاري إنشاء القيود..."),
              callback: function (r) {
                const msg = r && r.message ? r.message : null;
                if (!msg) {
                  frappe.msgprint({
                    title: __("خطأ"),
                    indicator: "red",
                    message: __("لم يتم استلام رد من الخادم.")
                  });
                  return;
                }

                if (msg.status === "success") {
                  show_success_dialog(msg);
                } else if (msg.status === "noop") {
                  frappe.msgprint({
                    title: __("لا يوجد ما يمكن معالجته"),
                    indicator: "blue",
                    message: msg.message || __("كل السجلات مدفوعة أو مرتبطة مسبقاً. لم يتم إنشاء أي قيود.")
                  });
                } else {
                  const errMsg =
                    msg.message || msg.error || msg.exc ||
                    (r._server_messages ? JSON.parse(r._server_messages).join("<br>") : null) ||
                    __("حدث خطأ غير متوقع.");

                  frappe.msgprint({
                    title: __("خطأ"),
                    indicator: "red",
                    message: errMsg
                  });
                }
              },
              error: function () {
                frappe.msgprint({
                  title: __("خطأ"),
                  indicator: "red",
                  message: __("تعذر تنفيذ العملية. يرجى المحاولة لاحقاً.")
                });
              }
            });
          },
          function () {
            frappe.msgprint(__("تم إلغاء العملية."));
          }
        );
      },
    });

    dialog.show();
  });

  // تنسيق الأرقام
  function format_number(value) {
    const n = Number(value);
    if (Number.isFinite(n)) return n.toFixed(2);
    return "0.00";
  }

  function show_success_dialog(msg) {
    const je1 = msg.journal_entry_accrual;
    const je2 = msg.journal_entry_payment;
    const refNo = msg.reference_no || "";
    const updatedLogs = Array.isArray(msg.updated_logs) ? msg.updated_logs : [];
    const suppliers = Array.isArray(msg.suppliers) ? msg.suppliers : [];

    const supplierLines = suppliers.length
      ? suppliers.map(s => `• ${frappe.utils.escape_html(s.supplier)}: <strong>${format_number(s.amount || s.paid_amount || s.net || 0)}</strong>`).join("<br>")
      : __("لا يوجد موردون");

    const logsLine = updatedLogs.length
      ? frappe.utils.escape_html(updatedLogs.join(", "))
      : __("لا يوجد");

    const je1Html = je1 ? `<a href="/app/journal-entry/${je1}" target="_blank">${je1}</a>` : __("لا يوجد");
    const je2Html = je2 ? `<a href="/app/journal-entry/${je2}" target="_blank">${je2}</a>` : __("لا يوجد");

    frappe.msgprint({
      title: __("تم التنفيذ"),
      indicator: "green",
      message: `
        <div style="margin-bottom: 6px;">
          ${frappe.utils.escape_html(msg.message || __("تم إنشاء القيود وتحديث السجلات بنجاح."))}
        </div>
        <div>
          <strong>${__("قيد الإثبات")}:</strong> ${je1Html}<br>
          <strong>${__("قيد الدفع")}:</strong> ${je2Html}
          ${refNo ? `<br><strong>${__("رقم المرجع")}:</strong> ${frappe.utils.escape_html(refNo)}` : ""}
        </div>
        <hr>
        <div>
          <strong>${__("الموردون")}</strong><br>
          ${supplierLines}
        </div>
        <hr>
        <div>
          <strong>${__("السجلات المحدّثة")} (${updatedLogs.length})</strong><br>
          ${logsLine}
        </div>
      `
    });
  }

  // جلب التقرير
  filter_container.find("#fetch-button").on("click", function () {
    const selected_date = filters.date.get_value();
    const selected_supplier = filters.supplier.get_value();
    const selected_driver = filters.driver.get_value();
    const selected_village = filters.village.get_value();
    const is_grouped = filters.group.get_value();

    if (!selected_date) frappe.throw(__("يرجى تحديد تاريخ البداية."));

    const method_name = is_grouped
      ? "milk.milk.utils.get_grouped_supplier_report"
      : "milk.milk.utils.get_supplier_report_seven_days";

    frappe.call({
      method: method_name,
      args: {
        selected_date,
        supplier: selected_supplier || null,
        driver: selected_driver || null,
        village: selected_village || null,
      },
      callback: function (response) {
        if (response.message.status !== "success") {
          frappe.msgprint({
            title: __("خطأ"),
            indicator: "red",
            message: response.message.message,
          });
          return;
        }

        if (is_grouped) {
          renderGroupedResults(response.message.data);
        } else {
          // جلب إجمالي القروض الأسبوعية للموردين (paied = 0)
          frappe.call({
            method: "milk.milk.utils.get_weekly_supplier_loan_totals",
            args: { selected_date },
            callback: function (loanRes) {
              const loanTotals = (loanRes && loanRes.message && loanRes.message.status === "success")
                ? (loanRes.message.data || {})
                : {};
              renderResults(response.message.data, selected_date, loanTotals);
            },
            error: function () {
              renderResults(response.message.data, selected_date, {});
            }
          });
        }
      },
    });
  });

  // العرض المُجمّع
  function renderGroupedResults(data) {
    results_container.empty();

    if (!data || Object.keys(data).length === 0) {
      results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
      return;
    }

    for (const [driver, driver_data] of Object.entries(data)) {
      const driver_section = $(`
        <div class="card driver-section mb-3 p-3" style="
          border:1px solid #ddd; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.1);
          background:#f9f9f9; direction:rtl; text-align:right;">
          <h3 class="collapsible d-flex align-items-center" style="cursor:pointer; margin:0; font-size:18px; font-weight:bold; color:#0d6efd;">
            <span style="flex-grow:1;">${__("الخط")}: ${frappe.utils.escape_html(driver)} | ${__("إجمالي الكمية")}: <strong>${format_number(driver_data.total_qty)}</strong> | ${__("الإجمالي")}: <strong>${format_number(driver_data.total_amount)}</strong></span>
            <span class="collapse-icon" style="transition: transform 0.3s;">▶</span>
          </h3>
          <div class="content mt-2" style="display:none; padding-right:10px;"></div>
        </div>
      `);

      for (const [village, village_data] of Object.entries(driver_data.villages)) {
        const village_section = $(`
          <div class="card village-section mb-2 p-2" style="
            border:1px solid #ccc; border-radius:10px; background:#fff; margin-right:15px; direction:rtl; text-align:right;">
            <h4 class="collapsible d-flex align-items-center" style="cursor:pointer; margin:0; font-size:16px; color:#198754;">
              <span style="flex-grow:1;">${__("القرية")}: ${frappe.utils.escape_html(village)} | ${__("إجمالي الكمية")}: <strong>${format_number(village_data.total_qty)}</strong> | ${__("الإجمالي")}: <strong>${format_number(village_data.total_amount)}</strong></span>
              <span class="collapse-icon" style="transition: transform 0.3s;">▶</span>
            </h4>
            <div class="content mt-1" style="display:none; padding-right:10px;"></div>
          </div>
        `);

        for (const [supplier, supplier_data] of Object.entries(village_data.suppliers)) {
          let supplier_total_qty = 0;
          let supplier_total_amount = 0;
          Object.values(supplier_data.milk_types).forEach(milk => {
            supplier_total_qty += Number(milk.qty || 0);
            supplier_total_amount += Number(milk.amount || 0);
          });

          const supplier_section = $(`
            <div class="card supplier-section mb-2 p-2" style="
              border:1px solid #bbb; border-radius:8px; background:#fefefe; margin-right:10px; direction:rtl; text-align:right;">
              <h5 class="collapsible d-flex align-items-center" style="cursor:pointer; margin:0; font-size:14px; color:#6c757d;">
                <span style="flex-grow:1;">${__("المورد")}: ${frappe.utils.escape_html(supplier)} | ${__("إجمالي الكمية")}: <strong>${format_number(supplier_total_qty)}</strong> | ${__("الإجمالي")}: <strong>${format_number(supplier_total_amount)}</strong></span>
                <span class="collapse-icon" style="transition: transform 0.3s;">▶</span>
              </h5>
              <div class="content mt-1" style="display:none; padding-right:5px;">
                <table class="table table-bordered supplier-table mb-2" style="width:100%; border-collapse:collapse; font-size:13px;">
                  <thead>
                    <tr style="background:#f1f5f9;">
                      <th>${__("نوع اللبن")}</th>
                      <th>${__("الكمية")}</th>
                      <th>${__("الإجمالي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(supplier_data.milk_types).map(([milk_type, milk]) =>
                      `<tr>
                        <td>${translateMilkType(milk_type)}</td>
                        <td><strong>${format_number(milk.qty)}</strong></td>
                        <td><strong>${format_number(milk.amount)}</strong></td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `);

          village_section.find(".content").append(supplier_section);
        }

        driver_section.find(".content").append(village_section);
      }

      results_container.append(driver_section);
    }

    // فتح/طي الأقسام
    $(".collapsible").off("click").on("click", function () {
      const content = $(this).next(".content");
      const icon = $(this).find(".collapse-icon");
      content.slideToggle(300);
      icon.css("transform", content.is(":visible") ? "rotate(90deg)" : "rotate(0deg)");
    });
  }

  // إعادة التحميل والطباعة
  filter_container.find("#refresh-button").on("click", () => location.reload());

  filter_container.find("#print-button").on("click", function () {
    if (results_container.children().length === 0) {
      frappe.msgprint(__("لا توجد بيانات للطباعة."));
      return;
    }

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @media print {
            @page { size: A4; margin: 1cm; }
            body { font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 0; direction: rtl; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; direction: rtl; text-align: right; }
            th, td { border: 1px solid black; padding: 8px; text-align: right; }
            th { background-color: #f8f9fa; font-weight: bold; font-size: 14px; }
            tfoot td { background-color: #f1f5f9; font-weight: bold; font-size: 13px; }
            .supplier-section, .driver-section, .village-section { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid black; padding: 10px; border-radius: 5px; font-size: 14px; direction: rtl; text-align: right; }
            .supplier-header .header-line { display: flex; justify-content: flex-start; gap: 8px; font-size: 14px; font-weight: bold; margin-bottom: 10px; direction: rtl; text-align: right; }
          }
        </style>
      </head>
      <body>
    `;

    if (filters.group.get_value()) {
      results_container.find(".driver-section").each(function () {
        printContent += $(this).prop("outerHTML");
      });
    } else {
      results_container.find(".supplier-section").each(function () {
        printContent += $(this).prop("outerHTML");
      });
    }

    printContent += `
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  });

  // العرض البسيط (غير المجمّع) مع مسحوب/الصافي في أول بطاقة لكل مورد
  function renderResults(data, selected_date, loanTotals = {}) {
    results_container.empty();

    if (!data || Object.keys(data).length === 0) {
      results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
      return;
    }

    const dateRangeArabic = getDateRangeInArabic(selected_date);
    const shownLoanForSupplier = new Set(); // لضمان عرض "مسحوب/الصافي" مرة واحدة لكل مورد

    data.forEach((supplier) => {
      const supplierName = supplier.supplier_name;
      const custom_villages = supplier.custom_villages || "غير محدد";
      const milkTypeDisplay = `${translateMilkType(supplier.milk_type)} (${supplier.encrypted_rate})`;

      const total_morning = Number(supplier.total_morning || 0);
      const total_evening = Number(supplier.total_evening || 0);
      const total_qty = Number(supplier.total_quantity || 0);
      const total_amount = Number(supplier.total_amount || 0);

      const loan_full_supplier_week = Number(loanTotals[supplierName] || 0);
      const canShowLoanHere = !shownLoanForSupplier.has(supplierName) && loan_full_supplier_week > 0;
      if (canShowLoanHere) shownLoanForSupplier.add(supplierName);

      const net_after = canShowLoanHere
        ? Math.max(0, total_amount - loan_full_supplier_week)
        : total_amount;

      const supplier_section = $(`
        <div class="supplier-section" style="
          border: 2px solid #000; 
          padding: 10px; 
          margin-bottom: 10px; 
          border-radius: 5px; 
          background: #f9f9f9; 
          box-sizing: border-box;">
          
          <div class="supplier-header" style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            font-size: 14px; 
            font-weight: bold; 
            background: #e9ecef; 
            padding: 10px; 
            border: 2px solid #000; 
            border-radius: 5px; 
            box-sizing: border-box;">
            <div style="color: #d9534f; font-size: 16px; font-weight: bold;">
              ألبان العمري
            </div>
            <div style="text-align: right;">
              <span style="color: blue;">${frappe.utils.escape_html(supplierName)}</span>
              &nbsp;|&nbsp;
              <span style="color: red;">(${frappe.utils.escape_html(custom_villages)})</span>
              &nbsp;|&nbsp;
              <span>(${dateRangeArabic})</span>
              &nbsp;|&nbsp;
              <span>${frappe.utils.escape_html(milkTypeDisplay)}</span>
            </div>
          </div>

          <table class="table text-center table-bordered centered-table" style="
            width: 100%; 
            font-size: 12px; 
            border-collapse: collapse; 
            margin-top: 10px; 
            border-spacing: 0; 
            border: 2px solid #000; 
            box-sizing: border-box;">
            <thead>
              <tr style="background: #f1f1f1; font-weight: bold;">
                <th style="border: 2px solid #000; white-space: nowrap;">${__("اليوم")}</th>
                ${supplier.days
                  .map((day) => `<th style="font-weight: bold; white-space: nowrap; border: 2px solid #000;">${day.day_name || __("تاريخ غير صالح")}</th>`)
                  .join("")}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="white-space: nowrap; border: 2px solid #000;"><strong>${__("الصباح")}</strong></td>
                ${supplier.days
                  .map((day) => {
                    const morning = day.morning || { qty: 0, pont: 0 };
                    return supplier.custom_pont_size_rate === 1
                      ? `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;"><strong>${format_number(morning.qty)}</strong> ${__("كجم")}-(${frappe.utils.escape_html(String(morning.pont))})</td>`
                      : `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;"><strong>${format_number(morning.qty)}</strong> ${__("كجم")}</td>`;
                  })
                  .join("")}
              </tr>
              <tr>
                <td style="white-space: nowrap; border: 2px solid #000;"><strong>${__("المساء")}</strong></td>
                ${supplier.days
                  .map((day) => {
                    const evening = day.evening || { qty: 0, pont: 0 };
                    return supplier.custom_pont_size_rate === 1
                      ? `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;"><strong>${format_number(evening.qty)}</strong> ${__("كجم")}-(${frappe.utils.escape_html(String(evening.pont))})</td>`
                      : `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;"><strong>${format_number(evening.qty)}</strong> ${__("كجم")}</td>`;
                  })
                  .join("")}
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: #f8f8f8; font-weight: bold;">
                <td style="border: 2px solid #000;">${__("الإجمالي")}</td>
                <td colspan="${supplier.days.length}" class="totals-cell" style="text-align: center; border: 2px solid #000; padding: 6px 4px;">
                  ${__("الصباح")}: <strong>${format_number(total_morning)}</strong>
                  <span class="sep"> | </span>
                  ${__("المساء")}: <strong>${format_number(total_evening)}</strong>
                  <span class="sep"> | </span>
                  ${__("الإجمالي الكلي")}: <strong>${format_number(total_qty)}</strong>
                  <span class="sep"> | </span>
                  ${__("الإجمالي")}: <strong>${format_number(total_amount)}</strong>
                  ${canShowLoanHere ? `
                    <span class="sep"> | </span>
                    ${__("مسحوب")}: <strong>${format_number(loan_full_supplier_week)}</strong>
                    <span class="sep"> | </span>
                    ${__("الصافي")}: <strong>${format_number(net_after)}</strong>
                  ` : ""}
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="contact-info text-center" style="font-size: 14px; font-weight: bold; margin-top: 10px; color: #555;">
            ${__("الحسابات: ٠١٠١٨١١٥٤١٥١")} &nbsp;&nbsp; — &nbsp;&nbsp; ${__("الحاج أحمد: ٠١١٢٦٩٥٤٧٠٠")}
          </div>
        </div>
      `);

      results_container.append(supplier_section);
    });

    // أنماط مساعدة لتثبيت عرض الجدول والسماح بلفّ سطر الإجماليات
    const styleId = "supplier-report-print-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .centered-table { table-layout: fixed; width: 100%; }
        .centered-table td, .centered-table th {
          height: 40px;
          vertical-align: middle;
          text-align: center;
          border: 2px solid #000;
          box-sizing: border-box;
        }
        .centered-table th { white-space: nowrap; }

        .totals-cell {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.4;
        }
        .sep { margin: 0 6px; }

        @media print {
          @page { size: A4; margin: 1cm; }
          .centered-table th, .centered-table td { padding: 6px 4px; }
          .totals-cell {
            font-size: 12px;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .sep { margin: 0 4px; }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  // أداة مساعدة للتواريخ
  function getDateRangeInArabic(startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const formatter = new Intl.DateTimeFormat("ar-EG", { day:"numeric", month:"long", year:"numeric" });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }
};