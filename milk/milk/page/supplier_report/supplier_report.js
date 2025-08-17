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

  // Utility function for milk type translation
  function translateMilkType(type, toArabic = true) {
    return toArabic ? milkTypeTranslations[type] || type : milkTypeTranslations[type] || type;
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
    const selected_supplier = filters.supplier.get_value();

    if (!selected_date) {
      frappe.throw(__("يرجى تحديد تاريخ البداية."));
    }

    // Display the selected day name near the filter
    const selected_day_name = getDayName(selected_date);
    filter_container.find("#day-name-display").text(`(${selected_day_name})`);

    // Call backend to fetch records
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
    window.print(); // Trigger print
  });

  // Function to Render Results
  function renderResults(data, selected_date) {
    results_container.empty();

    if (!data || Object.keys(data).length === 0) {
      results_container.html(`<div class="alert alert-warning">${__("لا توجد بيانات.")}</div>`);
      return;
    }

    // Sort the days to start from the selected date
    const start_day = new Date(selected_date).getDay();
    const sorted_data = data.map((supplier) => {
      const sorted_days = sortDays(supplier.days, start_day);
      return { ...supplier, days: sorted_days };
    });

    // Render up to 5 suppliers
    sorted_data.slice(0, 5).forEach((supplier) => {
      const supplier_section = $(`
        <div class="supplier-section">
          <div class="supplier-header text-center mb-1">
            <div class="header-line">
              <span><strong>${__("المورد")}:</strong> ${supplier.supplier_name}</span> |
              <span><strong>${__("التاريخ")}:</strong> ${supplier.week_start}</span> |
              <span><strong>${__("النوع")}:</strong> ${translateMilkType(supplier.milk_type, true)}</span> <!-- Translate milk type -->
            </div>
          </div>
          <table class="table text-center table-bordered">
            <thead>
              <tr>
                <th>${__("اليوم")}</th>
                ${supplier.days.map((day) => `<th>${day.day_name}</th>`).join("")}
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
              <tr class="font-weight-bold bg-light">
                <td>${__("الإجمالي")}</td>
                <td colspan="${supplier.days.length}">
                  ${__("إجمالي الصباح")}: ${supplier.total_morning} ${__("كجم")} | 
                  ${__("إجمالي المساء")}: ${supplier.total_evening} ${__("كجم")} | 
                  ${__("الإجمالي الكلي")}: ${supplier.total_quantity} ${__("كجم")} | 
                  ${__("السعر")}: ${supplier.rate} ${__("جنيه مصري لكل كجم")} | 
                  ${__("التكلفة الإجمالية")}: ${supplier.total_amount} ${__("جنيه مصري")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `);

      results_container.append(supplier_section);
    });
  }

  // Helper function to get the day name in Arabic from a date string
  function getDayName(date) {
    const days = [__("الأحد"), __("الاثنين"), __("الثلاثاء"), __("الأربعاء"), __("الخميس"), __("الجمعة"), __("السبت")];
    const dayIndex = new Date(date).getDay();
    return days[dayIndex];
  }

  // Helper function to sort days starting from a specific day
  function sortDays(days, start_day) {
    const day_order = [__("الأحد"), __("الاثنين"), __("الثلاثاء"), __("الأربعاء"), __("الخميس"), __("الجمعة"), __("السبت")];
    const sorted_order = [...day_order.slice(start_day), ...day_order.slice(0, start_day)];

    return days.sort((a, b) => {
      return sorted_order.indexOf(a.day_name) - sorted_order.indexOf(b.day_name);
    });
  }

  // Add CSS for styling
  const css = `
    #printable-content {
      font-family: "Arial", sans-serif;
      color: #000;
    }

    .supplier-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .supplier-header .header-line {
      display: flex;
      justify-content: center;
      gap: 20px;
      font-size: 16px;
      font-weight: bold;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .table th,
    .table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: center;
    }

    .table th {
      background-color: #f8f9fa;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .btn {
        display: none; /* Hide buttons in print */
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