frappe.provide("milk.daily_milk_quality");

frappe.pages['daily-milk-quality'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'تسجيل جودة اللبن اليومي',
		single_column: true
	});

	const $section = $(wrapper).find('.layout-main-section');
	$section.empty();

	const ui = `
	<div class="dmq-root" dir="rtl">
		<style>
			:root {
				--border:#e5e7eb; --muted:#6b7280; --bg:#fff; --soft:#fafafa;
			}
			.dmq-root { margin:-15px; padding:0 12px 16px; background:var(--bg); font-weight:700; }

			/* Toolbar */
			.dmq-toolbar {
				display:grid; gap:10px;
				grid-template-columns: repeat(5, minmax(150px, 1fr)) auto;
				align-items:end; padding:10px 4px 10px; border-bottom:1px solid var(--border);
			}
			.dmq-tool { display:flex; flex-direction:column; gap:4px; }
			.dmq-tool .label { font-size:11px; color:var(--muted); font-weight:600; padding-inline:2px; }
			.dmq-tool .body .control-label { display:none !important; }
			.dmq-tool .body .control-input, .dmq-tool .body input, .dmq-tool .body .input-with-feedback, .dmq-tool .body select {
				height:30px; min-height:30px; padding:4px 8px; font-size:12px; width:100%;
			}
			.dmq-actions { display:flex; gap:8px; align-items:center; justify-content:flex-end; }

			/* Table Card */
			.table-card { margin-top:8px; border:1px solid var(--border); border-radius:8px; background:#fff; overflow:visible; }
			/* We remove the big header and summary per your request */

			/* Grid columns: #, supplier(link), water, protein, density, hardness, pont, delete */
			.dmq-grid {
				display:grid;
				grid-template-columns: 48px minmax(260px,1fr) 110px 110px 110px 110px 110px 60px;
				align-items:center;
			}
			.dmq-head, .dmq-foot { background:var(--soft); }
			.dmq-head>div, .dmq-row>div, .dmq-foot-row>div {
				padding:6px 8px; border-bottom:1px solid var(--border); min-height:40px; display:flex; align-items:center;
			}
			.th { font-size:12px; font-weight:600; color:var(--muted); }
			.center { justify-content:center; text-align:center; }
			.right { justify-content:flex-start; text-align:right; }

			.dmq-body .dmq-row:nth-child(even) { background:#fbfbfb; }
			.dmq-row { position:relative; overflow:visible; z-index:0; }

			.dmq-row input.form-control {
				height:28px; min-height:28px; padding:3px 6px; font-size:12px;
			}
			.btn-del-row { color:#b91c1c; }
			.btn-add-row { margin:8px 10px; }

			.input-invalid { border-color:#ef4444 !important; background:#fff1f2; }

			@media (max-width:1200px){
				.dmq-grid { grid-template-columns:48px minmax(220px,1fr) 100px 100px 100px 100px 100px 60px; }
			}
			@media (max-width:860px){
				.dmq-toolbar { grid-template-columns: repeat(2, minmax(160px,1fr)); grid-auto-rows:auto; }
			}
		</style>

		<!-- Toolbar with compact actions -->
		<div class="dmq-toolbar" role="region" aria-label="مرشحات وإجراءات">
			<div class="dmq-tool" data-tool="driver">
				<div class="label">الخط</div>
				<div class="body"><div data-field="driver"></div></div>
			</div>
			<div class="dmq-tool" data-tool="village">
				<div class="label">القرية</div>
				<div class="body"><div data-field="village"></div></div>
			</div>
			<div class="dmq-tool" data-tool="date">
				<div class="label">التاريخ</div>
				<div class="body"><div data-field="date"></div></div>
			</div>
			<div class="dmq-tool" data-tool="session">
				<div class="label">الفترة</div>
				<div class="body"><div data-field="session"></div></div>
			</div>
			<div class="dmq-tool" data-tool="animal_type">
				<div class="label">النوع</div>
				<div class="body"><div data-field="animal_type"></div></div>
			</div>

			<div class="dmq-actions">
				<button class="btn btn-default btn-xs" data-action="load">جلب الموردين</button>
				<button class="btn btn-primary btn-xs" data-action="submit">تأكيد</button>
				<button class="btn btn-default btn-xs" data-action="clear">مسح</button>
			</div>
		</div>

		<!-- Table -->
		<div class="table-card" role="region" aria-label="جدول جودة اللبن">
			<div class="dmq-head dmq-grid">
				<div class="th center">#</div>
				<div class="th right">المورد</div>
				<div class="th center">ماء</div>
				<div class="th center">بروتين</div>
				<div class="th center">كثافة</div>
				<div class="th center">صلابة</div>
				<div class="th center">بنط</div>
				<div class="th center">حذف</div>
			</div>

			<div class="dmq-body" data-body="rows">
				<div class="dmq-row dmq-grid"><div class="right" style="grid-column:1 / -1; padding:10px;">لا توجد بيانات</div></div>
			</div>

			<div class="dmq-foot">
				<div class="dmq-foot-row dmq-grid" aria-hidden="true">
					<div></div>
					<div class="right" style="font-weight:600;"></div>
					<div class="center"></div>
					<div class="center"></div>
					<div class="center"></div>
					<div class="center"></div>
					<div class="center"></div>
					<div></div>
				</div>
			</div>

			<div class="table-bottom-actions" style="padding:10px;">
				<button class="btn btn-default btn-xs btn-add-row" data-action="add_row_bottom">إضافة صف</button>
			</div>
		</div>
	</div>`;

	const $ui = $(ui);
	$section.append($ui);

	// State
	const state = {
		driver: "",
		village: "",
		date: frappe.datetime.get_today(),
		session: 'morning', // morning | evening
		animal_type: 'Buffalo', // default "جاموس"
		rows: [] // {supplier, water, protein, density, hardness, pont}
	};

	let rowControls = []; // keep ControlLink refs to update queries

	// Elements
	const $body = $ui.find('[data-body="rows"]');

	// Controls
	const controls = {};
	function Control(df, sel) {
		const M = {
			Link: frappe.ui.form.ControlLink,
			Date: frappe.ui.form.ControlDate,
			Select: frappe.ui.form.ControlSelect,
			Data: frappe.ui.form.ControlData
		};
		const C = M[df.fieldtype] || frappe.ui.form.ControlData;
		return new C({ df, parent: $ui.find(sel)[0], render_input: true });
	}

	controls.driver = Control({
		fieldtype: "Link",
		fieldname: "driver",
		label: "الخط",
		options: "Driver",
		change: () => {
			state.driver = controls.driver.get_value();
			updateSupplierLinkQueries();
		}
	}, '[data-field="driver"]');

	controls.village = Control({
		fieldtype: "Link",
		fieldname: "village",
		label: "القرية",
		options: "Village",
		change: () => {
			state.village = controls.village.get_value();
			updateSupplierLinkQueries();
		}
	}, '[data-field="village"]');

	controls.date = Control({
		fieldtype: "Date",
		fieldname: "date",
		label: "التاريخ",
		default: state.date,
		change: () => state.date = controls.date.get_value()
	}, '[data-field="date"]');
	controls.date.set_value(state.date);

	controls.session = Control({
		fieldtype: "Select",
		fieldname: "session",
		label: "الفترة",
		options: [
			{ label: "صباح", value: "morning" },
			{ label: "مساء", value: "evening" }
		],
		default: "morning",
		change: () => { state.session = controls.session.get_value(); }
	}, '[data-field="session"]');
	controls.session.set_value(state.session);

	controls.animal_type = Control({
		fieldtype: "Select",
		fieldname: "animal_type",
		label: "النوع",
		options: [
			{ label: "بقر", value: "Cow" },
			{ label: "جاموس", value: "Buffalo" }
		],
		change: () => { state.animal_type = controls.animal_type.get_value(); }
	}, '[data-field="animal_type"]');
	controls.animal_type.set_value(state.animal_type);

	// Buttons
	const $btn_load = $ui.find('[data-action="load"]');
	const $btn_clear = $ui.find('[data-action="clear"]');
	const $btn_submit = $ui.find('[data-action="submit"]');
	const $btn_add_row_bottom = $ui.find('[data-action="add_row_bottom"]');

	function render_rows() {
		$body.empty();
		rowControls = [];
		if (!state.rows.length) {
			$body.append(`<div class="dmq-row dmq-grid"><div class="right" style="grid-column:1 / -1; padding:10px;">لا توجد بيانات</div></div>`);
			return;
		}
		let idx = 1;
		state.rows.forEach((rec, i) => {
			const $row = $(`
				<div class="dmq-row dmq-grid" data-index="${i}">
					<div class="center"><span>${idx}</span></div>
					<div class="right"><div data-cell="supplier_link"></div></div>
					<div class="center"><input type="text" class="form-control float-only" data-cell="water"    value="${rec.water ?? ''}"    inputmode="decimal" placeholder="0.00"></div>
					<div class="center"><input type="text" class="form-control float-only" data-cell="protein"  value="${rec.protein ?? ''}"  inputmode="decimal" placeholder="0.00"></div>
					<div class="center"><input type="text" class="form-control float-only" data-cell="density"  value="${rec.density ?? ''}"  inputmode="decimal" placeholder="0.00"></div>
					<div class="center"><input type="text" class="form-control float-only" data-cell="hardness" value="${rec.hardness ?? ''}" inputmode="decimal" placeholder="0.00"></div>
					<div class="center"><input type="text" class="form-control float-only" data-cell="pont"     value="${rec.pont ?? ''}"     inputmode="decimal" placeholder="0.00"></div>
					<div class="center">
						<button type="button" class="btn btn-xs btn-link btn-del-row" title="حذف الصف">✕</button>
					</div>
				</div>
			`);
			$body.append($row);

			// Supplier Link field
			const supplier_parent = $row.find('div[data-cell="supplier_link"]')[0];
			const supplierLink = new frappe.ui.form.ControlLink({
				df: {
					fieldtype: "Link",
					fieldname: `supplier_${i}`,
					label: "المورد",
					options: "Supplier",
					reqd: 0,
					only_select: 0
				},
				parent: supplier_parent,
				render_input: true
			});
			if (rec.supplier) supplierLink.set_value(rec.supplier);
			supplierLink.get_query = makeSupplierQuery();

			function syncSupplier() {
				rec.supplier = supplierLink.get_value() || "";
			}
			if (supplierLink.$input) {
				supplierLink.$input.on('change', syncSupplier);
				supplierLink.$input.on('blur', syncSupplier);
				supplierLink.$input.on('input', syncSupplier);
			}

			// Numeric handling + delete
			$row.find('input.float-only').each(function() { wireFloatOnly($(this), rec); });
			$row.find('.btn-del-row').on('click', () => {
				state.rows.splice(i,1);
				render_rows();
			});

			rowControls.push({ supplierLink });
			idx++;
		});
	}

	function makeSupplierQuery() {
		return () => {
			const q = { filters: { disabled: 0, custom_milk_supplier: 1 } };
			const drv = controls.driver && controls.driver.get_value();
			if (drv) q.filters['custom_driver_in_charge'] = drv;
			return q;
		};
	}

	function updateSupplierLinkQueries() {
		rowControls.forEach(rc => {
			if (rc && rc.supplierLink) {
				rc.supplierLink.get_query = makeSupplierQuery();
			}
		});
	}

	function wireFloatOnly($input, rec) {
		$input.on('wheel', e => e.preventDefault(), { passive:false });
		$input.on('keydown', (e) => {
			const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
			if (allowed.includes(e.key)) return;
			if (['e','E','+'].includes(e.key)) { e.preventDefault(); return; }
			if (e.key === '-') {
				const val = e.target.value; const start = e.target.selectionStart || 0;
				if (start !== 0 || val.includes('-')) e.preventDefault();
				return;
			}
			if (e.key >= '0' && e.key <= '9') return;
			if (e.key === '.' || e.key === ',') {
				const val = e.target.value;
				if (val.includes('.') || val.includes(',')) e.preventDefault();
				return;
			}
			e.preventDefault();
		});
		$input.on('input', (e) => {
			const key = $input.data('cell');
			let v = (e.target.value || '').replace(',', '.');
			if (!/^-?\d*\.?\d*$/.test(v)) $input.addClass('input-invalid'); else $input.removeClass('input-invalid');
			rec[key] = v;
			e.target.value = v;
		});
		$input.on('blur', (e) => {
			const key = $input.data('cell');
			let v = (e.target.value || '').trim().replace(',', '.');
			if (v === '.' || v === '-.' || v === '-') v = '';
			if (v && !/^-?\d*\.?\d+$/.test(v)) $input.addClass('input-invalid'); else $input.removeClass('input-invalid');
			rec[key] = v;
			e.target.value = v;
		});
	}

	function add_empty_row() {
		state.rows.push({
			supplier: "",
			water: "", protein: "", density: "", hardness: "", pont: ""
		});
		render_rows();
	}

	function clear_all(keep_filters=false) {
		state.rows = [];
		rowControls = [];
		render_rows();
		if (!keep_filters) {
			controls.driver && controls.driver.set_value("");
			controls.village && controls.village.set_value("");
			controls.date && controls.date.set_value(frappe.datetime.get_today());
			controls.session && controls.session.set_value('morning');
			controls.animal_type && controls.animal_type.set_value('Buffalo');
		}
	}

	function get_flags_from_controls() {
		const s = controls.session.get_value() || 'morning';
		const morning = s === 'morning' ? 1 : 0;
		const evening = s === 'evening' ? 1 : 0;
		const a = controls.animal_type.get_value() || 'Buffalo';
		const cow = a === 'Cow' ? 1 : 0;
		const buffalo = a === 'Buffalo' ? 1 : 0;
		return { morning, evening, cow, buffalo };
	}

	function build_child_rows() {
		const rows = [];
		state.rows.forEach(r => {
			const supplier = (r.supplier || '').trim();
			if (!supplier) return;

			const norm = k => (r[k] ?? '').toString().replace(',', '.').trim();
			const keys = ['water','protein','density','hardness','pont'];
			const vals = keys.map(norm);

			for (let i=0; i<keys.length; i++) {
				const v = vals[i];
				if (v !== '' && !/^-?\d*\.?\d+$/.test(v)) {
					throw new Error(`قيمة غير صحيحة في "${labelOf(keys[i])}" للمورد "${supplier}".`);
				}
			}
			const all_blank = vals.every(v => v === '');
			if (all_blank) return;

			rows.push({
				supplier,
				water: vals[0],
				protein: vals[1],
				density: vals[2],
				hardness: vals[3],
				pont: vals[4]
			});
		});
		return rows;
	}
	function labelOf(k) {
		return ({ water:'ماء', protein:'بروتين', density:'كثافة', hardness:'صلابة', pont:'بنط' })[k] || k;
	}

	async function load_suppliers() {
		const driver = controls.driver.get_value();
		const village = controls.village.get_value();
		const date = controls.date.get_value();

		if (!date) { frappe.msgprint("يرجى تحديد التاريخ."); return; }

		try {
			frappe.dom.freeze(__('جاري تحميل الموردين...'));
			const r = await frappe.call({
				method: "milk.milk.page.daily_milk_quality.api.load_daily_quality",
				args: { driver: driver || "", village: village || "", date }
			});
			const msg = r.message || {};
			state.rows = (msg.rows || []).map(x => ({
				supplier: x.supplier || "",
				water: "", protein: "", density: "", hardness: "", pont: ""
			}));
			render_rows();
			if (!state.rows.length) {
				frappe.show_alert({ message: 'لا توجد بيانات', indicator: 'orange' }, 4);
			}
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title:'خطأ', message: e.message || String(e), indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
		}
	}

	async function submit_all() {
		const driver = controls.driver.get_value();
		const village = controls.village.get_value();
		const date = controls.date.get_value();
		const { morning, evening, cow, buffalo } = get_flags_from_controls();

		if (!date) { frappe.msgprint("يرجى تحديد التاريخ."); return; }

		let child_rows;
		try {
			child_rows = build_child_rows();
		} catch (err) {
			frappe.msgprint({ title:'تنبيه', message: err.message || String(err), indicator: 'orange' });
			return;
		}
		if (!child_rows.length) {
			frappe.msgprint("لم يتم إدخال صفوف صالحة.");
			return;
		}

		try {
			frappe.dom.freeze(__('جاري التأكيد...'));
			const r = await frappe.call({
				method: "milk.milk.page.daily_milk_quality.api.insert_and_submit_daily_quality",
				args: { driver: driver || "", village: village || "", date, morning, evening, cow, buffalo, rows: child_rows }
			});
			const msg = r.message || {};
			frappe.show_alert({ message: `تم التأكيد بنجاح (${msg.docname || ''})`, indicator: 'green' }, 5);
			clear_all(true);
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title:'خطأ', message: e.message || String(e), indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
		}
	}

	$btn_load.on('click', load_suppliers);
	$btn_submit.on('click', submit_all);
	$btn_clear.on('click', () => clear_all(false));
	$btn_add_row_bottom.on('click', add_empty_row);

	render_rows();
};