frappe.pages['car-collect'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'استلام سياره',
        single_column: true
    });

    // Styles including enhanced quality mini inputs with live feedback
    const styles = `
        <style>
            .car-collect-page { margin: 0; padding: 0; background: #f8f9fa; font-family: 'Inter', sans-serif; }
            .car-collect-page .car-form-container { max-width: 980px; margin: 28px auto; padding: 28px 22px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); animation: fadeIn 0.6s ease-in-out; }
            .car-collect-page .car-form-header { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 18px; color: #1e293b; letter-spacing: .8px; text-transform: uppercase; background: linear-gradient(to right, #2563eb, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .car-collect-page .car-form-section { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin-bottom: 16px; }
            .car-collect-page .form-item { flex: 1; min-width: 260px; max-width: 420px; text-align: center; }
            .car-collect-page .form-item label { font-size: 15px; font-weight: 700; color: #2563eb; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
            .car-collect-page .form-item input, .car-collect-page .form-item select {
                width: 100%; padding: 11px 12px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 15px; background: #f8fafc; transition: all .25s ease;
            }
            .car-collect-page .form-item input:focus, .car-collect-page .form-item select:focus {
                border-color: #2563eb; background: white; box-shadow: 0 3px 10px rgba(37,99,235,0.2);
            }
            .car-collect-page .toggle-group { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
            .car-collect-page .toggle-btn { padding: 9px 14px; font-size: 14px; font-weight: 700; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; background: #f8fafc; color: #475569; transition: all .25s; }
            .car-collect-page .toggle-btn:hover { background: #e2e8f0; color: #2563eb; }
            .car-collect-page .toggle-btn.active { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; border-color: #1d4ed8; box-shadow: 0 5px 15px rgba(37,99,235,0.3); }

            .car-collect-page .actions { display: flex; justify-content: center; gap: 18px; margin-top: 18px; }
            .car-collect-page .btn { padding: 13px 28px; font-size: 16px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; transition: all .25s; text-transform: uppercase; }
            .car-collect-page .btn-primary { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; }
            .car-collect-page .btn-secondary { background: #e2e8f0; color: #475569; }

            /* Enhanced Quality row */
            .quality-row {
                display: grid;
                grid-template-columns: repeat(5, minmax(120px, 1fr));
                gap: 10px;
                align-items: end;
            }
            .quality-item { text-align: center; }
            .quality-item label { font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 4px; }
            .quality-input {
                padding: 8px 10px; font-size: 13px; border-radius: 10px; border: 2px solid #cbd5e1; background: #f8fafc; transition: border-color .2s, background .2s, color .2s;
            }
            .q-tip { font-size: 11px; color: #64748b; margin-top: 4px; text-align: center; grid-column: 1 / -1; }

            /* Feedback colors */
            .q-ok { border-color: #16a34a !important; background: #f0fdf4; }
            .q-warn { border-color: #f59e0b !important; background: #fffbeb; }
            .q-bad { border-color: #dc2626 !important; background: #fef2f2; }

            @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

            @media (max-width: 900px) {
                .quality-row { grid-template-columns: repeat(3, 1fr); }
            }
            @media (max-width: 600px) {
                .quality-row { grid-template-columns: repeat(2, 1fr); }
                .car-collect-page .form-item { min-width: 100%; max-width: 100%; }
                .car-collect-page .btn { width: 100%; }
            }
        </style>
    `;
    $(wrapper).append(styles);

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
                        <input id="quantity" type="number" min="0" step="0.01" placeholder="أدخل الكمية" />
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

                <!-- Enhanced Quality Section -->
                <div class="car-form-section">
                    <div class="quality-row" id="quality-row">
                        <div class="quality-item">
                            <label title="Typical 1.026 - 1.034 (Cow), 1.028 - 1.036 (Buffalo)">الكثافة</label>
                            <input id="density" class="quality-input" type="number" min="0" step="0.0001" placeholder="1.030" />
                        </div>
                        <div class="quality-item">
                            <label>الصلابة</label>
                            <input id="hardness" class="quality-input" type="number" min="0" step="0.01" placeholder="0.00" />
                        </div>
                        <div class="quality-item">
                            <label title="عادة 2.8% - 4.0% للأبقار، أعلى للجاموس">بروتين (%)</label>
                            <input id="protein" class="quality-input" type="number" min="0" max="100" step="0.01" placeholder="3.20" />
                        </div>
                        <div class="quality-item">
                            <label title="Pont / Freezing point dep.">البنط</label>
                            <input id="pont" class="quality-input" type="number" min="0" step="0.01" placeholder="0.00" />
                        </div>
                        <div class="quality-item">
                            <label title="الماء المضاف أو المُقدّر">ماء (%)</label>
                            <input id="water" class="quality-input" type="number" min="0" max="100" step="0.01" placeholder="0.00" />
                        </div>

                        <div class="q-tip" id="q-tip">
                            نطاقات إرشادية ستظهر حسب نوع الحليب المختار.
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

    // Frappe Controls
    const driver_control = frappe.ui.form.make_control({
        parent: $('#driver-container'),
        df: { fieldtype: 'Link', options: 'Driver', fieldname: 'driver', placeholder: 'الخط', fetch_if_empty: true, min_query_length: 0 },
        render_input: true
    });
    const warehouse_control = frappe.ui.form.make_control({
        parent: $('#warehouse-container'),
        df: { fieldtype: 'Link', options: 'Warehouse', fieldname: 'warehouse', placeholder: 'اختر المخزن', fetch_if_empty: true },
        render_input: true
    });
    warehouse_control.set_value(frappe.boot.user_defaults?.warehouse || '');
    const date_control = frappe.ui.form.make_control({
        parent: $('#date-container'),
        df: { fieldtype: 'Date', fieldname: 'date', default: frappe.datetime.get_today() },
        render_input: true
    });

    // Toggles
    let selected_time = '';
    let selected_milk = '';
    $('#time-buttons').on('click', '.toggle-btn', function () {
        $('#time-buttons .toggle-btn').removeClass('active');
        $(this).addClass('active');
        selected_time = $(this).data('value');
        updateQualityHints();
        runQualityChecks();
    });
    $('#milk-buttons').on('click', '.toggle-btn', function () {
        $('#milk-buttons .toggle-btn').removeClass('active');
        $(this).addClass('active');
        selected_milk = $(this).data('value');
        updateQualityHints();
        runQualityChecks();
    });

    // Helpers
    function parseNumber(val) {
        const v = String(val ?? '').trim();
        if (v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    // Quality reference ranges (simplified, can be adjusted)
    const ranges = {
        Cow: {
            density: { min: 1.026, warn: [1.026, 1.028], ok: [1.028, 1.034], high_warn: [1.034, 1.036] },
            protein: { min: 2.8, ok: [2.8, 4.0] }
        },
        Buffalo: {
            density: { min: 1.028, warn: [1.028, 1.030], ok: [1.030, 1.036], high_warn: [1.036, 1.038] },
            protein: { min: 3.5, ok: [3.5, 4.5] }
        }
    };

    const qInputs = {
        density: $('#density'),
        hardness: $('#hardness'),
        protein: $('#protein'),
        pont: $('#pont'),
        water: $('#water')
    };

    // Live validation + feedback
    Object.values(qInputs).forEach($el => {
        $el.on('input', runQualityChecks);
    });

    function setState($el, state) {
        $el.removeClass('q-ok q-warn q-bad');
        if (!state) return;
        $el.addClass(state);
    }

    function updateQualityHints() {
        const tip = $('#q-tip');
        if (!selected_milk) {
            tip.text('نطاقات إرشادية ستظهر حسب نوع الحليب المختار.');
            return;
        }
        const r = ranges[selected_milk];
        if (!r) {
            tip.text('');
            return;
        }
        const densOk = r.density.ok.join(' - ');
        const protOk = r.protein.ok.join(' - ');
        tip.text(`نطاقات إرشادية (${selected_milk === 'Cow' ? 'بقر' : 'جاموسي'}): كثافة ${densOk} | بروتين ${protOk}%`);
    }

    function runQualityChecks() {
        // Flags to tune behavior
        const enableWaterHeuristic = true;

        const density = parseNumber(qInputs.density.val());
        const protein = parseNumber(qInputs.protein.val());
        const water = parseNumber(qInputs.water.val());

        // Density feedback
        if (density == null || !selected_milk) {
            setState(qInputs.density, null);
        } else {
            const r = ranges[selected_milk].density;
            if (density < r.min) setState(qInputs.density, 'q-bad');
            else if (density < r.warn[1]) setState(qInputs.density, 'q-warn');
            else if (density <= r.ok[1] && density >= r.ok[0]) setState(qInputs.density, 'q-ok');
            else if (density <= r.high_warn[1]) setState(qInputs.density, 'q-warn');
            else setState(qInputs.density, 'q-bad');
        }

        // Protein feedback
        if (protein == null || !selected_milk) {
            setState(qInputs.protein, null);
        } else {
            const r = ranges[selected_milk].protein;
            if (protein < r.min) setState(qInputs.protein, 'q-bad');
            else if (protein < r.ok[0]) setState(qInputs.protein, 'q-warn');
            else if (protein <= r.ok[1]) setState(qInputs.protein, 'q-ok');
            else setState(qInputs.protein, 'q-warn');
        }

        // Water heuristic: high water% or low density => warn
        if (water == null) {
            setState(qInputs.water, null);
        } else {
            if (water > 10) setState(qInputs.water, 'q-bad');
            else if (water > 5) setState(qInputs.water, 'q-warn');
            else setState(qInputs.water, 'q-ok');
        }
        if (enableWaterHeuristic && density != null) {
            const minD = ranges[selected_milk || 'Cow'].density.ok[0];
            if (density < minD && (water == null || water <= 5)) {
                // density is low but water not high -> caution
                setState(qInputs.water, 'q-warn');
            }
        }

        // Hardness and Pont: generic non-negative checks
        ['hardness', 'pont'].forEach(key => {
            const v = parseNumber(qInputs[key].val());
            if (v == null) setState(qInputs[key], null);
            else if (v < 0) setState(qInputs[key], 'q-bad');
            else setState(qInputs[key], 'q-ok');
        });
    }

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

        // Quality fields
        const density = parseNumber(qInputs.density.val());
        const hardness = parseNumber(qInputs.hardness.val());
        const protein = parseNumber(qInputs.protein.val());
        const pont = parseNumber(qInputs.pont.val());
        const water = parseNumber(qInputs.water.val());

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

        // Final range guards (server also validates)
        if (protein != null && (protein < 0 || protein > 100)) {
            frappe.msgprint("قيمة البروتين يجب أن تكون بين 0 و 100.");
            return;
        }
        if (water != null && (water < 0 || water > 100)) {
            frappe.msgprint("قيمة الماء يجب أن تكون بين 0 و 100.");
            return;
        }
        if (density != null && density < 0) {
            frappe.msgprint("قيمة الكثافة يجب أن تكون موجبة.");
            return;
        }
        if (hardness != null && hardness < 0) {
            frappe.msgprint("قيمة الصلابة يجب أن تكون موجبة.");
            return;
        }
        if (pont != null && pont < 0) {
            frappe.msgprint("قيمة Pont يجب أن تكون موجبة.");
            return;
        }

        frappe.call({
            method: 'milk.milk.page.car_collect.api.insert_car_collection',
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
                    driver_helper_name,
                    density,
                    hardness,
                    protein,
                    pont,
                    water
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
        $('#density').val('');
        $('#hardness').val('');
        $('#protein').val('');
        $('#pont').val('');
        $('#water').val('');
        selected_time = '';
        selected_milk = '';
        $('#time-buttons .toggle-btn, #milk-buttons .toggle-btn').removeClass('active');
        updateQualityHints();
        runQualityChecks();
    });

    // Initialize hints on load
    updateQualityHints();
};