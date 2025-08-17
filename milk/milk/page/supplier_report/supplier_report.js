frappe.pages["supplier-report"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "تقرير الموردين",
    single_column: true,
  });

  // Add Filter Section (One Line)
  const filter_container = $(`
    <div class="flex items-center gap-4 mb-4" style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div id="filter-wrapper-date" style="flex: 1 1 auto;"></div>
      <div id="filter-wrapper-supplier" style="flex: 1 1 auto;"></div>
      <strong id="day-name-display" class="text-primary" style="white-space: nowrap;"></strong>
      <button class="btn btn-primary" id="fetch-button" style="white-space: nowrap;">جلب التقرير</button>
      <button class="btn btn-secondary" id="refresh-button" style="white-space: nowrap;">تحديث</button>
      <button class="btn btn-success" id="print-button" style="white-space: nowrap;">طباعة التقرير</button>
    </div>
  `).appendTo(page.body);

  // Add Filters
  const filters = {};
  filters.date = page.add_field({
    fieldname: "date",
    label: "تحديد تاريخ البداية",
    fieldtype: "Date",
    reqd: 1,
    container: filter_container.find("#filter-wrapper-date")[0],
  });

  filters.supplier = page.add_field({
    fieldname: "supplier",
    label: "اسم المورد",
    fieldtype: "Link",
    options: "Supplier",
    reqd: 0,
    placeholder: "اختياري",
    container: filter_container.find("#filter-wrapper-supplier")[0],
  });

  // Add Results Container
  const results_container = $(`<div id="printable-content" class="results mt-4"></div>`).appendTo(page.body);

  // Event: Fetch Report
  filter_container.find("#fetch-button").on("click", function () {
    const selected_date = filters.date.get_value();
    const selected_supplier = filters.supplier.get_value();

    if (!selected_date) {
      frappe.throw("يرجى تحديد تاريخ البداية.");
    }

    // Display the selected day name near the filter
    const selected_day_name = getDayName(selected_date);
    filter_container.find("#day-name-display").text(`(${selected_day_name})`);

    // Call backend to fetch records
    frappe.call({
      method: "milk.milk.utils.get_supplier_report_seven_days",
      args: {
        selected_date,
        supplier: selected_supplier || null, // Pass supplier filter if selected
      },
      callback: function (response) {
        if (response.message.status === "success") {
          renderResults(response.message.data, selected_date);
        } else {
          frappe.msgprint({
            title: "خطأ",
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
      frappe.msgprint("لا توجد بيانات للطباعة.");
      return;
    }
    window.print(); // Trigger print
  });

  // Function to Render Results
  function renderResults(data, selected_date) {
    results_container.empty();

    if (!data || Object.keys(data).length === 0) {
      results_container.html(`<div class="alert alert-warning">لا توجد بيانات.</div>`);
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
              <span><strong>المورد:</strong> ${supplier.supplier_name}</span> |
              <span><strong>التاريخ:</strong> ${supplier.week_start}</span> |
              <span><strong>النوع:</strong> ${supplier.milk_type}</span>
            </div>
          </div>
          <table class="table text-center table-bordered">
            <thead>
              <tr>
                <th>اليوم</th>
                ${supplier.days.map((day) => `<th>${day.day_name}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>الصباح</strong></td>
                ${supplier.days.map((day) => `<td>${day.morning || 0} كجم</td>`).join("")}
              </tr>
              <tr>
                <td><strong>المساء</strong></td>
                ${supplier.days.map((day) => `<td>${day.evening || 0} كجم</td>`).join("")}
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-weight-bold bg-light">
                <td>الإجمالي</td>
                <td colspan="${supplier.days.length}">
                  إجمالي الصباح: ${supplier.total_morning} كجم | إجمالي المساء: ${supplier.total_evening} كجم | 
                  الإجمالي الكلي: ${supplier.total_quantity} كجم | السعر: ${supplier.rate} جنيه مصري لكل كجم | 
                  التكلفة الإجمالية: ${supplier.total_amount} جنيه مصري
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
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dayIndex = new Date(date).getDay();
    return days[dayIndex];
  }

  // Helper function to sort days starting from a specific day
  function sortDays(days, start_day) {
    const day_order = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
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
      height: calc(100vh / 5 - 10px); /* Ensure 5 sections fit on one A4 page */
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