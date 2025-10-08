frappe.provide("milk.fast_sales_invoice");

frappe.pages['fast-sales-invoice'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'فاتورة مبيعات',
		single_column: true
	});
  document.title = " فاتورة مبيعات ";
	const $section = $(wrapper).find('.layout-main-section');
	$section.empty();

	const ui_html = `
		<div class="fsi-root">
			<style>

			.fsi-root {
  font-weight: 700; /* bold everywhere in this page */
}
  .fsi-title,
.card .head,
.summary .chip,
.table-title,
.fsi-head .th,
.fsi-foot-row,
.fsi-row > div,
.result-header,
.result-row {
  font-weight: 700;
}
  
/* Clean Frappe-like styling with minimal layout only */

/* Page spacing */
.fsi-root { margin:-15px; padding:10px 16px 24px; background:#fff; }
.fsi-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.fsi-title { font-weight:600; }
.fsi-status { font-size:12px; color:var(--text-muted, #6b7280); }

/* Cards layout (inputs use Frappe defaults) */
.cards-row { display:grid; grid-template-columns:repeat(20,minmax(0,1fr)); gap:12px; overflow:visible; }
.card { grid-column:span 4; border:1px solid var(--border-color, #e5e7eb); border-radius:8px; background:#fff; overflow:visible; }
.card .head { font-size:12px; font-weight:600; color:var(--text-muted, #6b7280); padding:8px 10px 0; }
.card .body { padding:6px 10px 10px; position:relative; overflow:visible; }
.card .body .control-label { display:none !important; }

/* Summary row */
.summary { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
.summary .chip { border:1px solid var(--border-color, #e5e7eb); border-radius:6px; padding:6px 8px; font-size:12px; color:var(--text-muted, #6b7280); }

/* Table wrapper (no internal scroll) */
.table-card { margin-top:12px; border:1px solid var(--border-color, #e5e7eb); border-radius:8px; background:#fff; overflow:visible; }
.table-title { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border-color, #e5e7eb); color:var(--text-muted, #6b7280); font-size:12px; font-weight:600; }
.title-actions { display:flex; gap:8px; }

/* Grid columns (removed total/outstanding):
   #, customer, balance, qty, paid, actions */
.fsi-grid {
  display:grid;
  grid-template-columns:34px minmax(220px,1fr) 160px 130px 160px 64px;
  align-items:center;
}
.fsi-head, .fsi-foot { background:#fafafa; position:static; z-index:auto; }
.fsi-head>div, .fsi-row>div, .fsi-foot-row>div {
  padding:8px 8px;
  border-bottom:1px solid var(--border-color, #e5e7eb);
  min-height:44px; display:flex; align-items:center;
}
.th { font-size:12px; font-weight:600; color:var(--text-muted, #6b7280); }
.center { justify-content:center; text-align:center; }
.right { justify-content:flex-end; text-align:right; }

/* Body grows naturally; page scrolls */
.fsi-body { max-height:none; overflow:visible; }
.fsi-body .fsi-row:nth-child(even) { background:#fbfbfb; }
.fsi-row { position:relative; overflow:visible; z-index:0; }

/* Cells -- inputs use Frappe defaults */
.cell { width:100%; position:relative; overflow:visible; z-index:0; }
.cell .control-label { display:none !important; }
.cell .control-input, .cell input, .cell .awesomplete>input, .cell .input-with-feedback { width:100%; }

/* Actions bar (bottom) */
.actions-bar { padding:8px 10px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; border-top:1px solid var(--border-color, #e5e7eb); background:#fff; }

/* Modal -- rely on Frappe defaults; ensure stacking */
.fsi-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.35); display:none; align-items:center; justify-content:center; z-index:99999; }
.fsi-modal { background:#fff; width:min(880px,92vw); border-radius:8px; overflow:hidden; }
.fsi-modal-header { padding:10px; border-bottom:1px solid var(--border-color, #e5e7eb); display:flex; justify-content:space-between; align-items:center; }
.fsi-modal-title { font-weight:600; }
.fsi-modal-body { padding:10px; max-height:60vh; overflow:auto; }
.result-list { border:1px solid var(--border-color, #e5e7eb); border-radius:6px; overflow:hidden; }
.result-row { display:grid; grid-template-columns:1fr 110px 140px; gap:8px; padding:8px 10px; border-bottom:1px solid var(--border-color, #e5e7eb); }
.result-row:last-child { border-bottom:0; }
.result-header { background:#fafafa; color:var(--text-muted, #6b7280); font-size:12px; font-weight:600; }
.fsi-modal-footer { padding:8px 10px; border-top:1px solid var(--border-color, #e5e7eb); display:flex; justify-content:flex-end; gap:8px; }

/* Awesomplete (Link dropdown) -- robust, scoped, non-intrusive */
.awesomplete { position: relative !important; z-index:1; }
.awesomplete > ul {
  position: absolute !important;
  inset-inline-start: 0 !important; /* RTL/LTR */
  top: calc(100% + 4px) !important;
  min-width: 100% !important;
  max-width: min(520px, 92vw);
  max-height: 320px;
  overflow: auto;
  background: #fff;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 6px;
  margin: 0;
  padding: 4px 0;
  z-index: 10; /* above input within same container */
  direction: rtl;
  box-shadow: 0 8px 16px rgba(0,0,0,.08);
}
.awesomplete > ul > li { padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; cursor: pointer; }
.awesomplete > ul > li[aria-selected="true"], .awesomplete > ul > li:hover { background:#f5f5f5; }

/* Prevent outer containers from clipping the dropdown */
.fsi-root, .layout-main-section, .page-content { overflow: visible !important; }

/* Responsive tweaks */
@media (max-width:1100px){ .cards-row{ grid-template-columns:repeat(10,1fr);} .card{ grid-column:span 10;} }
@media (max-width:800px){ .fsi-grid { grid-template-columns:34px minmax(160px,1fr) 140px 120px 160px 60px; } }
@media (max-width:680px){ .fsi-body{ max-height:none; } }
			</style>

			<div class="fsi-header">
				<div class="fsi-title"></div>
				<div class="fsi-status" data-bind="status"></div>
			</div>

			<div class="cards-row">
				<div class="card" data-wrap-card="posting_date"><div class="head">تاريخ القيد</div><div class="body"><div data-field="posting_date"></div></div></div>
				<div class="card" data-wrap-card="customer_group"><div class="head">مجموعة العملاء</div><div class="body"><div data-field="customer_group"></div></div></div>
				<div class="card" data-wrap-card="item_code"><div class="head">الصنف</div><div class="body"><div data-field="item_code"></div></div></div>
				<div class="card" data-wrap-card="set_warehouse"><div class="head">المخزن</div><div class="body"><div data-field="set_warehouse"></div></div></div>
				<div class="card" data-wrap-card="mode_of_payment"><div class="head">طريقة الدفع</div><div class="body"><div data-field="mode_of_payment"></div></div></div>
			</div>

			<div class="summary">
				<div class="chip">عدد الصفوف <span class="v" data-bind="rows_count">0</span></div>
				<div class="chip">إجمالي الكمية <span class="v" data-bind="sum_qty">0</span></div>
				<div class="chip">إجمالي المدفوع <span class="v" data-bind="sum_paid">0.00</span></div>
				<div class="chip">إجمالي أرصدة العملاء <span class="v" data-bind="t_balances">--</span></div>
			</div>

			<div class="table-card">
				<div class="table-title">
					<span>العملاء</span>
					<div class="title-actions">
						<button class="btn btn-default btn-xs" data-action="print_blank">طباعة نموذج فاضي</button>
					</div>
				</div>
				<div class="fsi-head fsi-grid">
					<div class="th center">#</div>
					<div class="th">العميل</div>
					<div class="th right">رصيد العميل</div>
					<div class="th center">الكمية</div>
					<div class="th center">المبلغ المدفوع</div>
					<div class="th center">إجراءات</div>
				</div>
				<div class="fsi-body" data-body="rows"></div>
				<div class="fsi-foot">
					<div class="fsi-foot-row fsi-grid">
						<div></div>
						<div class="right" style="font-weight:600;">الإجماليات</div>
						<div class="right"><span data-bind="t_balances">--</span></div>
						<div class="center"><span data-bind="t_qty">0.00</span></div>
						<div class="center"><span data-bind="t_paid">0.00</span></div>
						<div></div>
					</div>
				</div>
				<div class="actions-bar">
					<button class="btn btn-default btn-xs" data-action="add_row">إضافة صف</button>
					<button class="btn btn-default btn-xs" data-action="clear_all">تنظيف</button>
					<button class="btn btn-primary btn-xs" data-action="submit">ترحيل</button>
				</div>
			</div>

			<div class="fsi-modal-backdrop" data-modal="backdrop">
				<div class="fsi-modal">
					<div class="fsi-modal-header"><div class="fsi-modal-title">الفواتير اللي اتعملت</div><button class="btn btn-default btn-xs" data-modal="close">✕</button></div>
					<div class="fsi-modal-body">
						<div class="result-list">
							<div class="result-row result-header"><div>رقم الفاتورة</div><div class="right">المدفوع</div><div class="right">المستحق</div></div>
							<div data-modal="rows"></div>
							<div class="result-row" style="background:#fafafa; font-weight:600;">
								<div>الإجمالي</div><div class="right" data-modal="sum_paid">0.00</div><div class="right" data-modal="sum_outstanding">0.00</div>
							</div>
						</div>
					</div>
					<div class="fsi-modal-footer"><button class="btn btn-primary btn-xs" data-modal="ok">إغلاق</button></div>
				</div>
			</div>
		</div>
	`;
	const $ui = $(ui_html);
	$section.append($ui);

	// Helpers
	const flt = (v) => frappe.utils && frappe.utils.flt ? frappe.utils.flt(v) : (parseFloat(v) || 0);
	function safe_text_number(v, precision = 2) {
		let n = Number(v);
		if (!isFinite(n)) n = 0;
		return n.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
	}
	function enableDropdownEscape($input) {
		if (!$input || !$input.on) return;
		const open = () => $body.addClass('fsi-dropdown-open');
		const close = () => $body.removeClass('fsi-dropdown-open');
		$input.on('focus', open);
		$input.on('blur', () => setTimeout(close, 150));
	}

	// State
	const state = {
		posting_date: frappe.datetime.get_today(),
		customer_group: null,
		item_code: null,
		set_warehouse: frappe.defaults.get_default("warehouse") || null,
		mode_of_payment: null,
		rows: [],
	};

	// Binds
	const $rows_count = $ui.find('[data-bind="rows_count"]');
	const $sum_qty = $ui.find('[data-bind="sum_qty"]');
	const $sum_paid = $ui.find('[data-bind="sum_paid"]');
	const $t_qty = $ui.find('[data-bind="t_qty"]');
	const $t_paid = $ui.find('[data-bind="t_paid"]');
	const $t_balances = $ui.find('[data-bind="t_balances"]');

	const $body = $ui.find('[data-body="rows"]');
	const $btn_add = $ui.find('[data-action="add_row"]');
	const $btn_clear = $ui.find('[data-action="clear_all"]');
	const $btn_submit = $ui.find('[data-action="submit"]');
	const $btn_print = $ui.find('[data-action="print_blank"]');

	// Modal
	const $modal = {
		backdrop: $ui.find('[data-modal="backdrop"]'),
		rows: $ui.find('[data-modal="rows"]'),
		sum_paid: $ui.find('[data-modal="sum_paid"]'),
		sum_outstanding: $ui.find('[data-modal="sum_outstanding"]'),
		close: $ui.find('[data-modal="close"]'),
		ok: $ui.find('[data-modal="ok"]')
	};
	function open_modal() { $modal.backdrop.css('display', 'flex'); }
	function close_modal() { $modal.backdrop.hide(); }

	// Controls
	const controls = {};
	function Control(df, sel) {
		const M = { Link: frappe.ui.form.ControlLink, Float: frappe.ui.form.ControlFloat, Currency: frappe.ui.form.ControlCurrency, Date: frappe.ui.form.ControlDate };
		const C = M[df.fieldtype] || frappe.ui.form.ControlData;
		return new C({ df, parent: $ui.find(sel)[0], render_input: true });
	}

	controls.posting_date = Control({ fieldtype:"Date", fieldname:"posting_date", label:"تاريخ القيد", default: state.posting_date,
		change: () => state.posting_date = controls.posting_date.get_value()
	}, '[data-field="posting_date"]'); controls.posting_date.set_value(state.posting_date);

	controls.customer_group = Control({
		fieldtype:"Link", fieldname:"customer_group", label:"مجموعة العملاء", options:"Customer Group",
		change: async () => {
			const grp = controls.customer_group.get_value() || null;
			if (!grp) { state.customer_group = null; state.rows = []; render_rows(); return; }
			state.customer_group = grp;
			await load_customers_for_group(grp, { replace_rows: true });
		}
	}, '[data-field="customer_group"]');

	controls.item_code = Control({ fieldtype:"Link", fieldname:"item_code", label:"الصنف", options:"Item", reqd:1,
		get_query: () => ({ filters: { disabled: 0 } }),
		change: async () => {
			state.item_code = controls.item_code.get_value();
			recompute_sums();
			render_rows();
		}
	}, '[data-field="item_code"]');

	controls.set_warehouse = Control({ fieldtype:"Link", fieldname:"set_warehouse", label:"المخزن", options:"Warehouse",
		get_query: () => ({ filters: { is_group: 0, disabled: 0 } }),
		change: () => state.set_warehouse = controls.set_warehouse.get_value()
	}, '[data-field="set_warehouse"]'); controls.set_warehouse.set_value(state.set_warehouse || "");

	controls.mode_of_payment = Control({ fieldtype:"Link", fieldname:"mode_of_payment", label:"طريقة الدفع", options:"Mode of Payment",
		get_query: () => ({ filters: { enabled: 1 } }),
		change: () => { state.mode_of_payment = controls.mode_of_payment.get_value(); }
	}, '[data-field="mode_of_payment"]');

	// Enable dropdown escape for top-level Links
	[controls.item_code, controls.set_warehouse, controls.mode_of_payment, controls.customer_group]
		.forEach(c => { if (c && c.$input) enableDropdownEscape(c.$input); });

	// Rows
	let row_auto_id = 1;
	function new_row() { return { id: row_auto_id++, customer: null, qty: 1, paid_amount: 0, balance: null }; }
	function add_row(row) { state.rows.push(row || new_row()); render_rows(); }
	function remove_row(id) { state.rows = state.rows.filter(x => x.id !== id); render_rows(); }

	function recompute_sums() {
		let sum_qty = 0, sum_paid = 0, known_bal = 0, has_unknown = false;
		state.rows.forEach(r => {
			sum_qty += flt(r.qty) || 0;
			sum_paid += flt(r.paid_amount) || 0;
			if (r.balance == null) has_unknown = true; else known_bal += flt(r.balance);
		});
		$rows_count.text(state.rows.length);
		$sum_qty.text(safe_text_number(sum_qty, 2));
		$sum_paid.text(safe_text_number(sum_paid, 2));
		$t_qty.text(safe_text_number(sum_qty, 2));
		$t_paid.text(safe_text_number(sum_paid, 2));
		$t_balances.text(has_unknown ? 'جاري التحميل…' : safe_text_number(known_bal, 2));
	}

	function render_rows() {
		$body.empty();
		state.rows.forEach((r, idx) => {
			const $row = $(`
				<div class="fsi-row fsi-grid" data-id="${r.id}">
					<div class="center">${idx + 1}</div>
					<div><div class="cell" data-cell="customer"></div></div>
					<div class="right"><span data-cell="balance">--</span></div>
					<div class="center"><div class="cell" data-cell="qty"></div></div>
					<div class="center"><div class="cell" data-cell="paid_amount"></div></div>
					<div class="center"><button class="btn btn-default btn-xs" data-action="remove" title="حذف">✕</button></div>
				</div>
			`);
			$body.append($row);

			// عميل
			const c_customer = new frappe.ui.form.ControlLink({
				df: { fieldtype:"Link", fieldname:"customer", label:"العميل", options:"Customer", reqd:1, get_query: () => ({ filters: { disabled: 0 } }) },
				parent: $row.find('[data-cell="customer"]')[0],
				render_input: true
			});
			if (r.customer) c_customer.set_value(r.customer);
			if (c_customer.$input) {
				enableDropdownEscape(c_customer.$input);
				c_customer.$input.on('focus', () => {
					if (c_customer.autocomplete && c_customer.autocomplete.evaluate) {
						c_customer.autocomplete.minChars = 0;
						c_customer.autocomplete.evaluate();
					}
				});
				c_customer.$input.on('change input', async () => {
					r.customer = c_customer.get_value();
					r.balance = null;
					update_balance_cell($row, r);
					if (r.customer) await fetch_and_set_balance(r, $row);
				});
			}

			// كمية
			const c_qty = new frappe.ui.form.ControlFloat({ df:{ fieldtype:"Float", fieldname:"qty", label:"الكمية", reqd:1 }, parent:$row.find('[data-cell="qty"]')[0], render_input:true });
			c_qty.set_value(r.qty);
			c_qty.$input && c_qty.$input.on('change keyup', () => {
				r.qty = flt(c_qty.get_value()) || 0;
				recompute_sums();
			});

			// مدفوع
			const c_paid = new frappe.ui.form.ControlCurrency({ df:{ fieldtype:"Currency", fieldname:"paid_amount", label:"المبلغ المدفوع" }, parent:$row.find('[data-cell="paid_amount"]')[0], render_input:true });
			c_paid.set_value(r.paid_amount);
			c_paid.$input && c_paid.$input.on('change keyup', () => {
				r.paid_amount = flt(c_paid.get_value()) || 0;
				recompute_sums(); // auto sum paid when changed
			});

			$row.find('[data-action="remove"]').on('click', () => remove_row(r.id));

			update_balance_cell($row, r);
			if (r.customer && r.balance == null) fetch_and_set_balance(r, $row);
		});
		recompute_sums();
	}

	function update_balance_cell($row, r) {
		const $b = $row.find('[data-cell="balance"]');
		if (!r.customer) { $b.text('--'); return; }
		if (r.balance == null) { $b.text('--'); return; }
		$b.text(safe_text_number(flt(r.balance), 2));
	}

	function validate_all() {
		if (!state.posting_date) return frappe.throw('تاريخ القيد مطلوب');
		if (!state.item_code) return frappe.throw('الصنف مطلوب');
		if (!state.set_warehouse) return frappe.throw('المخزن مطلوب');
		if (!state.rows.length) return frappe.throw('أضف صف عميل واحد على الأقل');
		for (const r of state.rows) {
			if (!r.customer) return frappe.throw('العميل مطلوب في كل الصفوف');
			if (!(flt(r.qty) > 0)) return frappe.throw('لازم الكمية تكون أكبر من صفر');
			if ((flt(r.paid_amount) || 0) > 0 && !state.mode_of_payment) return frappe.throw('طريقة الدفع مطلوبة لأن في صفوف عليها مبلغ مدفوع');
		}
	}

	// Helpers: clear/reset
	function reset_state() {
		state.posting_date = frappe.datetime.get_today();
		state.customer_group = null;
		state.item_code = null;
		state.set_warehouse = frappe.defaults.get_default("warehouse") || null;
		state.mode_of_payment = null;
		state.rows = [];
		// reset controls
		controls.posting_date && controls.posting_date.set_value(state.posting_date);
		controls.customer_group && controls.customer_group.set_value("");
		controls.item_code && controls.item_code.set_value("");
		controls.set_warehouse && controls.set_warehouse.set_value(state.set_warehouse || "");
		controls.mode_of_payment && controls.mode_of_payment.set_value("");
	}

	function clear_all() {
		reset_state();
		$body.empty();
		add_row();
		recompute_sums();
	}

	// Submit
	async function submit_all() {
		try { validate_all(); } catch (e) { return; }
		try {
			$btn_submit.prop('disabled', true);
			frappe.dom.freeze('جاري إنشاء فواتير المبيعات...');
			const r = await frappe.call({
				method: 'milk.milk.page.fast_sales_invoice.api.make_fast_sales_invoices',
				args: {
					posting_date: state.posting_date,
					item_code: state.item_code,
					set_warehouse: state.set_warehouse,
					mode_of_payment: state.mode_of_payment || null,
					// backend handles pricing
					rows: state.rows.map(x => ({ customer: x.customer, qty: flt(x.qty) || 0, paid_amount: flt(x.paid_amount) || 0 }))
				}
			});
			const out = r.message || {};
			show_result_modal(Array.isArray(out.invoices) ? out.invoices : []);
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title: 'خطأ', message: e.message || e, indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
			$btn_submit.prop('disabled', false);
		}
	}

	function show_result_modal(invoices) {
		$modal.rows.empty();
		let sum_paid = 0, sum_out = 0;
		if (!invoices.length) {
			$modal.rows.append($('<div class="result-row"><div>مافيش فواتير اتعملت</div><div></div><div></div></div>'));
		} else {
			invoices.forEach(inv => {
				const name = (inv && inv.name) ? String(inv.name) : '';
				const paid = flt(inv && inv.paid_amount); sum_paid += paid;
				const out = flt(inv && inv.outstanding_amount); sum_out += out;
				const $r = $('<div class="result-row"></div>');
				const $c1 = $('<div></div>').append($('<a target="_blank"></a>').attr('href', '#Form/Sales Invoice/' + encodeURIComponent(name)).text(name));
				const $c2 = $('<div class="right"></div>').text(safe_text_number(paid, 2));
				const $c3 = $('<div class="right"></div>').text(safe_text_number(out, 2));
				$r.append($c1, $c2, $c3);
				$modal.rows.append($r);
			});
		}
		$modal.sum_paid.text(safe_text_number(sum_paid, 2));
		$modal.sum_outstanding.text(safe_text_number(sum_out, 2));
		open_modal();
	}

	// Balances
	async function fetch_and_set_balance(row, $row) {
		try {
			const r = await frappe.call({ method: 'milk.milk.page.fast_sales_invoice.api.get_customer_balance', args: { customer: row.customer } });
			row.balance = flt((r.message && r.message.balance) || 0);
		} catch (e) { row.balance = 0; }
		finally { update_balance_cell($row, row); }
	}
	async function fetch_balances_batch(customers) {
		if (!customers.length) return {};
		const r = await frappe.call({ method: 'milk.milk.page.fast_sales_invoice.api.get_customer_balances', args: { customers } });
		return r.message || {};
	}

	// Load group
	async function load_customers_for_group(customer_group, opts = {}) {
		const replace_rows = opts.replace_rows !== false;
		try {
			frappe.dom.freeze('جاري تحميل العملاء...');
			const customers = await frappe.db.get_list('Customer', {
				fields: ['name', 'customer_name', 'disabled'],
				filters: [['customer_group', '=', customer_group], ['disabled', '=', 0]],
				limit: 1000, order_by: 'customer_name asc'
			});
			if (replace_rows) state.rows = [];
			if (!customers || !customers.length) { render_rows(); frappe.show_alert({ message:'مافيش عملاء نشطين في المجموعة دي', indicator:'orange' }); return; }
			customers.forEach(c => state.rows.push({ id:(row_auto_id++), customer:c.name, qty:1, paid_amount:0, balance:null }));
			render_rows();
			const balances = await fetch_balances_batch(customers.map(c => c.name));
			state.rows.forEach(r => { if (r.customer && balances[r.customer] != null) r.balance = flt(balances[r.customer]); });
			state.rows.forEach(r => update_balance_cell($body.find('.fsi-row[data-id="'+r.id+'"]'), r));
			frappe.show_alert({ message:'تم تحميل ' + customers.length + ' عميل', indicator:'green' });
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title:'خطأ', message: e.message || e, indicator:'red' });
		} finally {
			frappe.dom.unfreeze();
		}
	}

	// طباعة نموذج فاضي
	$btn_print.on('click', () => {
		const date = controls.posting_date.get_value() || '';
		const group = controls.customer_group.get_value() || '';
		const item = controls.item_code.get_value() || '';
		const selected_customers = (state.rows || []).filter(r => r.customer);
		if (!item || selected_customers.length === 0) {
			frappe.throw('اختار الصنف وعميل واحد على الأقل قبل الطباعة.');
			return;
		}
		const customers = selected_customers.map(r => ({
			name: r.customer || '',
			balance: r.balance == null ? '' : safe_text_number(r.balance, 2)
		}));
		print_blank_sheet({ date, group, item, customers });
	});
	function print_blank_sheet({ date, group, item, customers }) {
		const win = window.open('', '_blank');
		const esc = (s) => (s || '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
		const css = `
			*{box-sizing:border-box}
			body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;margin:24px}
			h1{font-size:18px;margin:0 0 8px 0}
			.meta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px}
			.meta .kv{background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px}
			table{width:100%;border-collapse:collapse;table-layout:fixed}
			th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
			th{background:#fafafa}
			td.num{text-align:right}
			col.idx{width:34px}
			col.cust{width:46%}
			col.qty{width:12%}
			col.paid{width:12%}
			col.old{width:15%}
			col.note{width:15%}
			@media print{ body{margin:8mm} .no-print{display:none !important} }
		`;
		const rows_html = customers.map((c, i) =>
			'<tr>'
				+ '<td>'+(i+1)+'</td>'
				+ '<td>'+esc(c.name)+'</td>'
				+ '<td></td>'
				+ '<td></td>'
				+ '<td class="num">'+esc(c.balance || '')+'</td>'
				+ '<td></td>'
			+ '</tr>'
		).join('');

		const html = '<!doctype html><html><head><meta charset="utf-8"><title>نموذج مبيعات</title><style>'+css+'</style></head><body>'
			+ '<h1>نموذج مبيعات</h1>'
			+ '<div class="meta"><div class="kv"><strong>التاريخ:</strong> '+esc(date)+'</div><div class="kv"><strong>مجموعة العملاء:</strong> '+esc(group)+'</div><div class="kv"><strong>الصنف:</strong> '+esc(item)+'</div></div>'
			+ '<table><colgroup><col class="idx"><col class="cust"><col class="qty"><col class="paid"><col class="old"><col class="note"></colgroup>'
			+ '<thead><tr><th>#</th><th>العميل</th><th>الكمية</th><th>المدفوع</th><th>الرصيد القديم</th><th>ملاحظة</th></tr></thead>'
			+ '<tbody>'+rows_html+'</tbody></table>'
			+ '<div class="no-print" style="margin-top:10px;"><button onclick="window.print()">طباعة</button></div>'
			+ '</body></html>';
		win.document.open(); win.document.write(html); win.document.close();
	}

	// Events
	$btn_add.on('click', () => add_row());
	$btn_clear.on('click', () => clear_all());
	$btn_submit.on('click', submit_all);
	$modal.close.on('click', () => { close_modal(); clear_all(); });
	$modal.ok.on('click', () => { close_modal(); clear_all(); });
	$modal.backdrop.on('click', (e) => { if (e.target === $modal.backdrop[0]) { close_modal(); clear_all(); } });

	// Start
	add_row();
};