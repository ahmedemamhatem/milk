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
				--gap: 10px;
				--border: #e5e7eb;
				--muted: #6b7280;
				--bg: #fff;
				--bg-soft: #fafafa;
				--chip-bg: #f9fafb;
				--chip-text: #111827;
				--accent: #2563eb;
			}
			.dmq-root { margin:-15px; padding:0 12px 16px; background:var(--bg); font-weight:700; }

			/* Toolbar */
			.dmq-toolbar {
				display:grid; gap: var(--gap);
				grid-template-columns: repeat(5, minmax(140px, 1fr)) auto;
				align-items:end; padding:10px 4px 10px; border-bottom:1px solid var(--border);
			}
			.dmq-tool { display:flex; flex-direction:column; gap:4px; }
			.dmq-tool .label { font-size:11px; color:var(--muted); font-weight:600; padding-inline:2px; }
			.dmq-tool .body .control-label { display:none !important; }
			.dmq-tool .body .control-input, .dmq-tool .body input, .dmq-tool .body .input-with-feedback, .dmq-tool .body select {
				height:30px; min-height:30px; padding:4px 8px; font-size:12px; width:100%;
			}
			.dmq-actions { display:flex; gap:8px; align-items:center; justify-content:flex-end; }

			/* Cards container */
			.cards-wrap {
				padding: 12px 4px 0;
				display:grid; gap: 12px;
				grid-template-columns: repeat(4, minmax(220px, 1fr));
			}
			@media (max-width:1200px){
				.cards-wrap { grid-template-columns: repeat(3, minmax(220px,1fr)); }
			}
			@media (max-width:900px){
				.cards-wrap { grid-template-columns: repeat(2, minmax(220px,1fr)); }
			}
			@media (max-width:600px){
				.cards-wrap { grid-template-columns: 1fr; }
				.dmq-toolbar { grid-template-columns: repeat(2, minmax(140px,1fr)); grid-auto-rows: auto; }
			}

			/* Supplier card */
			.card {
				border:1px solid var(--border); border-radius:10px; background:var(--bg);
				padding:10px; display:flex; flex-direction:column; gap:10px;
			}
			.card-head {
				display:flex; align-items:center; justify-content:space-between;
			}
			.card-supplier {
				font-size:14px; font-weight:800; color:var(--chip-text);
				display:inline-flex; align-items:center; gap:6px;
				background:var(--chip-bg); border:1px solid var(--border);
				border-radius:999px; padding:6px 10px;
				max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
			}
			.card-del { color:#b91c1c; }
			.card-grid {
				display:grid; gap:8px;
				grid-template-columns: repeat(3, 1fr);
			}
			@media (max-width:400px){ .card-grid { grid-template-columns: 1fr 1fr; } }
			.cell { display:flex; flex-direction:column; gap:4px; }
			.cell label { font-size:11px; color:var(--muted); }
			.cell input.form-control {
				height:30px; min-height:30px; padding:4px 8px; font-size:12px;
			}
			.input-invalid { border-color:#ef4444 !important; background:#fff1f2; }

			.empty-note {
				margin:14px 6px 0; padding:12px; border:1px dashed var(--border); border-radius:10px;
				color:var(--muted); font-weight:600; text-align:center;
			}
		</style>

		<!-- Toolbar -->
		<div class="dmq-toolbar" role="region" aria-label="المرشحات والإجراءات">
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

		<!-- Cards Grid -->
		<div class="cards-wrap" data-cards></div>
		<div class="empty-note" data-empty>لا توجد بطاقات موردين بعد. اضغط "جلب الموردين".</div>
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

	// Refs
	const $cards = $ui.find('[data-cards]');
	const $empty = $ui.find('[data-empty]');

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
		change: () => { state.driver = controls.driver.get_value(); }
	}, '[data-field="driver"]');

	controls.village = Control({
		fieldtype: "Link",
		fieldname: "village",
		label: "القرية",
		options: "Village",
		change: () => { state.village = controls.village.get_value(); }
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

	// Actions
	const $btn_load = $ui.find('[data-action="load"]');
	const $btn_submit = $ui.find('[data-action="submit"]');
	const $btn_clear = $ui.find('[data-action="clear"]');

	function toggle_empty() {
		if (!state.rows.length) { $empty.show(); $cards.hide(); }
		else { $empty.hide(); $cards.show(); }
	}

	function render_cards() {
		$cards.empty();
		state.rows.forEach((rec, i) => {
			const $card = $(`
				<div class="card" data-index="${i}">
					<div class="card-head">
						<div class="card-supplier" title="${frappe.utils.escape_html(rec.supplier || '')}">
							<span>${frappe.utils.escape_html(rec.supplier || '')}</span>
						</div>
						<button type="button" class="btn btn-xs btn-link card-del" title="حذف">✕</button>
					</div>
					<div class="card-grid">
						<div class="cell"><label>ماء</label><input type="text" class="form-control float-only" data-cell="water" value="${rec.water ?? ''}" inputmode="decimal" placeholder="0.00"></div>
						<div class="cell"><label>بروتين</label><input type="text" class="form-control float-only" data-cell="protein" value="${rec.protein ?? ''}" inputmode="decimal" placeholder="0.00"></div>
						<div class="cell"><label>كثافة</label><input type="text" class="form-control float-only" data-cell="density" value="${rec.density ?? ''}" inputmode="decimal" placeholder="0.00"></div>
						<div class="cell"><label>صلابة</label><input type="text" class="form-control float-only" data-cell="hardness" value="${rec.hardness ?? ''}" inputmode="decimal" placeholder="0.00"></div>
						<div class="cell"><label>بنط</label><input type="text" class="form-control float-only" data-cell="pont" value="${rec.pont ?? ''}" inputmode="decimal" placeholder="0.00"></div>
					</div>
				</div>
			`);
			// Bind number inputs
			$card.find('input.float-only').each(function() { wireFloatOnly($(this), rec); });
			// Delete
			$card.find('.card-del').on('click', () => {
				state.rows.splice(i, 1);
				render_cards(); toggle_empty();
			});
			$cards.append($card);
		});
		toggle_empty();
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

	function get_flags_from_controls() {
		const s = controls.session.get_value() || 'morning';
		const morning = s === 'morning' ? 1 : 0;
		const evening = s === 'evening' ? 1 : 0;
		const a = controls.animal_type.get_value() || 'Buffalo';
		const cow = a === 'Cow' ? 1 : 0;
		const buffalo = a === 'Buffalo' ? 1 : 0;
		return { morning, evening, cow, buffalo };
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
			render_cards();
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title: 'خطأ', message: e.message || String(e), indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
		}
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

	function clear_all(keep_filters=false) {
		state.rows = [];
		render_cards();
		if (!keep_filters) {
			controls.driver && controls.driver.set_value("");
			controls.village && controls.village.set_value("");
			controls.date && controls.date.set_value(frappe.datetime.get_today());
			controls.session && controls.session.set_value('morning');
			controls.animal_type && controls.animal_type.set_value('Buffalo');
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
			frappe.msgprint({ title: 'تنبيه', message: err.message || String(err), indicator: 'orange' });
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
			// Keep filters, clear cards
			clear_all(true);
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title: 'خطأ', message: e.message || String(e), indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
		}
	}

	$btn_load.on('click', load_suppliers);
	$btn_submit.on('click', submit_all);
	$btn_clear.on('click', () => clear_all(false));

	// initial
	render_cards();
	toggle_empty();
};