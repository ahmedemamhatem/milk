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
    // Translate milk type from English to Arabic or Arabic to English
    function translateMilkType(type, toArabic = true) {
        return toArabic ? milkTypeTranslations[type] || type : milkTypeTranslations[type] || type;
    }
    // Add custom styles
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
                gap: 20px;
                margin-top: 20px;
            }

            .btn-primary {
                background: linear-gradient(to right, #2563eb, #1d4ed8);
                color: white;
                padding: 12px 24px;
                font-size: 16px;
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
                padding: 12px 24px;
                font-size: 16px;
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
        df: { fieldname: 'village', label: __('القرية'), fieldtype: 'Link', options: 'Village', reqd: 1 },
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
                        <th>${__('كمية المساء')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="5" style="text-align:center;">${__('لا توجد بيانات')}</td></tr>
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

    // Populate Table with Data
  // Populate Table with Data and Translate Milk Types to Arabic
    function populate_table_with_data(data, readOnly = false) {
        const tbody = table_section.find("tbody");
        tbody.empty();

        let rowCount = 1;
        data.forEach((entry) => {
            // Translate milk types to Arabic
            const milkTypes = entry.milk_type.split(",").map((type) => translateMilkType(type, true));
            milkTypes.forEach((milk_type) => {
                const row = `
                    <tr>
                        <td>${rowCount++}</td>
                        <td>${entry.supplier || __('غير معروف')}</td>
                        <td>${milk_type}</td>
                        <td>
                            <input type="number" class="morning-quantity" value="${entry.morning_quantity || 0}" 
                                style="width: 100%;" ${readOnly ? "readonly" : ""}>
                        </td>
                        <td>
                            <input type="number" class="evening-quantity" value="${entry.evening_quantity || 0}" 
                                style="width: 100%;" ${readOnly ? "readonly" : ""}>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        });
    }

    // Handle Save and Submit
    // Collect data from table and translate Milk Types to English before submitting
function save_or_submit(action) {
    const milk_entries = [];
    let invalid_rows = false;

    table_section.find("tbody tr").each(function () {
        const supplier = $(this).find("td:nth-child(2)").text().trim();
        const milk_type = translateMilkType($(this).find("td:nth-child(3)").text().trim(), false); // Translate to English
        const morning_quantity = parseFloat($(this).find(".morning-quantity").val()) || 0;
        const evening_quantity = parseFloat($(this).find(".evening-quantity").val()) || 0;

        if (!supplier || !milk_type) {
            invalid_rows = true;
        }

        milk_entries.push({
            supplier,
            milk_type,
            morning_quantity,
            evening_quantity,
        });
    });

    if (invalid_rows) {
        frappe.msgprint({
            title: __('خطأ'),
            indicator: 'red',
            message: __('يرجى التأكد من أن جميع الصفوف تحتوي على بيانات صحيحة.')
        });
        return;
    }

    // Call backend
    frappe.call({
        method: action === 'save' ? 'milk.milk.utils.save_milk_collection' : 'milk.milk.utils.submit_milk_collection',
        args: {
            driver: driver.get_value(),
            village: village.get_value(),
            collection_date: collection_date.get_value(),
            milk_entries: milk_entries,
        },
        callback: function () {
            frappe.msgprint({
                title: __('تم'),
                indicator: 'green',
                message: action === 'save' ? __('تم حفظ البيانات بنجاح.') : __('تم تأكيد البيانات بنجاح.')
            });

            if (action === 'submit') {
                table_section.find('input').attr('readonly', true);
            }
        },
    });
}

    actions_section.find('.save-btn').click(() => save_or_submit('save'));
    actions_section.find('.submit-btn').click(() => save_or_submit('submit'));

    get_suppliers_button.click(() => {
        frappe.call({
            method: "milk.milk.utils.get_suppliers",
            args: {
                driver: driver.get_value(),
                village: village.get_value(),
                collection_date: collection_date.get_value(),
            },
            callback: function (response) {
                const { status, milk_entries, suppliers, message } = response.message;

                frappe.msgprint(message);

                if (status === 'submitted') {
                    populate_table_with_data(milk_entries, true);
                } else if (status === 'draft') {
                    populate_table_with_data(milk_entries, false);
                } else if (status === 'new') {
                    populate_table_with_data(suppliers, false);
                }
            },
        });
    });

    actions_section.find('.clear-btn').click(() => {
        table_section.find('tbody').html(`
            <tr><td colspan="5" style="text-align:center;">${__('لا توجد بيانات')}</td></tr>
        `);
        frappe.msgprint(__('تم مسح البيانات بنجاح 🧹'));
    });
};