frappe.pages['milk_collection'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('تسجيل اللبن'),
    single_column: true,
  });

  // Translation map for milk types
  const milkTypeTranslations = {
    "Cow": "بقر",
    "Buffalo": "جاموس",
    "بقر": "Cow",
    "جاموس": "Buffalo",
  };

  // Translate milk type from English to Arabic or vice versa
  function translateMilkType(type, toArabic = true) {
    return toArabic ? milkTypeTranslations[type] || type : milkTypeTranslations[type] || type;
  }

  // Helper to get Arabic day names
  function getArabicDayName(dateStr) {
    const daysInArabic = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const date = new Date(dateStr);
    return daysInArabic[date.getDay()];
  }

  // Styles
  const styles = `
    <style>
      body {
        margin: 0;
        padding: 0;
        background: linear-gradient(to bottom right, #f0f9ff, #ecfdf5);
        font-family: 'Inter', sans-serif;
      }

      .filters-section {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }

      .filter-item label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #2563eb;
      }

      .filter-item input, .filter-item select {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
      }

      .get-suppliers-btn {
        background: linear-gradient(to right, #2563eb, #1d4ed8);
        color: white;
        font-size: 14px;
        font-weight: bold;
        padding: 4px 12px;
        height: 34px;
        line-height: 1;
        border-radius: 4px;
        cursor: pointer;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }

      .get-suppliers-btn:hover {
        transform: scale(1.05);
      }

      .table-section {
        overflow-x: auto;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .table-section table {
        width: 100%;
        border-collapse: collapse;
      }

      .table-section th {
        background: #2563eb;
        color: white;
        padding: 12px;
        text-align: center;
        font-weight: bold;
      }

      .table-section td {
        padding: 10px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
      }

      .table-section tr:hover {
        background: #f3f4f6;
      }

      .table-section input[readonly] {
        background-color: #f3f3f3;
        cursor: not-allowed;
      }

      .actions-section {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .btn-primary {
        background: linear-gradient(to right, #2563eb, #1d4ed8);
        color: white;
        padding: 12px 16px;
        font-size: 15px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
        border: none;
        transition: transform 0.2s ease;
      }

      .btn-primary:disabled {
        background: #d1d5db;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #e5e7eb;
        color: #1f2937;
        padding: 12px 16px;
        font-size: 15px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s ease;
      }

      .btn-secondary:hover {
        background: #d1d5db;
      }
    </style>
  `;
  $(wrapper).append(styles);

  // Filters Section
  const filter_section = $('<div class="filters-section"></div>').appendTo(page.body);

  const driver = frappe.ui.form.make_control({
    parent: $('<div class="filter-item"></div>').appendTo(filter_section),
    df: { fieldname: 'driver', label: __('السائق'), fieldtype: 'Link', options: 'Driver', reqd: 1 },
    render_input: true,
  });

  const village = frappe.ui.form.make_control({
    parent: $('<div class="filter-item"></div>').appendTo(filter_section),
    df: { fieldname: 'village', label: __('القرية'), fieldtype: 'Link', options: 'Village', reqd: 0 },
    render_input: true,
  });

  const collection_date = frappe.ui.form.make_control({
    parent: $('<div class="filter-item"></div>').appendTo(filter_section),
    df: { fieldname: 'collection_date', label: __('تاريخ التجميع'), fieldtype: 'Date', default: frappe.datetime.get_today(), reqd: 1 },
    render_input: true,
  });

  const get_suppliers_button = $('<button class="get-suppliers-btn">' + __('عرض الموردين') + '</button>').appendTo(filter_section);

  const table_section = $(`
    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th>${__('الرقم')}</th>
            <th>${__('المورد')}</th>
            <th>${__('نوع اللبن')}</th>
            <th>${__('كمية الصباح')}</th>
            <th>${__('بنط الصباح')}</th>
            <th>${__('كمية المساء')}</th>
            <th>${__('بنط المساء')}</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="7" style="text-align:center;">${__('لا توجد بيانات')}</td></tr>
        </tbody>
      </table>
    </div>
  `).appendTo(page.body);

  const actions_section = $(`
    <div class="actions-section">
      <button class="btn-primary save-btn">${__('حفظ')}</button>
      <button class="btn-primary submit-btn">${__('تأكيد')}</button>
      <button class="btn-secondary clear-btn">${__('مسح البيانات')}</button>
    </div>
  `).appendTo(page.body);

  // Print Draft button
  actions_section.find(".clear-btn").after(`<button class="btn-secondary print-draft-btn">${__('طباعة مسودة')}</button>`);

  // Function to validate pont fields
  function validate_pont_field(pontValue, milkType, isReadonly) {
    if (isReadonly) {
      return "readonly"; // Skip validation for readonly fields
    }
    if (pontValue === 0) return "zero";
    if (milkType === "Cow" && (pontValue < 3 || pontValue > 5)) return "invalid_cow";
    if (milkType === "Buffalo" && (pontValue < 6 || pontValue > 9)) return "invalid_buffalo";
    return "valid";
  }

  // Function to validate quantities against averages
  function validate_quantity_against_average(supplier, morning_quantity, evening_quantity, callback) {
    frappe.call({
      method: "milk.milk.utils.get_average_quantity",
      args: { supplier, days: 10 },
      callback: function (response) {
        // Default values if no response or empty response
        const average = response.message || { morning: 0, evening: 0 };

        // Calculate valid ranges for morning and evening
        const morning_min = average.morning - 2;
        const morning_max = average.morning + 2;
        const evening_min = average.evening - 2;
        const evening_max = average.evening + 2;

        let errors = [];

        // Validate morning quantity
        if (morning_quantity < morning_min || morning_quantity > morning_max) {
          errors.push(
            `كمية الصباح (${morning_quantity}) خارج النطاق المسموح به (المتوسط: ${average.morning} ± 2).`
          );
        }

        // Validate evening quantity
        if (evening_quantity < evening_min || evening_quantity > evening_max) {
          errors.push(
            `كمية المساء (${evening_quantity}) خارج النطاق المسموح به (المتوسط: ${average.evening} ± 2).`
          );
        }

        // Pass validation result back via the callback
        callback({
          valid: errors.length === 0,
          messages: errors,
        });
      },
    });
  }

  // Populate table with data
  function populate_table_with_data(data, isSubmitted = false) {
    const tbody = table_section.find("tbody");
    tbody.empty();

    let rowCount = 1;
    data.forEach((entry) => {
      const isPontEditable = entry.custom_pont_size_rate === 1;
      const milkTypes = entry.milk_type.split(",").map((type) => translateMilkType(type, true));
      milkTypes.forEach((milk_type) => {
        const row = $(`
          <tr>
            <td>${rowCount++}</td>
            <td>${entry.supplier || __('غير معروف')}</td>
            <td>${milk_type}</td>
            <td><input type="number" class="morning-quantity" value="${entry.morning_quantity || 0}" ${isSubmitted ? "readonly" : ""}></td>
            <td><input type="number" class="morning-pont" value="${entry.morning_pont || 0}" ${!isPontEditable ? "readonly" : ""}></td>
            <td><input type="number" class="evening-quantity" value="${entry.evening_quantity || 0}" ${isSubmitted ? "readonly" : ""}></td>
            <td><input type="number" class="evening-pont" value="${entry.evening_pont || 0}" ${!isPontEditable ? "readonly" : ""}></td>
          </tr>
        `);
        tbody.append(row);
      });
    });
  }

  // Save or submit data
  async function save_or_submit(action) {
    const milk_entries = [];
    let validation_issues = [];
    let invalid_rows = false;

    const validationPromises = [];

    table_section.find("tbody tr").each(function (index, row) {
      const $row = $(row);
      const supplier = $row.find("td:nth-child(2)").text().trim();
      const milk_type = translateMilkType($row.find("td:nth-child(3)").text().trim(), false);
      const morning_quantity = parseFloat($row.find(".morning-quantity").val()) || 0;
      const morning_pont = parseFloat($row.find(".morning-pont").val()) || 0;
      const evening_quantity = parseFloat($row.find(".evening-quantity").val()) || 0;
      const evening_pont = parseFloat($row.find(".evening-pont").val()) || 0;

      const isMorningPontReadonly = $row.find(".morning-pont").prop("readonly");
      const isEveningPontReadonly = $row.find(".evening-pont").prop("readonly");

      // Validate pont fields
      const morningPontValidation = validate_pont_field(morning_pont, milk_type, isMorningPontReadonly);
      if (morningPontValidation === "invalid_cow") {
        frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (بقر) يجب أن يكون بين 3 و 5.`);
        invalid_rows = true;
        return false; // break
      }
      if (morningPontValidation === "invalid_buffalo") {
        frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (جاموس) يجب أن يكون بين 6 و 9.`);
        invalid_rows = true;
        return false; // break
      }

      const eveningPontValidation = validate_pont_field(evening_pont, milk_type, isEveningPontReadonly);
      if (eveningPontValidation === "invalid_cow") {
        frappe.msgprint(`خطأ في الصف ${index + 1}: بنط المساء (بقر) يجب أن يكون بين 3 و 5.`);
        invalid_rows = true;
        return false;
      }
      if (eveningPontValidation === "invalid_buffalo") {
        frappe.msgprint(`خطأ في الصف ${index + 1}: بنط المساء (جاموس) يجب أن يكون بين 6 و 9.`);
        invalid_rows = true;
        return false;
      }

      // Push validation promise for quantities
      const promise = new Promise((resolve) => {
        frappe.call({
          method: "milk.milk.utils.get_average_quantity",
          args: { supplier, milk_type, days: 10 },
          callback: function (response) {
            const average = response.message || { morning: 0, evening: 0 };

            const morning_min = average.morning - 2;
            const morning_max = average.morning + 2;
            const evening_min = average.evening - 2;
            const evening_max = average.evening + 2;

            let errors = [];

            // Morning validation
            if (morning_quantity > 0) {
              if (morning_quantity < morning_min || morning_quantity > morning_max) {
                errors.push(
                  `كمية الصباح (${morning_quantity}) خارج النطاق المسموح به (المتوسط: ${average.morning} ± 2).`
                );
              }
            } else if (morning_quantity === 0) {
              errors.push(`كمية الصباح = 0`);
            }

            // Evening validation
            if (evening_quantity > 0) {
              if (evening_quantity < evening_min || evening_quantity > evening_max) {
                errors.push(
                  `كمية المساء (${evening_quantity}) خارج النطاق المسموح به (المتوسط: ${average.evening} ± 2).`
                );
              }
            } else if (evening_quantity === 0) {
              errors.push(`كمية المساء = 0`);
            }

            if (errors.length > 0) {
              validation_issues.push(`صف ${index + 1}: ${errors.join(" | ")}`);
            }

            milk_entries.push({
              supplier,
              milk_type,
              morning_quantity,
              morning_pont,
              evening_quantity,
              evening_pont,
            });
            resolve();
          },
        });
      });

      validationPromises.push(promise);
    });

    if (invalid_rows) {
      frappe.msgprint("يرجى تصحيح الأخطاء قبل المتابعة!");
      return;
    }

    // Wait for all async validations
    await Promise.all(validationPromises);

    if (validation_issues.length > 0) {
      const confirmation_message = validation_issues.join("<br>");
      frappe.confirm(
        `تحذير: توجد مشاكل في الكميات.<br>${confirmation_message}<br>هل تريد المتابعة؟`,
        () => proceed_with_save_or_submit(action, milk_entries),
        () => frappe.msgprint("تم إلغاء العملية.")
      );
    } else {
      proceed_with_save_or_submit(action, milk_entries);
    }
  }

  // Proceed with saving or submitting data
  function proceed_with_save_or_submit(action, milk_entries) {
    frappe.call({
      method: action === "save" ? "milk.milk.utils.save_milk_collection" : "milk.milk.utils.submit_milk_collection",
      args: {
        driver: driver.get_value(),
        village: village.get_value(),
        collection_date: collection_date.get_value(),
        milk_entries,
      },
      callback: function () {
        frappe.msgprint(action === "save" ? "تم حفظ البيانات بنجاح!" : "تم تأكيد البيانات بنجاح!");
        clear_table_and_filters();
      },
    });
  }

  // Clear table and filters
  function clear_table_and_filters() {
    table_section.find("tbody").html(`<tr><td colspan="7">لا توجد بيانات</td></tr>`);
    frappe.msgprint("تم مسح البيانات.");
  }

  // Fetch suppliers on button click
  get_suppliers_button.click(() => {
    const selectedDriver = driver.get_value();
    const selectedDate = collection_date.get_value();

    if (!selectedDriver || !selectedDate) {
      frappe.msgprint("يرجى تحديد السائق وتاريخ التجميع!");
      return;
    }

    frappe.call({
      method: "milk.milk.utils.get_suppliers",
      args: {
        driver: selectedDriver,
        collection_date: selectedDate,
        villages: [village.get_value()],
      },
      callback: function (response) {
        if (response.message.status === "submitted") {
          populate_table_with_data(response.message.milk_entries, true);
        } else if (response.message.status === "draft") {
          populate_table_with_data(response.message.milk_entries, false);
        } else if (response.message.status === "new") {
          populate_table_with_data(response.message.suppliers, false);
        }
        frappe.msgprint(response.message.message);
      },
    });
  });

  // Attach event handlers for buttons
  actions_section.find(".save-btn").click(() => save_or_submit("save"));
  actions_section.find(".submit-btn").click(() => save_or_submit("submit"));
  actions_section.find(".clear-btn").click(clear_table_and_filters);

  // Print Draft: fetch active milk suppliers and print grouped pages
  actions_section.find(".print-draft-btn").on("click", async () => {
    try {
      frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

      // Fetch suppliers with custom_milk_supplier == 1 and enabled
      const suppliers = await frappe.db.get_list('Supplier', {
        fields: [
          'name',
          'supplier_name',
          'disabled',
          'custom_milk_supplier',
          'custom_driver_in_charge',
          'custom_villages',
          'custom_buffalo',
          'custom_cow'
        ],
        filters: {
          disabled: 0,
          custom_milk_supplier: 1
        },
        limit: 5000
      });

      if (!suppliers || suppliers.length === 0) {
        frappe.msgprint(__('لا يوجد موردون نشطون بعلم المورد لبن.'));
        return;
      }

      // Build rows per milk type and village
      const rows = [];
      suppliers.forEach(sup => {
        // Normalize villages to array of strings
        const villages = Array.isArray(sup.custom_villages)
          ? sup.custom_villages
          : (typeof sup.custom_villages === 'string' && sup.custom_villages
              ? sup.custom_villages.split(',').map(v => v.trim()).filter(Boolean)
              : []);

        const driver_name = sup.custom_driver_in_charge || __('غير محدد');
        const sup_name = sup.supplier_name || sup.name;

        // Buffalo row
        if (Number(sup.custom_buffalo) === 1) {
          villages.forEach(v => {
            rows.push({
              driver: driver_name,
              village: v || __('غير محدد'),
              supplier: sup_name,
              milk_type: 'جاموسي'
            });
          });
        }
        // Cow row
        if (Number(sup.custom_cow) === 1) {
          villages.forEach(v => {
            rows.push({
              driver: driver_name,
              village: v || __('غير محدد'),
              supplier: sup_name,
              milk_type: 'بقري'
            });
          });
        }
      });

      if (!rows.length) {
        frappe.msgprint(__('لا توجد صفوف للطباعة (تحقق من إعدادات نوع اللبن بالموردين).'));
        return;
      }

      // Sort so that grouping by driver then village is consecutive
      rows.sort((a, b) => {
        if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
        if (a.village !== b.village) return a.village.localeCompare(b.village, 'ar');
        if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
        return a.milk_type.localeCompare(b.milk_type, 'ar');
      });

      // Date and day name for header
      const today = frappe.datetime ? frappe.datetime.get_today() : new Date().toISOString().slice(0,10);
      const dayName = getArabicDayName(today);

      // Build printable HTML
      let html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${__('مسودة تجميع الموردين')}</title>
<style>
  :root{ --border:#d9dee7; --muted:#6b7280; --text:#0f172a; }
  html,body{ margin:0; padding:0; font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif; color:var(--text) }
  .page{ padding:16px 18px; page-break-after:always }
  .page:last-child{ page-break-after:auto }
  .hdr{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px }
  .hdr .title{ font-size:18px; font-weight:800 }
  .hdr .meta{ font-size:12px; color:var(--muted) }
  .kv{ display:flex; gap:12px; flex-wrap:wrap; margin:8px 0 12px }
  .chip{ border:1px solid var(--border); border-radius:8px; padding:6px 10px; font-size:13px }
  table{ width:100%; border-collapse:collapse; }
  th, td{ border:1px solid var(--border); padding:8px; font-size:14px; text-align:center; }
  th{ background:#f8fafc; color:#374151; font-weight:800 }
  td{ background:#fff }
  @media print{
    .page{ padding:10mm }
    th,td{ padding:4mm 3mm; font-size:12px }
  }
</style>
</head>
<body>
`;

      // Function to render a section for one driver+village
      const flushPage = (driver_name, village_name, rowsForGroup) => {
        const rowsHtml = rowsForGroup.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.supplier}</td>
            <td>${r.milk_type}</td>
            <td></td>
            <td></td>
          </tr>
        `).join('') || `<tr><td colspan="5">${__('لا توجد بيانات')}</td></tr>`;

        html += `
<section class="page">
  <div class="hdr">
    <div class="title">${__('مسودة تسجيل اللبن')}</div>
    <div class="meta">${dayName} - ${today}</div>
  </div>
  <div class="kv">
    <div class="chip">${__('السائق')}: ${driver_name || __('غير محدد')}</div>
    <div class="chip">${__('القرية')}: ${village_name || __('غير محدد')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${__('المورد')}</th>
        <th>${__('نوع اللبن')}</th>
        <th>${__('كمية الصباح')}</th>
        <th>${__('كمية المساء')}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</section>
`;
      };

      // Iterate grouped by driver -> village, create a page per village
      let currentDriver = null;
      let currentVillage = null;
      let buffer = [];

      rows.forEach(r => {
        if (currentDriver === null) {
          currentDriver = r.driver;
          currentVillage = r.village;
        }
        const changed = (r.driver !== currentDriver) || (r.village !== currentVillage);
        if (changed) {
          flushPage(currentDriver, currentVillage, buffer);
          buffer = [];
          currentDriver = r.driver;
          currentVillage = r.village;
        }
        buffer.push(r);
      });
      if (buffer.length) {
        flushPage(currentDriver, currentVillage, buffer);
      }

      html += `
</body>
</html>`;

      // Open window and print
      const w = window.open('', '_blank');
      if (!w) {
        frappe.msgprint(__('فضلاً فعّل النوافذ المنبثقة للسماح بالطباعة.'));
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 300);
    } catch (e) {
      console.error(e);
      frappe.msgprint({ title: __('خطأ'), message: e.message || String(e), indicator: 'red' });
    } finally {
      frappe.dom.unfreeze();
    }
  });
};