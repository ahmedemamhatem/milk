frappe.pages["supplier-report"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("تقرير الموردين"),
    single_column: true,
  });

  // Translation map for milk types
  const milkTypeTranslations = {
    "Cow": "بقر",
    "Buffalo": "جاموس",
    "بقر": "Cow",
    "جاموس": "Buffalo",
  };

  // Utility function to translate milk type
  function translateMilkType(type) {
    return milkTypeTranslations[type] || type;
  }

  // Add Filter Section
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

  // Add Filters
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

  // Add Results Container
  const results_container = $(`<div id="printable-content" class="results mt-4"></div>`).appendTo(page.body);

  // Event: Fetch Report
  filter_container.find("#fetch-button").on("click", function () {
    const selected_date = filters.date.get_value();
    const selected_supplier = filters.supplier.get_value(); // Can be null for all suppliers

    if (!selected_date) {
      frappe.throw(__("يرجى تحديد تاريخ البداية."));
    }

    // Fetch and Render the Report
    frappe.call({
      method: "milk.milk.utils.get_supplier_report_seven_days",
      args: {
        selected_date,
        supplier: selected_supplier || null, // Pass null if no supplier is selected
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

  // Event: Refresh Page
  filter_container.find("#refresh-button").on("click", function () {
    location.reload();
  });

  // Event: Print Report
  filter_container.find("#print-button").on("click", function () {
    if (results_container.children().length === 0) {
      frappe.msgprint(__("لا توجد بيانات للطباعة."));
      return;
    }
    window.print();
  });

  // Function to Render Results
  function renderResults(data, selected_date) {
    results_container.empty();

    if (!data || Object.keys(data).length === 0) {
      results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
      return;
    }

    // Get the Arabic date range
    const dateRangeArabic = getDateRangeInArabic(selected_date);

    // Render all suppliers
    data.forEach((supplier) => {
      const custom_villages = supplier.custom_villages || "غير محدد";

      const supplier_section = $(`
        <div class="supplier-section">
          <div class="supplier-header text-center mb-1">
            <div class="header-line">
              <span style="color: red; font-weight: bold;">البان العمري</span> |
              <span style="color: blue;">${supplier.supplier_name}</span>
              <span style="color: red;">(${custom_villages})</span> |
              <span>(${dateRangeArabic})</span> |
              <span>(${translateMilkType(supplier.milk_type)})</span>
            </div>
          </div>

          <table class="table text-center table-bordered">
            <thead>
              <tr>
                <th>${__("اليوم")}</th>
                ${supplier.days
                  .map((day) => {
                    if (!day.day_name) {
                      console.error("Missing day_name for day:", day);
                      return `<th>${__("تاريخ غير صالح")}</th>`;
                    }
                    return `<th>${day.day_name}</th>`;
                  })
                  .join("")}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${__("الصباح")}</strong></td>
                ${supplier.days.map((day) => `<td>${day.morning || 0} ${__("كجم")}</td>`).join("")}
              </tr>
              <tr>
                <td><strong>${__("المساء")}</strong></td>
                ${supplier.days.map((day) => `<td>${day.evening || 0} ${__("كجم")}</td>`).join("")}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>${__("الإجمالي")}</strong></td>
                <td colspan="${supplier.days.length}">
                  ${__("إجمالي الصباح")}: ${supplier.total_morning} ${__("كجم")} |
                  ${__("إجمالي المساء")}: ${supplier.total_evening} ${__("كجم")} |
                  ${__("الإجمالي الكلي")}: ${supplier.total_quantity} ${__("كجم")} |
                  ${__("الإجمالي بالقيمة")}: ${supplier.total_amount.toLocaleString()} ${__("جنيه")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `);

      results_container.append(supplier_section);
    });
  }

  // Function to Get Arabic Date Range
  function getDateRangeInArabic(startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatter = new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedStart = formatter.format(start); // Arabic date for start
    const formattedEnd = formatter.format(end); // Arabic date for end

    return `${formattedStart} - ${formattedEnd}`;
  }

  // Add CSS for Double and Bold Borders
  const css = `
    table, th, td {
      border: 3px double black;
      padding: 8px;
      text-align: center;
    }

    table {
      border: 5px solid black;
      border-collapse: collapse;
      margin-bottom: 20px;
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
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .supplier-header .header-line {
      display: flex;
      justify-content: center;
      gap: 10px;
      font-size: 16px;
      font-weight: bold;
    }

    @media print {
      .btn {
        display: none;
      }

      .supplier-section {
        page-break-inside: avoid;
      }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
};