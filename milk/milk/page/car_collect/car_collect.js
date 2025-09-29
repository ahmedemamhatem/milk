frappe.pages['car-collect'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'استلام سياره',
        single_column: true
    });

    // Scoped Styles (keep old look)
    const styles = `
        <style>
            .car-collect-page { margin: 0; padding: 0; background: #f8f9fa; font-family: 'Inter', sans-serif; }
            .car-collect-page .car-form-container { max-width: 900px; margin: 50px auto; padding: 40px 30px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); animation: fadeIn 0.8s ease-in-out; }
            .car-collect-page .car-form-header { font-size: 36px; font-weight: 800; text-align: center; margin-bottom: 50px; color: #1e293b; letter-spacing: 1.2px; text-transform: uppercase; background: linear-gradient(to right, #2563eb, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .car-collect-page .car-form-section { display: flex; flex-wrap: wrap; gap: 30px; justify-content: space-between; margin-bottom: 30px; }
            .car-collect-page .form-item { flex: 1; min-width: 280px; max-width: 400px; text-align: center; }
            .car-collect-page .form-item label { font-size: 18px; font-weight: 700; color: #2563eb; margin-bottom: 10px; display: block; text-transform: uppercase; letter-spacing: 0.8px; }
            .car-collect-page .form-item input, .car-collect-page .form-item select { width: 100%; padding: 14px 16px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 16px; transition: all 0.3s ease; background: #f8fafc; box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05); }
            .car-collect-page .form-item input:focus, .car-collect-page .form-item select:focus { border-color: #2563eb; background: white; box-shadow: 0 3px 10px rgba(37, 99, 235, 0.2); }
            .car-collect-page .toggle-group { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
            .car-collect-page .toggle-btn { padding: 12px 24px; font-size: 16px; font-weight: 700; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; background: #f8fafc; color: #475569; transition: all 0.3s ease; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05); }
            .car-collect-page .toggle-btn:hover { background: #e2e8f0; color: #2563eb; }
            .car-collect-page .toggle-btn.active { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; border-color: #1d4ed8; box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3); }
            .car-collect-page .actions { display: flex; justify-content: center; gap: 40px; margin-top: 40px; }
            .car-collect-page .btn { padding: 18px 50px; font-size: 20px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; }
            .car-collect-page .btn-primary { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
            .car-collect-page .btn-primary:hover { background: linear-gradient(to right, #1e40af, #1d4ed8); box-shadow: 0 10px 25px rgba(37, 99, 235, 0.6); }
            .car-collect-page .btn-secondary { background: #e2e8f0; color: #475569; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); }
            .car-collect-page .btn-secondary:hover { background: #cbd5e1; color: #1e293b; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @media (max-width: 768px) { .car-collect-page .form-item { flex: 1 1 100%; } .car-collect-page .car-form-header { font-size: 28px; } .car-collect-page .btn { width: 100%; } }
        </style>
    `;
    $(wrapper).append(styles);

    // Scoped HTML (old style preserved) + added two fields
    const form_html = `
        <div class="car-collect-page">
            <div class="car-form-container">
                <div class="car-form-header">استلام سيارة</div>

                <div class="car-form-section">
                    <div class="form-item" id="driver-container">
                        <label>الخط</label>
                    </div>
                    <div class="form-item" id="warehouse-container">
                        <label>اختر المخزن</label>
                    </div>
                </div>

                <div class="car-form-section">
                    <div class="form-item" id="date-container">
                        <label>التاريخ</label>
                    </div>
                    <div class="form-item">
                        <label>الكمية (كجم)</label>
                        <input id="quantity" type="number" min="1" placeholder="أدخل الكمية" />
                    </div>
                </div>

                <div class="car-form-section">
                    <div class="form-item">
                        <label>اسم السائق</label>
                        <input id="driver_name" type="text" placeholder="اكتب اسم السائق" />
                    </div>
                    <div class="form-item">
                        <label>اسم مساعد السائق</label>
                        <input id="driver_helper_name" type="text" placeholder="اكتب اسم مساعد السائق" />
                    </div>
                </div>

                <div class="car-form-section">
                    <div class="form-item">
                        <label>وقت الجمع</label>
                        <div class="toggle-group" id="time-buttons">
                            <div class="toggle-btn" data-value="morning">صباحاً</div>
                            <div class="toggle-btn" data-value="evening">مساءً</div>
                        </div>
                    </div>
                    <div class="form-item">
                        <label>نوع الحليب</label>
                        <div class="toggle-group" id="milk-buttons">
                            <div class="toggle-btn" data-value="Cow">بقر</div>
                            <div class="toggle-btn" data-value="Buffalo">جاموسي</div>
                        </div>
                    </div>
                </div>

                <div class="actions">
                    <button class="btn btn-secondary" id="clear-btn">مسح</button>
                    <button class="btn btn-primary" id="save-btn">حفظ</button>
                </div>
            </div>
        </div>
    `;
    $(form_html).appendTo(page.body);

    // Initialize Frappe Controls (same as before)
    const driver_control = frappe.ui.form.make_control({
        parent: $('#driver-container'),
        df: { fieldtype: 'Link', options: 'Driver', fieldname: 'driver', placeholder: 'الخط', fetch_if_empty: true, min_query_length: 0 },
        render_input: true
    });

    const warehouse_control = frappe.ui.form.make_control({
        parent: $('#warehouse-container'),
        df: {
            fieldtype: 'Link',
            options: 'Warehouse',
            fieldname: 'warehouse',
            placeholder: 'اختر المخزن',
            fetch_if_empty: true,
        },
        render_input: true
    });

    warehouse_control.set_value(frappe.boot.user_defaults?.warehouse || '');

    const date_control = frappe.ui.form.make_control({
        parent: $('#date-container'),
        df: { fieldtype: 'Date', fieldname: 'date', default: frappe.datetime.get_today() },
        render_input: true
    });

    // Toggle Button Logic
    let selected_time = '';
    let selected_milk = '';

    $('#time-buttons').on('click', '.toggle-btn', function () {
        $('#time-buttons .toggle-btn').removeClass('active');
        $(this).addClass('active');
        selected_time = $(this).data('value');
    });

    $('#milk-buttons').on('click', '.toggle-btn', function () {
        $('#milk-buttons .toggle-btn').removeClass('active');
        $(this).addClass('active');
        selected_milk = $(this).data('value');
    });

    // Save Logic
    $(document).on('click', '#save-btn', function () {
        const driver = driver_control.get_value();
        const warehouse = warehouse_control.get_value();
        const date = date_control.get_value();
        const quantity = $('#quantity').val();
        const driver_name = ($('#driver_name').val() || '').trim();
        const driver_helper_name = ($('#driver_helper_name').val() || '').trim();
        const morning = selected_time === 'morning' ? 1 : 0;
        const evening = selected_time === 'evening' ? 1 : 0;
        const milk_type = selected_milk;

        if (!driver || !warehouse || !quantity || !date) {
            frappe.msgprint("الرجاء تعبئة جميع الحقول المطلوبة.");
            return;
        }
        if (!morning && !evening) {
            frappe.msgprint("الرجاء اختيار صباحاً أو مساءً.");
            return;
        }
        if (!milk_type) {
            frappe.msgprint("الرجاء اختيار نوع الحليب.");
            return;
        }

        frappe.call({
            method: 'milk.milk.page.car_collect.api.insert_car_collection', // updated path
            args: {
                data: JSON.stringify({
                    driver,
                    warehouse,
                    quantity,
                    date,
                    morning,
                    evening,
                    milk_type,
                    driver_name,
                    driver_helper_name
                })
            },
            freeze: true,
            freeze_message: 'جاري الحفظ...',
            callback: function (response) {
                if (response.message) {
                    frappe.msgprint("✅ تم حفظ بيانات استلام السيارة بنجاح!");
                    $('#clear-btn').click();
                }
            }
        });
    });

    // Clear Logic
    $(document).on('click', '#clear-btn', function () {
        driver_control.set_value('');
        warehouse_control.set_value(frappe.boot.user_defaults?.warehouse || '');
        date_control.set_value(frappe.datetime.get_today());
        $('#quantity').val('');
        $('#driver_name').val('');
        $('#driver_helper_name').val('');
        selected_time = '';
        selected_milk = '';
        $('#time-buttons .toggle-btn, #milk-buttons .toggle-btn').removeClass('active');
    });
};