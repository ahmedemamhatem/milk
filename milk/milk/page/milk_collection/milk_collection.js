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

  function translateMilkType(type, toArabic = true) {
    return toArabic ? milkTypeTranslations[type] || type : milkTypeTranslations[type] || type;
  }

  function getArabicDayName(dateStr) {
    const daysInArabic = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const date = new Date(dateStr);
    return daysInArabic[date.getDay()];
  }

  // Styles
  const styles = `
    <style>
      body { margin: 0; padding: 0; background: linear-gradient(to bottom right, #f0f9ff, #ecfdf5); font-family: 'Inter', sans-serif; }
      .filters-section { display: flex; flex-wrap: wrap; gap: 20px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px; }
      .filter-item { min-width: 220px; }
      .filter-item label { display: block; margin-bottom: 5px; font-weight: bold; color: #2563eb; }
      .filter-item input, .filter-item select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
      .get-suppliers-btn { background: linear-gradient(to right, #2563eb, #1d4ed8); color: #fff; font-size: 14px; font-weight: bold; padding: 4px 12px; height: 34px; line-height: 1; border-radius: 4px; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
      .get-suppliers-btn:hover { transform: scale(1.05); }
      .table-section { overflow-x: auto; background: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .table-section table { width: 100%; border-collapse: collapse; }
      .table-section th { background: #2563eb; color: white; padding: 12px; text-align: center; font-weight: bold; }
      .table-section td { padding: 10px; text-align: center; border-bottom: 1px solid #e5e7eb; }
      .table-section tr:hover { background: #f3f4f6; }
      .table-section input[readonly] { background-color: #f3f3f3; cursor: not-allowed; }
      .actions-section { display: flex; justify-content: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
      .btn-primary { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 12px 16px; font-size: 15px; font-weight: bold; border-radius: 8px; cursor: pointer; border: none; transition: 0.2s ease; }
      .btn-primary:disabled { background: #d1d5db; cursor: not-allowed; }
      .btn-secondary { background: #e5e7eb; color: #1f2937; padding: 12px 16px; font-size: 15px; font-weight: bold; border-radius: 8px; cursor: pointer; border: none; transition: background-color 0.2s ease; }
      .btn-secondary:hover { background: #d1d5db; }
      .hidden { display: none !important; }
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

  // Use Pont filter (Yes/No, default No)
  const use_pont = frappe.ui.form.make_control({
    parent: $('<div class="filter-item"></div>').appendTo(filter_section),
    df: {
      fieldname: 'use_pont',
      label: __('استخدام البنط'),
      fieldtype: 'Select',
      options: 'No\nYes',
      default: 'No'
    },
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
            <th class="pont-col">${__('بنط الصباح')}</th>
            <th>${__('كمية المساء')}</th>
            <th class="pont-col">${__('بنط المساء')}</th>
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

  // Toggle pont columns visibility in on-page table
  function togglePontVisibility() {
    const show = (use_pont.get_value() || 'No') === 'Yes';
    const table = table_section.find('table');
    table.find('th.pont-col, td.pont-col').toggleClass('hidden', !show);
  }

  // Validation
  function validate_pont_field(pontValue, milkType, isReadonly) {
    if (isReadonly) return "readonly";
    if (pontValue === 0) return "zero";
    if (milkType === "Cow" && (pontValue < 3 || pontValue > 5)) return "invalid_cow";
    if (milkType === "Buffalo" && (pontValue < 6 || pontValue > 9)) return "invalid_buffalo";
    return "valid";
  }

  // Populate table
  function populate_table_with_data(data, isSubmitted = false) {
    const tbody = table_section.find("tbody");
    tbody.empty();

    let rowCount = 1;
    data.forEach((entry) => {
      const isPontEditable = entry.custom_pont_size_rate === 1;
      const milkTypes = (entry.milk_type || '').split(",").map((type) => translateMilkType(type, true));
      milkTypes.forEach((milk_type) => {
        const row = $(`
          <tr>
            <td>${rowCount++}</td>
            <td>${entry.supplier || __('غير معروف')}</td>
            <td>${milk_type}</td>
            <td><input type="number" class="morning-quantity" value="${entry.morning_quantity || 0}" ${isSubmitted ? "readonly" : ""}></td>
            <td class="pont-col"><input type="number" class="morning-pont" value="${entry.morning_pont || 0}" ${!isPontEditable ? "readonly" : ""}></td>
            <td><input type="number" class="evening-quantity" value="${entry.evening_quantity || 0}" ${isSubmitted ? "readonly" : ""}></td>
            <td class="pont-col"><input type="number" class="evening-pont" value="${entry.evening_pont || 0}" ${!isPontEditable ? "readonly" : ""}></td>
          </tr>
        `);
        tbody.append(row);
      });
    });

    togglePontVisibility();
  }

  // Save or submit
  async function save_or_submit(action) {
    const milk_entries = [];
    let validation_issues = [];
    let invalid_rows = false;
    const validationPromises = [];

    const usePont = (use_pont.get_value() || 'No') === 'Yes';

    table_section.find("tbody tr").each(function (index, row) {
      const $row = $(row);
      const supplier = $row.find("td:nth-child(2)").text().trim();
      const milk_type = translateMilkType($row.find("td:nth-child(3)").text().trim(), false);
      const morning_quantity = parseFloat($row.find(".morning-quantity").val()) || 0;
      const evening_quantity = parseFloat($row.find(".evening-quantity").val()) || 0;

      let morning_pont = 0;
      let evening_pont = 0;

      if (usePont) {
        morning_pont = parseFloat($row.find(".morning-pont").val()) || 0;
        evening_pont = parseFloat($row.find(".evening-pont").val()) || 0;

        const isMorningPontReadonly = $row.find(".morning-pont").prop("readonly");
        const isEveningPontReadonly = $row.find(".evening-pont").prop("readonly");

        const morningPontValidation = validate_pont_field(morning_pont, milk_type, isMorningPontReadonly);
        if (morningPontValidation === "invalid_cow") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (بقر) يجب أن يكون بين 3 و 5.`);
          invalid_rows = true;
          return false;
        }
        if (morningPontValidation === "invalid_buffalo") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (جاموس) يجب أن يكون بين 6 و 9.`);
          invalid_rows = true;
          return false;
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
      }

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
            if (morning_quantity > 0) {
              if (morning_quantity < morning_min || morning_quantity > morning_max) {
                errors.push(`كمية الصباح (${morning_quantity}) خارج النطاق (المتوسط: ${average.morning} ± 2).`);
              }
            } else if (morning_quantity === 0) {
              errors.push(`كمية الصباح = 0`);
            }

            if (evening_quantity > 0) {
              if (evening_quantity < evening_min || evening_quantity > evening_max) {
                errors.push(`كمية المساء (${evening_quantity}) خارج النطاق (المتوسط: ${average.evening} ± 2).`);
              }
            } else if (evening_quantity === 0) {
              errors.push(`كمية المساء = 0`);
            }

            if (errors.length > 0) validation_issues.push(`صف ${index + 1}: ${errors.join(" | ")}`);

            milk_entries.push({ supplier, milk_type, morning_quantity, morning_pont, evening_quantity, evening_pont });
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

  // Button handlers
  actions_section.find(".save-btn").click(() => save_or_submit("save"));
  actions_section.find(".submit-btn").click(() => save_or_submit("submit"));
  actions_section.find(".clear-btn").click(clear_table_and_filters);

  // UTIL: parse Supplier.custom_villages to simple list of village names
  function parseVillagesList(cv) {
    const out = [];
    if (!cv) return out;

    if (Array.isArray(cv)) {
      cv.forEach(item => {
        if (!item) return;
        if (typeof item === 'string') {
          const v = item.trim();
          if (v) out.push(v);
        } else if (typeof item === 'object') {
          const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
          if (v) out.push(v);
        }
      });
      return out;
    }

    if (typeof cv === 'string') {
      const s = cv.trim();
      if (!s) return out;
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          arr.forEach(item => {
            if (!item) return;
            if (typeof item === 'string') {
              const v = item.trim();
              if (v) out.push(v);
            } else if (typeof item === 'object') {
              const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
              if (v) out.push(v);
            }
          });
          return out;
        }
      } catch (e) {
        s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
        return out;
      }
      s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
      return out;
    }

    return out;
  }

  // PRINT DRAFT: two-column layout (right continues after left), group by village, supplier-level custom_sort, respect Use Pont
  actions_section.find(".print-draft-btn").on("click", async () => {
    try {
      frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

      const selectedDate = collection_date.get_value();
      const today = selectedDate || (frappe.datetime ? frappe.datetime.get_today() : new Date().toISOString().slice(0,10));
      const dayName = getArabicDayName(today);

      const selectedDriver = driver.get_value();
      const selectedVillage = village.get_value();
      const showPont = (use_pont.get_value() || 'No') === 'Yes';

      // Fetch suppliers including supplier-level custom_sort and custom_villages
      const suppliers = await frappe.db.get_list('Supplier', {
        fields: [
          'name',
          'supplier_name',
          'disabled',
          'custom_milk_supplier',
          'custom_driver_in_charge',
          'custom_villages',
          'custom_buffalo',
          'custom_cow',
          'custom_sort'
        ],
        filters: { disabled: 0, custom_milk_supplier: 1 },
        limit: 5000
      });

      if (!suppliers || suppliers.length === 0) {
        frappe.msgprint(__('لا يوجد موردون نشطون بعلم المورد لبن.'));
        return;
      }

      // Build rows
      const rows = [];
      suppliers.forEach(sup => {
        const driver_name = (sup.custom_driver_in_charge || '').toString().trim() || __('غير محدد');
        if (selectedDriver && driver_name !== selectedDriver) return;

        const villages = parseVillagesList(sup.custom_villages);
        if (!villages.length) return;

        const villagesToUse = selectedVillage ? villages.filter(v => v === selectedVillage) : villages;
        if (!villagesToUse.length) return;

        const sup_name = sup.supplier_name || sup.name;
        const sort_key = Number.isFinite(Number(sup.custom_sort)) ? Number(sup.custom_sort) : 999999;

        const add = (label) => {
          villagesToUse.forEach(vname => {
            rows.push({
              driver: driver_name,
              village: vname,
              supplier: sup_name,
              milk_type: label,
              sort_key
            });
          });
        };

        if (Number(sup.custom_cow) === 1) add('بقري');
        if (Number(sup.custom_buffalo) === 1) add('جاموسي');
      });

      if (!rows.length) {
        frappe.msgprint(__('لا توجد صفوف للطباعة بعد تطبيق الفلاتر.'));
        return;
      }

      // Global sort: driver -> village -> custom_sort -> supplier -> milk_type
      rows.sort((a, b) => {
        if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
        if (a.village !== b.village) return a.village.localeCompare(b.village, 'ar');
        if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
        if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
        return a.milk_type.localeCompare(b.milk_type, 'ar');
      });

      // HTML with two columns per row
      let html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${__('مسودة تجميع الموردين')}</title>
<style>
  :root{ --border:#d9dee7; --muted:#6b7280; --text:#0f172a; }
  html,body{ margin:0; padding:0; font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif; color:var(--text) }
  .page{ padding:12mm 10mm; page-break-after:always }
  .page:last-child{ page-break-after:auto }
  .hdr{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px }
  .hdr .title{ font-size:18px; font-weight:800 }
  .hdr .meta{ font-size:12px; color:var(--muted) }
  .village-title{ margin:12px 0 6px; font-weight:800; border-bottom:2px solid var(--border); padding-bottom:4px; }
  table{ width:100%; border-collapse:collapse; margin-bottom:8px; table-layout: fixed; }
  th, td{ border:1px solid var(--border); padding:6px; font-size:13px; text-align:center; }
  th{ background:#f8fafc; color:#374151; font-weight:800 }
  td{ background:#fff }
  .pont-col { display: ${showPont ? '' : 'none'}; }
  /* Set column widths for better balance */
  th, td { word-wrap: break-word; }
  .col-idx { width: 5%; }
  .col-supplier { width: 25%; }
  .col-mtype { width: 10%; }
  .col-qty { width: 15%; }
  .col-pont { width: 10%; }
  @media print{
    .page{ padding:10mm }
    th,td{ padding:4mm 3mm; font-size:12px }
  }
</style>
</head>
<body>
`;

      const renderDriverPage = (driver_name, rowsForDriver) => {
        // Group by village
        const byVillage = {};
        rowsForDriver.forEach(r => {
          (byVillage[r.village] = byVillage[r.village] || []).push(r);
        });

        html += `
<section class="page">
  <div class="hdr">
    <div class="title">${__('مسودة تسجيل اللبن')} — ${driver_name || __('غير محدد')}</div>
    <div class="meta">${dayName} - ${today}</div>
  </div>
`;

        const villageNames = Object.keys(byVillage).sort((a, b) => a.localeCompare(b, 'ar'));

        villageNames.forEach(villageName => {
          const group = byVillage[villageName];

          // Sort inside village: custom_sort -> supplier -> milk_type
          group.sort((a, b) => {
            if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
            if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
            return a.milk_type.localeCompare(b.milk_type, 'ar');
          });

          // Two columns with continuous indices
          const N = group.length;
          const half = Math.ceil(N / 2);
          const left = group.slice(0, half);
          const right = group.slice(half);
          const maxRows = Math.max(left.length, right.length);

          let rowsHtml = '';
          for (let i = 0; i < maxRows; i++) {
            const a = left[i] || null;
            const b = right[i] || null;
            const aIdx = a ? (i + 1) : '';
            const bIdx = b ? (half + i + 1) : '';
            rowsHtml += `
            <tr>
              <td class="col-idx">${aIdx}</td>
              <td class="col-supplier">${a ? a.supplier : ''}</td>
              <td class="col-mtype">${a ? a.milk_type : ''}</td>
              <td class="col-qty"></td>
              <td class="col-pont pont-col"></td>
              <td class="col-idx">${bIdx}</td>
              <td class="col-supplier">${b ? b.supplier : ''}</td>
              <td class="col-mtype">${b ? b.milk_type : ''}</td>
              <td class="col-qty"></td>
              <td class="col-pont pont-col"></td>
            </tr>`;
          }

          html += `
  <div class="village-title">${__('القرية')}: ${villageName || __('غير محدد')}</div>
  <table>
    <thead>
      <tr>
        <th class="col-idx">#</th>
        <th class="col-supplier">${__('المورد')}</th>
        <th class="col-mtype">${__('نوع اللبن')}</th>
        <th class="col-qty">${__('كمية الصباح')}</th>
        <th class="col-pont pont-col">${__('بنط الصباح')}</th>
        <th class="col-idx">#</th>
        <th class="col-supplier">${__('المورد')}</th>
        <th class="col-mtype">${__('نوع اللبن')}</th>
        <th class="col-qty">${__('كمية الصباح')}</th>
        <th class="col-pont pont-col">${__('بنط الصباح')}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="10">${__('لا توجد بيانات')}</td></tr>`}
    </tbody>
  </table>
`;
        });

        html += `
</section>
`;
      };

      // Group rows by driver for page breaks
      let currentDriver = null;
      let buffer = [];
      const flushDriver = () => {
        if (!buffer.length) return;
        renderDriverPage(currentDriver, buffer);
        buffer = [];
      };

      rows.forEach(r => {
        if (currentDriver === null) currentDriver = r.driver;
        if (r.driver !== currentDriver) {
          flushDriver();
          currentDriver = r.driver;
        }
        buffer.push(r);
      });
      flushDriver();

      html += `
</body>
</html>`;

      // Open and print
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

  // React to Use Pont toggle and apply immediately (default No)
  $(use_pont.$input).on('change', togglePontVisibility);
  togglePontVisibility();
};