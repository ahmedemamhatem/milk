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

  // Add filter UI
  const filter_container = $(`
    <div class="flex items-center gap-4 mb-4" style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div id="filter-wrapper-date" style="flex: 1 1 auto;"></div>
      <div id="filter-wrapper-supplier" style="flex: 1 1 auto;"></div>
      <strong id="day-name-display" class="text-primary" style="white-space: nowrap;"></strong>
      <button class="btn btn-primary" id="fetch-button" style="white-space: nowrap;">${__("جلب التقرير")}</button>
      <button class="btn btn-secondary" id="refresh-button" style="white-space: nowrap;">${__("تحديث")}</button>
      <button class="btn btn-success" id="print-button" style="white-space: nowrap;">${__("طباعة التقرير")}</button>
    </div>
  `).appendTo(page.body);

  // Add filters for date and supplier
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

  // Results container
  const results_container = $(`<div id="printable-content" class="results mt-4"></div>`).appendTo(page.body);

  // Fetch button action
  filter_container.find("#fetch-button").on("click", function () {
    const selected_date = filters.date.get_value();
    const selected_supplier = filters.supplier.get_value();

    if (!selected_date) {
      frappe.throw(__("يرجى تحديد تاريخ البداية."));
    }

    frappe.call({
      method: "milk.milk.utils.get_supplier_report_seven_days",
      args: {
        selected_date,
        supplier: selected_supplier || null,
      },
      callback: function (response) {
        if (response.message.status === "success") {
          renderResults(response.message.data, selected_date);
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

  // Refresh button action
  filter_container.find("#refresh-button").on("click", function () {
    location.reload();
  });

  // Print button action
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
    font-size: 14px; /* Larger base font size */
    margin: 0;
    padding: 0;
    direction: rtl; /* Set direction to right-to-left */
    text-align: right; /* Align text to the right */
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px; /* Larger table font size */
    direction: rtl; /* Ensure tables follow RTL direction */
    text-align: right; /* Align table text to the right */
  }

  th, td {
    border: 1px solid black;
    padding: 8px; /* Larger padding for better spacing */
    text-align: right; /* Align table cells to the right */
  }

  th {
    background-color: #f8f9fa;
    font-weight: bold;
    font-size: 14px; /* Larger font for table headers */
  }

  tfoot td {
    background-color: #f1f5f9;
    font-weight: bold;
    font-size: 13px; /* Larger font for table footers */
  }

  .supplier-section {
    margin-bottom: 20px;
    page-break-inside: avoid; /* Prevent dividing the section between pages */
    border: 1px solid black;
    padding: 10px;
    border-radius: 5px;
    font-size: 14px; /* Larger font size for supplier sections */
    direction: rtl; /* Ensure section follows RTL */
    text-align: right; /* Align section text to the right */
  }

  .supplier-header .header-line {
    display: flex;
    justify-content: flex-start; /* Align header line to the right */
    gap: 8px;
    font-size: 14px; /* Larger font for header lines */
    font-weight: bold;
    margin-bottom: 10px;
    direction: rtl; /* RTL for header */
    text-align: right; /* Align header text to the right */
  }
}

          body {
            font-family: Arial, sans-serif;
            font-size: 10px; /* Small font size for print */
            margin: 0;
            padding: 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px; /* Smaller table font size */
          }

          th, td {
            border: 1px solid black;
            padding: 4px; /* Smaller padding for print */
            text-align: center;
          }

          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }

          tfoot td {
            background-color: #f1f5f9;
            font-weight: bold;
          }

          .supplier-section {
            margin-bottom: 20px;
            page-break-inside: avoid; /* Prevent dividing the section between pages */
            border: 1px solid black;
            padding: 8px;
            border-radius: 3px;
            font-size: 10px; /* Adjust font size for supplier sections */
          }

          .supplier-header .header-line {
            display: flex;
            justify-content: center;
            gap: 8px;
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 8px;
          }
        }
      </style>
    </head>
    <body>
  `;

  results_container.find(".supplier-section").each(function () {
    printContent += $(this).prop("outerHTML");
  });

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

  // Render results
function renderResults(data, selected_date) {
  results_container.empty();

  if (!data || Object.keys(data).length === 0) {
    results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
    return;
  }

  const dateRangeArabic = getDateRangeInArabic(selected_date);

  data.forEach((supplier) => {
    const custom_villages = supplier.custom_villages || "غير محدد";

    // Combine milk type and encrypted rate for display
    const milkTypeDisplay = `${translateMilkType(supplier.milk_type)} (${supplier.encrypted_rate})`;

    const supplier_section = $(`
<div class="supplier-section">
  <div class="supplier-header text-center mb-1">
    <div class="header-line">
      <span style="color: blue;">${supplier.supplier_name}</span> |
      <span style="color: red;">(${custom_villages})</span> |
      <span>(${dateRangeArabic})</span> |
      <span>${milkTypeDisplay}</span>
      <span style="color: red; font-weight: bold; font-style: italic;">البان العمري</span>
    </div>
  </div>

  <table class="table text-center table-bordered">
    <thead>
      <tr>
        <th>${__("اليوم")}</th>
        ${supplier.days
          .map((day) => `<th>${day.day_name || __("تاريخ غير صالح")}</th>`)
          .join("")}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${__("الصباح")}</strong></td>
        ${supplier.days.map((day) => {
          const morning = day.morning || { qty: 0, pont: 0 };
          return supplier.custom_pont_size_rate === 1
           ? `<td>${morning.qty} ${__("كجم")} - (${morning.pont})</td>`
            : `<td>${morning.qty} ${__("كجم")}</td>`;
        }).join("")}
      </tr>
      <tr>
        <td><strong>${__("المساء")}</strong></td>
        ${supplier.days.map((day) => {
          const evening = day.evening || { qty: 0, pont: 0 };
          return supplier.custom_pont_size_rate === 1
            ? `<td>${evening.qty} ${__("كجم")} - (${evening.pont})</td>`
            : `<td>${evening.qty} ${__("كجم")}</td>`;
        }).join("")}
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td><strong>${__("الإجمالي")}</strong></td>
        <td colspan="${supplier.days.length}">
          ${__("إجمالي الصباح")}: ${supplier.total_morning} ${__("كجم")} |
          ${__("إجمالي المساء")}: ${supplier.total_evening} ${__("كجم")} |
          ${__("الإجمالي الكلي")}: ${supplier.total_quantity} ${__("كجم")} |
          ${__("الإجمالي المالي")}: ${supplier.total_amount.toFixed(2)} ${__("جنيه")}
      
        </td>
      </tr>
    </tfoot>
  </table>
</div>
`);

    results_container.append(supplier_section);
  });
}
  // Helper to format date range in Arabic
  function getDateRangeInArabic(startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatter = new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }
};