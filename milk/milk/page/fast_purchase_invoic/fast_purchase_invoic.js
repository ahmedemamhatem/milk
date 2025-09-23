frappe.provide("milk.fast_purchase_invoic");

frappe.pages['fast-purchase-invoic'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'فاتورة مشتريات',
    single_column: true
  });

  const $section = $(wrapper).find('.layout-main-section');
  $section.empty();

  // UI
  const ui_html = `
    <div class="fast-pi-full" dir="rtl">
      <style>
        :root{
          --pi-radius: 12px;
          --pi-border: #d9dee7;
          --pi-border-hover: #b9c2d0;
          --pi-focus: #2563eb;
          --pi-muted: #6b7280;
          --pi-bg: #f8fafc;
          --pi-card: #ffffff;
          --pi-line: #e5e7eb;
          --pi-danger: #ef4444;
        }

        .fast-pi-full{
          background: var(--pi-bg);
          min-height: calc(100vh - 80px);
          margin: -15px;
          padding: 14px 16px 20px;
          color: #0f172a;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: "Tajawal", "Cairo", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", "Noto Sans", sans-serif;
          letter-spacing: .1px;
        }

        /* Header */
        .fastpi-header{
          display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;
          max-width:1280px;margin-inline:auto 12px;
        }
        .fastpi-title{font-size:24px;font-weight:800;color:#111827}
        .fastpi-status{font-size:12px;color:var(--pi-muted)}

        /* Sections container */
        .fastpi-sections{max-width:1280px;margin:0 auto}

        /* Sections as soft cards */
        .section{
          background: var(--pi-card);
          border: 1px solid var(--pi-border);
          border-radius: var(--pi-radius);
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
          padding: 14px;
          margin-bottom: 14px;
        }
        .section-title{font-size:12px;font-weight:800;color:var(--pi-muted);text-transform:uppercase;letter-spacing:.25px;margin-bottom:8px}

        /* Grid */
        .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
        .supplier{grid-column:span 8}
        .pdate{grid-column:span 4}
        .item{grid-column:span 6}
        .qty{grid-column:span 2}
        .rate{grid-column:span 2}
        .wh{grid-column:span 2}
        .paid{grid-column:span 4}
        .mop{grid-column:span 4}
        .totals{
          grid-column:span 4;
          display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:center;
        }

        /* Field card */
        .field{
          padding:6px;
          border-radius:var(--pi-radius);
          background: transparent;
          overflow: visible; /* avoid dropdown clipping */
        }
        .field-label{
          font-size:12.5px;font-weight:800;color:#374151;margin-bottom:6px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;
        }
        .field .control-label, .field label{display:none!important}

        /* Ensure Frappe controls fill width without breaking behavior */
        .field .frappe-control,
        .field .control-input-wrapper,
        .field .input-with-feedback,
        .field .awesomplete,
        .field .awesomplete>input{
          width:100%;max-width:none;box-sizing:border-box;
        }
        .field .frappe-control{display:block}
        .field .control-input-wrapper{position:relative;padding:0}

        /* Inputs: clear border, rounded, nicer focus */
        .field .control-input,
        .field input,
        .field .awesomplete>input,
        .field .input-with-feedback{
          height:44px!important;min-height:44px!important;font-size:15px;
          background:#fff!important;color:#0f172a!important;
          border:1px solid var(--pi-border)!important;border-radius:12px!important;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .field .control-input:hover,
        .field .input-with-feedback:hover,
        .field .awesomplete>input:hover{
          border-color: var(--pi-border-hover)!important;
        }
        .field .control-input:focus,
        .field .input-with-feedback:focus,
        .field .awesomplete>input:focus{
          border-color: var(--pi-focus)!important;
          box-shadow: 0 0 0 3px rgba(37,99,235,.15)!important;
          outline:none!important;
        }

        /* Awesomplete dropdown: aligned, on top */
        .fast-pi-full .awesomplete{position:relative;width:100%}
        .fast-pi-full .awesomplete > ul{
          position:absolute!important;
          top:calc(100% + 6px)!important;
          inset-inline-start:0!important;
          min-width:100%;
          max-height:50vh;overflow:auto;
          z-index:10050!important;
          border:1px solid var(--pi-border);
          border-radius:12px;
          background:#fff;
          box-shadow:0 12px 28px rgba(0,0,0,.12);
        }

        /* Error highlight on the field wrapper border of input itself */
        .field.error .control-input,
        .field.error .awesomplete>input,
        .field.error .input-with-feedback{
          border-color: var(--pi-danger)!important;
          box-shadow: 0 0 0 3px rgba(239,68,68,.12)!important;
        }

        /* Totals mini cards */
        .kv{text-align:center;background:#fff;border:1px solid var(--pi-border);border-radius:12px;padding:10px}
        .kv .k{font-size:11px;color:var(--pi-muted);text-transform:uppercase}
        .kv .v{font-size:18px;font-weight:800;color:#111827}

        /* Action bar */
        .actionbar{
          max-width:1280px;margin:12px auto 0;
          display:flex;justify-content:flex-end;gap:10px;
        }
        .btn-submit{
          background:#2563eb;border:1px solid #2563eb;color:#fff;border-radius:12px;
          padding:12px 18px;font-size:16px;font-weight:900;letter-spacing:.2px;cursor:pointer;
          transition:transform .05s ease, background .15s ease;
        }
        .btn-submit:hover{background:#1e4fd7;border-color:#1e4fd7}
        .btn-submit:active{transform:translateY(1px)}
        .btn-submit[disabled]{opacity:.6;cursor:not-allowed}

        @media (max-width: 1100px) {
          .supplier{grid-column:span 12}
          .pdate{grid-column:span 12}
          .item{grid-column:span 12}
          .qty{grid-column:span 6}
          .rate{grid-column:span 6}
          .wh{grid-column:span 12}
          .paid{grid-column:span 12}
          .mop{grid-column:span 12}
          .totals{grid-column:span 12}
        }
      </style>

      <div class="fastpi-header">
        <div class="fastpi-title"></div>
        <div class="fastpi-status" data-bind="status">جاهز</div>
      </div>

      <div class="fastpi-sections">
        <div class="section">
          <div class="section-title">المورد والتاريخ</div>
          <div class="grid">
            <div class="field supplier" data-wrap="supplier">
              <div class="field-label">المورد</div>
              <div data-field="supplier"></div>
            </div>
            <div class="field pdate" data-wrap="posting_date">
              <div class="field-label">تاريخ القيد</div>
              <div data-field="posting_date"></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">الصنف والتسعير</div>
          <div class="grid">
            <div class="field item" data-wrap="item_code">
              <div class="field-label">الصنف</div>
              <div data-field="item_code"></div>
            </div>
            <div class="field qty" data-wrap="qty">
              <div class="field-label">الكمية</div>
              <div data-field="qty"></div>
            </div>
            <div class="field rate" data-wrap="rate">
              <div class="field-label">السعر</div>
              <div data-field="rate"></div>
            </div>
            <div class="field wh" data-wrap="set_warehouse">
              <div class="field-label">المخزن</div>
              <div data-field="set_warehouse"></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">الدفع</div>
          <div class="grid">
            <div class="field paid" data-wrap="paid_amount">
              <div class="field-label">المبلغ المدفوع</div>
              <div data-field="paid_amount"></div>
            </div>
            <div class="field mop" data-wrap="mode_of_payment">
              <div class="field-label">طريقة الدفع</div>
              <div data-field="mode_of_payment"></div>
            </div>
            <div class="totals">
              <div class="kv">
                <div class="k">الإجمالي</div>
                <div class="v" data-bind="grand_total">0.00</div>
              </div>
              <div class="kv">
                <div class="k">مدفوع</div>
                <div class="v" data-bind="paid_preview">0.00</div>
              </div>
              <div class="kv">
                <div class="k">المستحق</div>
                <div class="v" data-bind="outstanding">0.00</div>
              </div>
            </div>
          </div>
        </div>

        <div class="actionbar">
          <button class="btn-submit" data-action="submit">ترحيل</button>
        </div>
      </div>
    </div>
  `;
  const $ui = $(ui_html);
  $section.append($ui);

  // State
  const state = {
    supplier: null,
    item_code: null,
    qty: 1,
    rate: 0,
    paid_amount: 0,
    mode_of_payment: null,
    set_warehouse: frappe.defaults.get_default("warehouse") || null,
    posting_date: frappe.datetime.get_today()
  };

  // Binds
  const $status = $ui.find('[data-bind="status"]');
  const $grand_total = $ui.find('[data-bind="grand_total"]');
  const $paid_preview = $ui.find('[data-bind="paid_preview"]');
  const $outstanding = $ui.find('[data-bind="outstanding"]');

  // Controls
  const controls = {};
  function Control(df, sel) {
    const Map = {
      Link: frappe.ui.form.ControlLink,
      Float: frappe.ui.form.ControlFloat,
      Currency: frappe.ui.form.ControlCurrency,
      Date: frappe.ui.form.ControlDate
    };
    const C = Map[df.fieldtype] || frappe.ui.form.ControlData;
    return new C({ df, parent: $ui.find(sel)[0], render_input: true });
  }

  controls.supplier = Control({
    fieldtype: "Link",
    fieldname: "supplier",
    label: "المورد",
    options: "Supplier",
    reqd: 1,
    get_query: () => ({ filters: { disabled: 0, custom_milk_supplier: 0 } }),
    change: () => { state.supplier = controls.supplier.get_value(); }
  }, '[data-field="supplier"]');

  controls.posting_date = Control({
    fieldtype: "Date",
    fieldname: "posting_date",
    label: "تاريخ القيد",
    default: state.posting_date,
    change: () => { state.posting_date = controls.posting_date.get_value(); }
  }, '[data-field="posting_date"]');
  controls.posting_date.set_value(state.posting_date);

  controls.item_code = Control({
    fieldtype: "Link",
    fieldname: "item_code",
    label: "الصنف",
    options: "Item",
    reqd: 1,
    get_query: () => ({ filters: { disabled: 0 } }),
    change: () => { state.item_code = controls.item_code.get_value(); refresh_totals(); }
  }, '[data-field="item_code"]');

  controls.qty = Control({
    fieldtype: "Float",
    fieldname: "qty",
    label: "الكمية",
    reqd: 1,
    default: state.qty,
    change: () => { state.qty = flt(controls.qty.get_value()) || 0; refresh_totals(); }
  }, '[data-field="qty"]');
  controls.qty.set_value(state.qty);

  controls.rate = Control({
    fieldtype: "Currency",
    fieldname: "rate",
    label: "السعر",
    reqd: 1,
    default: state.rate,
    change: () => { state.rate = flt(controls.rate.get_value()) || 0; refresh_totals(); }
  }, '[data-field="rate"]');
  controls.rate.set_value(state.rate);

  controls.set_warehouse = Control({
    fieldtype: "Link",
    fieldname: "set_warehouse",
    label: "المخزن",
    options: "Warehouse",
    get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
    change: () => { state.set_warehouse = controls.set_warehouse.get_value(); }
  }, '[data-field="set_warehouse"]');
  controls.set_warehouse.set_value(state.set_warehouse || "");

  controls.paid_amount = Control({
    fieldtype: "Currency",
    fieldname: "paid_amount",
    label: "المبلغ المدفوع",
    default: state.paid_amount,
    change: () => { state.paid_amount = flt(controls.paid_amount.get_value()) || 0; refresh_totals(); }
  }, '[data-field="paid_amount"]');
  controls.paid_amount.set_value(state.paid_amount);

  controls.mode_of_payment = Control({
    fieldtype: "Link",
    fieldname: "mode_of_payment",
    label: "طريقة الدفع",
    options: "Mode of Payment",
    get_query: () => ({ filters: { enabled: 1 } }),
    change: () => { state.mode_of_payment = controls.mode_of_payment.get_value(); }
  }, '[data-field="mode_of_payment"]');

  // Helpers
  const $btn_submit = $ui.find('[data-action="submit"]');
  const flt = (v) => frappe.utils && frappe.utils.flt ? frappe.utils.flt(v) : (parseFloat(v) || 0);

  function format_num(n) {
    let x = Number(n);
    if (!isFinite(x)) x = 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function validate() {
    $ui.find('.field.error').removeClass('error');

    if (!state.supplier) return mark_error('supplier', 'اختار المورد');
    if (!state.item_code) return mark_error('item_code', 'اختار الصنف');
    if (!state.qty || state.qty <= 0) return mark_error('qty', 'لازم الكمية تكون أكبر من صفر');
    if (state.rate === null || state.rate === undefined) return mark_error('rate', 'اكتب السعر');

    const grand = compute_grand();
    const paid = flt(state.paid_amount) || 0;
    if (paid > 0 && !state.mode_of_payment) return mark_error('mode_of_payment', 'اختار طريقة الدفع لما يكون في مبلغ مدفوع');
    if (paid > grand + 1e-9) return mark_error('paid_amount', 'المبلغ المدفوع مينفعش يكون أكبر من الإجمالي');

    return null;
  }

  function mark_error(field_wrap_key, msg) {
    const wrap = $ui.find('.field[data-wrap="' + field_wrap_key + '"]');
    wrap.addClass('error');
    frappe.msgprint(msg);
    const ctrl = controls[field_wrap_key];
    if (ctrl && ctrl.$input) {
      setTimeout(function () { ctrl.$input.focus(); }, 10);
    }
    return msg;
  }

  function compute_grand() {
    return (flt(state.qty) || 0) * (flt(state.rate) || 0);
  }

  function refresh_totals() {
    const grand = compute_grand();
    const paid = flt(state.paid_amount) || 0;
    const outstanding = Math.max(grand - paid, 0);

    $grand_total.text(format_num(grand));
    $paid_preview.text(format_num(paid));
    $outstanding.text(format_num(outstanding));

    const paidWrap = $ui.find('.field[data-wrap="paid_amount"]');
    if (paid > grand + 1e-9) {
      paidWrap.addClass('error');
    } else {
      paidWrap.removeClass('error');
    }
  }
  refresh_totals();

  async function submit_invoice() {
    const err = validate();
    if (err) return;

    try {
      $btn_submit.prop('disabled', true);
      frappe.dom.freeze('جاري ترحيل فاتورة المشتريات...');
      const r = await frappe.call({
        method: 'milk.milk.page.fast_purchase_invoic.api.make_fast_purchase_invoice',
        args: {
          supplier: state.supplier,
          item_code: state.item_code,
          qty: state.qty,
          rate: state.rate,
          posting_date: state.posting_date,
          set_warehouse: state.set_warehouse,
          paid_amount: state.paid_amount || 0,
          mode_of_payment: state.mode_of_payment || null,
          submit: 1
        }
      });
      const out = r.message || {};
      if (out.purchase_invoice) {
        try {
          const doc = await frappe.db.get_doc('Purchase Invoice', out.purchase_invoice);
          const outstanding_val = doc.outstanding_amount || 0;
          $outstanding.text(format_num(outstanding_val));
          frappe.show_alert({
            message: 'اترحلت الفاتورة ' + out.purchase_invoice + '. المستحق: ' + format_currency(outstanding_val, doc.currency),
            indicator: outstanding_val > 0 ? 'orange' : 'green'
          });
        } catch (e) { /* ignore */ }
        clear_form_fast();
        $status.text('جاهز');
      } else {
        frappe.show_alert({ message: 'مافيش مستند اتعمل.', indicator: 'orange' });
      }
    } catch (e) {
      console.error(e);
      frappe.msgprint({ title: 'خطأ', message: e.message || e, indicator: 'red' });
    } finally {
      frappe.dom.unfreeze();
      $btn_submit.prop('disabled', false);
    }
  }

  function clear_form_fast() {
    const today = frappe.datetime.get_today();
    const wh = frappe.defaults.get_default('warehouse') || state.set_warehouse || null;

    state.supplier = null;
    state.item_code = null;
    state.qty = 1;
    state.rate = 0;
    state.paid_amount = 0;
    state.mode_of_payment = null;
    state.set_warehouse = wh;
    state.posting_date = today;

    controls.supplier.set_value('');
    controls.item_code.set_value('');
    controls.qty.set_value(state.qty);
    controls.rate.set_value(state.rate);
    controls.paid_amount.set_value(state.paid_amount);
    controls.mode_of_payment.set_value('');
    controls.set_warehouse.set_value(wh || '');
    controls.posting_date.set_value(today);

    refresh_totals();
    if (controls.supplier && controls.supplier.$input) {
      setTimeout(function () { controls.supplier.$input.focus(); }, 10);
    }
  }

  const $btn = $ui.find('[data-action="submit"]');
  $btn.on('click', submit_invoice);

  // Tab order + Enter to move next
  const order = [
    controls.supplier, controls.posting_date,
    controls.item_code, controls.qty, controls.rate, controls.set_warehouse,
    controls.paid_amount, controls.mode_of_payment
  ].filter(function (x) { return !!x; });
  order.forEach(function (c, i) {
    const next = order[i + 1];
    if (c.$input) {
      c.$input.on('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (next && next.$input) next.$input.focus();
          else $btn.focus();
        }
      });
    }
  });

  // Ctrl+Enter submit
  $(document).on('keydown.fastpi', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      $btn.click();
    }
  });
  $(wrapper).on('remove', function () {
    $(document).off('keydown.fastpi');
  });
};