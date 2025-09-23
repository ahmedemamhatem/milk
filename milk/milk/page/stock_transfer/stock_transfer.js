frappe.provide("milk.stock_transfer");

frappe.pages['stock-transfer'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'تحويل مخزون',
    single_column: true
  });

  const $section = $(wrapper).find('.layout-main-section');
  $section.empty();

  const ui_html = `
    <div class="fsi-root st-root">
      <style>
        :root { --bg:#fff; --text:#0f172a; --muted:#475569; --primary:#2563eb; --primary-dark:#1e40af; --line:#e2e8f0; --field-bg:#f8fafc; --danger:#ef4444; --chip-bg:#f1f5f9; }

        .fsi-root { background:var(--bg); color:var(--text); min-height:calc(100vh - 80px); margin:-15px; padding:10px 16px 24px; }
        .fsi-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .fsi-title { font-size:22px; font-weight:800; }
        .fsi-status { font-size:12px; color:var(--muted); }

        .cards-row { display:grid; grid-template-columns:repeat(20,minmax(0,1fr)); column-gap:12px; row-gap:10px; align-items:stretch; }
        .card { grid-column:span 4; background:var(--field-bg); border:1px solid var(--line); border-radius:12px; padding:8px 10px; min-height:74px; box-shadow:0 1px 0 rgba(15,23,42,.03); position:relative; }
        .card .head { font-size:11px; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.3px; margin-bottom:4px; }
        .card .body .control-label { display:none !important; }
        .card .body .control-input, .card .body input, .card .body .awesomplete>input {
          background:#fff !important; border:1px solid #dbe2ea !important; border-radius:10px !important; min-height:34px; height:34px;
        }
        .card.error { outline:2px solid var(--danger); }

        .table-card { margin-top:12px; border:1px solid var(--line); border-radius:12px; overflow:visible; background:#fff; box-shadow:0 1px 0 rgba(15,23,42,.03); position:relative; }
        .table-title { padding:10px 12px; font-size:12px; font-weight:900; color:var(--muted); text-transform:uppercase; letter-spacing:.3px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:8px; align-items:center; }

        /* idx, item, qty, available, actions */
        .st-grid { display:grid; grid-template-columns:40px minmax(260px,1fr) 140px 160px 80px; align-items:center; }
        .fsi-head, .fsi-foot { background:#f8fafc; }
        .fsi-head>div, .st-row>div, .fsi-foot-row>div { padding:10px 8px; border-bottom:1px solid var(--line); min-height:48px; display:flex; align-items:center; }
        .st-body { max-height:52vh; overflow:auto; }
        .st-body .st-row:nth-child(even) { background:#fcfdff; }
        .th { font-size:11px; font-weight:800; color:var(--muted); text-transform:uppercase; }
        .center { justify-content:center; text-align:center; }
        .right { justify-content:flex-end; text-align:right; }

        .cell { width:100%; }
        .cell .control-label { display:none !important; }
        .cell .control-input, .cell input, .cell .awesomplete>input, .cell .input-with-feedback {
          width:100%; background:#fff !important; color:var(--text) !important; border:1px solid #dbe2ea !important; border-radius:10px !important; min-height:32px; height:32px;
        }
        .cell-error { outline:2px solid var(--danger); border-radius:8px; }

        .actions-bar { padding:10px 12px; display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--line); background:#fff; }
        .btn { border:none; border-radius:10px; padding:10px 14px; font-weight:800; cursor:pointer; }
        .btn-add { background:#e2e8f0; color:#0f172a; }
        .btn-submit { background:linear-gradient(180deg, var(--primary), var(--primary-dark)); color:#fff; }
        .btn-outline { background:#fff; border:1px solid var(--line); }
        .btn:disabled { opacity:.6; cursor:not-allowed; }

        /* Awesomplete dropdown above table */
        .st-root .cards-row,
        .st-root .card,
        .st-root .table-card,
        .st-root .st-body,
        .st-root .st-row,
        .st-root .cell { overflow: visible !important; }
        .st-root .st-row { position: relative; z-index: 2; }
        .st-root .cell .awesomplete, .st-root .card .awesomplete { position: relative; z-index: 10010; width: 100%; }
        .st-root .awesomplete > ul {
          position: absolute !important;
          top: calc(100% + 6px) !important;
          left: 0 !important;
          right: 0 !important;
          min-width: 100%;
          max-width: min(640px, 92vw);
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 10px;
          margin: 0;
          padding: 6px 0;
          box-shadow: 0 8px 28px rgba(0,0,0,.12);
          max-height: 320px;
          overflow: auto;
          z-index: 10050 !important;
        }
        .st-root .awesomplete > ul, .st-root .awesomplete > ul * { pointer-events: auto !important; }
        .st-root .awesomplete > ul > li {
          display:block; padding:8px 12px; color:var(--text); line-height:1.25;
          white-space: normal; word-break: break-word; direction: inherit;
        }
        .st-root .awesomplete > ul > li[aria-selected="true"], .st-root .awesomplete > ul > li:hover { background: var(--field-bg); }

        @media (max-width:1100px){ .cards-row{ grid-template-columns:repeat(10,1fr);} .card{ grid-column:span 10;} }
        @media (max-width:680px){ .st-body{ max-height:45vh;} }
      </style>

      <div class="fsi-header">
        <div class="fsi-title"> </div>
        <div class="fsi-status" data-bind="status">جاهز</div>
      </div>

      <div class="cards-row">
        <div class="card" data-wrap-card="posting_date"><div class="head">تاريخ القيد</div><div class="body"><div data-field="posting_date"></div></div></div>
        <div class="card" data-wrap-card="from_warehouse"><div class="head">من مخزن</div><div class="body"><div data-field="from_warehouse"></div></div></div>
        <div class="card" data-wrap-card="to_warehouse"><div class="head">إلى مخزن</div><div class="body"><div data-field="to_warehouse"></div></div></div>
      </div>

      <div class="table-card">
        <div class="table-title">
          <span>أصناف التحويل</span>
          <div class="title-actions"></div>
        </div>
        <div class="fsi-head st-grid">
          <div class="th center">#</div>
          <div class="th">الصنف</div>
          <div class="th center">الكمية</div>
          <div class="th right">المتاح (من المخزن)</div>
          <div class="th center">إجراءات</div>
        </div>
        <div class="st-body" data-body="rows"></div>
        <div class="actions-bar">
          <button class="btn btn-add" data-action="add_row">إضافة صف</button>
          <button class="btn btn-submit" data-action="submit">تنفيذ التحويل</button>
        </div>
      </div>
    </div>
  `;
  const $ui = $(ui_html);
  $section.append($ui);

  // Helpers
  const flt = (v) => frappe.utils && frappe.utils.flt ? frappe.utils.flt(v) : (parseFloat(v) || 0);
  function safe_number(v, d=2){ let n=Number(v); if(!isFinite(n)) n=0; return n.toLocaleString(undefined,{minimumFractionDigits:d, maximumFractionDigits:d}); }

  // State
  const state = {
    posting_date: frappe.datetime.get_today(),
    from_warehouse: null,
    to_warehouse: null,
    rows: []
  };

  // Binds
  const $status = $ui.find('[data-bind="status"]');
  const $body = $ui.find('[data-body="rows"]');
  const $btn_add = $ui.find('[data-action="add_row"]');
  const $btn_submit = $ui.find('[data-action="submit"]');

  // Controls
  const controls = {};
  function Control(df, sel) {
    const M = { Link: frappe.ui.form.ControlLink, Float: frappe.ui.form.ControlFloat, Date: frappe.ui.form.ControlDate };
    const C = M[df.fieldtype] || frappe.ui.form.ControlData;
    return new C({ df, parent: $ui.find(sel)[0], render_input: true });
  }
  function mark_card_error(key, on){ const $c = $ui.find('[data-wrap-card="'+key+'"]'); on ? $c.addClass('error') : $c.removeClass('error'); }

  controls.posting_date = Control({ fieldtype:"Date", fieldname:"posting_date", label:"تاريخ القيد",
    default: state.posting_date,
    change: () => state.posting_date = controls.posting_date.get_value()
  }, '[data-field="posting_date"]'); controls.posting_date.set_value(state.posting_date);

  controls.from_warehouse = Control({ fieldtype:"Link", fieldname:"from_warehouse", label:"من مخزن", options:"Warehouse",
    get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
    change: async () => { state.from_warehouse = controls.from_warehouse.get_value(); await refresh_availability_all(); render_mark_errors(); }
  }, '[data-field="from_warehouse"]');
  controls.from_warehouse.$input && controls.from_warehouse.$input.on('focus', () => {
    const ac = controls.from_warehouse.autocomplete; if (ac && ac.evaluate) { ac.minChars = 0; ac.evaluate(); }
  });

  controls.to_warehouse = Control({ fieldtype:"Link", fieldname:"to_warehouse", label:"إلى مخزن", options:"Warehouse",
    get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
    change: () => { state.to_warehouse = controls.to_warehouse.get_value(); render_mark_errors(); }
  }, '[data-field="to_warehouse"]');
  controls.to_warehouse.$input && controls.to_warehouse.$input.on('focus', () => {
    const ac = controls.to_warehouse.autocomplete; if (ac && ac.evaluate) { ac.minChars = 0; ac.evaluate(); }
  });

  // Rows
  let auto_id = 1;
  function new_row(){ return { id:auto_id++, item_code:null, qty:1, available:null }; }
  function add_row(row){ state.rows.push(row || new_row()); render_rows(); }
  function remove_row(id){ state.rows = state.rows.filter(x => x.id !== id); render_rows(); }

  async function refresh_availability_all(){
    for (const r of state.rows) { await fetch_available_for_row(r); update_row_numbers(r); }
  }
  async function fetch_available_for_row(r){
    const item = r.item_code, wh = state.from_warehouse;
    if (!item || !wh) { r.available = null; return; }
    try {
      const res = await frappe.call({
        method: 'milk.milk.page.stock_transfer.api.get_available_qty',
        args: { item_code: item, warehouse: wh }
      });
      r.available = flt(res.message || 0);
    } catch { r.available = 0; }
  }

  function render_rows(){
    $body.empty();
    state.rows.forEach((r, idx) => {
      const $row = $(`
        <div class="st-row st-grid" data-id="${r.id}">
          <div class="center">${idx + 1}</div>
          <div><div class="cell" data-cell="item_code"></div></div>
          <div class="center"><div class="cell" data-cell="qty"></div></div>
          <div class="right"><span data-cell="available">--</span></div>
          <div class="center"><button class="btn btn-outline btn-sm" data-action="remove" title="حذف">✕</button></div>
        </div>
      `);
      $body.append($row);

      // Item control
      const c_item = new frappe.ui.form.ControlLink({
        df: { fieldtype:"Link", fieldname:"item_code", label:"الصنف", options:"Item", reqd:1,
          get_query: () => ({ filters: { disabled: 0, has_variants: 0 } })
        },
        parent: $row.find('[data-cell="item_code"]')[0],
        render_input: true
      });
      if (r.item_code) c_item.set_value(r.item_code);
      if (c_item.$input) {
        c_item.$input.on('focus', () => {
          const ac = c_item.autocomplete; if (ac && ac.evaluate) { ac.minChars = 0; ac.evaluate(); }
        });
        c_item.$input.on('awesomplete-selectcomplete', async (e) => {
          const oe = e && e.originalEvent;
          const picked = (oe && oe.text && (oe.text.value || oe.text)) || c_item.$input.val();
          c_item.set_value(picked || '');
          r.item_code = c_item.get_value() || null;
          await fetch_available_for_row(r);
          update_row_numbers(r);
          render_mark_errors();
        });
        c_item.$input.on('change', async () => {
          r.item_code = c_item.get_value() || null;
          await fetch_available_for_row(r);
          update_row_numbers(r);
          render_mark_errors();
        });
      }

      // Qty control
      const c_qty = new frappe.ui.form.ControlFloat({
        df:{ fieldtype:"Float", fieldname:"qty", label:"الكمية", reqd:1 }, parent:$row.find('[data-cell="qty"]')[0], render_input:true
      });
      c_qty.set_value(r.qty);
      c_qty.$input && c_qty.$input.on('change keyup', () => {
        r.qty = flt(c_qty.get_value()) || 0;
        update_row_numbers(r);
        const $inp = $row.find('[data-cell="qty"] .control-input');
        if (!(r.qty > 0)) $inp.addClass('cell-error'); else $inp.removeClass('cell-error');
      });

      // Remove
      $row.find('[data-action="remove"]').on('click', () => remove_row(r.id));

      // Inicial
      update_row_numbers(r);
    });
  }

  function update_row_numbers(r){
    const $row = $body.find('.st-row[data-id="'+r.id+'"]');
    $row.find('[data-cell="available"]').text(r.available == null ? '--' : safe_number(r.available, 2));
  }

  function render_mark_errors(){
    $ui.find('.card.error').removeClass('error');
    $body.find('.cell-error').removeClass('cell-error');

    if (!state.posting_date) mark_card_error('posting_date', true);
    if (!state.from_warehouse) mark_card_error('from_warehouse', true);
    if (!state.to_warehouse) mark_card_error('to_warehouse', true);
    if (state.from_warehouse && state.to_warehouse && state.from_warehouse === state.to_warehouse){
      mark_card_error('from_warehouse', true);
      mark_card_error('to_warehouse', true);
    }

    state.rows.forEach(r => {
      const $row = $body.find('.st-row[data-id="'+r.id+'"]');
      if (!r.item_code) $row.find('[data-cell="item_code"] .control-input').addClass('cell-error');
      if (!(flt(r.qty) > 0)) $row.find('[data-cell="qty"] .control-input').addClass('cell-error');
    });
  }

  function validate_all(){
    if (!state.posting_date) return frappe.throw('تاريخ القيد مطلوب');
    if (!state.from_warehouse) return frappe.throw('مطلوب تحديد المخزن المحوَّل منه');
    if (!state.to_warehouse) return frappe.throw('مطلوب تحديد المخزن المحوَّل إليه');
    if (state.from_warehouse === state.to_warehouse) return frappe.throw('مينفعش نفس المخزن يكون من وإلى');
    if (!state.rows.length) return frappe.throw('أضف صف واحد على الأقل');
    for (const r of state.rows){
      if (!r.item_code) return frappe.throw('الصنف مطلوب في كل الصفوف');
      if (!(flt(r.qty) > 0)) return frappe.throw('لازم الكمية تكون أكبر من صفر');
    }
  }

  function reset_page(){
    state.posting_date = frappe.datetime.get_today();
    state.from_warehouse = null;
    state.to_warehouse = null;
    state.rows = [];

    controls.posting_date.set_value(state.posting_date);
    controls.from_warehouse.set_value('');
    controls.to_warehouse.set_value('');

    add_row();
    $status.text('جاهز');
  }

  async function submit_all(){
    render_mark_errors();
    try { validate_all(); } catch (e) { return; }
    try {
      $btn_submit.prop('disabled', true);
      frappe.dom.freeze('جاري إنشاء قيد التحويل...');

      const payload = {
        posting_date: state.posting_date,
        from_warehouse: state.from_warehouse,
        to_warehouse: state.to_warehouse,
        rows: state.rows.map(r => ({ item_code: r.item_code, qty: flt(r.qty) || 0 })),
      };

      const res = await frappe.call({
        method: 'milk.milk.page.stock_transfer.api.make_stock_transfer',
        args: { data: payload }
      });

      const name = res && res.message;
      if (name) {
        frappe.msgprint({
          title: 'تم بنجاح',
          message: 'تم إنشاء قيد تحويل: ' + frappe.utils.escape_html(name),
          indicator: 'green'
        });
        reset_page();
      } else {
        frappe.show_alert({ message: 'مفيش مستند اتعمل.', indicator: 'orange' });
      }
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) ? String(e.message) : 'حصل خطأ';
      frappe.msgprint({ title: 'خطأ', message: msg, indicator: 'red' });
    } finally {
      frappe.dom.unfreeze();
      $btn_submit.prop('disabled', false);
    }
  }

  // Events
  $btn_add.on('click', () => add_row());
  $btn_submit.on('click', submit_all);

  // Start
  add_row();
};