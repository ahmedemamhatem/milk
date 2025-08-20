frappe.pages["supplier-report"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("تقرير الموردين"),
    single_column: true,
  });

  // Translations for Milk Type
  const milkTypeTranslations = {
    "Cow": "بقر",
    "Buffalo": "جاموس",
    "بقر": "Cow",
    "جاموس": "Buffalo",
  };

  function translateMilkType(type) {
    return milkTypeTranslations[type] || type;
  }

  // --- FILTER UI ---
  const filter_container = $(`
    <div class="flex items-center gap-4 mb-4" style="display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
      <div id="filter-wrapper-date" style="flex:1 1 auto;"></div>
      <div id="filter-wrapper-supplier" style="flex:1 1 auto;"></div>
      <div id="filter-wrapper-driver" style="flex:1 1 auto;"></div>
      <div id="filter-wrapper-village" style="flex:1 1 auto;"></div>
      <div id="filter-wrapper-group" style="flex:0 0 auto;"></div>
      <strong id="day-name-display" class="text-primary" style="white-space:nowrap;"></strong>
      <button class="btn btn-primary" id="fetch-button" style="white-space:nowrap;">${__("جلب التقرير")}</button>
      <button class="btn btn-secondary" id="refresh-button" style="white-space:nowrap;">${__("تحديث")}</button>
      <button class="btn btn-success" id="print-button" style="white-space:nowrap;">${__("طباعة التقرير")}</button>
      <button class="btn btn-warning" id="pay-button" style="white-space:nowrap;">${__("دفع للموردين")}</button>
    </div>
  `).appendTo(page.body);


// --- PAY BUTTON ---
// --- PAY BUTTON ---
filter_container.find("#pay-button").on("click", function () {
  if (results_container.children().length === 0) {
    frappe.msgprint(__("لا توجد بيانات للدفع."));
    return;
  }

  // Open popup to select mode of payment
  const dialog = new frappe.ui.Dialog({
    title: __("حدد وضع الدفع"),
    fields: [
      {
        fieldname: "mode_of_payment",
        label: __("طريقة الدفع"),
        fieldtype: "Link",
        options: "Mode of Payment",
        reqd: 1,
      },
    ],
    primary_action_label: __("إنشاء فواتير"),
    primary_action(values) {
      dialog.hide();

      // Show confirmation dialog before proceeding
      frappe.confirm(
        __("هل أنت متأكد أنك تريد إنشاء الفواتير ودفعها؟"),
        function () {
          // Call the back-end method
          frappe.call({
            method: "milk.milk.utils.create_invoices_and_pay",
            args: {
              selected_date: filters.date.get_value(),
              mode_of_payment: values.mode_of_payment,
              supplier: filters.supplier.get_value() || null,
              driver: filters.driver.get_value() || null,
              village: filters.village.get_value() || null,
              is_grouped: filters.group.get_value() || false,
            },
            callback: function (response) {
              if (response.message.status === "success") {
                frappe.msgprint(
                  __("تم إنشاء الفواتير بنجاح. تم تحديث السجلات التالية: ") +
                    response.message.updated_logs.join(", ")
                );
              } else {
                frappe.msgprint({
                  title: __("خطأ"),
                  indicator: "red",
                  message: response.message.message,
                });
              }
            },
          });
        },
        function () {
          // If canceled, show cancellation message
          frappe.msgprint(__("تم إلغاء الدفع."));
        }
      );
    },
  });

  dialog.show();
});

  const filters = {};
  filters.date = page.add_field({
    fieldname: "date",
    label: __("تحديد تاريخ البداية"),
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
    label: __("تجميع"),
    fieldtype: "Check",
    reqd: 0,
    container: filter_container.find("#filter-wrapper-group")[0],
  });

  // --- RESULTS CONTAINER ---
  const results_container = $(`<div id="printable-content" class="results mt-4"></div>`).appendTo(page.body);

  // --- FETCH REPORT ---
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
        if (response.message.status === "success") {
          is_grouped
            ? renderGroupedResults(response.message.data)
            : renderResults(response.message.data, selected_date);
        } else {
          frappe.msgprint({
            title: __("خطأ"),
            indicator: "red",
            message: response.message.message,
          });
        }
      },
    });
  });

  // --- GROUPED RESULTS ---
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
          <span style="flex-grow:1;">${__("الخط")}: ${driver} | ${__("إجمالي الكمية")}: ${driver_data.total_qty} | ${__("الإجمالي المالي")}: ${driver_data.total_amount.toFixed(2)}</span>
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
            <span style="flex-grow:1;">${__("القرية")}: ${village} | ${__("إجمالي الكمية")}: ${village_data.total_qty} | ${__("الإجمالي المالي")}: ${village_data.total_amount.toFixed(2)}</span>
            <span class="collapse-icon" style="transition: transform 0.3s;">▶</span>
          </h4>
          <div class="content mt-1" style="display:none; padding-right:10px;"></div>
        </div>
      `);

      for (const [supplier, supplier_data] of Object.entries(village_data.suppliers)) {
        // Compute total qty and total amount for this supplier
        let supplier_total_qty = 0;
        let supplier_total_amount = 0;
        Object.values(supplier_data.milk_types).forEach(milk => {
          supplier_total_qty += milk.qty;
          supplier_total_amount += milk.amount;
        });

        const supplier_section = $(`
          <div class="card supplier-section mb-2 p-2" style="
            border:1px solid #bbb; border-radius:8px; background:#fefefe; margin-right:10px; direction:rtl; text-align:right;">
            <h5 class="collapsible d-flex align-items-center" style="cursor:pointer; margin:0; font-size:14px; color:#6c757d;">
              <span style="flex-grow:1;">${__("المورد")}: ${supplier} | ${__("إجمالي الكمية")}: ${supplier_total_qty} | ${__("الإجمالي المالي")}: ${supplier_total_amount.toFixed(2)}</span>
              <span class="collapse-icon" style="transition: transform 0.3s;">▶</span>
            </h5>
            <div class="content mt-1" style="display:none; padding-right:5px;">
              <table class="table table-bordered supplier-table mb-2" style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th>${__("نوع الحليب")}</th>
                    <th>${__("الكمية")}</th>
                    <th>${__("الإجمالي")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(supplier_data.milk_types).map(([milk_type, milk]) =>
                    `<tr>
                      <td>${translateMilkType(milk_type)}</td>
                      <td>${milk.qty}</td>
                      <td>${milk.amount.toFixed(2)}</td>
                    </tr>`).join("")
                  }
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

  // --- Collapsible toggle for all levels ---
  $(".collapsible").off("click").on("click", function () {
    const content = $(this).next(".content");
    const icon = $(this).find(".collapse-icon");
    content.slideToggle(300);
    icon.css("transform", content.is(":visible") ? "rotate(90deg)" : "rotate(0deg)");
  });
}


  // --- REFRESH & PRINT ---
  filter_container.find("#refresh-button").on("click", () => location.reload());

  // --- PRINT BUTTON ---
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
          @page {
            size: A4;
            margin: 1cm;
          }

          body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            margin: 0;
            padding: 0;
            direction: rtl;
            text-align: right;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
            direction: rtl;
            text-align: right;
          }

          th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: right;
          }

          th {
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 14px;
          }

          tfoot td {
            background-color: #f1f5f9;
            font-weight: bold;
            font-size: 13px;
          }

          .supplier-section, .driver-section, .village-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
            border: 1px solid black;
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
            direction: rtl;
            text-align: right;
          }

          .supplier-header .header-line {
            display: flex;
            justify-content: flex-start;
            gap: 8px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            direction: rtl;
            text-align: right;
          }
        }
      </style>
    </head>
    <body>
  `;

  // Check if group filter is enabled
  if (filters.group.get_value()) {
    // --- GROUPED PRINT ---
    results_container.find(".driver-section").each(function () {
      printContent += $(this).prop("outerHTML");
    });
  } else {
    // --- NON-GROUPED PRINT ---
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

  // --- SIMPLE RESULTS (UNGROUPED) ---
  function renderResults(data, selected_date) {
  results_container.empty();

  if (!data || Object.keys(data).length === 0) {
    results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
    return;
  }

  const dateRangeArabic = getDateRangeInArabic(selected_date);

  data.forEach((supplier) => {
    const custom_villages = supplier.custom_villages || "غير محدد";
    const milkTypeDisplay = `${translateMilkType(supplier.milk_type)} (${supplier.encrypted_rate})`;

    const supplier_section = $(`
      <div class="supplier-section" style="
        border: 2px solid #000; 
        padding: 10px; 
        margin-bottom: 10px; 
        border-radius: 5px; 
        background: #f9f9f9; 
        box-sizing: border-box;">
        
        <!-- Header -->
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
          <!-- Company Name (Left) -->
          <div style="
            color: #d9534f; 
            font-size: 16px; 
            font-weight: bold;">
            البان العمري
          </div>
          <!-- Other Details (Right) -->
          <div style="
            text-align: right;">
            <span style="color: blue;">${supplier.supplier_name}</span>
            &nbsp;|&nbsp;
            <span style="color: red;">(${custom_villages})</span>
            &nbsp;|&nbsp;
            <span>(${dateRangeArabic})</span>
            &nbsp;|&nbsp;
            <span>${milkTypeDisplay}</span>
          </div>
        </div>

        <!-- Table -->
        <table class="table text-center table-bordered centered-table" style="
          width: 100%; 
          font-size: 12px; 
          border-collapse: collapse; 
          margin-top: 10px; 
          border-spacing: 0; 
          border: 2px solid #000; 
          box-sizing: border-box;">
          <thead>
            <tr style="background: #f1f1f1; font-weight: bold; white-space: nowrap;">
              <th style="border: 2px solid #000;">${__("اليوم")}</th>
              ${supplier.days
                .map(
                  (day) =>
                    `<th style="font-weight: bold; white-space: nowrap; border: 2px solid #000;">${day.day_name || __("تاريخ غير صالح")}</th>`
                )
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
                    ? `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;">${morning.qty} ${__("كجم")}-(${morning.pont})</td>`
                    : `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;">${morning.qty} ${__("كجم")}</td>`;
                })
                .join("")}
            </tr>
            <tr>
              <td style="white-space: nowrap; border: 2px solid #000;"><strong>${__("المساء")}</strong></td>
              ${supplier.days
                .map((day) => {
                  const evening = day.evening || { qty: 0, pont: 0 };
                  return supplier.custom_pont_size_rate === 1
                    ? `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;">${evening.qty} ${__("كجم")}-(${evening.pont})</td>`
                    : `<td style="vertical-align: middle; white-space: nowrap; border: 2px solid #000;">${evening.qty} ${__("كجم")}</td>`;
                })
                .join("")}
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f8f8f8; font-weight: bold;">
              <td style="border: 2px solid #000;">${__("الإجمالي")}</td>
              <td colspan="${supplier.days.length}" style="text-align: center; white-space: nowrap; border: 2px solid #000; padding-bottom: 5px;">
                ${__("إجمالي الصباح")}: ${supplier.total_morning} ${__("كجم")} |
                ${__("إجمالي المساء")}: ${supplier.total_evening} ${__("كجم")} |
                ${__("الإجمالي الكلي")}: ${supplier.total_quantity} ${__("كجم")} |
                ${__("الإجمالي المالي")}: ${supplier.total_amount.toFixed(2)} ${__("جنيه")}
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div class="contact-info text-center" style="
          font-size: 14px; 
          font-weight: bold; 
          margin-top: 10px; 
          color: #555;">
          ${__("الحسابات : ٠١٠١٨١١٥٤١٥١")} &nbsp;&nbsp; -- &nbsp;&nbsp; ${__("الحاج احمد : ٠١١٢٦٩٥٤٧٠٠")}
        </div>
      </div>
    `);

    results_container.append(supplier_section);
  });

  // Add styles for tables
  $("head").append(`
    <style>
      .centered-table td, .centered-table th {
        height: 40px; 
        vertical-align: middle; 
        text-align: center; 
        white-space: nowrap; 
        border: 2px solid #000; 
        box-sizing: border-box; 
      }

      .table {
        border-collapse: collapse; /* Ensure borders don't overlap */
        border-spacing: 0; /* Prevent gaps */
        width: 100%;
      }

      .tfoot td {
        padding-bottom: 5px; /* Prevent border overlap */
      }

      .supplier-header {
        margin-bottom: 5px;
      }

      .supplier-section {
        page-break-inside: avoid; 
      }

      @media print {
        .centered-table {
          border: 2px solid #000; 
        }
        .centered-table td, .centered-table th {
          border: 2px solid #000; 
        }
        .supplier-section {
          page-break-inside: avoid; 
          margin: 0; 
          padding: 0; 
        }
      }
    </style>
  `);
}
  // --- HELPER ---
  function getDateRangeInArabic(startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const formatter = new Intl.DateTimeFormat("ar-EG", { day:"numeric", month:"long", year:"numeric" });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }
};
