frappe.provide("milk.milk_collection");

frappe.pages['milk_collection'].on_page_load = function (wrapper) {
	// Build page
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'تسجيل اللبن',
		single_column: true
	});

	const $section = $(wrapper).find('.layout-main-section');
	$section.empty();

	// UI
	const ui_html = `
		<div class="fsi-root" dir="rtl">
			<style>
			/* Root + baseline */
			.fsi-root { margin:-15px; padding:0 12px 20px; background:#fff; font-weight:700; }

			/* Toolbar (filters row moved up under page title) */
			.fsi-toolbar {
				display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap;
				padding:10px 4px 8px; border-bottom:1px solid var(--border-color, #e5e7eb);
			}
			.fsi-tool {
				display:flex; flex-direction:column; gap:4px;
				min-width:180px; max-width:260px; flex:1 1 180px;
			}
			.fsi-tool .label { font-size:11px; color:var(--text-muted, #6b7280); font-weight:600; padding-inline:2px; }
			.fsi-tool .body { }
			/* Compact inputs */
			.fsi-tool .body .control-label { display:none !important; }
			.fsi-tool .body .control-input, .fsi-tool .body input, .fsi-tool .body .input-with-feedback {
				height:28px; min-height:28px; padding:3px 6px; font-size:12px; width:100%;
			}
			.fsi-tool[data-tool="use_pont"] .body { display:flex; align-items:center; gap:6px; }

			/* Header actions on the right */
			.fsi-toolbar-actions {
				display:flex; gap:8px; align-items:center; margin-inline-start:auto; padding-bottom:2px;
			}

			/* Summary row (under toolbar) */
			.summary { padding:8px 4px; display:flex; gap:8px; flex-wrap:wrap; }
			.summary .chip { border:1px solid var(--border-color, #e5e7eb); border-radius:6px; padding:6px 8px; font-size:12px; color:var(--text-muted, #6b7280); }

			/* Table wrapper */
			.table-card { margin-top:8px; border:1px solid var(--border-color, #e5e7eb); border-radius:8px; background:#fff; overflow:visible; }
			.table-title { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid var(--border-color, #e5e7eb); color:var(--text-muted, #6b7280); font-size:12px; font-weight:600; }
			.title-actions { display:flex; gap:8px; }

			/* Grid: #, supplier, milk type, morning qty, morning pont, evening qty, evening pont */
			.fsi-grid {
				display:grid;
				grid-template-columns:48px minmax(260px,1fr) 140px 160px 150px 160px 150px;
				align-items:center;
			}
			.fsi-head, .fsi-foot { background:#fafafa; position:static; z-index:auto; }
			.fsi-head>div, .fsi-row>div, .fsi-foot-row>div {
				padding:6px 8px;
				border-bottom:1px solid var(--border-color, #e5e7eb);
				min-height:40px; display:flex; align-items:center;
			}
			.th { font-size:12px; font-weight:600; color:var(--text-muted, #6b7280); }
			.center { justify-content:center; text-align:center; }
			.right { justify-content:flex-start; text-align:right; } /* RTL alignment */

			.fsi-body { max-height:none; overflow:visible; }
			.fsi-body .fsi-row:nth-child(even) { background:#fbfbfb; }
			.fsi-row { position:relative; overflow:visible; z-index:0; cursor: pointer; }

			/* Inputs in grid smaller */
			.fsi-row input.form-control { height:28px; min-height:28px; padding:3px 6px; font-size:12px; }

			/* Village header as a full-width row within body */
			.village-header {
				grid-column: 1 / -1;
				background:#f3f4f6; color:#111827; border-top:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;
				padding:8px 10px; font-size:13px; font-weight:700;
				cursor: default;
			}

			/* Stronger Row highlight on click/focus (more visible) */
			.fsi-row.row-active {
				position: relative;
				background: #e0e7ff; /* stronger indigo tint */
				box-shadow: 0 0 0 2px rgba(94,100,255,0.35) inset, 0 1px 6px rgba(0,0,0,0.06);
				outline: 2px solid #6366f1; /* indigo-500 */
				z-index: 1;
			}
			.fsi-row.row-active::before {
				content: "";
				position: absolute;
				inset-inline-start: 0;
				top: 0;
				bottom: 0;
				width: 6px; /* thicker side bar */
				background: linear-gradient(180deg, #4f46e5, #818cf8);
				border-top-left-radius: 6px;
				border-bottom-left-radius: 6px;
			}
			.fsi-row.row-active > div { border-bottom-color: #a5b4fc; }

			/* Actions bar */
			.actions-bar { padding:8px 10px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; border-top:1px solid var(--border-color, #e5e7eb); background:#fff; }

			/* Awesomplete dropdown robustness */
			.awesomplete { position: relative !important; z-index:1; }
			.awesomplete > ul {
				position: absolute !important;
				inset-inline-start: 0 !important;
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
				z-index: 10;
				direction: rtl;
				box-shadow: 0 8px 16px rgba(0,0,0,.08);
			}
			.awesomplete > ul > li { padding: 6px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; cursor: pointer; }
			.awesomplete > ul > li[aria-selected="true"], .awesomplete > ul > li:hover { background:#f5f5f5; }

			.fsi-root, .layout-main-section, .page-content { overflow: visible !important; }

			.hidden { display:none !important; }

			@media (max-width:1200px){
				.fsi-grid { grid-template-columns:48px minmax(200px,1fr) 120px 140px 120px 140px 120px; }
			}
			@media (max-width:860px){
				.fsi-tool { min-width:160px; flex:1 1 160px; }
			}
			</style>

			<!-- Toolbar: filters moved up -->
			<div class="fsi-toolbar">
				<div class="fsi-tool" data-tool="driver">
					<div class="label">الخط</div>
					<div class="body"><div data-field="driver"></div></div>
				</div>
				<div class="fsi-tool" data-tool="village">
					<div class="label">القرية</div>
					<div class="body"><div data-field="village"></div></div>
				</div>
				<div class="fsi-tool" data-tool="collection_date">
					<div class="label">تاريخ التجميع</div>
					<div class="body"><div data-field="collection_date"></div></div>
				</div>
				<div class="fsi-tool" data-tool="use_pont" style="max-width:180px;">
					<div class="label"> </div>
					<div class="body"><div data-field="use_pont"></div></div>
				</div>

				<div class="fsi-toolbar-actions">
					<button class="btn btn-primary btn-xs" data-action="get_suppliers">عرض الموردين</button>
					<button class="btn btn-default btn-xs" data-action="print_draft">طباعة مسودة</button>
				</div>
			</div>

			<!-- Summary -->
			<div class="summary">
				<div class="chip">عدد الصفوف <span class="v" data-bind="rows_count">0</span></div>
				<div class="chip">إجمالي صباح <span class="v" data-bind="sum_morning">0.00</span></div>
				<div class="chip">إجمالي مساء <span class="v" data-bind="sum_evening">0.00</span></div>
			</div>

			<!-- Table -->
			<div class="table-card">
				<div class="table-title">
					<span>الموردون</span>
					<div class="title-actions">
						<button class="btn btn-primary btn-xs" data-action="save">حفظ</button>
						<button class="btn btn-primary btn-xs" data-action="submit">تأكيد</button>
						<button class="btn btn-default btn-xs" data-action="clear">مسح البيانات</button>
					</div>
				</div>

				<div class="fsi-head fsi-grid">
					<div class="th center">#</div>
					<div class="th right">المورد</div>
					<div class="th center">نوع اللبن</div>
					<div class="th center">كمية الصباح</div>
					<div class="th center pont-col">بنط الصباح</div>
					<div class="th center">كمية المساء</div>
					<div class="th center pont-col">بنط المساء</div>
				</div>

				<div class="fsi-body" data-body="rows">
					<div class="fsi-row fsi-grid"><div class="village-header">لا توجد بيانات</div></div>
				</div>

				<div class="fsi-foot">
					<div class="fsi-foot-row fsi-grid">
						<div></div>
						<div class="right" style="font-weight:600;">الإجماليات</div>
						<div></div>
						<div class="center"><span data-bind="t_morning">0.00</span></div>
						<div class="center pont-col"></div>
						<div class="center"><span data-bind="t_evening">0.00</span></div>
						<div class="center pont-col"></div>
					</div>
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

	// Translation map
	const milkTypeTranslations = {
		"Cow": "بقر",
		"Buffalo": "جاموس",
		"بقر": "Cow",
		"جاموس": "Buffalo",
	};
	function toArabicMilk(type) { return milkTypeTranslations[type] || type || ''; }
	function toEnglishMilk(type) { return milkTypeTranslations[type] || type || ''; }

	function getArabicDayName(dateStr) {
		const daysInArabic = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
		const date = new Date(dateStr);
		return daysInArabic[date.getDay()];
	}

	// State
	const state = {
		driver: null,
		village: null,
		collection_date: frappe.datetime.get_today(),
		use_pont: 0,
		status: 'new',
		rows: []
	};

	// Binds
	const $rows_count = $ui.find('[data-bind="rows_count"]');
	const $sum_morning = $ui.find('[data-bind="sum_morning"]');
	const $sum_evening = $ui.find('[data-bind="sum_evening"]');
	const $t_morning = $ui.find('[data-bind="t_morning"]');
	const $t_evening = $ui.find('[data-bind="t_evening"]');

	const $body = $ui.find('[data-body="rows"]');

	// Buttons
	const $btn_get_suppliers = $ui.find('[data-action="get_suppliers"]');
	const $btn_print_draft = $ui.find('[data-action="print_draft"]');
	const $btn_save = $ui.find('[data-action="save"]');
	const $btn_submit = $ui.find('[data-action="submit"]');
	const $btn_clear = $ui.find('[data-action="clear"]');

	// Controls
	const controls = {};
	function Control(df, sel) {
		const M = {
			Link: frappe.ui.form.ControlLink,
			Float: frappe.ui.form.ControlFloat,
			Currency: frappe.ui.form.ControlCurrency,
			Date: frappe.ui.form.ControlDate,
			Check: frappe.ui.form.ControlCheck,
			Data: frappe.ui.form.ControlData,
			Int: frappe.ui.form.ControlInt
		};
		const C = M[df.fieldtype] || frappe.ui.form.ControlData;
		return new C({ df, parent: $ui.find(sel)[0], render_input: true });
	}

	controls.driver = Control({ fieldtype:"Link", fieldname:"driver", label:"الخط", options:"Driver", reqd:1,
		change: () => state.driver = controls.driver.get_value()
	}, '[data-field="driver"]');

	controls.village = Control({ fieldtype:"Link", fieldname:"village", label:"القرية", options:"Village",
		change: () => state.village = controls.village.get_value()
	}, '[data-field="village"]');

	controls.collection_date = Control({ fieldtype:"Date", fieldname:"collection_date", label:"تاريخ التجميع", default: state.collection_date,
		change: () => state.collection_date = controls.collection_date.get_value()
	}, '[data-field="collection_date"]'); controls.collection_date.set_value(state.collection_date);

	controls.use_pont = Control({ fieldtype:"Check", fieldname:"use_pont", label:"استخدام البنط", default: 0,
		change: () => { state.use_pont = controls.use_pont.get_value() ? 1 : 0; togglePontVisibility(); }
	}, '[data-field="use_pont"]');

	[controls.driver, controls.village].forEach(c => { if (c && c.$input) enableDropdownEscape(c.$input); });

	// Toggle buttons
	function toggleActionButtons(status) {
	 const isSubmitted = status === 'submitted';
	 $btn_save.prop('disabled', isSubmitted);
	 $btn_submit.prop('disabled', isSubmitted);
	 if (controls.use_pont && controls.use_pont.$input) $(controls.use_pont.$input).prop('disabled', isSubmitted);
	}

	// Pont columns hidden unless use_pont=1
	function togglePontVisibility() {
		const show = Boolean(controls.use_pont && controls.use_pont.get_value());
		$ui.find('.pont-col').toggleClass('hidden', !show);
	}

	// Activate a row (by click or focus); deactivate siblings
	function activate_row($row) {
		if (!$row || !$row.length) return;
		if ($row.find('.village-header').length) return; // skip header rows
		$body.children('.fsi-row').removeClass('row-active');
		$row.addClass('row-active');
	}

	// Wire click/focus highlight on a row
	function wire_row_highlight($row) {
		// Click anywhere in row
		$row.on('mousedown', (e) => {
			// Ignore clicks on village header rows
			if ($row.find('.village-header').length) return;
			activate_row($row);
		});
		// Focus within inputs
		$row.on('focusin', () => activate_row($row));
		// If focus leaves to outside the table body, remove active
		$row.on('focusout', () => {
			setTimeout(() => {
				if (!$body.find(':focus').length) {
					$body.children('.fsi-row').removeClass('row-active');
				}
			}, 0);
		});
	}

	// Render rows with village headers (milk type in Arabic)
	function render_rows() {
		$body.empty();
		let idx = 1;

		if (!state.rows.length) {
			$body.append(`<div class="fsi-row fsi-grid"><div class="village-header">لا توجد بيانات</div></div>`);
			apply_summaries(0, 0, 0);
			return;
		}
		let lastVillage = null;
		state.rows.forEach(rec => {
			if (rec.village !== lastVillage) {
				lastVillage = rec.village;
				const vname = rec.village || 'غير محدد';
				$body.append(`<div class="fsi-row fsi-grid"><div class="village-header">القرية: ${frappe.utils.escape_html(vname)}</div></div>`);
			}
			const isSubmitted = state.status === 'submitted';
			const isPontEditable = Number(rec.custom_pont_size_rate) === 1 && !isSubmitted;
			const rowId = frappe.utils.get_random(8);
			const $row = $(`
				<div class="fsi-row fsi-grid" data-id="${rowId}" tabindex="0" aria-label="صف رقم ${idx}">
					<div class="center"><span data-cell="idx">${idx}</span></div>
					<div class="right"><span data-cell="supplier">${frappe.utils.escape_html(rec.supplier || 'غير معروف')}</span></div>
					<div class="center"><span data-cell="milk_type">${frappe.utils.escape_html(rec.milk_type || '')}</span></div>
					<div class="center"><input type="number" class="form-control" data-cell="morning_quantity" value="${Number(rec.morning_quantity)||0}" ${isSubmitted ? 'readonly' : ''}></div>
					<div class="center pont-col"><input type="number" class="form-control" data-cell="morning_pont" value="${Number(rec.morning_pont)||0}" ${!isPontEditable ? 'readonly' : ''}></div>
					<div class="center"><input type="number" class="form-control" data-cell="evening_quantity" value="${Number(rec.evening_quantity)||0}" ${isSubmitted ? 'readonly' : ''}></div>
					<div class="center pont-col"><input type="number" class="form-control" data-cell="evening_pont" value="${Number(rec.evening_pont)||0}" ${!isPontEditable ? 'readonly' : ''}></div>
				</div>
			`);
			$body.append($row);
			wire_row_highlight($row);

			// Input events
			$row.find('input[data-cell="morning_quantity"]').on('input change', e => {
				rec.morning_quantity = flt(e.target.value) || 0;
				recompute_sums();
			});
			$row.find('input[data-cell="evening_quantity"]').on('input change', e => {
				rec.evening_quantity = flt(e.target.value) || 0;
				recompute_sums();
			});
			$row.find('input[data-cell="morning_pont"]').on('input change', e => { rec.morning_pont = flt(e.target.value) || 0; });
			$row.find('input[data-cell="evening_pont"]').on('input change', e => { rec.evening_pont = flt(e.target.value) || 0; });

			idx++;
		});
		recompute_sums();
		togglePontVisibility(); // enforce visibility state
	}

	function apply_summaries(rowsCount, sumM, sumE) {
		$rows_count.text(rowsCount);
		$sum_morning.text(safe_text_number(sumM, 2));
		$sum_evening.text(safe_text_number(sumE, 2));
		$t_morning.text(safe_text_number(sumM, 2));
		$t_evening.text(safe_text_number(sumE, 2));
	}

	function recompute_sums() {
		let sumM = 0, sumE = 0, rcount = 0;
		state.rows.forEach(r => {
			if (!r || !r.supplier) return;
			rcount++;
			sumM += flt(r.morning_quantity) || 0;
			sumE += flt(r.evening_quantity) || 0;
		});
		apply_summaries(rcount, sumM, sumE);
	}

	// Validation helpers
	function validate_pont_field(pontValue, milkTypeEn, isReadonly) {
		if (isReadonly) return "readonly";
		if (pontValue === 0) return "zero";
		if (milkTypeEn === "Cow" && (pontValue < 3 || pontValue > 5)) return "invalid_cow";
		if (milkTypeEn === "Buffalo" && (pontValue < 6 || pontValue > 9)) return "invalid_buffalo";
		return "valid";
	}

	// Populate rows (milk type in Arabic + ordering)
	async function populate_table_with_data(data, status = 'new') {
		state.status = status || 'new';
		toggleActionButtons(state.status);

		const parseVillagesList = _parseVillagesList;
		const getVillageForEntry = (entry) => {
			const explicit = (entry.village || entry.village_name || '').toString().trim();
			if (explicit) return explicit;
			const villages = parseVillagesList(entry.custom_villages);
			if (villages && villages.length) return villages[0];
			return '';
		};

		const normalized = [];
		const suppliersToFetch = new Set();

		const pushEntry = (entry) => {
			const supplier = (entry.supplier_name || entry.supplier || '').toString().trim();
			const milkTypesStr = (entry.milk_type || entry.milk_type_label || '').toString().trim();
			const mt = milkTypesStr ? milkTypesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

			if (mt.length) {
				mt.forEach(one => {
					const ar = toArabicMilk(one);
					const rec = {
						supplier,
						village: getVillageForEntry(entry),
						custom_sort: Number.isFinite(Number(entry.custom_sort)) ? Number(entry.custom_sort) : null,
						morning_quantity: Number(entry.morning_quantity) || 0,
						evening_quantity: Number(entry.evening_quantity) || 0,
						morning_pont: Number(entry.morning_pont) || 0,
						evening_pont: Number(entry.evening_pont) || 0,
						custom_pont_size_rate: Number(entry.custom_pont_size_rate) || 0,
						milk_type: ar
					};
					if (rec.custom_sort == null && supplier) suppliersToFetch.add(supplier);
					normalized.push(rec);
				});
			} else {
				const rec = {
					supplier,
					village: getVillageForEntry(entry),
					custom_sort: Number.isFinite(Number(entry.custom_sort)) ? Number(entry.custom_sort) : null,
					morning_quantity: Number(entry.morning_quantity) || 0,
					evening_quantity: Number(entry.evening_quantity) || 0,
					morning_pont: Number(entry.morning_pont) || 0,
					evening_pont: Number(entry.evening_pont) || 0,
					custom_pont_size_rate: Number(entry.custom_pont_size_rate) || 0,
					milk_type: ''
				};
				if (rec.custom_sort == null && supplier) suppliersToFetch.add(supplier);
				normalized.push(rec);
			}
		};

		(data || []).forEach(pushEntry);

		if (suppliersToFetch.size > 0) {
			try {
				const names = Array.from(suppliersToFetch);
				const supplierDocs = await frappe.db.get_list('Supplier', {
					fields: ['name', 'supplier_name', 'custom_sort', 'custom_villages'],
					filters: [['name', 'in', names]],
					limit: names.length
				});
				const sortMap = {};
				const villageMap = {};
				supplierDocs.forEach(doc => {
					const sortVal = Number.isFinite(Number(doc.custom_sort)) ? Number(doc.custom_sort) : null;
					sortMap[doc.name] = sortVal;
					if (doc.supplier_name) sortMap[doc.supplier_name] = sortVal;
					const villages = _parseVillagesList(doc.custom_villages);
					const vName = villages && villages.length ? villages[0] : '';
					villageMap[doc.name] = vName;
					if (doc.supplier_name) villageMap[doc.supplier_name] = vName;
				});
				normalized.forEach(rec => {
					if (rec.custom_sort == null && rec.supplier && sortMap.hasOwnProperty(rec.supplier)) {
						rec.custom_sort = sortMap[rec.supplier];
					}
					if (!rec.village && rec.supplier && villageMap.hasOwnProperty(rec.supplier)) {
						rec.village = villageMap[rec.supplier];
					}
				});
			} catch (e) {
				console.warn('Failed to fetch custom_sort/custom_villages:', e);
			}
		}

		// invalid/0 sorts to end
		normalized.forEach(rec => {
			if (!Number.isFinite(rec.custom_sort) || rec.custom_sort === 0) rec.custom_sort = 999999;
		});

		// ordering
		normalized.sort((a, b) => {
			if (a.custom_sort !== b.custom_sort) return a.custom_sort - b.custom_sort;
			const sa = (a.supplier || '').toString();
			const sb = (b.supplier || '').toString();
			if (sa !== sb) return sa.localeCompare(sb, 'ar');
			const va = (a.village || '').toString();
			const vb = (b.village || '').toString();
			return va.localeCompare(vb, 'ar');
		});

		state.rows = normalized;
		render_rows();
	}

	// Save or submit
	async function save_or_submit(action) {
		const milk_entries = [];
		let validation_issues = [];
		let invalid_rows = false;
		const validationPromises = [];

		const usePont = Boolean(controls.use_pont.get_value());

		let visualIndex = 0;
		$body.children('.fsi-row').each(function () {
			const $row = $(this);
			if ($row.find('.village-header').length) return; // skip header rows
			visualIndex += 1;

			const supplier = ($row.find('[data-cell="supplier"]').text() || '').trim();
			const milk_type_ar = ($row.find('[data-cell="milk_type"]').text() || '').trim();
			const milk_type_en = toEnglishMilk(milk_type_ar);
			const $mq = $row.find('input[data-cell="morning_quantity"]');
			const $eq = $row.find('input[data-cell="evening_quantity"]');
			const morning_quantity = parseFloat($mq.val()) || 0;
			const evening_quantity = parseFloat($eq.val()) || 0;

			let morning_pont = 0, evening_pont = 0;

			if (usePont) {
				const $mp = $row.find('input[data-cell="morning_pont"]');
				const $ep = $row.find('input[data-cell="evening_pont"]');
				morning_pont = parseFloat($mp.val()) || 0;
				evening_pont = parseFloat($ep.val()) || 0;

				const isMorningPontReadonly = $mp.prop('readonly');
				const isEveningPontReadonly = $ep.prop('readonly');

				const morningPontValidation = validate_pont_field(morning_pont, milk_type_en, isMorningPontReadonly);
				if (morningPontValidation === "invalid_cow") { frappe.msgprint(`خطأ في الصف ${visualIndex}: بنط الصباح (بقر) يجب أن يكون بين ٣ و ٥.`); invalid_rows = true; return false; }
				if (morningPontValidation === "invalid_buffalo") { frappe.msgprint(`خطأ في الصف ${visualIndex}: بنط الصباح (جاموس) يجب أن يكون بين ٦ و ٩.`); invalid_rows = true; return false; }

				const eveningPontValidation = validate_pont_field(evening_pont, milk_type_en, isEveningPontReadonly);
				if (eveningPontValidation === "invalid_cow") { frappe.msgprint(`خطأ في الصف ${visualIndex}: بنط المساء (بقر) يجب أن يكون بين ٣ و ٥.`); invalid_rows = true; return false; }
				if (eveningPontValidation === "invalid_buffalo") { frappe.msgprint(`خطأ في الصف ${visualIndex}: بنط المساء (جاموس) يجب أن يكون بين ٦ و ٩.`); invalid_rows = true; return false; }
			}

			// async average checks
			const promise = new Promise((resolve) => {
				frappe.call({
					method: "milk.milk.utils.get_average_quantity",
					args: { supplier, milk_type: milk_type_en, days: 10 },
					callback: function (response) {
						const average = response.message || { morning: 0, evening: 0 };

						const morning_min = average.morning * 0.80;
						const morning_max = average.morning * 1.20;
						const evening_min = average.evening * 0.80;
						const evening_max = average.evening * 1.20;

						const fmt = (n) => Number.isFinite(n) ? Number(n).toFixed(2) : '0.00';

						let errors = [];
						if (morning_quantity > 0) {
							if (morning_quantity < morning_min || morning_quantity > morning_max) errors.push(`كمية الصباح (${fmt(morning_quantity)}) خارج النطاق (المتوسط: ${fmt(average.morning)} ± 20%).`);
						} else if (morning_quantity === 0) { errors.push(`كمية الصباح = 0`); }

						if (evening_quantity > 0) {
							if (evening_quantity < evening_min || evening_quantity > evening_max) errors.push(`كمية المساء (${fmt(evening_quantity)}) خارج النطاق (المتوسط: ${fmt(average.evening)} ± 20%).`);
						} else if (evening_quantity === 0) { errors.push(`كمية المساء = 0`); }

						if (errors.length > 0) validation_issues.push(`صف ${visualIndex}: ${errors.join(" | ")}`);

						milk_entries.push({ supplier, milk_type: milk_type_en, morning_quantity, morning_pont, evening_quantity, evening_pont });
						resolve();
					},
				});
			});

			validationPromises.push(promise);
		}); // each

		if (invalid_rows) { frappe.msgprint("يرجى تصحيح الأخطاء قبل المتابعة!"); return; }

		await Promise.all(validationPromises);

		if (validation_issues.length > 0) {
			const confirmation_message = validation_issues.join("<br>");
			frappe.confirm(
				`تحذير: توجد مشاكل في الكميات.<br>${confirmation_message}<br>هل تريد المتابعة؟`,
				() => proceed_with_save_or_submit(action, milk_entries),
				() => frappe.msgprint("تم إلغاء العملية.")
			);
		} else {
			proceed_with_save_or_submit(action, milk_entries);
		}
	}

	function proceed_with_save_or_submit(action, milk_entries) {
		frappe.call({
			method: action === "save" ? "milk.milk.utils.save_milk_collection" : "milk.milk.utils.submit_milk_collection",
			args: {
				driver: controls.driver.get_value(),
				village: controls.village.get_value(),
				collection_date: controls.collection_date.get_value(),
				milk_entries,
			},
			callback: function () {
				frappe.msgprint(action === "save" ? "تم حفظ البيانات بنجاح!" : "تم تأكيد البيانات بنجاح!");
				clear_all();
			},
		});
	}

	// Clear/reset page
	function clear_all() {
		state.rows = [];
		state.status = 'new';
		controls.village && controls.village.set_value("");
		controls.use_pont && controls.use_pont.set_value(0);
		togglePontVisibility(); // keep hidden after clear
		render_rows();
		toggleActionButtons(state.status);
		frappe.msgprint("تم مسح البيانات.");
	}

	// Fetch suppliers handler
	async function get_suppliers() {
		const selectedDriver = controls.driver.get_value();
		const selectedDate = controls.collection_date.get_value();
		const selectedVillage = controls.village.get_value();

		if (!selectedDriver || !selectedDate) {
			frappe.msgprint("يرجى تحديد الخط وتاريخ التجميع!");
			return;
		}

		const r = await frappe.call({
			method: "milk.milk.utils.get_suppliers",
			args: {
				driver: selectedDriver,
				collection_date: selectedDate,
				villages: selectedVillage ? [selectedVillage] : []
			}
		});

		const msg = r && r.message ? r.message : {};
		const status = msg.status || 'new';

		let rows = [];
		if (Array.isArray(msg.milk_entries) && msg.milk_entries.length) rows = msg.milk_entries;
		else if (Array.isArray(msg.suppliers) && msg.suppliers.length) rows = msg.suppliers;

		await populate_table_with_data(rows || [], status);

		if (msg.message) frappe.msgprint(msg.message);
		if (!rows || !rows.length) {
			frappe.show_alert({ message: __('لا توجد بيانات لعرضها بعد تطبيق الفلاتر.'), indicator: 'orange' }, 5);
		}

		// enforce pont visibility after any rerender
		togglePontVisibility();
	}

	// PRINT DRAFT
	$btn_print_draft.on('click', async () => {
		try {
			frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

			const selectedDate = controls.collection_date.get_value();
			const today = selectedDate || (frappe.datetime ? frappe.datetime.get_today() : new Date().toISOString().slice(0,10));

			const selectedDriver = controls.driver.get_value();
			const selectedVillage = controls.village.get_value();

			const suppliers = await frappe.db.get_list('Supplier', {
				fields: [
					'name','supplier_name','disabled','custom_milk_supplier','custom_driver_in_charge',
					'custom_villages','custom_buffalo','custom_cow','custom_sort'
				],
				filters: { disabled: 0, custom_milk_supplier: 1 },
				limit: 5000
			});

			if (!suppliers || suppliers.length === 0) {
				frappe.msgprint(__('لا يوجد موردون نشطون بعلم المورد لبن.'));
				return;
			}

			const rows = [];
			const parseVillagesList = _parseVillagesList;

			suppliers.forEach(sup => {
				const driver_name = (sup.custom_driver_in_charge || '').toString().trim() || __('غير محدد');
				if (selectedDriver && driver_name !== selectedDriver) return;

				const villages = parseVillagesList(sup.custom_villages);
				if (!villages.length) return;

				const villagesToUse = selectedVillage ? villages.filter(v => v === selectedVillage) : villages;
				if (!villagesToUse.length) return;

				const sup_name = sup.supplier_name || sup.name;
				const sort_key = Number.isFinite(Number(sup.custom_sort)) && Number(sup.custom_sort) !== 0 ? Number(sup.custom_sort) : 999999;

				const add = (label) => {
					villagesToUse.forEach(vname => {
						rows.push({ driver: driver_name, village: vname, supplier: sup_name, milk_type: label, sort_key });
					});
				};

				if (Number(sup.custom_cow) === 1) add('بقري');
				if (Number(sup.custom_buffalo) === 1) add('جاموسي');
			});

			if (!rows.length) {
				frappe.msgprint(__('لا توجد صفوف للطباعة بعد تطبيق الفلاتر.'));
				return;
			}

			rows.sort((a, b) => {
				if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
				if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
				if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
				return a.milk_type.localeCompare(b.milk_type, 'ar');
			});

			let html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${__('مسودة تجميع الموردين')}</title>
<style>
  :root{ --border:#0f172a; --muted:#627084; --text:#0f172a; }
  @page{ size: A4 portrait; margin: 8mm; }
  html, body{ margin:0; padding:0; color:var(--text); background:#fff; font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .canvas{ width: 194mm; margin: 0 auto; overflow: hidden; box-sizing: border-box; }
  .fitwrap{ transform-origin: top center; }
  .hdr{ display:flex; justify-content:space-between; align-items:flex-end; margin:0 0 3mm 0; border-bottom:1.2px solid var(--border); padding-bottom:2mm; }
  .hdr .title{ font-size:14px; font-weight:800; }
  .hdr .meta{ font-size:10px; color:var(--muted); }
  .village{ margin: 3mm 0; page-break-inside: avoid; }
  .village-title{ font-weight:800; margin:0 0 1.5mm 0; font-size:11px; }
  .grid{ width:100%; border:1.2px solid var(--border); border-radius:0; overflow:hidden; box-sizing: border-box; }
  .row{ display:grid; grid-template-columns: 8mm 45mm 12mm 16mm 16mm 8mm 45mm 12mm 16mm 16mm; align-items: stretch; border-top:1px solid var(--border); min-height: 9.5mm; }
  .row:first-child{ border-top:none; }
  .cell{ padding:2.2mm 1.2mm; font-size:9.8px; border-inline-start:1px solid var(--border); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; box-sizing: border-box; }
  .cell:first-child{ border-inline-start:none; }
  .start{ text-align:start; }
</style>
</head>
<body>
<div class="canvas">
  <div id="fitwrap" class="fitwrap scale-100">
    <div class="hdr">
      <div class="title">${__('مسودة تسجيل اللبن')} -- ${rows[0]?.driver || __('غير محدد')}</div>
    </div>
`;

			const byVillageMap = {};
			rows.forEach(r => { (byVillageMap[r.village] = byVillageMap[r.village] || []).push(r); });
			const villageNames = Object.keys(byVillageMap).sort((a, b) => a.localeCompare(b, 'ar'));

			villageNames.forEach(villageName => {
				const group = byVillageMap[villageName];
				const N = group.length;
				const half = Math.ceil(N / 2);

				let rowsHtml = '';
				for (let i = 0; i < Math.max(half, N - half); i++) {
					const a = group[i] || null;
					const b = group[half + i] || null;
					const aIdx = a ? (i + 1) : '';
					const bIdx = b ? (half + i + 1) : '';

					rowsHtml += `
          <div class="row">
            <div class="cell">${aIdx}</div>
            <div class="cell start">${a ? a.supplier : ''}</div>
            <div class="cell">${a ? a.milk_type : ''}</div>
            <div class="cell"></div>
            <div class="cell"></div>
            <div class="cell">${bIdx}</div>
            <div class="cell start">${b ? b.supplier : ''}</div>
            <div class="cell">${b ? b.milk_type : ''}</div>
            <div class="cell"></div>
            <div class="cell"></div>
          </div>`;
				}

				html += `
      <div class="village">
        <div class="village-title">${__('القرية')}: ${villageName || __('غير محدد')}</div>
        <div class="grid">
          ${rowsHtml || `<div class="row"><div class="cell" style="grid-column:1 / -1; text-align:center; color:#777">${__('لا توجد بيانات')}</div></div>`}
        </div>
      </div>
`;
			});

			html += `
  </div>
</div>
</body>
</html>`;

			const w = window.open('', '_blank');
			if (!w) { frappe.msgprint(__('فضلاً فعّل النوافذ المنبثقة للسماح بالطباعة.')); return; }
			w.document.open(); w.document.write(html); w.document.close(); w.focus();
			setTimeout(() => { w.print(); }, 350);
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title: __('خطأ'), message: e.message || String(e), indicator: 'red' });
		} finally {
			frappe.dom.unfreeze();
		}
	});

	// Events
	$btn_get_suppliers.on('click', get_suppliers);
	$btn_save.on('click', () => save_or_submit('save'));
	$btn_submit.on('click', () => save_or_submit('submit'));
	$btn_clear.on('click', clear_all);

	// Init: hide pont columns before any render
	togglePontVisibility(); // hidden by default
	toggleActionButtons('new');
	render_rows();

	// UTIL: parse Supplier.custom_villages
	function _parseVillagesList(cv) {
		const out = [];
		if (!cv) return out;

		if (Array.isArray(cv)) {
			cv.forEach(item => {
				if (!item) return;
				if (typeof item === 'string') {
					const v = item.trim();
					if (v) out.push(v);
				} else if (typeof item === 'object') {
					const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
					if (v) out.push(v);
				}
			});
			return out;
		}

		if (typeof cv === 'string') {
			const s = cv.trim();
			if (!s) return out;
			try {
				const arr = JSON.parse(s);
				if (Array.isArray(arr)) {
					arr.forEach(item => {
						if (!item) return;
						if (typeof item === 'string') {
							const v = item.trim();
							if (v) out.push(v);
						} else if (typeof item === 'object') {
							const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
							if (v) out.push(v);
						}
					});
					return out;
				}
			} catch (e) {
				s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
				return out;
			}
			s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
			return out;
		}

		return out;
	}
};