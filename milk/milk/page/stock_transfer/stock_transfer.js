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
    <div class="st-root" dir="rtl">
      <style>
        :root{
          --st-radius: 12px;
          --st-border: #d9dee7;
          --st-border-hover: #b9c2d0;
          --st-focus: #2563eb;
          --st-muted: #6b7280;
          --st-bg: #f8fafc;
          --st-card: #ffffff;
          --st-line: #e5e7eb;
          --st-danger: #ef4444;
          --st-text: #0f172a;
        }

        .st-root{
          background: var(--st-bg);
          color: var(--st-text);
          min-height: calc(100vh - 80px);
          margin: -15px;
          padding: 14px 16px 22px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: "Tajawal", "Cairo", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", "Noto Sans", sans-serif;
          letter-spacing: .1px;
        }

        .fsi-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;max-width:1280px;margin-inline:auto}
        .fsi-title{font-size:24px;font-weight:800;color:#111827}
        .fsi-status{font-size:12px;color:var(--st-muted)}

        .cards-row{
          max-width:1280px;margin:0 auto 12px;
          display:grid;grid-template-columns:repeat(20,minmax(0,1fr));gap:12px;
        }

        .card{
          grid-column:span 4;
          background:var(--st-card);
          border:1px solid var(--st-border);
          border-radius:var(--st-radius);
          box-shadow:0 8px 24px rgba(2,6,23,.06);
          padding:12px;
          overflow:visible;
        }
        .card .head{font-size:12px;font-weight:800;color:var(--st-muted);text-transform:uppercase;letter-spacing:.25px;margin-bottom:8px}
        .card .body .control-label{display:none!important}
        .card .body .control-input,
        .card .body input,
        .card .body .awesomplete>input{
          height:44px!important;min-height:44px!important;font-size:15px;
          background:#fff!important;color:var(--st-text)!important;
          border:1px solid var(--st-border)!important;border-radius:12px!important;
          transition:border-color .15s, box-shadow .15s;
        }
        .card .body .control-input:hover,
        .card .body .awesomplete>input:hover{border-color:var(--st-border-hover)!important}
        .card .body .control-input:focus,
        .card .body .awesomplete>input:focus{
          border-color:var(--st-focus)!important;
          box-shadow:0 0 0 3px rgba(37,99,235,.15)!important;
          outline:none!important;
        }
        .card.error{outline:2px solid var(--st-danger); outline-offset:2px}

        /* Table card */
        .table-card{
          max-width:1280px;margin:0 auto;
          border:1px solid var(--st-border);border-radius:var(--st-radius);
          background:#fff;box-shadow:0 8px 24px rgba(2,6,23,.06);
          overflow:visible;
        }
        .table-title{
          padding:12px 14px;border-bottom:1px solid var(--st-border);
          font-size:12px;font-weight:800;color:var(--st-muted);text-transform:uppercase;letter-spacing:.25px;
          display:flex;justify-content:space-between;align-items:center;gap:8px
        }

        /* Columns: idx, item, qty, available, actions */
        .st-grid{display:grid;grid-template-columns:64px minmax(520px,1fr) 180px 220px 120px;align-items:center}
        .fsi-head>div,.st-row>div{padding:10px 12px;border-bottom:1px solid var(--st-border);min-height:56px;display:flex;align-items:center;background:#fff}
        .fsi-head{background:#f9fbff}
        .th{font-size:12px;font-weight:800;color:var(--st-muted);text-transform:uppercase}
        .center{text-align:center;justify-content:center}
        .right{text-align:right;justify-content:flex-end}

        .st-body{max-height:52vh;overflow:auto}
        .st-body .st-row:nth-child(even){background:#fcfdff}

        .cell{width:100%;overflow:visible}
        .cell .control-label{display:none!important}
        .cell .control-input,
        .cell input,
        .cell .awesomplete>input,
        .cell .input-with-feedback{
          width:100%;
          height:42px!important;min-height:42px!important;font-size:15px;
          background:#fff!important;color:var(--st-text)!important;
          border:1px solid var(--st-border)!important;border-radius:12px!important;
          transition:border-color .15s, box-shadow .15s;
        }
        .cell .control-input:hover{border-color:var(--st-border-hover)!important}
        .cell .control-input:focus{
          border-color:var(--st-focus)!important;
          box-shadow:0 0 0 3px rgba(37,99,235,.15)!important;
          outline:none!important;
        }
        .cell-error{border-color:var(--st-danger)!important;box-shadow:0 0 0 3px rgba(239,68,68,.12)!important}

        /* Actions bar */
        .actions-bar{padding:12px 14px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--st-border);background:#fff;border-bottom-left-radius:var(--st-radius);border-bottom-right-radius:var(--st-radius)}
        .btn{border:none;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer}
        .btn-add{background:#e2e8f0;color:#0f172a}
        .btn-submit{background:#2563eb;border:1px solid #2563eb;color:#fff}
        .btn-submit:hover{background:#1e4fd7;border-color:#1e4fd7}
        .btn:disabled{opacity:.6;cursor:not-allowed}

        /* Awesomplete: make sure dropdown is visible and aligned */
        .st-root .cards-row, .st-root .card, .st-root .table-card, .st-root .st-body, .st-root .st-row, .st-root .cell{overflow:visible!important}
        .st-root .awesomplete{position:relative;width:100%}
        .st-root .awesomplete > ul{
          position:absolute!important;top:calc(100% + 6px)!important;inset-inline-start:0!important;
          min-width:100%;max-height:50vh;overflow:auto;z-index:10050!important;
          background:#fff;border:1px solid var(--st-border);border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,.12)
        }
        .st-root .awesomplete > ul > li{display:block;padding:8px 12px;color:var(--st-text);line-height:1.25;white-space:normal;word-break:break-word}
        .st-root .awesomplete > ul > li[aria-selected="true"], .st-root .awesomplete > ul > li:hover{background:#f8fafc}

        @media (max-width:1280px){
          .st-grid{grid-template-columns:44px minmax(260px,1fr) 150px 180px 90px}
          .cards-row{grid-template-columns:repeat(10,1fr)}
          .card{grid-column:span 10}
        }
        @media (max-width:680px){ .st-body{max-height:45vh} }
      </style>

      <div class="fsi-header">
        <div class="fsi-title"></div>
        <div class="fsi-status" data-bind="status">جاهز</div>
      </div>

      <div class="cards-row">
        <div class="card" data-wrap-card="posting_date">
          <div class="head">تاريخ القيد</div>
          <div class="body"><div data-field="posting_date"></div></div>
        </div>
        <div class="card" data-wrap-card="from_warehouse">
          <div class="head">من مخزن</div>
          <div class="body"><div data-field="from_warehouse"></div></div>
        </div>
        <div class="card" data-wrap-card="to_warehouse">
          <div class="head">إلى مخزن</div>
          <div class="body"><div data-field="to_warehouse"></div></div>
        </div>
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
    theC = M[df.fieldtype] || frappe.ui.form.ControlData;
    return new theC({ df, parent: $ui.find(sel)[0], render_input: true });
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
          <div class="center"><button class="btn btn-add" data-action="remove" title="حذف">✕</button></div>
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
        frappe.msgprint({ title:'تم بنجاح', message:'تم إنشاء قيد تحويل: ' + frappe.utils.escape_html(name), indicator:'green' });
        reset_page();
      } else {
        frappe.show_alert({ message:'مفيش مستند اتعمل.', indicator:'orange' });
      }
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) ? String(e.message) : 'حصل خطأ';
      frappe.msgprint({ title:'خطأ', message: msg, indicator:'red' });
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