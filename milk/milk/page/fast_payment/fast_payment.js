frappe.provide("milk.fast_payment");

frappe.pages['fast-payment'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'دفعة ',
    single_column: true
  });
  document.title = " تسجيل دفعات ";
  const $section = $(wrapper).find('.layout-main-section');
  $section.empty();

  const ui_html = `
    <div class="fast-pay-full" dir="rtl">
      <style>
        :root{
          --p-radius: 12px;
          --p-border: #d9dee7;
          --p-border-hover: #b9c2d0;
          --p-focus: #2563eb;
          --p-muted: #6b7280;
          --p-bg: #f8fafc;
          --p-card: #ffffff;
          --p-danger: #ef4444;
          --p-success: #16a34a;
          --p-text: #0f172a;
          --p-title: #111827;
        }
        .fast-pay-full{
          background: var(--p-bg);
          min-height: calc(100vh - 80px);
          margin: -15px;
          padding: 14px 16px 20px;
          color: var(--p-text);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: "Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif;
        }

        /* Header */
        .fastpay-header{
          display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;
          max-width:1280px;margin-inline:auto 12px;
        }
        .fastpay-title-wrap{display:flex;align-items:center;gap:10px}
        .fastpay-title{font-size:24px;font-weight:800;color:var(--p-title)}
        .status-badge{
          font-size:12px;font-weight:700;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:4px 10px
        }

        /* Layout */
        .fastpay-sections{max-width:1280px;margin:0 auto}
        .section{
          background: var(--p-card);
          border: 1px solid var(--p-border);
          border-radius: var(--p-radius);
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
          padding: 14px;
          margin-bottom: 14px;
        }
        .section-title{
          display:flex;align-items:center;justify-content:space-between;
          font-size:12px;font-weight:800;color:var(--p-muted);text-transform:uppercase;letter-spacing:.25px;margin-bottom:8px
        }
        .section-title .subtitle{font-size:11px;font-weight:700;color:#9ca3af;text-transform:none}
        .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}

        /* Field spans */
        .ptype{grid-column:span 3}
        .partytype{grid-column:span 3}
        .pdate{grid-column:span 3}
        .mop{grid-column:span 3}
        .party{grid-column:span 8}
        .amount{grid-column:span 4}
        .ref{grid-column:span 12}
        .opts{grid-column:span 12}
        .totals{grid-column:span 12; display:flex; gap:10px; flex-wrap:wrap}

        /* Key-Value cards */
        .kv{flex:1 1 220px;text-align:center;background:#fff;border:1px solid var(--p-border);border-radius:12px;padding:10px}
        .kv .k{font-size:11px;color:var(--p-muted);text-transform:uppercase}
        .kv .v{font-size:20px;font-weight:900;color:#111827}

        /* Actions */
        .actionbar{
          position:sticky; bottom:0; background:transparent; z-index:5;
          max-width:1280px;margin:12px auto 0;display:flex;justify-content:space-between;gap:10px;
        }
        .action-left{display:flex;align-items:center;gap:10px}
        .action-right{display:flex;gap:10px}
        .btn{
          appearance:none; border-radius:12px; padding:11px 16px; font-weight:800; cursor:pointer; border:1px solid transparent;
          transition:transform .05s ease, background .15s ease, border-color .15s ease, color .15s ease;
        }
        .btn-primary{background:#2563eb;border-color:#2563eb;color:#fff}
        .btn-primary:hover{background:#1e4fd7;border-color:#1e4fd7}
        .btn-primary:active{transform:translateY(1px)}
        .btn-secondary{background:#fff;border-color:var(--p-border);color:#111827}
        .btn-secondary:hover{border-color:var(--p-border-hover)}
        .btn[disabled]{opacity:.6;cursor:not-allowed}

        /* Field UI */
        .field{padding:6px;border-radius:var(--p-radius);overflow:visible}
        .field-label{font-size:12.5px;font-weight:800;color:#374151;margin-bottom:6px;text-align:right;display:flex;align-items:center;gap:6px}
        .field-label .hint{font-size:11px;color:var(--p-muted);font-weight:700}
        .field .control-label, .field label{display:none!important}
        .field .frappe-control, .field .control-input-wrapper, .field .input-with-feedback, .field .awesomplete, .field .awesomplete>input{width:100%;max-width:none;box-sizing:border-box}
        .field .frappe-control{display:block}
        .field .control-input-wrapper{position:relative;padding:0}
        .field .control-input, .field input, .field .awesomplete>input, .field .input-with-feedback{
          height:44px!important;min-height:44px!important;font-size:15px;background:#fff!important;color:var(--p-text)!important;
          border:1px solid var(--p-border)!important;border-radius:12px!important;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .field .control-input:hover, .field .input-with-feedback:hover, .field .awesomplete>input:hover{border-color:var(--p-border-hover)!important}
        .field .control-input:focus, .field .input-with-feedback:focus, .field .awesomplete>input:focus{
          border-color:var(--p-focus)!important;box-shadow:0 0 0 3px rgba(37,99,235,.15)!important;outline:none!important;
        }
        .field.error .control-input, .field.error .awesomplete>input, .field.error .input-with-feedback{
          border-color: var(--p-danger)!important; box-shadow: 0 0 0 3px rgba(239,68,68,.12)!important;
        }

        /* Inline hint row under MoP */
        .mop-hint{font-size:12px;margin-top:4px}
        .mop-hint .ok{color:var(--p-success);display:none}
        .mop-hint .warn{color:#b45309;display:none}

        @media (max-width: 1100px){
          .ptype{grid-column:span 6}
          .partytype{grid-column:span 6}
          .pdate{grid-column:span 6}
          .mop{grid-column:span 6}
          .party{grid-column:span 12}
          .amount{grid-column:span 12}
          .ref{grid-column:span 12}
          .opts{grid-column:span 12}
          .actionbar{position:sticky; bottom:0; padding:8px 0}
        }
      </style>

      <div class="fastpay-header">
        <div class="fastpay-title-wrap">
          <div class="fastpay-title"></div>
          <div class="status-badge" data-bind="status">جاهز</div>
        </div>
        <div class="pill muted">Ctrl/⌘ + Enter للترحيل</div>
      </div>

      <div class="fastpay-sections">
        <!-- Basic -->
        <div class="section">
          <div class="section-title">
            <div>البيانات الأساسية</div>
            <div class="subtitle">حدّد نوع الحركة والطرف والتاريخ</div>
          </div>
          <div class="grid">
            <div class="field ptype" data-wrap="payment_type">
              <div class="field-label">نوع الحركة <span class="hint">تحصيل/صرف</span></div>
              <div data-field="payment_type"></div>
            </div>
            <div class="field partytype" data-wrap="party_type">
              <div class="field-label">نوع الطرف</div>
              <div data-field="party_type"></div>
            </div>
            <div class="field pdate" data-wrap="posting_date">
              <div class="field-label">تاريخ القيد</div>
              <div data-field="posting_date"></div>
            </div>
            <div class="field mop" data-wrap="mode_of_payment">
              <div class="field-label">طريقة الدفع</div>
              <div data-field="mode_of_payment"></div>
              <div class="mop-hint">
                <span class="ok">تم العثور على حساب طريقة الدفع للشركة</span>
                <span class="warn">لا يوجد حساب لطريقة الدفع للشركة (سيتم استخدام بديل إن سمح)</span>
              </div>
            </div>
            <div class="field party" data-wrap="party">
              <div class="field-label">الطرف</div>
              <div data-field="party"></div>
            </div>
            <div class="field amount" data-wrap="paid_amount">
              <div class="field-label">المبلغ</div>
              <div data-field="paid_amount"></div>
            </div>
            <div class="field ref" data-wrap="reference_no">
              <div class="field-label">مرجع/ملاحظة</div>
              <div data-field="reference_no"></div>
            </div>
            <div class="field opts" data-wrap="options">
              <label class="pill" style="cursor:pointer;user-select:none">
                <input type="checkbox" data-field="require_mop_account" style="accent-color:#2563eb;width:16px;height:16px;margin:0 0 0 0">
                إلزام وجود حساب لطريقة الدفع
              </label>
            </div>
            <div class="totals">
              <div class="kv">
                <div class="k">المبلغ</div>
                <div class="v" data-bind="amount_preview">0.00</div>
              </div>
              <div class="kv">
                <div class="k">نوع الطرف</div>
                <div class="v" data-bind="partytype_preview">عميل</div>
              </div>
              <div class="kv">
                <div class="k">طريقة الدفع</div>
                <div class="v" data-bind="mop_preview">—</div>
              </div>
              <div class="kv">
                <div class="k">تاريخ القيد</div>
                <div class="v" data-bind="date_preview">—</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actionbar">
          <div class="action-left">
            <button class="btn btn-secondary" data-action="clear">تفريغ</button>
          </div>
          <div class="action-right">
            <button class="btn btn-primary" data-action="submit">ترحيل</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ui = $(ui_html);
  $section.append($ui);

  // State
  const state = {
    payment_type: 'Receive', // Receive (تحصيل) or Pay (صرف)
    party_type: 'Customer',  // Customer or Supplier
    party: null,
    posting_date: frappe.datetime.get_today(),
    mode_of_payment: null,
    paid_amount: 0,
    reference_no: '',
    require_mop_account: 0
  };

  // Binds
  const $status = $ui.find('[data-bind="status"]');
  const $amount_preview = $ui.find('[data-bind="amount_preview"]');
  const $partytype_preview = $ui.find('[data-bind="partytype_preview"]');
  const $mop_preview = $ui.find('[data-bind="mop_preview"]');
  const $date_preview = $ui.find('[data-bind="date_preview"]');

  // Buttons (declare once!)
  const $btn_submit = $ui.find('[data-action="submit"]');
  const $btn_clear = $ui.find('[data-action="clear"]');

  // Controls factory
  const controls = {};
  function Control(df, sel) {
    const Map = {
      Link: frappe.ui.form.ControlLink,
      Float: frappe.ui.form.ControlFloat,
      Currency: frappe.ui.form.ControlCurrency,
      Date: frappe.ui.form.ControlDate,
      Select: frappe.ui.form.ControlSelect,
      Data: frappe.ui.form.ControlData
    };
    const C = Map[df.fieldtype] || frappe.ui.form.ControlData;
    const ctrl = new C({ df, parent: $ui.find(sel)[0], render_input: true });
    if (ctrl.$input && df.placeholder) {
      ctrl.$input.attr('placeholder', df.placeholder);
    }
    return ctrl;
  }

  // Controls
  controls.payment_type = Control({
    fieldtype: 'Select',
    fieldname: 'payment_type',
    label: 'نوع الحركة',
    options: 'Receive\nPay',
    default: state.payment_type,
    change: () => {
      state.payment_type = controls.payment_type.get_value();
      auto_adjust_party_type();
      update_previews();
    }
  }, '[data-field="payment_type"]');
  controls.payment_type.set_value(state.payment_type);

  controls.party_type = Control({
    fieldtype: 'Select',
    fieldname: 'party_type',
    label: 'نوع الطرف',
    options: 'Customer\nSupplier',
    default: state.party_type,
    change: () => {
      state.party_type = controls.party_type.get_value();
      setup_party_query();
      controls.party.set_value('');
      state.party = null;
      update_previews();
    }
  }, '[data-field="party_type"]');
  controls.party_type.set_value(state.party_type);

  controls.posting_date = Control({
    fieldtype: 'Date',
    fieldname: 'posting_date',
    label: 'تاريخ القيد',
    default: state.posting_date,
    change: () => { state.posting_date = controls.posting_date.get_value(); update_previews(); }
  }, '[data-field="posting_date"]');
  controls.posting_date.set_value(state.posting_date);

  // MoP field with inline hint check (async on change)
  const $mop_hint_ok = $ui.find('.mop-hint .ok');
  const $mop_hint_warn = $ui.find('.mop-hint .warn');

  controls.mode_of_payment = Control({
    fieldtype: 'Link',
    fieldname: 'mode_of_payment',
    label: 'طريقة الدفع',
    options: 'Mode of Payment',
    get_query: () => ({ filters: { enabled: 1 } }),
    change: async () => { 
      state.mode_of_payment = controls.mode_of_payment.get_value(); 
      $mop_preview.text(state.mode_of_payment || '—');
      await check_mop_account_hint();
    }
  }, '[data-field="mode_of_payment"]');

  controls.party = Control({
    fieldtype: 'Link',
    fieldname: 'party',
    label: 'الطرف',
    options: state.party_type,
    reqd: 1,
    placeholder: 'اختر الطرف...',
    get_query: () => ({ filters: { disabled: 0 } }),
    change: () => { state.party = controls.party.get_value(); }
  }, '[data-field="party"]');

  function setup_party_query() {
    if (!controls.party) return;
    controls.party.df.options = state.party_type;
    controls.party.refresh();
  }
  setup_party_query();

  controls.paid_amount = Control({
    fieldtype: 'Currency',
    fieldname: 'paid_amount',
    label: 'المبلغ',
    default: state.paid_amount,
    change: () => { 
      state.paid_amount = flt_safe(controls.paid_amount.get_value()) || 0; 
      refresh_totals(); 
    }
  }, '[data-field="paid_amount"]');
  controls.paid_amount.set_value(state.paid_amount);

  controls.reference_no = Control({
    fieldtype: 'Data',
    fieldname: 'reference_no',
    label: 'مرجع/ملاحظة',
    default: state.reference_no,
    placeholder: 'اختياري...',
    change: () => { state.reference_no = controls.reference_no.get_value(); }
  }, '[data-field="reference_no"]');

  // Require MoP account toggle
  const $require_mop_account = $ui.find('input[data-field="require_mop_account"]');
  $require_mop_account.on('change', function() {
    state.require_mop_account = this.checked ? 1 : 0;
    check_mop_account_hint(); // re-check
  });

  // Helpers
  function flt_safe(v) {
    if (frappe.utils && frappe.utils.flt) return frappe.utils.flt(v);
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function format_num(n) {
    let x = Number(n);
    if (!isFinite(x)) x = 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function refresh_totals() {
    const amt = flt_safe(state.paid_amount) || 0;
    $amount_preview.text(format_num(amt));
  }

  function update_previews() {
    $partytype_preview.text(state.party_type === 'Customer' ? 'عميل' : 'مورد');
    $mop_preview.text(state.mode_of_payment || '—');
    $date_preview.text(state.posting_date || '—');
    refresh_totals();
  }
  update_previews();

  function mark_error(field_wrap_key, msg) {
    const wrap = $ui.find('.field[data-wrap="' + field_wrap_key + '"]');
    wrap.addClass('error');
    if (msg) frappe.show_alert({ message: msg, indicator: 'red' });
    const ctrl = controls[field_wrap_key];
    if (ctrl && ctrl.$input) setTimeout(function(){ ctrl.$input.focus(); }, 10);
    return msg || 'error';
  }

  function clear_errors() { $ui.find('.field.error').removeClass('error'); }

  function validate() {
    clear_errors();
    if (!state.payment_type) return mark_error('payment_type', 'اختار نوع الحركة');
    if (!state.party_type) return mark_error('party_type', 'اختار نوع الطرف');
    if (!state.posting_date) return mark_error('posting_date', 'اختار تاريخ القيد');
    if (!state.mode_of_payment) return mark_error('mode_of_payment', 'اختار طريقة الدفع');
    if (!state.party) return mark_error('party', 'اختار الطرف');
    if (!state.paid_amount || state.paid_amount <= 0) return mark_error('paid_amount', 'لازم المبلغ يكون أكبر من صفر');
    return null;
  }

  function auto_adjust_party_type() {
    if (state.payment_type === 'Receive' && state.party_type !== 'Customer') {
      state.party_type = 'Customer';
      controls.party_type.set_value('Customer');
      setup_party_query();
      controls.party.set_value('');
      state.party = null;
    } else if (state.payment_type === 'Pay' && state.party_type !== 'Supplier') {
      state.party_type = 'Supplier';
      controls.party_type.set_value('Supplier');
      setup_party_query();
      controls.party.set_value('');
      state.party = null;
    }
  }

  async function check_mop_account_hint() {
    // Optional: ping a lightweight method to verify MoP account availability
    // If you don't want extra roundtrips, you can omit this.
    $mop_hint_ok.hide();
    $mop_hint_warn.hide();
    if (!state.mode_of_payment) return;

    try {
      const r = await frappe.call({
        method: 'frappe.client.get',
        args: { doctype: 'Mode of Payment', name: state.mode_of_payment }
      });
      const mop = r.message || {};
      const company = frappe.defaults.get_default('company') || null;
      let has_acc = false;
      if (mop && Array.isArray(mop.accounts) && company) {
        has_acc = mop.accounts.some(a => a.company === company && (a.default_account || a.account));
      }
      if (has_acc) $mop_hint_ok.show();
      else $mop_hint_warn.show();
    } catch (e) {
      // Silent
    }
  }

  // Helper: success dialog with Close action that clears the page
function create_success_dialog({ pe_name, payment_type, party_type, party, amount, mop, date }) {
  const dir = 'rtl';
  const msg_html = `
    <div dir="${dir}" style="line-height:1.7">
      <div style="font-weight:800;color:#065f46;margin-bottom:6px">تم ترحيل الدفعة بنجاح</div>
      <ul style="margin:0;padding-inline-start:18px">
        <li><b>المستند:</b> ${frappe.utils.escape_html(pe_name)}</li>
        <li><b>النوع:</b> ${payment_type === 'Receive' ? 'تحصيل' : 'صرف'}</li>
        <li><b>الطرف:</b> ${party_type === 'Customer' ? 'عميل' : 'مورد'} — ${frappe.utils.escape_html(party)}</li>
        <li><b>المبلغ:</b> ${Number(amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</li>
        <li><b>طريقة الدفع:</b> ${frappe.utils.escape_html(mop || '—')}</li>
        <li><b>تاريخ القيد:</b> ${frappe.utils.escape_html(date || '')}</li>
      </ul>
    </div>
  `;

  const d = new frappe.ui.Dialog({
    title: 'نجاح',
    primary_action_label: 'إغلاق',
    primary_action: () => {
      d.hide();
      clear_form_fast(); // clears and resets the page
    }
  });
  d.$body.html(msg_html);
  d.show();
}

// Submit payment with enhanced success handling
async function submit_payment() {
  const err = validate();
  if (err) return;

  try {
    $btn_submit.prop('disabled', true);
    frappe.dom.freeze('جاري ترحيل الدفعة...');
    const r = await frappe.call({
      method: 'milk.milk.page.fast_payment.api.make_fast_payment',
      args: {
        payment_type: state.payment_type,
        party_type: state.party_type,
        party: state.party,
        posting_date: state.posting_date,
        mode_of_payment: state.mode_of_payment,
        paid_amount: state.paid_amount,
        reference_no: state.reference_no || '',
        require_mop_account: state.require_mop_account
      }
    });
    const out = r.message || {};
    if (out.payment_entry) {
      $status.text('تم الإنشاء');
      // Show detailed message with Close button; on close, clear the page
      create_success_dialog({
        pe_name: out.payment_entry,
        payment_type: state.payment_type,
        party_type: state.party_type,
        party: state.party,
        amount: state.paid_amount,
        mop: state.mode_of_payment,
        date: state.posting_date
      });
    } else {
      frappe.show_alert({ message: 'مافيش مستند اتعمل.', indicator: 'orange' });
    }
  } catch (e) {
    console.error(e);
    frappe.msgprint({ title: 'خطأ', message: e.message || String(e), indicator: 'red' });
    $status.text('خطأ');
  } finally {
    frappe.dom.unfreeze();
    $btn_submit.prop('disabled', false);
  }
}

  function clear_form_fast() {
    const today = frappe.datetime.get_today();
    state.payment_type = 'Receive';
    state.party_type = 'Customer';
    state.party = null;
    state.posting_date = today;
    state.mode_of_payment = null;
    state.paid_amount = 0;
    state.reference_no = '';
    state.require_mop_account = 0;

    controls.payment_type.set_value(state.payment_type);
    controls.party_type.set_value(state.party_type);
    setup_party_query();
    controls.party.set_value('');
    controls.posting_date.set_value(today);
    controls.mode_of_payment.set_value('');
    controls.paid_amount.set_value(0);
    controls.reference_no.set_value('');
    $require_mop_account.prop('checked', false);

    update_previews();
    if (controls.party && controls.party.$input) {
      setTimeout(function(){ controls.party.$input.focus(); }, 10);
    }
    $status.text('جاهز');
    clear_errors();
    $mop_hint_ok.hide();
    $mop_hint_warn.hide();
  }

  // Wire buttons
  $btn_submit.on('click', submit_payment);
  $btn_clear.on('click', clear_form_fast);

  // Tab order + Enter to move next
  const order = [
    controls.payment_type, controls.party_type, controls.posting_date,
    controls.mode_of_payment, controls.party, controls.paid_amount, controls.reference_no
  ].filter(x => !!x);
  order.forEach((c, i) => {
    const next = order[i + 1];
    if (c.$input) {
      c.$input.on('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (next && next.$input) next.$input.focus();
          else $btn_submit.focus();
        }
      });
    }
  });

  // Ctrl+Enter submit
  $(document).on('keydown.fastpay', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      $btn_submit.click();
    }
  });
  $(wrapper).on('remove', function () {
    $(document).off('keydown.fastpay');
  });
};