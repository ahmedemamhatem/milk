frappe.provide("milk.fast_expense");

frappe.pages['fast-expense'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'مصروف',
    single_column: true
  });

  const $section = $(wrapper).find('.layout-main-section');
  $section.empty();

  const ui = `
    <div class="fxp" dir="rtl">
      <style>
        :root{
          --fxp-radius: 12px;
          --fxp-border: #e5e7eb;
          --fxp-border-hover: #c7cdd8;
          --fxp-focus: #2563eb;
          --fxp-muted: #6b7280;
          --fxp-bg: #f8fafc;
          --fxp-card: #ffffff;
          --fxp-danger: #ef4444;
          --fxp-success: #16a34a;
          --fxp-warn: #b45309;
          --fxp-text: #0f172a;
          --fxp-title: #111827;
        }
        .fxp{background:var(--fxp-bg);min-height:calc(100vh - 80px);margin:-15px;padding:14px 16px 20px;color:var(--fxp-text);font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,Arial,"Noto Sans Arabic","Noto Sans",sans-serif}
        .hdr{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;max-width:1100px;margin-inline:auto 12px}
        .title-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .title{font-size:24px;font-weight:800;color:var(--fxp-title)}
        .badge{font-size:12px;font-weight:800;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:4px 10px}
        .hint{font-size:12px;color:#475569;background:#fff;border:1px solid var(--fxp-border);border-radius:10px;padding:4px 8px}
        .tips{font-size:12px;color:var(--fxp-muted)}
        .cards{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr;gap:14px}
        .card{background:var(--fxp-card);border:1px solid var(--fxx-border, var(--fxp-border));border-radius:14px;box-shadow:0 8px 24px rgba(2,6,23,.06);padding:14px}
        .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .card-title{font-size:13px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:.25px}
        .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}

        /* Field layout */
        .c-date{grid-column:span 4}
        .c-mop{grid-column:span 4}
        .c-cost-center{grid-column:span 4}
        .c-category{grid-column:span 6}
        .c-amount{grid-column:span 3}
        .c-ref{grid-column:span 12}

        /* Field UI */
        .field{padding:6px}
        .field-label{font-size:12.5px;font-weight:800;color:#374151;margin-bottom:6px;text-align:right;display:flex;align-items:center;gap:8px}
        .field .control-label, .field label{display:none!important}
        .field .frappe-control, .field .control-input-wrapper, .field .input-with-feedback, .field .awesomplete, .field .awesomplete>input{width:100%;max-width:none;box-sizing:border-box}
        .field .frappe-control{display:block}
        .field .control-input-wrapper{position:relative;padding:0}
        .field .control-input, .field input, .field .awesomplete>input, .field .input-with-feedback{
          height:44px!important;min-height:44px!important;font-size:15px;background:#fff!important;color:var(--fxp-text)!important;border:1px solid var(--fxp-border)!important;border-radius:12px!important;transition:border-color .15s ease, box-shadow .15s ease}
        .field .control-input:hover, .field .input-with-feedback:hover, .field .awesomplete>input:hover{border-color:var(--fxp-border-hover)!important}
        .field .control-input:focus, .field .input-with-feedback:focus, .field .awesomplete>input:focus{border-color:var(--fxp-focus)!important;box-shadow:0 0 0 3px rgba(37,99,235,.15)!important;outline:none!important}
        .field.error .control-input, .field.error .awesomplete>input, .field.error .input-with-feedback{border-color: var(--fxp-danger)!important; box-shadow: 0 0 0 3px rgba(239,68,68,.12)!important}

        /* Large text area tweaks */
        .field.c-ref .control-input, .field.c-ref textarea.input-with-feedback {
          height:160px!important; min-height:160px!important; resize: vertical;
          line-height:1.6; padding-top:10px; padding-bottom:10px;
        }

        .help-hint{font-size:12px;color:#64748b;margin-top:4px}
        .help-hint .ok{color:var(--fxp-success);display:none}
        .help-hint .warn{color:var(--fxp-warn);display:none}

        /* Live summary pills */
        .pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
        .pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;border:1px solid var(--fxp-border);background:#fff;color:#111827}
        .pill .key{color:#6b7280}
        .pill .val{color:#111827}

        /* Totals widget */
        .totals{display:grid;grid-template-columns:repeat(12,1fr);gap:10px;margin-top:10px}
        .kv{grid-column:span 3;text-align:center;background:#fff;border:1px solid var(--fxp-border);border-radius:12px;padding:12px}
        .kv .k{font-size:11px;color:var(--fxp-muted);text-transform:uppercase}
        .kv .v{font-size:20px;font-weight:900;color:#111827}

        /* Actions */
        .actions{position:sticky; bottom:0; z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;max-width:1100px;margin:2px auto 0;padding-top:6px}
        .left-actions{display:flex;gap:8px;align-items:center}
        .btn{appearance:none;border-radius:12px;padding:11px 16px;font-weight:900;cursor:pointer;border:1px solid transparent}
        .btn-primary{background:#2563eb;border-color:#2563eb;color:#fff}
        .btn-primary:hover{background:#1e4fd7;border-color:#1e4fd7}
        .btn-secondary{background:#fff;border-color:var(--fxp-border);color:#111827}
        .kbd{background:#fff;border:1px solid var(--fxp-border);border-radius:8px;padding:6px 8px;font-size:12px;color:#6b7280}
        .progress{display:none;font-size:12px;color:#6b7280}
        .progress.show{display:inline}

        @media (max-width: 900px){
          .c-date{grid-column:span 6}
          .c-mop{grid-column:span 6}
          .c-cost-center{grid-column:span 12}
          .c-category{grid-column:span 12}
          .c-amount{grid-column:span 12}
          .c-ref{grid-column:span 12}
          .kv{grid-column:span 12}
        }
      </style>

      <div class="hdr">
        <div class="title-wrap">
          <div class="title"></div>
          <div class="badge" data-bind="status">جاهز</div>
          <div class="hint" data-bind="company_hint">--</div>
        </div>
        <div class="tips">Ctrl/⌘ + Enter للترحيل</div>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-header">
            <div class="card-title">البيانات</div>
            <div class="recent" data-bind="recent_wrap" style="display:none"></div>
          </div>
          <div class="grid">
            <div class="field c-date" data-wrap="posting_date">
              <div class="field-label">تاريخ القيد</div>
              <div data-field="posting_date"></div>
            </div>
            <div class="field c-mop" data-wrap="mode_of_payment">
              <div class="field-label">طريقة الدفع</div>
              <div data-field="mode_of_payment"></div>
              <div class="help-hint"><span class="warn" data-bind="mop_warn">--</span></div>
            </div>
            <div class="field c-cost-center" data-wrap="cost_center">
              <div class="field-label">مركز التكلفة</div>
              <div data-field="cost_center"></div>
            </div>
            <div class="field c-category" data-wrap="expense_category">
              <div class="field-label">
                تصنيف المصروف
                <span class="hint help-hint" style="border:none;padding:0;margin:0"><span class="ok" data-bind="acc_ok">--</span><span class="warn" data-bind="acc_warn">--</span></span>
              </div>
              <div data-field="expense_category"></div>
            </div>
            <div class="field c-amount" data-wrap="amount">
              <div class="field-label">المبلغ <span class="hint" data-bind="currency_hint">--</span></div>
              <div data-field="amount"></div>
            </div>
            <div class="field c-ref" data-wrap="remarks">
              <div class="field-label">ملاحظة/تفاصيل</div>
              <div data-field="remarks"></div>
            </div>
          </div>

          <div class="pills">
            <div class="pill"><span class="key">المبلغ:</span> <span class="val" data-bind="pill_amount">0.00</span></div>
            <div class="pill"><span class="key">الدفع:</span> <span class="val" data-bind="pill_mop">--</span></div>
            <div class="pill"><span class="key">التصنيف:</span> <span class="val" data-bind="pill_category">--</span></div>
            <div class="pill"><span class="key">مركز التكلفة:</span> <span class="val" data-bind="pill_cost_center">--</span></div>
            <div class="pill"><span class="key">التاريخ:</span> <span class="val" data-bind="pill_date">--</span></div>
          </div>

          <div class="totals">
            <div class="kv">
              <div class="k">المبلغ</div>
              <div class="v" data-bind="amount_preview">0.00</div>
            </div>
            <div class="kv">
              <div class="k">طريقة الدفع</div>
              <div class="v" data-bind="mop_preview">--</div>
            </div>
            <div class="kv">
              <div class="k">مركز التكلفة</div>
              <div class="v" data-bind="cost_center_preview">--</div>
            </div>
            <div class="kv">
              <div class="k">التاريخ</div>
              <div class="v" data-bind="date_preview">--</div>
            </div>
          </div>
        </div>

        <div class="actions">
          <div class="left-actions">
            <button class="btn btn-secondary" data-action="clear">تفريغ</button>
            <span class="kbd"></span>
            <span class="progress" data-bind="progress">•</span>
          </div>
          <div>
            <button class="btn btn-primary" data-action="submit">ترحيل</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ui = $(ui);
  $section.append($ui);

  // State
  const state = {
    company_currency: null,
    posting_date: frappe.datetime.get_today(),
    mode_of_payment: null,
    cost_center: null,
    expense_category: null,
    amount: 0,
    remarks: '',
    auto_note: false
  };

  // Binds
  const $status = $ui.find('[data-bind="status"]');
  const $company_hint = $ui.find('[data-bind="company_hint"]');
  const $amount_preview = $ui.find('[data-bind="amount_preview"]');
  const $mop_preview = $ui.find('[data-bind="mop_preview"]');
  const $cost_center_preview = $ui.find('[data-bind="cost_center_preview"]');
  const $date_preview = $ui.find('[data-bind="date_preview"]');
  const $pill_amount = $ui.find('[data-bind="pill_amount"]');
  const $pill_mop = $ui.find('[data-bind="pill_mop"]');
  const $pill_category = $ui.find('[data-bind="pill_category"]');
  const $pill_cost_center = $ui.find('[data-bind="pill_cost_center"]');
  const $pill_date = $ui.find('[data-bind="pill_date"]');
  const $progress = $ui.find('[data-bind="progress"]');
  const $acc_ok = $ui.find('[data-bind="acc_ok"]');
  const $acc_warn = $ui.find('[data-bind="acc_warn"]');
  const $mop_warn = $ui.find('[data-bind="mop_warn"]');
  const $currency_hint = $ui.find('[data-bind="currency_hint"]');

  // Buttons
  const $btn_submit = $ui.find('[data-action="submit"]');
  const $btn_clear = $ui.find('[data-action="clear"]');

  // Controls
  const controls = {};
  function Control(df, sel) {
    const Map = {
      Link: frappe.ui.form.ControlLink,
      Float: frappe.ui.form.ControlFloat,
      Currency: frappe.ui.form.ControlCurrency,
      Date: frappe.ui.form.ControlDate,
      Select: frappe.ui.form.ControlSelect,
      Data: frappe.ui.form.ControlData,
      SmallText: frappe.ui.form.ControlSmallText,
      Text: frappe.ui.form.ControlText // Large Text
    };
    const C = Map[df.fieldtype] || frappe.ui.form.ControlData;
    const ctrl = new C({ df, parent: $ui.find(sel)[0], render_input: true });
    if (ctrl.$input && df.placeholder) ctrl.$input.attr('placeholder', df.placeholder);
    if (df.change && ctrl.$input) ctrl.$input.on('change', df.change);
    return ctrl;
  }

  controls.posting_date = Control({
    fieldtype: 'Date',
    fieldname: 'posting_date',
    label: 'تاريخ القيد',
    default: state.posting_date,
    change: () => { state.posting_date = controls.posting_date.get_value(); update_previews(); if (state.auto_note) update_auto_note(); }
  }, '[data-field="posting_date"]');
  controls.posting_date.set_value(state.posting_date);

  controls.mode_of_payment = Control({
    fieldtype: 'Link',
    fieldname: 'mode_of_payment',
    label: 'طريقة الدفع',
    options: 'Mode of Payment',
    get_query: () => ({ filters: { enabled: 1 } }),
    change: async () => {
      state.mode_of_payment = controls.mode_of_payment.get_value();
      await refresh_mop_hint();
      update_previews();
      if (state.auto_note) update_auto_note();
    }
  }, '[data-field="mode_of_payment"]');

  controls.cost_center = Control({
    fieldtype: 'Link',
    fieldname: 'cost_center',
    label: 'مركز التكلفة',
    options: 'Cost Center',
    get_query: () => {
      const company = frappe.defaults.get_user_default('Company') || frappe.defaults.get_default('company');
      return company ? { filters: { is_group: 0, company } } : { filters: { is_group: 0 } };
    },
    change: () => {
      state.cost_center = controls.cost_center.get_value();
      update_previews();
    }
  }, '[data-field="cost_center"]');

  controls.expense_category = Control({
    fieldtype: 'Link',
    fieldname: 'expense_category',
    label: 'تصنيف المصروف',
    options: 'Expense Category',
    get_query: () => ({ filters: { disabled: 0 } }),
    change: async () => {
      state.expense_category = controls.expense_category.get_value();
      await refresh_category_hint();
      update_previews();
      if (state.auto_note) update_auto_note();
    }
  }, '[data-field="expense_category"]');

  controls.amount = Control({
    fieldtype: 'Currency',
    fieldname: 'amount',
    label: 'المبلغ',
    default: state.amount,
    change: () => {
      state.amount = flt_safe(controls.amount.get_value());
      update_previews();
      if (state.auto_note) update_auto_note();
    }
  }, '[data-field="amount"]');
  controls.amount.set_value(state.amount);

  // Large Text Note
  controls.remarks = Control({
    fieldtype: 'Text', // Large Text
    fieldname: 'remarks',
    label: 'ملاحظة/تفاصيل',
    placeholder: 'اكتب تفاصيل المصروف هنا...',
    change: () => { state.remarks = controls.remarks.get_value(); }
  }, '[data-field="remarks"]');

  init_context();

  async function init_context() {
    try {
      const default_company = frappe.defaults.get_user_default('Company') || frappe.defaults.get_default('company');
      if (default_company) {
        const c = await frappe.call({
          method: 'frappe.client.get_value',
          args: { doctype: 'Company', filters: { name: default_company }, fieldname: ['default_currency', 'cost_center'] }
        });
        state.company_currency = c.message && c.message.default_currency || null;
        $company_hint.text(`العملة: ${state.company_currency || '--'}`);
        $currency_hint.text(state.company_currency || '');
        if (c.message && c.message.cost_center && controls.cost_center) {
          controls.cost_center.set_value(c.message.cost_center);
          state.cost_center = c.message.cost_center;
        }
      } else {
        $company_hint.text('--');
        $currency_hint.text('');
      }
      update_previews();
    } catch {
      // non-fatal
    }
  }

  async function refresh_mop_hint() {
    $mop_warn.hide();
    if (!state.mode_of_payment) return;
    try {
      const mop = await frappe.call({
        method: 'frappe.client.get',
        args: { doctype: 'Mode of Payment', name: state.mode_of_payment }
      });
      if (!mop.message || mop.message.disabled) {
        $mop_warn.text('طريقة الدفع غير مفعّلة').show();
      }
    } catch {
      $mop_warn.text('تعذر التحقق من طريقة الدفع').show();
    }
  }

  async function refresh_category_hint() {
    $acc_ok.hide(); $acc_warn.hide();
    if (!state.expense_category) return;
    try {
      const r = await frappe.call({
        method: 'milk.milk.page.fast_expense.api.peek_expense_account',
        args: { expense_category: state.expense_category }
      });
      const acc = (r.message && r.message.account) || null;
      if (acc) {
        $acc_ok.text(`سيتم استخدام حساب: ${acc}`).show();
      } else {
        $acc_warn.text('لم يتم العثور على حساب للمصروف، سيتم استخدام افتراضي الشركة إن وجد').show();
      }
    } catch {
      $acc_warn.text('تعذر تحديد حساب المصروف').show();
    }
  }

  // Helpers
  function flt_safe(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
  function fmt(n) { const x = Number(n); return (isFinite(x) ? x : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function update_previews() {
    const amt = fmt(state.amount || 0) + (state.company_currency ? ` ${state.company_currency}` : '');
    $amount_preview.text(amt);
    $mop_preview.text(state.mode_of_payment || '--');
    $cost_center_preview.text(state.cost_center || '--');
    $date_preview.text(state.posting_date || '--');

    $pill_amount.text(amt);
    $pill_mop.text(state.mode_of_payment || '--');
    $pill_category.text(state.expense_category || '--');
    $pill_cost_center.text(state.cost_center || '--');
    $pill_date.text(state.posting_date || '--');
  }
  update_previews();

  function mark_error(key, msg) {
    const wrap = $ui.find('.field[data-wrap="'+key+'"]');
    wrap.addClass('error');
    if (msg) frappe.show_alert({ message: msg, indicator: 'red' });
    const ctrl = controls[key];
    if (ctrl && ctrl.$input) setTimeout(()=>ctrl.$input.focus(), 10);
    return msg || 'error';
  }
  function clear_errors(){ $ui.find('.field.error').removeClass('error'); }

  function validate() {
    clear_errors();
    if (!state.posting_date) return mark_error('posting_date', 'اختار تاريخ القيد');
    if (!state.mode_of_payment) return mark_error('mode_of_payment', 'اختار طريقة الدفع');
    if (!state.expense_category) return mark_error('expense_category', 'اختار تصنيف المصروف');
    if (!state.amount || state.amount <= 0) return mark_error('amount', 'لازم المبلغ يكون أكبر من صفر');
    return null;
  }

  function success_dialog(doc) {
    const d = new frappe.ui.Dialog({
      title: 'تم تسجيل المصروف',
      primary_action_label: 'إغلاق',
      primary_action: () => { d.hide(); clear_form(); }
    });
    const open_expense = () => frappe.set_route('Form', 'Expense', doc.name);
    const open_je = () => doc.journal_entry && frappe.set_route('Form', 'Journal Entry', doc.journal_entry);

    const html = `
      <div dir="rtl" style="line-height:1.7">
        <div style="font-weight:800;color:#065f46;margin-bottom:6px">تم إنشاء واعتماد المصروف بنجاح</div>
        <ul style="margin:0 0 10px 0;padding-inline-start:18px">
          <li><b>المستند:</b> ${frappe.utils.escape_html(doc.name || '')}</li>
          <li><b>التاريخ:</b> ${frappe.utils.escape_html(doc.posting_date || state.posting_date)}</li>
          <li><b>التصنيف:</b> ${frappe.utils.escape_html(doc.expense_category || state.expense_category)}</li>
          <li><b>طريقة الدفع:</b> ${frappe.utils.escape_html(doc.mode_of_payment || state.mode_of_payment || '')}</li>
          <li><b>مركز التكلفة:</b> ${frappe.utils.escape_html(doc.cost_center || state.cost_center || '--')}</li>
          <li><b>المبلغ:</b> ${fmt(doc.amount || state.amount)} ${state.company_currency || ''}</li>
        </ul>
        <div style="white-space:pre-wrap;margin:10px 0 6px 0"><b>الملاحظة:</b> ${frappe.utils.escape_html(state.remarks || '')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" data-act="open-expense">فتح المستند</button>
          ${doc.journal_entry ? '<button class="btn btn-secondary" data-act="open-je">فتح القيد</button>' : ''}
        </div>
      </div>
    `;
    d.$body.html(html);
    d.$body.find('[data-act="open-expense"]').on('click', ()=>{ d.hide(); open_expense(); });
    if (doc.journal_entry) d.$body.find('[data-act="open-je"]').on('click', ()=>{ d.hide(); open_je(); });
    d.show();
  }

  function update_auto_note() {
    const parts = [];
    if (state.expense_category) parts.push(`مصروف ${state.expense_category}`);
    if (state.mode_of_payment) parts.push(`(${state.mode_of_payment})`);
    if (state.amount) parts.push(`${fmt(state.amount)}${state.company_currency ? ' ' + state.company_currency : ''}`);
    if (state.cost_center) parts.push(`مركز تكلفة: ${state.cost_center}`);
    if (state.posting_date) parts.push(`بتاريخ ${state.posting_date}`);
    const note = parts.join(' - ');
    controls.remarks.set_value(note);
    state.remarks = note;
  }

  async function submit_expense() {
    const err = validate();
    if (err) return;

    try {
      toggle_progress(true);
      $btn_submit.prop('disabled', true);
      frappe.dom.freeze('جاري إنشاء المصروف...');

      const r = await frappe.call({
        method: 'milk.milk.page.fast_expense.api.make_fast_expense',
        args: {
          posting_date: state.posting_date,
          mode_of_payment: state.mode_of_payment,
          expense_category: state.expense_category,
          amount: state.amount,
          remarks: state.remarks || '',
          cost_center: state.cost_center || null
        }
      });
      const out = r.message || {};
      if (out.error) {
        frappe.msgprint({ title: 'تنبيه', message: out.error, indicator: 'orange' });
        return;
      }
      if (out.name) {
        $status.text('تم الإنشاء');
        success_dialog(out);
      } else {
        frappe.show_alert({ message: 'لم يتم إنشاء مستند.', indicator: 'orange' });
      }
    } catch (e) {
      console.error(e);
      frappe.msgprint({ title: 'خطأ', message: e.message || String(e), indicator: 'red' });
      $status.text('خطأ');
    } finally {
      frappe.dom.unfreeze();
      $btn_submit.prop('disabled', false);
      toggle_progress(false);
    }
  }

  function toggle_progress(show) {
    $progress.toggleClass('show', !!show);
    $progress.text(show ? '... جاري التنفيذ' : '•');
  }

  function clear_form() {
    const today = frappe.datetime.get_today();
    state.posting_date = today;
    state.mode_of_payment = null;
    state.cost_center = null;
    state.expense_category = null;
    state.amount = 0;
       state.remarks = '';
    state.auto_note = false;

    controls.posting_date.set_value(today);
    controls.mode_of_payment.set_value('');
    controls.cost_center.set_value('');
    controls.expense_category.set_value('');
    controls.amount.set_value(0);
    controls.remarks.set_value('');

    update_previews();
    clear_errors();
    $status.text('جاهز');
    if (controls.mode_of_payment && controls.mode_of_payment.$input) {
      setTimeout(()=>controls.mode_of_payment.$input.focus(), 10);
    }
  }

  const order = [
    controls.posting_date, controls.mode_of_payment, controls.cost_center,
    controls.expense_category, controls.amount, controls.remarks
  ].filter(Boolean);

  $btn_submit.on('click', submit_expense);
  $btn_clear.on('click', clear_form);

  order.forEach((c,i)=>{
    const next = order[i+1];
    if (c.$input) {
      c.$input.on('keydown', e=>{
        if (e.key === 'Enter') {
          e.preventDefault();
          if (next && next.$input) next.$input.focus(); else $btn_submit.click();
        }
      });
    }
  });
  $(document).on('keydown.fastxp', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $btn_submit.click();
  });
  $(wrapper).on('remove', function () { $(document).off('keydown.fastxp'); });
};