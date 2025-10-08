frappe.provide("milk.daily_milk_quality");

frappe.pages['daily-milk-quality'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'تسجيل جودة اللبن اليومي',
		single_column: true
	});
  document.title = " تسجيل جودة اللبن اليومي ";
	const $section = $(wrapper).find('.layout-main-section');
	$section.empty();

	const ui = `
	<div class="dmq-root" dir="rtl">
		<style>
		
		/* Root palette and global container */
:root {
	--border:#e5e7eb;              /* gray-200 */
	--border-strong:#cbd5e1;       /* slate-300 */
	--muted:#6b7280;               /* gray-500 */
	--ink:#111827;                 /* gray-900 */
	--bg:#ffffff;                  /* white */
	--soft:#fafafa;                /* soft background */
	--row-hover:#f6f7fb;           /* subtle hover */
	--row-active-bg:#e0f2fe;       /* blue-100 */
	--row-active-border:#0ea5e9;   /* sky-500 */
	--row-active-shadow: rgba(14,165,233,.25);
	--row-filled-stripe:#bbf7d0;   /* green-200 */
	--radius:12px;
}
html, body {
	background: var(--bg);
	color: var(--ink);
}
.dmq-root {
	margin: -15px;
	padding: 0 12px 16px;
	background: var(--bg);
	position: relative;
	z-index: 0;
	font-synthesis-weight: auto;
}

/* Toolbar: labels centered, inputs centered, keep Frappe defaults */
.dmq-toolbar {
	display: grid;
	gap: 12px;
	grid-template-columns: repeat(5, minmax(160px, 1fr)) auto;
	align-items: end;
	padding: 12px 4px;
	border-bottom: 1px solid var(--border);
}
.dmq-tool {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.dmq-tool .label {
	font-size: 12px;
	color: var(--muted);
	font-weight: 700;
	text-align: center;
}
.dmq-tool .body :is(.frappe-control, .control-input, input, select) {
	height: 34px;
	min-height: 34px;
	padding: 6px 10px;
	font-size: 13px;
	width: 100%;
	text-align: center; /* remove if you prefer left-aligned */
}
/* Hide internal labels inside Frappe controls to avoid duplicates */
.dmq-tool .frappe-control .control-label {
	display: none !important;
}
.dmq-actions {
	display: flex;
	gap: 8px;
	align-items: center;
	justify-content: flex-end;
}
@media (max-width: 980px) {
	.dmq-toolbar {
		grid-template-columns: repeat(2, minmax(160px, 1fr));
		grid-auto-rows: auto;
	}
}

/* Card shell for the table */
.table-card {
	margin-top: 10px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: #fff;
}

/* Table head: sticky look-alike (not position: sticky to avoid stacking issues) */
.table-head {
	display: grid;
	grid-template-columns: 64px minmax(420px,1fr) 140px 140px 140px 140px 140px 84px;
	padding: 10px 8px;
	border-bottom: 1px solid var(--border);
	background: linear-gradient(180deg, #fafafa, #f5f5f5);
	font-weight: 800;
	color: #334155;
	font-size: 12px;
	text-align: center;
	position: relative;
	z-index: 1;
}
.table-head > div {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Body wrapper */
.table-body {
	display: block;
	position: relative;
	z-index: 0;
}

/* Row grid with stable full-width highlights behind fields
   Row height increased to ~1.25x: we raise min-height and input heights slightly */
.table-row {
	display: grid;
	grid-template-columns: 64px minmax(420px,1fr) 140px 140px 140px 140px 140px 84px;
	align-items: center;
	padding: 10px 8px;                 /* was 8px; add a bit more padding */
	min-height: 54px;                  /* ensure about 1.25x height */
	border-bottom: 1px solid var(--border);
	position: relative;                /* for highlight layers */
	z-index: 1;
	overflow: visible;
	background: transparent;           /* fields use Frappe default backgrounds */
}

/* Make each cell sit above highlight layers; add soft vertical guides */
.table-row > div {
	border-inline-start: 1px solid #f1f5f9;
	padding-inline: 6px;
	position: relative;
	z-index: 2;                         /* content above highlights */
	overflow: visible;
}
.table-row > div:first-child {
	border-inline-start: none;
}

/* Full-row highlight layer */
.table-row::before {
	content: "";
	position: absolute;
	inset: 0;                           /* full coverage */
	background: transparent;
	transition: background-color .12s ease, box-shadow .12s ease;
	z-index: 1;
	pointer-events: none;
}

/* Left stripe layer (filled or active) */
.table-row::after {
	content: "";
	position: absolute;
	inset-inline-start: 0;
	top: 0; bottom: 0;
	width: 0;                           /* default hidden */
	background: transparent;
	border-radius: 0 6px 6px 0;
	z-index: 1;
	pointer-events: none;
}

/* Hover: clean and full-width */
.table-row:hover::before {
	background: var(--row-hover);
}

/* Filled: subtle green stripe; fields unchanged */
.table-row.is-filled::after {
	width: 4px;
	background: var(--row-filled-stripe);
	border-radius: 0 4px 4px 0;
}

/* Active: strong blue row tint + outline; fields unchanged */
.table-row.is-active::before {
	background: var(--row-active-bg);
	box-shadow: 0 0 0 1px var(--border-strong) inset, 0 2px 8px var(--row-active-shadow);
}
.table-row.is-active::after {
	width: 6px;
	background: var(--row-active-border);
	border-radius: 0 6px 6px 0;
}

/* Inputs inside rows: use Frappe default skins; optional center text for uniform columns */
.table-row .frappe-control .control-label {
	display: none !important;
}
/* Slightly increase control height to match row height (keeps Frappe look) */
.table-row :is(.frappe-control, .control-input, input, select, textarea) {
	height: 36px;           /* up from default ~30–32 */
	min-height: 36px;
	line-height: 1.25;      /* readable line height */
	font-size: 12px;
	text-align: center;     /* remove if you prefer left alignment */
}
/* Do not alter borders/backgrounds; keep Frappe defaults */

/* Delete button and footer */
.btn-del-row { color:#b91c1c; }
.btn-del-row:hover { color:#7f1d1d; text-decoration:none; }
.table-bottom { padding: 10px; }

/* Ensure link dropdowns are above the grid (Awesomplete / Selectize) */
.dmq-root .awesomplete > ul,
.dmq-root .awesomplete ul,
.dmq-root .awesomplete,
.dmq-root .awesomplete > ul > li,
.dmq-root .link-field .awesomplete > ul,
.dmq-root .selectize-dropdown {
	z-index: 9999 !important;
}
/* Some builds attach the list to body */
.awesomplete ul { z-index: 9999 !important; }
/* Supplier input: slightly larger and bold, keep default borders/background */
.table-row .supplier :is(input, .control-input) {
	font-size: 16px;   /* modest bump */
	font-weight: 700;  /* bold */
	line-height: 1.25;
}

/* Make numbers in all measurement fields bold */
.table-row .water :is(input, .control-input),
.table-row .protein :is(input, .control-input),
.table-row .density :is(input, .control-input),
.table-row .hardness :is(input, .control-input),
.table-row .pont :is(input, .control-input) {
	font-weight: 700;   /* bold numbers */
	/* keep font-size as default; or uncomment next line to bump a bit */
	/* font-size: 15px; */
}
	
		</style>
		
		<!-- Toolbar -->
		<div class="dmq-toolbar">
			<div class="dmq-tool" data-tool="animal_type">
				<div class="label">النوع</div>
				<div class="body"><div data-field="animal_type"></div></div>
			</div>
			<div class="dmq-tool" data-tool="session">
				<div class="label">الفترة</div>
				<div class="body"><div data-field="session"></div></div>
			</div>
			<div class="dmq-tool" data-tool="date">
				<div class="label">التاريخ</div>
				<div class="body"><div data-field="date"></div></div>
			</div>
			<div class="dmq-tool" data-tool="driver">
				<div class="label">الخط</div>
				<div class="body"><div data-field="driver"></div></div>
			</div>
			<div class="dmq-tool" data-tool="village">
				<div class="label">القرية</div>
				<div class="body"><div data-field="village"></div></div>
			</div>

			<div class="dmq-actions">
				<button class="btn btn-default btn-xs" data-action="load">جلب الموردين</button>
				<button class="btn btn-primary btn-xs" data-action="submit">تأكيد</button>
				<button class="btn btn-default btn-xs" data-action="print_draft">طباعة مسودة</button>
				<button class="btn btn-default btn-xs" data-action="clear">مسح</button>
			</div>
		</div>

		<!-- Grid -->
		<div class="table-card">
			<div class="table-head">
				<div>#</div>
				<div>المورد</div>
				<div>ماء</div>
				<div>بروتين</div>
				<div>كثافة</div>
				<div>صلابة</div>
				<div>بنط</div>
				<div>حذف</div>
			</div>
			<div class="table-body" data-rows></div>
			<div class="table-bottom">
				<button class="btn btn-default btn-xs" data-action="add_row_bottom">إضافة صف</button>
			</div>
		</div>
	</div>`;

	const $ui = $(ui);
	$section.append($ui);

	// Error helpers
	function to_text(err) {
		try {
			if (!err) return '';
			if (typeof err === 'string') return err;
			if (err.exc) {
				if (Array.isArray(err.exc)) return err.exc.join('\n');
				if (typeof err.exc === 'string') return err.exc;
			}
			if (err.message) {
				if (typeof err.message === 'string') return err.message;
				return JSON.stringify(err.message);
			}
			return JSON.stringify(err);
		} catch {
			return String(err);
		}
	}
	function show_error(title, err) {
		frappe.msgprint({
			title: title || __('خطأ'),
			message: `<div dir="rtl" style="white-space:pre-wrap">${frappe.utils.escape_html(to_text(err))}</div>`,
			indicator: 'red'
		});
	}

	// State
	const state = {
		driver: "",
		village: "",
		date: frappe.datetime.get_today(),
		session: 'morning',
		animal_type: 'Buffalo',
		rows: []
	};

	// Refs
	const $rows = $ui.find('[data-rows]');
	const $btn_load = $ui.find('[data-action="load"]');
	const $btn_submit = $ui.find('[data-action="submit"]');
	const $btn_clear = $ui.find('[data-action="clear"]');
	const $btn_add_row_bottom = $ui.find('[data-action="add_row_bottom"]');
	const $btn_print_draft = $ui.find('[data-action="print_draft"]');

	// Controls
	const controls = {};
	function Control(df, sel) {
		const C = {
			Link: frappe.ui.form.ControlLink,
			Date: frappe.ui.form.ControlDate,
			Select: frappe.ui.form.ControlSelect,
			Data: frappe.ui.form.ControlData
		}[df.fieldtype] || frappe.ui.form.ControlData;
		return new C({ df, parent: $ui.find(sel)[0], render_input: true });
	}

	controls.animal_type = Control({
		fieldtype: "Select", fieldname: "animal_type", label: "النوع",
		options: [{label:"بقر", value:"Cow"}, {label:"جاموس", value:"Buffalo"}],
		change: () => { state.animal_type = controls.animal_type.get_value(); }
	}, '[data-field="animal_type"]'); controls.animal_type.set_value(state.animal_type);

	controls.session = Control({
		fieldtype: "Select", fieldname: "session", label: "الفترة",
		options: [{label:"صباح", value:"morning"}, {label:"مساء", value:"evening"}],
		default: "morning", change: () => { state.session = controls.session.get_value(); }
	}, '[data-field="session"]'); controls.session.set_value(state.session);

	controls.date = Control({
		fieldtype: "Date", fieldname: "date", label: "التاريخ",
		default: state.date, change: () => state.date = controls.date.get_value()
	}, '[data-field="date"]'); controls.date.set_value(state.date);

	controls.driver = Control({
		fieldtype: "Link", fieldname: "driver", label: "الخط", options: "Driver",
		change: () => { state.driver = controls.driver.get_value(); updateSupplierQueries(); }
	}, '[data-field="driver"]');

	controls.village = Control({
		fieldtype: "Link", fieldname: "village", label: "القرية", options: "Village",
		change: () => { state.village = controls.village.get_value(); }
	}, '[data-field="village"]');

	// Utilities
	function supplier_link_query() {
		return () => {
			const filters = { disabled: 0, custom_milk_supplier: 1 };
			const drv = controls.driver && controls.driver.get_value();
			if (drv) filters['custom_driver_in_charge'] = drv;
			return { filters };
		};
	}
	async function get_supplier_name(id) {
		if (!id) return "";
		try {
			const r = await frappe.db.get_value('Supplier', id, ['supplier_name']);
			return r?.message?.supplier_name || id;
		} catch { return id; }
	}
	function is_filled(rec) {
		const keys = ['water','protein','density','hardness','pont'];
		return keys.some(k => {
			const v = (rec[k] ?? '').toString().trim();
			return v !== '' && v !== '0' && v !== '0.0' && v !== '0.00';
		});
	}

	// Table rendering
	let rowRefs = [];

	function render_rows() {
		$rows.empty();
		rowRefs = [];

		if (!state.rows.length) {
			$rows.append(`<div class="table-empty"></div>`);
			return;
		}

		state.rows.forEach((rec, i) => {
			const idx = i + 1;
			const $row = $(`
				<div class="table-row" data-index="${i}">
					<div class="center">${idx}</div>
					<div class="supplier"></div>
					<div class="num water"></div>
					<div class="num protein"></div>
					<div class="num density"></div>
					<div class="num hardness"></div>
					<div class="num pont"></div>
					<div class="center">
						<button class="btn btn-link btn-xs btn-del-row" title="حذف الصف">✕</button>
					</div>
				</div>
			`);
			$rows.append($row);

			// Supplier Link
			const supplierCtrl = new frappe.ui.form.ControlLink({
				df: { fieldtype:"Link", fieldname:`supplier_${i}`, label:"", options:"Supplier", only_select:1 },
				parent: $row.find('.supplier')[0], render_input: true
			});
			supplierCtrl.get_query = supplier_link_query();
			if (supplierCtrl.$input) {
				supplierCtrl.$input.css({ 'text-align': 'center' });
				supplierCtrl.$input.on('focus', () => set_active_row($row));
			}

			// Numeric cells
			function mkNumberCell(sel, field) {
				const c = new frappe.ui.form.ControlData({
					df: { fieldtype:"Data", fieldname:`${field}_${i}`, label:"" },
					parent: $row.find(sel)[0], render_input: true
				});
				const $inp = c.$input;
				$inp.attr('inputmode','decimal').attr('placeholder','0.00').val(rec[field] ?? '');
				$inp.css({ 'text-align':'center' });
				wireNumeric($inp, rec, field, () => apply_row_state($row, rec));
				return c;
			}
			const ctrl_water    = mkNumberCell('.water','water');
			const ctrl_protein  = mkNumberCell('.protein','protein');
			const ctrl_density  = mkNumberCell('.density','density');
			const ctrl_hardness = mkNumberCell('.hardness','hardness');
			const ctrl_pont     = mkNumberCell('.pont','pont');

			// Init Supplier
			if (rec.supplier) {
				supplierCtrl.set_value(rec.supplier);
				(async () => {
					const full = rec.supplier_name || await get_supplier_name(rec.supplier);
					rec.supplier_name = full;
					if (supplierCtrl.$input) supplierCtrl.$input.val(full);
				})();
			}

			// Sync supplier
			const syncSupplier = async () => {
				const id = supplierCtrl.get_value() || "";
				rec.supplier = id;
				if (id && supplierCtrl.$input) {
					const full = await get_supplier_name(id);
					rec.supplier_name = full;
					supplierCtrl.$input.val(full);
				}
				apply_row_state($row, rec);
			};
			if (supplierCtrl.$input) {
				supplierCtrl.$input.on('change blur', syncSupplier);
			}

			$row.find('.btn-del-row').on('click', () => {
				state.rows.splice(i,1);
				render_rows();
			});

			$row.on('mousedown click', () => set_active_row($row));
			$row.find('input').on('focus', () => set_active_row($row));

			apply_row_state($row, rec);

			rowRefs.push({
				$row, idx: i,
				ctrls: { supplier: supplierCtrl, water: ctrl_water, protein: ctrl_protein, density: ctrl_density, hardness: ctrl_hardness, pont: ctrl_pont }
			});
		});
	}

	function set_active_row($row) {
		rowRefs.forEach(r => r.$row.removeClass('is-active'));
		$row.addClass('is-active');
	}
	function apply_row_state($row, rec) {
		$row.toggleClass('is-filled', is_filled(rec));
	}

	function wireNumeric($input, rec, key, on_change) {
		$input.on('wheel', e => e.preventDefault(), { passive:false });
		$input.on('keydown', (e) => {
			const ok = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
			if (ok.includes(e.key)) return;
			if (['e','E','+'].includes(e.key)) { e.preventDefault(); return; }
			if (e.key === '-') {
				const v = e.target.value; const s = e.target.selectionStart || 0;
				if (s !== 0 || v.includes('-')) e.preventDefault(); return;
			}
			if (e.key >= '0' && e.key <= '9') return;
			if (e.key === '.' || e.key === ',') {
				const v = e.target.value;
				if (v.includes('.') || v.includes(',')) e.preventDefault(); return;
			}
			e.preventDefault();
		});
		$input.on('input', (e) => {
			let v = (e.target.value || '').replace(',', '.');
			if (!/^-?\d*\.?\d*$/.test(v)) $input.addClass('is-invalid'); else $input.removeClass('is-invalid');
			rec[key] = v; e.target.value = v; on_change && on_change();
		});
		$input.on('blur', (e) => {
			let v = (e.target.value || '').trim().replace(',', '.');
			if (v === '.' || v === '-.' || v === '-') v = '';
			if (v && !/^-?\d*\.?\d+$/.test(v)) $input.addClass('is-invalid'); else $input.removeClass('is-invalid');
			rec[key] = v; e.target.value = v; on_change && on_change();
		});
	}

	function add_empty_row() {
		state.rows.push({ supplier:"", supplier_name:"", water:"", protein:"", density:"", hardness:"", pont:"" });
		render_rows();
	}

	function clear_all(keep_filters=false) {
		state.rows = [];
		render_rows();
		if (!keep_filters) {
			controls.animal_type && controls.animal_type.set_value('Buffalo');
			controls.session && controls.session.set_value('morning');
			controls.date && controls.date.set_value(frappe.datetime.get_today());
			controls.driver && controls.driver.set_value("");
			controls.village && controls.village.set_value("");
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
					throw new Error(`قيمة غير صحيحة في "${({water:'ماء', protein:'بروتين', density:'كثافة', hardness:'صلابة', pont:'بنط'})[keys[i]]}" للمورد "${r.supplier_name || supplier}".`);
				}
			}
			if (vals.every(v => v === '')) return;
			rows.push({ supplier, water: vals[0], protein: vals[1], density: vals[2], hardness: vals[3], pont: vals[4] });
		});
		return rows;
	}

	// Print Draft: clean table with empty numeric cells
	function print_draft() {
		// Collect context labels
		const session_val = controls.session.get_value();
		const session_label = session_val === 'evening' ? 'مساء' : 'صباح';
		const animal_val = controls.animal_type.get_value();
		const animal_label = animal_val === 'Cow' ? 'بقر' : 'جاموس';
		const date_label = controls.date.get_value() || '';
		const driver_label = controls.driver.get_value() || '';
		const village_label = controls.village.get_value() || '';

		// Build rows from loaded suppliers
		const rows = (state.rows || []).map((r, idx) => {
			const name = r.supplier_name || r.supplier || '';
			return `<tr>
				<td class="idx">${idx + 1}</td>
				<td class="supplier">${frappe.utils.escape_html(name)}</td>
				<td></td><td></td><td></td><td></td><td></td>
			</tr>`;
		}).join('');

		const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>مسودة جودة اللبن</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
	:root {
		--ink:#111827; --muted:#6b7280; --line:#d1d5db;
	}
	html,body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"; color:var(--ink); }
	.wrap { padding:24px; }
	h1 { font-size:18px; margin:0 0 10px; text-align:center; }
	.meta { display:flex; flex-wrap:wrap; gap:8px 16px; justify-content:center; color:var(--muted); font-weight:700; margin-bottom:14px; }
	.meta .item { white-space:nowrap; }
	table { width:100%; border-collapse:collapse; }
	th, td { border:1px solid var(--line); padding:10px 8px; text-align:center; }
	th { background:#f7f7f7; font-size:12px; color:#374151; }
	td { height:36px; }
	td.supplier, th.supplier { text-align:right; }
	td.idx { width:48px; }
	@media print {
		.wrap { padding:0; }
		.print-hide { display:none !important; }
		@page { margin:14mm; }
	}
</style>
</head>
<body>
<div class="wrap">
	<h1>مسودة تسجيل جودة اللبن</h1>
	<div class="meta">
		<div class="item">النوع: ${animal_label}</div>
		<div class="item">الفترة: ${session_label}</div>
		<div class="item">التاريخ: ${frappe.utils.escape_html(date_label)}</div>
		${driver_label ? `<div class="item">الخط: ${frappe.utils.escape_html(driver_label)}</div>` : ``}
		${village_label ? `<div class="item">القرية: ${frappe.utils.escape_html(village_label)}</div>` : ``}
	</div>

	<table>
		<thead>
			<tr>
				<th>#</th>
				<th class="supplier">المورد</th>
				<th>ماء</th>
				<th>بروتين</th>
				<th>كثافة</th>
				<th>صلابة</th>
				<th>بنط</th>
			</tr>
		</thead>
		<tbody>
			${rows || ''}
		</tbody>
	</table>

	<div class="print-hide" style="margin-top:12px; text-align:center;">
		<button onclick="window.print()" style="padding:8px 12px; font-weight:700;">طباعة</button>
	</div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 100); };</script>
</body>
</html>`;

		const w = window.open('', '_blank');
		if (!w) {
			show_error('خطأ', 'لم يتم فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة (Pop-ups).');
			return;
		}
		w.document.open();
		w.document.write(html);
		w.document.close();
	}

	// Server ops
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
			state.rows = await Promise.all((msg.rows || []).map(async x => {
				const supplier = x.supplier || "";
				const supplier_name = await get_supplier_name(supplier);
				return { supplier, supplier_name, water:"", protein:"", density:"", hardness:"", pont:"" };
			}));
			render_rows();
			if (!state.rows.length) frappe.show_alert({ message:'لا توجد بيانات', indicator:'orange' }, 4);
		} catch (e) {
			console.error(e);
			show_error(__('خطأ'), e);
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
		try { child_rows = build_child_rows(); }
		catch (err) { show_error(__('تنبيه'), err); return; }
		if (!child_rows.length) { frappe.msgprint("لم يتم إدخال صفوف صالحة."); return; }

		try {
			frappe.dom.freeze(__('جاري التأكيد...'));
			const r = await frappe.call({
				method: "milk.milk.page.daily_milk_quality.api.insert_and_submit_daily_quality",
				args: { driver: driver || "", village: village || "", date, morning, evening, cow, buffalo, rows: child_rows }
			});
			const msg = r.message || {};
			frappe.show_alert({ message:`تم التأكيد بنجاح (${msg.docname || ''})`, indicator:'green' }, 5);
			clear_all(true);
		} catch (e) {
			console.error(e);
			show_error(__('خطأ'), e);
		} finally {
			frappe.dom.unfreeze();
		}
	}

	function updateSupplierQueries() {
		rowRefs.forEach(r => { if (r.ctrls?.supplier) r.ctrls.supplier.get_query = supplier_link_query(); });
	}

	// Actions
	$btn_load.on('click', load_suppliers);
	$btn_submit.on('click', submit_all);
	$btn_clear.on('click', () => clear_all(false));
	$btn_add_row_bottom.on('click', add_empty_row);
	$btn_print_draft.on('click', print_draft);

	// Initial
	render_rows();
};