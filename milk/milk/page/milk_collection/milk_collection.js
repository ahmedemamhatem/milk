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
    /* Page defaults (Frappe) */
    body { margin: 0; padding: 0; }

    /* Filters layout */
    .filters-section {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px 16px;
      margin-bottom: 12px;
    }
    .filter-item { min-width: 220px; }

    /* Label */
    .filter-item label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #1f2937;
      font-size: 12px;
    }

    /* Inputs/selects (Frappe-like) */
    .filter-item input[type="text"],
    .filter-item input[type="number"],
    .filter-item input[type="date"],
    .filter-item select {
      width: 100%;
      height: 32px;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: #fff;
      font-size: 13px;
      outline: none;
      transition: border-color .12s ease, box-shadow .12s ease;
    }
    .filter-item input:focus,
    .filter-item select:focus {
      border-color: #5e64ff;
      box-shadow: 0 0 0 2px rgba(94,100,255,0.15);
    }

    /* Enhanced Check style (for استخدام البنط) */
    .filter-item .frappe-control[data-fieldtype="Check"] {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 36px;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] .label-area,
    .filter-item .frappe-control[data-fieldtype="Check"] label {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
      cursor: pointer;
      padding-inline-end: 2px;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border: 1.6px solid #9ca3af;
      border-radius: 4px;
      background: #fff;
      position: relative;
      outline: none;
      transition: border-color .12s ease, background .12s ease, box-shadow .12s ease;
      cursor: pointer;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:hover {
      border-color: #6b7280;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:focus {
      border-color: #5e64ff;
      box-shadow: 0 0 0 3px rgba(94,100,255,0.18);
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:checked {
      background: #5e64ff;
      border-color: #5e64ff;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:checked::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 6px;
      width: 4px;
      height: 8px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:disabled {
      background: #f3f4f6;
      border-color: #e5e7eb;
      cursor: not-allowed;
    }
    .filter-item .frappe-control[data-fieldtype="Check"] input[type="checkbox"]:disabled + label {
      color: #9ca3af;
      cursor: not-allowed;
    }

    /* Get suppliers button (align with primary) */
    .get-suppliers-btn {
      background: #5e64ff;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 12px;
      height: 34px;
      line-height: 1;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid #5e64ff;
      transition: background .12s ease, box-shadow .12s ease, transform .02s ease;
    }
    .get-suppliers-btn:hover { background: #4c52ff; }
    .get-suppliers-btn:active { transform: translateY(1px); }
    .get-suppliers-btn:focus { box-shadow: 0 0 0 3px rgba(94,100,255,0.18); outline: none; }

    /* Table container */
    .table-section {
      overflow-x: auto;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .table-section table { width: 100%; border-collapse: collapse; }
    .table-section th {
      background: #5e64ff;
      color: #fff;
      padding: 10px;
      text-align: center;
      font-weight: 600;
      font-size: 13px;
    }
    .table-section td {
      padding: 8px 10px;
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
      background: #fff;
      font-size: 13px;
    }
    .table-section tr:hover td { background: #f9fafb; }
    .table-section input[readonly] {
      background-color: #f8fafc;
      cursor: not-allowed;
    }

    /* Actions and buttons */
    .actions-section {
      display: flex;
      justify-content: flex-start;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .btn-primary, .btn-secondary {
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      height: 34px;
      border: 1px solid transparent;
      transition: background .12s ease, color .12s ease, border-color .12s ease, box-shadow .12s ease, transform .02s ease;
    }
    .btn-primary {
      background: #5e64ff;
      color: #fff;
      border-color: #5e64ff;
    }
    .btn-primary:hover { background: #4c52ff; border-color: #4c52ff; }
    .btn-primary:active { transform: translateY(1px); }
    .btn-primary:focus { box-shadow: 0 0 0 3px rgba(94,100,255,0.18); outline: none; }
    .btn-primary:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      border-color: #e5e7eb;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .btn-secondary {
      background: #ffffff;
      color: #111827;
      border-color: #d1d5db;
    }
    .btn-secondary:hover { background: #f9fafb; border-color: #cbd5e1; }
    .btn-secondary:active { transform: translateY(1px); }
    .btn-secondary:focus { box-shadow: 0 0 0 3px rgba(17,24,39,0.08); outline: none; }

    .hidden { display: none !important; }

    /* Village header row in table */
    .village-header-row td {
      background: #f3f4f6;
      color: #111827;
      font-weight: 700;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      text-align: right;
      padding: 8px 10px;
      font-size: 13px;
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

  // Use Pont filter (Check)
  const use_pont = frappe.ui.form.make_control({
    parent: $('<div class="filter-item"></div>').appendTo(filter_section),
    df: {
      fieldname: 'use_pont',
      label: __('استخدام البنط'),
      fieldtype: 'Check',
      default: 0
    },
    render_input: true,
  });

  // Helper to enable/disable actions and Use Pont based on status
  function toggleActionButtons(status) {
    const isSubmitted = status === 'submitted';
    const $save = actions_section.find('.save-btn');
    const $submit = actions_section.find('.submit-btn');
    $save.prop('disabled', isSubmitted);
    $submit.prop('disabled', isSubmitted);
    $(use_pont.$input).prop('disabled', isSubmitted);
  }

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
    const show = Boolean(use_pont.get_value());
    const table = table_section.find('table');
    table.find('th.pont-col, td.pont-col').toggleClass('hidden', !show);
  }
  $(use_pont.$input).on('change', togglePontVisibility);
  togglePontVisibility();

  // Validation
  function validate_pont_field(pontValue, milkType, isReadonly) {
    if (isReadonly) return "readonly";
    if (pontValue === 0) return "zero";
    if (milkType === "Cow" && (pontValue < 3 || pontValue > 5)) return "invalid_cow";
    if (milkType === "Buffalo" && (pontValue < 6 || pontValue > 9)) return "invalid_buffalo";
    return "valid";
  }

  // Populate table with sorting and village headers
  async function populate_table_with_data(data, status = 'new') {
    const isSubmitted = status === 'submitted';
    const tbody = table_section.find("tbody");
    tbody.empty();

    const getVillageForEntry = (entry) => {
      const explicit = (entry.village || entry.village_name || '').toString().trim();
      if (explicit) return explicit;
      const villages = parseVillagesList(entry.custom_villages);
      if (villages && villages.length) return villages[0];
      return '';
    };

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

    (data || []).forEach(pushEntry);

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

    normalized.forEach(rec => {
      if (!Number.isFinite(rec.custom_sort)) rec.custom_sort = 999999;
    });

    normalized.sort((a, b) => {
      const va = (a.village || '').toString();
      const vb = (b.village || '').toString();
      if (va !== vb) return va.localeCompare(vb, 'ar');
      if (a.custom_sort !== b.custom_sort) return a.custom_sort - b.custom_sort;
      return (a.supplier || '').localeCompare((b.supplier || ''), 'ar');
    });

    let rowCount = 1;
    let lastVillage = null;

    const renderVillageHeader = (villageName) => {
      const safeName = villageName || __('غير محدد');
      const $hdr = $(`
        <tr class="village-header-row">
          <td colspan="7">
            ${__('القرية')}: ${safeName}
          </td>
        </tr>
      `);
      tbody.append($hdr);
    };

    normalized.forEach(rec => {
      const isPontEditable = rec.custom_pont_size_rate === 1 && !isSubmitted;
      const milkTypes = rec.milkTypes.length ? rec.milkTypes : [''];

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
    toggleActionButtons(status);
  }

  // Save or submit
  async function save_or_submit(action) {
    const milk_entries = [];
    let validation_issues = [];
    let invalid_rows = false;
    const validationPromises = [];

    const usePont = Boolean(use_pont.get_value());

    table_section.find("tbody tr").each(function (index, row) {
      const $row = $(row);

      // Skip village header rows or any non-data rows
      if ($row.hasClass('village-header-row')) return;
      if ($row.find('input').length === 0) return;

      const supplier = $row.find("td:nth-child(2)").text().trim();
      const milk_type = translateMilkType($row.find("td:nth-child(3)").text().trim(), false);
      const morning_quantity = parseFloat($row.find(".morning-quantity").val()) || 0;
      const evening_quantity = parseFloat($row.find(".evening-quantity").val()) || 0;

      let morning_pont = 0;
      let evening_pont = 0;

      if (usePont) {
        const $mp = $row.find(".morning-pont");
        const $ep = $row.find(".evening-pont");
        morning_pont = parseFloat($mp.val()) || 0;
        evening_pont = parseFloat($ep.val()) || 0;

        const isMorningPontReadonly = $mp.prop("readonly");
        const isEveningPontReadonly = $ep.prop("readonly");

        const morningPontValidation = validate_pont_field(morning_pont, milk_type, isMorningPontReadonly);
        if (morningPontValidation === "invalid_cow") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (بقر) يجب أن يكون بين ٣ و ٥.`);
          invalid_rows = true;
          return false;
        }
        if (morningPontValidation === "invalid_buffalo") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط الصباح (جاموس) يجب أن يكون بين ٦ و ٩.`);
          invalid_rows = true;
          return false;
        }

        const eveningPontValidation = validate_pont_field(evening_pont, milk_type, isEveningPontReadonly);
        if (eveningPontValidation === "invalid_cow") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط المساء (بقر) يجب أن يكون بين ٣ و ٥.`);
          invalid_rows = true;
          return false;
        }
        if (eveningPontValidation === "invalid_buffalo") {
          frappe.msgprint(`خطأ في الصف ${index + 1}: بنط المساء (جاموس) يجب أن يكون بين ٦ و ٩.`);
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

            // ±20% variance
            const morning_min = average.morning * 0.80;
            const morning_max = average.morning * 1.20;
            const evening_min = average.evening * 0.80;
            const evening_max = average.evening * 1.20;

            const fmt = (n) => Number.isFinite(n) ? Number(n).toFixed(2) : '0.00';

            let errors = [];
            if (morning_quantity > 0) {
              if (morning_quantity < morning_min || morning_quantity > morning_max) {
                errors.push(`كمية الصباح (${fmt(morning_quantity)}) خارج النطاق (المتوسط: ${fmt(average.morning)} ± 20%).`);
              }
            } else if (morning_quantity === 0) {
              errors.push(`كمية الصباح = 0`);
            }

            if (evening_quantity > 0) {
              if (evening_quantity < evening_min || evening_quantity > evening_max) {
                errors.push(`كمية المساء (${fmt(evening_quantity)}) خارج النطاق (المتوسط: ${fmt(average.evening)} ± 20%).`);
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
    }); // END each

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
    toggleActionButtons('new');
    $(use_pont.$input).prop('disabled', false).prop('checked', false).trigger('change');
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
        villages: village.get_value() ? [village.get_value()] : []
      },
      callback: function (response) {
        // Debug and defensive handling
        console.log('get_suppliers response', response);
        const msg = response && response.message ? response.message : {};
        const status = msg.status || 'new';

        let rows = [];
        if (Array.isArray(msg.milk_entries) && msg.milk_entries.length) {
          rows = msg.milk_entries;
        } else if (Array.isArray(msg.suppliers) && msg.suppliers.length) {
          rows = msg.suppliers;
        }

        populate_table_with_data(rows || [], status);

        if (msg.message) frappe.msgprint(msg.message);
        if (!rows || !rows.length) {
          frappe.show_alert({ message: __('لا توجد بيانات لعرضها بعد تطبيق الفلاتر.'), indicator: 'orange' }, 5);
        }
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

  // PRINT DRAFT (fit 1 page, two columns, two empty fields per side)
  actions_section.find(".print-draft-btn").on("click", async () => {
    try {
      frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

      const selectedDate = collection_date.get_value();
      const today = selectedDate || (frappe.datetime ? frappe.datetime.get_today() : new Date().toISOString().slice(0,10));
      const dayName = getArabicDayName(today);

      const selectedDriver = driver.get_value();
      const selectedVillage = village.get_value();

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

      rows.sort((a, b) => {
        if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
        if (a.village !== b.village) return a.village.localeCompare(b.village, 'ar');
        if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
        if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
        return a.milk_type.localeCompare(b.milk_type, 'ar');
      });

      const MAX_ROWS_BEFORE_SCALE = 70;

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

  @page{ size: A4 portrait; margin: 8mm; }

  html, body{
    margin:0; padding:0;
    color:var(--text);
    background:#fff;
    font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .canvas{ width: 194mm; margin: 0 auto; overflow: hidden; box-sizing: border-box; }
  .fitwrap{ transform-origin: top center; }

  .hdr{
    display:flex; justify-content:space-between; align-items:flex-end;
    margin:0 0 3mm 0; border-bottom:1.2px solid var(--border); padding-bottom:2mm;
  }
  .hdr .title{ font-size:14px; font-weight:800; }
  .hdr .meta{ font-size:10px; color:var(--muted); }

  .village{ margin: 3mm 0; page-break-inside: avoid; }
  .village-title{ font-weight:800; margin:0 0 1.5mm 0; font-size:11px; }

  .grid{
    width:100%;
    border:1.2px solid var(--border);
    border-radius:0;
    overflow:hidden;
    box-sizing: border-box;
  }

  .row{
    display:grid;
    grid-template-columns: 8mm 45mm 12mm 16mm 16mm 8mm 45mm 12mm 16mm 16mm;
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
      <div class="title">${__('مسودة تسجيل اللبن')} -- ${rows[0]?.driver || __('غير محدد')}</div>
      <div class="meta">${dayName} • ${today}</div>
    </div>
`;

      const byVillageMap = {};
      rows.forEach(r => {
        (byVillageMap[r.village] = byVillageMap[r.village] || []).push(r);
      });
      const villageNames = Object.keys(byVillageMap).sort((a, b) => a.localeCompare(b, 'ar'));

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
  </div>
</div>
<script>
  (function(){
    var totalRows = ${JSON.stringify(totalDisplayedRows)};
    var wrap = document.getElementById('fitwrap');
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

  // Initial state
  toggleActionButtons('new');
  $(use_pont.$input).on('change', togglePontVisibility);
  togglePontVisibility();
};