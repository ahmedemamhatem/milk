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
};