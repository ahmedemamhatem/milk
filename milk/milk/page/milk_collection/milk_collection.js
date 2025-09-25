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
// Populate table with sorting by Supplier.custom_sort (asc), then supplier name (asc)
// Insert a village header row before each supplier group, based on custom_villages from get_suppliers (or entry.village if available)
async function populate_table_with_data(data, isSubmitted = false) {
  const tbody = table_section.find("tbody");
  tbody.empty();

  // Utility to extract the village name to display for an entry
  const getVillageForEntry = (entry) => {
    // Prefer explicit village if provided by backend
    const explicit = (entry.village || entry.village_name || '').toString().trim();
    if (explicit) return explicit;

    // Else derive from custom_villages
    const villages = parseVillagesList(entry.custom_villages);
    if (villages && villages.length) return villages[0];

    return ''; // unknown
  };

  // Normalize entries
  const normalized = [];
  const suppliersToFetch = new Set();

  const pushEntry = (entry) => {
    const supplier = (entry.supplier_name || entry.supplier || '').toString().trim();
    const milkTypesStr = (entry.milk_type || entry.milk_type_label || '').toString().trim();
    const milkTypes = milkTypesStr ? milkTypesStr.split(',').map(s => translateMilkType(s.trim(), true)) : [];

    const rec = {
      supplier,
      village: getVillageForEntry(entry),
      custom_sort: Number.isFinite(Number(entry.custom_sort)) ? Number(entry.custom_sort) : null,
      morning_quantity: Number(entry.morning_quantity) || 0,
      evening_quantity: Number(entry.evening_quantity) || 0,
      morning_pont: Number(entry.morning_pont) || 0,
      evening_pont: Number(entry.evening_pont) || 0,
      custom_pont_size_rate: Number(entry.custom_pont_size_rate) || 0,
      milkTypes
    };

    if (rec.custom_sort == null && supplier) suppliersToFetch.add(supplier);
    normalized.push(rec);
  };

  data.forEach(pushEntry);

  // Batch fetch custom_sort for suppliers missing it
  if (suppliersToFetch.size > 0) {
    try {
      const names = Array.from(suppliersToFetch);
      const supplierDocs = await frappe.db.get_list('Supplier', {
        fields: ['name', 'supplier_name', 'custom_sort', 'custom_villages'],
        filters: [['name', 'in', names]],
        limit: names.length
      });
      const sortMap = {};
      const villageMap = {};
      supplierDocs.forEach(doc => {
        const sortVal = Number.isFinite(Number(doc.custom_sort)) ? Number(doc.custom_sort) : null;
        sortMap[doc.name] = sortVal;
        if (doc.supplier_name) sortMap[doc.supplier_name] = sortVal;
        const villages = parseVillagesList(doc.custom_villages);
        const vName = villages && villages.length ? villages[0] : '';
        villageMap[doc.name] = vName;
        if (doc.supplier_name) villageMap[doc.supplier_name] = vName;
      });
      normalized.forEach(rec => {
        if (rec.custom_sort == null && rec.supplier && sortMap.hasOwnProperty(rec.supplier)) {
          rec.custom_sort = sortMap[rec.supplier];
        }
        if (!rec.village && rec.supplier && villageMap.hasOwnProperty(rec.supplier)) {
          rec.village = villageMap[rec.supplier];
        }
      });
    } catch (e) {
      console.warn('Failed to fetch custom_sort/custom_villages:', e);
    }
  }

  // Defaults
  normalized.forEach(rec => {
    if (!Number.isFinite(rec.custom_sort)) rec.custom_sort = 999999;
  });

  // Sort by village (to group headers), then custom_sort, then supplier
  normalized.sort((a, b) => {
    const va = (a.village || '').toString();
    const vb = (b.village || '').toString();
    if (va !== vb) return va.localeCompare(vb, 'ar');
    if (a.custom_sort !== b.custom_sort) return a.custom_sort - b.custom_sort;
    return (a.supplier || '').localeCompare((b.supplier || ''), 'ar');
  });

  // Render with village headers
  let rowCount = 1;
  let lastVillage = null;

  const renderVillageHeader = (villageName) => {
    const safeName = villageName || __('غير محدد');
    const $hdr = $(`
      <tr class="village-header-row">
        <td colspan="7" style="
          text-align:right;
          font-weight:700;
          background:#f1f5f9;
          color:#0f172a;
          border-top:2px solid #cbd5e1;
          border-bottom:2px solid #cbd5e1;
          padding:10px;">
          ${__('القرية')}: ${safeName}
        </td>
      </tr>
    `);
    tbody.append($hdr);
  };

  normalized.forEach(rec => {
    const isPontEditable = rec.custom_pont_size_rate === 1;
    const milkTypes = rec.milkTypes.length ? rec.milkTypes : [''];

    // Insert village header if changed
    if (rec.village !== lastVillage) {
      renderVillageHeader(rec.village);
      lastVillage = rec.village;
    }

    milkTypes.forEach((milk_type) => {
      const row = $(`
        <tr>
          <td>${rowCount++}</td>
          <td>${rec.supplier || __('غير معروف')}</td>
          <td>${milk_type}</td>
          <td><input type="number" class="morning-quantity" value="${rec.morning_quantity}" ${isSubmitted ? "readonly" : ""}></td>
          <td class="pont-col"><input type="number" class="morning-pont" value="${rec.morning_pont}" ${!isPontEditable ? "readonly" : ""}></td>
          <td><input type="number" class="evening-quantity" value="${rec.evening_quantity}" ${isSubmitted ? "readonly" : ""}></td>
          <td class="pont-col"><input type="number" class="evening-pont" value="${rec.evening_pont}" ${!isPontEditable ? "readonly" : ""}></td>
        </tr>
      `);
      tbody.append(row);
    });
  });

  if (rowCount === 1) {
    tbody.html(`<tr><td colspan="7" style="text-align:center;">${__('لا توجد بيانات')}</td></tr>`);
  }

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
// PRINT DRAFT: force fit all content into one A4 page (scales down), full borders, headerless,
// two-column layout, two empty fields (morning/evening) per side, grouped by village
actions_section.find(".print-draft-btn").on("click", async () => {
  try {
    frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

    const selectedDate = collection_date.get_value();
    const today = selectedDate || (frappe.datetime ? frappe.datetime.get_today() : new Date().toISOString().slice(0,10));
    const dayName = getArabicDayName(today);

    const selectedDriver = driver.get_value();
    const selectedVillage = village.get_value();

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

    // Sort: driver -> village -> custom_sort -> supplier -> milk_type
    rows.sort((a, b) => {
      if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
      if (a.village !== b.village) return a.village.localeCompare(b.village, 'ar');
      if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
      if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
      return a.milk_type.localeCompare(b.milk_type, 'ar');
    });

    // Heuristics to scale content to one page:
    // If many rows, we apply a scale factor in print to fit on 1 page.
    // You can tune these values to your data volume.
    const MAX_ROWS_BEFORE_SCALE = 70;  // total entries per driver page (after split into two columns, equals rows displayed)
    const SCALE_FACTOR = 0.85;         // print-time scaling when too many rows

    // HTML with single A4 page and auto-fit scaling
    let html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${__('مسودة تجميع الموردين')}</title>
<style>
  :root{
    --border:#0f172a;
    --muted:#627084;
    --text:#0f172a;
  }

  @page{
    size: A4 portrait;
    margin: 8mm;
  }

  html, body{
    margin:0; padding:0;
    color:var(--text);
    background:#fff;
    font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* One-page canvas */
  .canvas{
    width: 194mm; /* 210 - 2*8mm margins */
    margin: 0 auto;
    overflow: hidden;
    box-sizing: border-box;
  }

  .fitwrap{
    transform-origin: top center;
  }

  /* Header - very compact */
  .hdr{
    display:flex; justify-content:space-between; align-items:flex-end;
    margin:0 0 3mm 0; border-bottom:1.2px solid var(--border); padding-bottom:2mm;
  }
  .hdr .title{ font-size:14px; font-weight:800; }
  .hdr .meta{ font-size:10px; color:var(--muted); }

  /* Village block - compact, avoid big gaps */
  .village{ margin: 3mm 0 3mm 0; page-break-inside: avoid; }
  .village-title{ font-weight:800; margin:0 0 1.5mm 0; font-size:11px; }

  /* Grid container with full borders */
  .grid{
    width:100%;
    border:1.2px solid var(--border);
    border-radius:0;
    overflow:hidden;
    box-sizing: border-box;
  }

  /* Two empty fields per side (Morning, Evening) — ultra-compact widths */
  /* Left: # | Supplier | Type | Morning | Evening | Right: # | Supplier | Type | Morning | Evening */
  .row{
    display:grid;
    grid-template-columns:
      8mm 45mm 12mm 16mm 16mm
      8mm 45mm 12mm 16mm 16mm;
    align-items: stretch;
    border-top:1px solid var(--border);
    min-height: 6.8mm;
  }
  .row:first-child{ border-top:none; }

  .cell{
    padding:1.4mm 1.2mm;
    font-size:9.8px;
    border-inline-start:1px solid var(--border);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    text-align:center;
    box-sizing: border-box;
  }
  .cell:first-child{ border-inline-start:none; }
  .start{ text-align:start; }

  /* Scaling applied in print if needed; controlled via a class injected by script */
  @media print{
    .scale-100{ transform: scale(1); }
    .scale-85{ transform: scale(0.85); }
    .scale-80{ transform: scale(0.80); }
    .scale-75{ transform: scale(0.75); }
  }
</style>
</head>
<body>
<div class="canvas">
  <div id="fitwrap" class="fitwrap scale-100">
    <div class="hdr">
      <div class="title">${__('مسودة تسجيل اللبن')} — ${rows[0]?.driver || __('غير محدد')}</div>
      <div class="meta">${dayName} • ${today}</div>
    </div>
`;

    // Group rows by village within the single page (no page breaks)
    const byVillageMap = {};
    rows.forEach(r => {
      (byVillageMap[r.village] = byVillageMap[r.village] || []).push(r);
    });
    const villageNames = Object.keys(byVillageMap).sort((a, b) => a.localeCompare(b, 'ar'));

    // Count total displayed rows: maximum of left/right columns per village summed
    let totalDisplayedRows = 0;

    villageNames.forEach(villageName => {
      const group = byVillageMap[villageName];

      group.sort((a, b) => {
        if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
        if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
        return a.milk_type.localeCompare(b.milk_type, 'ar');
      });

      const N = group.length;
      const half = Math.ceil(N / 2);
      totalDisplayedRows += Math.max(half, N - half);

      let rowsHtml = '';
      for (let i = 0; i < Math.max(half, N - half); i++) {
        const a = group[i] || null;
        const b = group[half + i] || null;
        const aIdx = a ? (i + 1) : '';
        const bIdx = b ? (half + i + 1) : '';

        rowsHtml += `
        <div class="row">
          <div class="cell">${aIdx}</div>
          <div class="cell start">${a ? a.supplier : ''}</div>
          <div class="cell">${a ? a.milk_type : ''}</div>
          <div class="cell"></div>
          <div class="cell"></div>
          <div class="cell">${bIdx}</div>
          <div class="cell start">${b ? b.supplier : ''}</div>
          <div class="cell">${b ? b.milk_type : ''}</div>
          <div class="cell"></div>
          <div class="cell"></div>
        </div>`;
      }

      html += `
    <div class="village">
      <div class="village-title">${__('القرية')}: ${villageName || __('غير محدد')}</div>
      <div class="grid">
        ${rowsHtml || `<div class="row"><div class="cell" style="grid-column:1 / -1; text-align:center; color:#777">${__('لا توجد بيانات')}</div></div>`}
      </div>
    </div>
`;
    });

    html += `
  </div> <!-- fitwrap -->
</div>  <!-- canvas -->
<script>
  // Auto-scale to ensure one-page fit by row count heuristic
  (function(){
    var totalRows = ${JSON.stringify(totalDisplayedRows)};
    var wrap = document.getElementById('fitwrap');
    // Choose scale class based on rough row count
    if (totalRows > ${MAX_ROWS_BEFORE_SCALE} + 20) {
      wrap.className = 'fitwrap scale-75';
    } else if (totalRows > ${MAX_ROWS_BEFORE_SCALE} + 10) {
      wrap.className = 'fitwrap scale-80';
    } else if (totalRows > ${MAX_ROWS_BEFORE_SCALE}) {
      wrap.className = 'fitwrap scale-85';
    } else {
      wrap.className = 'fitwrap scale-100';
    }
  })();
</script>
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
    setTimeout(() => { w.print(); }, 350);
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