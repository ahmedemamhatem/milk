frappe.provide("milk.manufacture");

frappe.pages['manufacture'].on_page_load = function(wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'التصنيع',
    single_column: true
  });

  const $section = $(wrapper).find('.layout-main-section');
  $section.empty();

  const ui_html = `
    <div class="mf-root" dir="rtl">
      <style>
        :root{
          --mf-radius: 10px;
          --mf-border: #d9dee7;
          --mf-border-hover: #b9c2d0;
          --mf-focus: #2563eb;
          --mf-muted: #6b7280;
          --mf-bg-soft: #f8fafc;
        }

        /* Container */
        .mf-root{
          min-height:calc(100vh - 80px);
          margin:-15px;
          padding:14px 12px 18px;
          background: var(--mf-bg-soft);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .container{max-width:1380px;margin:0 auto}

        /* Typography: Arabic-friendly */
        .mf-root, .mf-root input, .mf-root button, .mf-root .control-input,
        .mf-root .input-with-feedback{
          font-family: "Tajawal", "Cairo", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans Arabic", "Noto Sans", sans-serif;
          letter-spacing: .1px;
        }

        /* Header */
        .mf-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;}
        .mf-title{font-size:24px;font-weight:800;color:#111827}
        .mf-status{font-size:12px;color:var(--mf-muted)}

        /* Cards */
        .card{
          background:#fff;
          border:1px solid var(--mf-border);
          border-radius:var(--mf-radius);
          box-shadow: 0 8px 24px rgba(2,6,23,.06);
        }
        .card:hover{box-shadow:0 10px 28px rgba(2,6,23,.08)}
        .section-card{padding:14px;margin-bottom:14px}
        .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .section-title{font-size:12px;font-weight:800;color:var(--mf-muted);text-transform:uppercase;letter-spacing:.25px}

        /* Grid */
        .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
        .col-12{grid-column:span 12} .col-9{grid-column:span 9}
        .col-8{grid-column:span 8} .col-6{grid-column:span 6}
        .col-5{grid-column:span 5} .col-4{grid-column:span 4} .col-3{grid-column:span 3}

        /* Field wrappers */
        .field{padding:4px; overflow:visible}
        .field .label{
          font-size:12.5px;
          font-weight:800;
          margin-bottom:6px;
          text-align:right;
          color:#374151;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .field .control-label{display:none!important}

        /* Inputs: clearer borders, rounded corners, improved focus */
        .field .frappe-control,
        .field .control-input-wrapper,
        .field .input-with-feedback,
        .field .awesomplete,
        .field .awesomplete>input,
        .cell .frappe-control,
        .cell .control-input-wrapper,
        .cell .input-with-feedback,
        .cell .awesomplete,
        .cell .awesomplete>input{
          width:100%;max-width:none;box-sizing:border-box;
        }
        .field .frappe-control, .cell .frappe-control{display:block}
        .field .control-input-wrapper, .cell .control-input-wrapper{position:relative;padding:0}

        .control-input,
        .input-with-feedback,
        .awesomplete>input{
          height:44px!important;min-height:44px!important;font-size:15px;
          border:1px solid var(--mf-border)!important;
          border-radius:10px!important;
          background:#fff!important;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .control-input:hover,
        .input-with-feedback:hover,
        .awesomplete>input:hover{
          border-color: var(--mf-border-hover)!important;
          background:#fff!important;
        }
        .control-input:focus,
        .input-with-feedback:focus,
        .awesomplete>input:focus{
          border-color: var(--mf-focus)!important;
          box-shadow: 0 0 0 3px rgba(37,99,235,.15)!important;
          outline: none!important;
        }

        /* Placeholder color a bit softer */
        .mf-root ::placeholder{color:#9aa3b2;opacity:1}

        /* Awesomplete dropdown: aligned, visible, elevated */
        .mf-root .awesomplete{position:relative;width:100%;}
        .mf-root .awesomplete > ul{
          position:absolute !important;
          top:calc(100% + 6px) !important;
          inset-inline-start:0 !important;
          min-width:100%;
          max-height:50vh;overflow:auto;
          z-index:10050 !important;
          box-shadow:0 12px 28px rgba(0,0,0,.12);
          border-radius:10px;
          border:1px solid var(--mf-border);
          background:#fff;
        }

        /* Ensure no clipping on our containers */
        .mf-root .card, .mf-root .section-card, .mf-root .field, .mf-root .cell,
        .mf-root .mf-body, .mf-root .mf-row, .mf-root .mf-head,
        .mf-root .grid > .field, .mf-root .mf-grid > .mf-row > div {
          overflow:visible !important;
        }

        /* Basics widths */
        .basics .date-col{grid-column:span 3;min-width:220px}
        .basics .from-col{grid-column:span 4;min-width:360px}
        .basics .to-col{grid-column:span 5;min-width:420px}

        /* Product row */
        .product .item-col{grid-column:span 9;min-width:620px}
        .product .qty-col{grid-column:span 3;min-width:220px}

        /* Table */
        .table-card{padding:0}
        .table-title{padding:12px 14px;border-bottom:1px solid var(--mf-border);display:flex;justify-content:space-between;align-items:center}
        .table-title .t{font-size:12px;font-weight:800;color:var(--mf-muted);text-transform:uppercase}

        .mf-grid{display:grid;grid-template-columns:64px minmax(680px,1fr) 180px 200px 120px;align-items:center}
        .mf-head>div,.mf-row>div{padding:10px;border-bottom:1px solid var(--mf-border);min-height:56px;display:flex;align-items:center;background:#fff}
        .th{font-size:12px;font-weight:800;color:var(--mf-muted);text-transform:uppercase}
        .center{text-align:center;justify-content:center}
        .right{text-align:right;justify-content:flex-end}
        .cell{width:100%}
        .cell .control-label{display:none!important}

        /* Buttons */
        .actions-bar{padding:12px 14px;display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--mf-border);background:#fff;border-bottom-left-radius:var(--mf-radius);border-bottom-right-radius:var(--mf-radius)}
        .btn{border-radius:10px}
        .btn-primary{background:#2563eb;border-color:#2563eb}
        .btn-primary:hover{background:#1e4fd7;border-color:#1e4fd7}

        @media (max-width:1280px){
          .container{max-width:100%}
          .basics .date-col,.basics .from-col,.basics .to-col,
          .product .item-col,.product .qty-col { grid-column:span 12; min-width:auto }
          .mf-grid{grid-template-columns:44px minmax(260px,1fr) 150px 160px 90px}
        }
      </style>

      <div class="container">
        <div class="mf-header">
          <div class="mf-title"></div>
          <div class="mf-status" data-bind="status">جاهز</div>
        </div>

        <!-- Basics -->
        <div class="section-card card basics">
          <div class="section-head">
            <div class="section-title"></div>
          </div>
          <div class="grid">
            <div class="field date-col" data-wrap-card="posting_date">
              <div class="label">تاريخ القيد</div>
              <div data-field="posting_date"></div>
            </div>
            <div class="field from-col" data-wrap-card="from_warehouse">
              <div class="label">من مخزن (مخزن صاله الانتاج)</div>
              <div data-field="from_warehouse"></div>
            </div>
            <div class="field to-col" data-wrap-card="to_warehouse">
              <div class="label">إلى مخزن (مخزن التام)</div>
              <div data-field="to_warehouse"></div>
            </div>
          </div>
        </div>

        <!-- Product -->
        <div class="section-card card product">
          <div class="section-head">
            <div class="section-title">المنتج النهائي</div>
          </div>
          <div class="grid">
            <div class="field item-col" data-wrap-card="new_item">
              <div class="label">الصنف الجديد (منتج نهائي)</div>
              <div data-field="new_item"></div>
            </div>
            <div class="field qty-col" data-wrap-card="new_qty">
              <div class="label">الكمية الجديدة</div>
              <div data-field="new_qty"></div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="section-card card table-card">
          <div class="table-title">
            <span class="t">الأصناف المستخدمة (خامات)</span>
            <span class="text-muted" style="font-size:12px"></span>
          </div>
          <div class="mf-head mf-grid">
            <div class="th center">#</div>
            <div class="th">الصنف</div>
            <div class="th center">الكمية</div>
            <div class="th right">المتاح (من)</div>
            <div class="th center">إجراءات</div>
          </div>
          <div class="mf-body" data-body="rows"></div>
          <div class="actions-bar">
            <div class="left-actions">
              <button type="button" class="btn btn-secondary" data-action="add_row">إضافة صف</button>
              <button type="button" class="btn btn-outline-secondary" data-action="clear">مسح الكل</button>
            </div>
            <div class="right-actions">
              <button type="button" class="btn btn-primary" data-action="submit">تنفيذ التصنيع</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  const $ui = $(ui_html);
  $section.append($ui);

  // Helpers
  const flt = (v) => frappe.utils && frappe.utils.flt ? frappe.utils.flt(v) : (parseFloat(v) || 0);
  function fmt(n, d=2){ n=Number(n); if(!isFinite(n)) n=0; return n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }

  // State
  const state = {
    posting_date: frappe.datetime.get_today(),
    from_warehouse: null,
    to_warehouse: null,
    new_item: null,
    new_qty: 1,
    rows: []
  };

  // Binds
  const $status = $ui.find('[data-bind="status"]');
  const $body = $ui.find('[data-body="rows"]');
  const $btn_add = $ui.find('[data-action="add_row"]');
  const $btn_submit = $ui.find('[data-action="submit"]');
  const $btn_clear = $ui.find('[data-action="clear"]');

  // Controls
  const controls = {};
  function Control(df, sel) {
    const M = { Link: frappe.ui.form.ControlLink, Float: frappe.ui.form.ControlFloat, Date: frappe.ui.form.ControlDate };
    const C = M[df.fieldtype] || frappe.ui.form.ControlData;
    return new C({ df, parent: $ui.find(sel)[0], render_input: true });
  }

  controls.posting_date = Control({ fieldtype:"Date", fieldname:"posting_date", label:"تاريخ القيد",
    default: state.posting_date,
    change: () => state.posting_date = controls.posting_date.get_value()
  }, '[data-field="posting_date"]'); controls.posting_date.set_value(state.posting_date);

  controls.from_warehouse = Control({ fieldtype:"Link", fieldname:"from_warehouse", label:"من مخزن (مخزن صاله الانتاج)", options:"Warehouse",
    get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
    change: async () => { state.from_warehouse = controls.from_warehouse.get_value(); await refresh_availability_all(); }
  }, '[data-field="from_warehouse"]');

  controls.to_warehouse = Control({ fieldtype:"Link", fieldname:"to_warehouse", label:"إلى مخزن (مخزن التام)", options:"Warehouse",
    get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
    change: () => { state.to_warehouse = controls.to_warehouse.get_value(); }
  }, '[data-field="to_warehouse"]');

  controls.new_item = Control({ fieldtype:"Link", fieldname:"new_item", label:"الصنف الجديد (منتج نهائي)", options:"Item", reqd:1,
    get_query: () => ({ filters: { disabled: 0, has_variants: 0 } }),
    change: () => { state.new_item = controls.new_item.get_value() || null; }
  }, '[data-field="new_item"]');

  controls.new_qty = Control({ fieldtype:"Float", fieldname:"new_qty", label:"الكمية الجديدة", reqd:1, default:state.new_qty,
    change: () => { state.new_qty = flt(controls.new_qty.get_value()) || 0; }
  }, '[data-field="new_qty"]'); controls.new_qty.set_value(state.new_qty);

  // Rows
  let auto_id = 1;
  function new_row(){ return { id:auto_id++, item_code:null, qty:1, available:null }; }
  function add_row(row){ state.rows.push(row || new_row()); render_rows(); }
  function remove_row(id){ state.rows = state.rows.filter(x => x.id !== id); render_rows(); }
  function clear_all(){ state.rows = []; render_rows(); }

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
        <div class="mf-row mf-grid" data-id="${r.id}">
          <div class="center">${idx + 1}</div>
          <div><div class="cell" data-cell="item_code"></div></div>
          <div class="center"><div class="cell" data-cell="qty"></div></div>
          <div class="right"><span data-cell="available">--</span></div>
          <div class="center"><button type="button" class="btn btn-outline-secondary" data-action="remove" title="حذف">✕</button></div>
        </div>
      `);
      $body.append($row);

      const c_item = new frappe.ui.form.ControlLink({
        df: { fieldtype:"Link", fieldname:"item_code", label:"الصنف", options:"Item", reqd:1,
          get_query: () => ({ filters: { disabled: 0, has_variants: 0 } })
        },
        parent: $row.find('[data-cell="item_code"]')[0],
        render_input: true
      });
      if (r.item_code) c_item.set_value(r.item_code);
      if (c_item.$input) {
        c_item.$input.on('change awesomplete-selectcomplete', async () => {
          r.item_code = c_item.get_value() || null;
          await fetch_available_for_row(r); update_row_numbers(r);
        });
      }

      const c_qty = new frappe.ui.form.ControlFloat({
        df:{ fieldtype:"Float", fieldname:"qty", label:"الكمية", reqd:1 }, parent:$row.find('[data-cell="qty"]')[0], render_input:true
      });
      c_qty.set_value(r.qty);
      c_qty.$input && c_qty.$input.on('change keyup', () => {
        r.qty = flt(c_qty.get_value()) || 0;
        update_row_numbers(r);
      });

      $row.find('[data-action="remove"]').on('click', () => remove_row(r.id));

      update_row_numbers(r);
    });
  }

  function update_row_numbers(r){
    const $row = $body.find('.mf-row[data-id="'+r.id+'"]');
    $row.find('[data-cell="available"]').text(r.available == null ? '--' : fmt(r.available, 2));
  }

  function validate_all(){
    if (!state.posting_date) return frappe.throw('تاريخ القيد مطلوب');
    if (!state.to_warehouse) return frappe.throw('مطلوب تحديد مخزن المنتج النهائي');
    if (!state.from_warehouse) return frappe.throw('مطلوب تحديد المخزن اللي هنسحب منه الخامات');
    if (state.from_warehouse === state.to_warehouse) return frappe.throw('مينفعش نفس المخزن يكون من وإلى');
    if (!state.new_item) return frappe.throw('الصنف الجديد (المنتج النهائي) مطلوب');
    if (!(flt(state.new_qty) > 0)) return frappe.throw('لازم الكمية الجديدة تكون أكبر من صفر');
    if (!state.rows.length) return frappe.throw('أضف صف خامة واحد على الأقل');
    for (const r of state.rows){
      if (!r.item_code) return frappe.throw('الصنف مطلوب في كل صف');
      if (!(flt(r.qty) > 0)) return frappe.throw('لازم الكمية تكون أكبر من صفر في كل صف');
    }
  }

  async function create_manufacture_entry(){
    try { validate_all(); } catch (e) { return; }
    try {
      $btn_submit.prop('disabled', true);
      frappe.dom.freeze('جاري إنشاء قيد التصنيع...');

      const res = await frappe.call({
        method: 'milk.milk.page.manufacture.api.make_repack_entry',
        args: {
          posting_date: state.posting_date,
          from_warehouse: state.from_warehouse,
          to_warehouse: state.to_warehouse,
          new_item: state.new_item,
          new_qty: state.new_qty,
          rows: state.rows.map(r => ({ item_code: r.item_code, qty: flt(r.qty) || 0 }))
        }
      });

      const name = res && res.message;
      if (name) {
        frappe.msgprint({ title:'تم بنجاح', message:'تم إنشاء قيد: ' + frappe.utils.escape_html(name), indicator:'green' });
        reset_page();
      } else {
        frappe.show_alert({ message:'مفيش مستند اتعمل.', indicator:'orange' });
      }
    } catch (e) {
      console.error(e);
      frappe.msgprint({ title:'خطأ', message: (e && e.message) ? String(e.message) : 'حصل خطأ', indicator:'red' });
    } finally {
      frappe.dom.unfreeze();
      $btn_submit.prop('disabled', false);
    }
  }

  function reset_page(){
    state.posting_date = frappe.datetime.get_today();
    state.from_warehouse = null;
    state.to_warehouse = null;
    state.new_item = null;
    state.new_qty = 1;
    state.rows = [];
    controls.posting_date.set_value(state.posting_date);
    controls.from_warehouse.set_value('');
    controls.to_warehouse.set_value('');
    controls.new_item.set_value('');
    controls.new_qty.set_value(state.new_qty);
    add_row();
    $status.text('جاهز');
  }

  // Events
  $btn_add.on('click', () => add_row());
  $btn_clear.on('click', () => clear_all());
  $btn_submit.on('click', create_manufacture_entry);

  // Start
  add_row();
};