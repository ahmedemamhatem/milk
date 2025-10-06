frappe.pages['car-collect'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'استلام سياره',
        single_column: true
    });

    // Styles with responsive 2-line layout on medium screens
    const styles = `
        <style>
            .car-collect-page { margin: 0; padding: 0; background: #f8f9fa; font-family: 'Inter', sans-serif; }
            .car-collect-page .car-form-container { max-width: 980px; margin: 28px auto; padding: 28px 22px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
            .car-collect-page .car-form-header { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 18px; color: #1e293b; letter-spacing: .8px; text-transform: uppercase; background: linear-gradient(to right, #2563eb, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .car-collect-page .car-form-section { display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; margin-bottom: 16px; }
            .car-collect-page .form-item { flex: 1; min-width: 260px; max-width: 420px; text-align: center; }
            .car-collect-page .form-item label { font-size: 15px; font-weight: 700; color: #2563eb; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
            .car-collect-page .form-item input, .car-collect-page .form-item select {
                width: 100%; padding: 11px 12px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 15px; background: #f8fafc; transition: all .25s ease;
            }
            .car-collect-page .form-item input:focus, .car-collect-page .form-item select:focus { border-color: #2563eb; background: white; box-shadow: 0 3px 10px rgba(37,99,235,0.2); }

            .car-collect-page .toggle-group { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
            .car-collect-page .toggle-btn { padding: 9px 14px; font-size: 14px; font-weight: 700; border: 2px solid #cbd5e1; border-radius: 12px; cursor: pointer; background: #f8fafc; color: #475569; transition: all .25s; }
            .car-collect-page .toggle-btn:hover { background: #e2e8f0; color: #2563eb; }
            .car-collect-page .toggle-btn.active { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; border-color: #1d4ed8; box-shadow: 0 5px 15px rgba(37,99,235,0.3); }

            .car-collect-page .actions { display: flex; justify-content: center; gap: 18px; margin-top: 18px; }
            .car-collect-page .btn { padding: 13px 28px; font-size: 16px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; transition: all .25s; text-transform: uppercase; }
            .car-collect-page .btn-primary { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; }
            .car-collect-page .btn-secondary { background: #e2e8f0; color: #475569; }

            /* Section title */
            .section-title { width: 100%; font-size: 18px; font-weight: 800; color: #1e293b; margin: 8px 0 6px; text-align: center; }
            .section-sub { width: 100%; font-size: 12px; color: #64748b; text-align: center; margin-bottom: 8px; }

            /* Quality block */
            .quality-header { display: flex; align-items: center; gap: 10px; justify-content: center; width: 100%; }
            .quality-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
            .quality-toggle input { width: 18px; height: 18px; }
            .quality-toggle span { font-weight: 700; color: #1e293b; }

            .quality-row {
                display: grid;
                grid-template-columns: repeat(5, minmax(140px, 1fr)); /* lg: one line */
                gap: 12px;
                align-items: end;
                justify-items: center; /* center items within cells */
                width: 100%;
            }
            .quality-item { text-align: center; width: 100%; max-width: 260px; }
            .quality-item label { font-size: 12px; font-weight: 700; color: #2563eb; margin-bottom: 4px; }
            .quality-input { padding: 8px 10px; font-size: 13px; border-radius: 10px; border: 2px solid #cbd5e1; background: #f8fafc; width: 100%; }
            .hidden { display: none !important; }
            .req label::after { content: " *"; color: #dc2626; font-weight: 900; }

            /* Medium screens: 3 + 2 centered (two lines) */
            @media (max-width: 991px) {
                .quality-row {
                    grid-template-columns: repeat(3, minmax(160px, 1fr));
                    justify-content: center;
                }
                /* Make last two center on second line by spanning phantom gaps if needed */
                .quality-item:nth-child(4),
                .quality-item:nth-child(5) {
                    /* nothing needed; grid auto-wrap centers via justify-items */
                }
            }

            /* Small screens: 2 per line */
            @media (max-width: 768px) {
                .quality-row {
                    grid-template-columns: repeat(2, minmax(140px, 1fr));
                }
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

                <div class="section-title">تفاصيل الجودة</div>
                <div class="section-sub">قم بتفعيل الحقول إذا أردت تسجيل القيم</div>

                <div class="car-form-section">
                    <div class="quality-header">
                        <label class="quality-toggle">
                            <input type="checkbox" id="quality_enabled" />
                            <span>اضافه جوده للاستلام</span>
                        </label>
                    </div>
                    <div id="quality_block" class="quality-row hidden" aria-label="Quality Values">
                        <div class="quality-item" data-key="density">
                            <label>الكثافة</label>
                            <input id="density" class="quality-input" type="number" />
                        </div>
                        <div class="quality-item" data-key="hardness">
                            <label>الصلابة</label>
                            <input id="hardness" class="quality-input" type="number"  />
                        </div>
                        <div class="quality-item" data-key="protein">
                            <label>بروتين (%)</label>
                            <input id="protein" class="quality-input" type="number"  />
                        </div>
                        <div class="quality-item" data-key="pont">
                            <label>البنط</label>
                            <input id="pont" class="quality-input" type="number"  />
                        </div>
                        <div class="quality-item" data-key="water">
                            <label>ماء (%)</label>
                            <input id="water" class="quality-input" type="number"  />
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
    });
    $('#milk-buttons').on('click', '.toggle-btn', function () {
        $('#milk-buttons .toggle-btn').removeClass('active');
        $(this).addClass('active');
        selected_milk = $(this).data('value');
    });

    // Quality checkbox behavior
    const $qualityEnabled = $('#quality_enabled');
    const $qualityBlock = $('#quality_block');
    const qIds = ['density','hardness','protein','pont','water'];
    const qInputs = Object.fromEntries(qIds.map(id => [id, $(`#${id}`)]));

    function setQualityRequired(isRequired) {
        $qualityBlock.find('.quality-item').toggleClass('req', isRequired);
        qIds.forEach(id => qInputs[id].prop('required', isRequired));
    }
    function clearQuality() { qIds.forEach(id => qInputs[id].val('')); }

    $qualityEnabled.on('change', function() {
        const enabled = $(this).is(':checked');
        if (enabled) {
            $qualityBlock.removeClass('hidden');
            setQualityRequired(true);
        } else {
            setQualityRequired(false);
            clearQuality();
            $qualityBlock.addClass('hidden');
        }
    });

    // Parse helper
    function parseNumber(val) {
        const v = String(val ?? '').trim();
        if (v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }

    // Save
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

        const qualityEnabled = $qualityEnabled.is(':checked');
        const density = parseNumber(qInputs.density.val());
        const hardness = parseNumber(qInputs.hardness.val());
        const protein = parseNumber(qInputs.protein.val());
        const pont = parseNumber(qInputs.pont.val());
        const water = parseNumber(qInputs.water.val());

        if (!driver || !warehouse || !quantity || !date) return frappe.msgprint("الرجاء تعبئة جميع الحقول المطلوبة.");
        if (!morning && !evening) return frappe.msgprint("الرجاء اختيار صباحاً أو مساءً.");
        if (!milk_type) return frappe.msgprint("الرجاء اختيار نوع الحليب.");

        if (qualityEnabled) {
            const missing = [];
            if (density == null) missing.push('الكثافة');
            if (hardness == null) missing.push('الصلابة');
            if (protein == null) missing.push('البروتين');
            if (pont == null) missing.push('Pont');
            if (water == null) missing.push('الماء');
            if (missing.length) return frappe.msgprint('الحقول التالية مطلوبة لقسم الجودة: ' + missing.join('، '));
            if (density < 0) return frappe.msgprint("قيمة الكثافة يجب أن تكون موجبة.");
            if (hardness < 0) return frappe.msgprint("قيمة الصلابة يجب أن تكون موجبة.");
            if (protein < 0 || protein > 100) return frappe.msgprint("قيمة البروتين يجب أن تكون بين 0 و 100.");
            if (pont < 0) return frappe.msgprint("قيمة Pont يجب أن تكون موجبة.");
            if (water < 0 || water > 100) return frappe.msgprint("قيمة الماء يجب أن تكون بين 0 و 100.");
        }

        const payload = {
            driver, warehouse, quantity, date, morning, evening, milk_type,
            driver_name, driver_helper_name,
            density: qualityEnabled ? density : null,
            hardness: qualityEnabled ? hardness : null,
            protein: qualityEnabled ? protein : null,
            pont: qualityEnabled ? pont : null,
            water: qualityEnabled ? water : null,
            quality_enabled: qualityEnabled ? 1 : 0
        };

        frappe.call({
            method: 'milk.milk.page.car_collect.api.insert_car_collection',
            args: { data: JSON.stringify(payload) },
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

    // Clear
    $(document).on('click', '#clear-btn', function () {
        driver_control.set_value('');
        warehouse_control.set_value(frappe.boot.user_defaults?.warehouse || '');
        date_control.set_value(frappe.datetime.get_today());
        $('#quantity').val('');
        $('#driver_name').val('');
        $('#driver_helper_name').val('');
        $('#quality_enabled').prop('checked', false).trigger('change');
        selected_time = '';
        selected_milk = '';
        $('#time-buttons .toggle-btn, #milk-buttons .toggle-btn').removeClass('active');
    });
};