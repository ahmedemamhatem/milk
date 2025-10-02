frappe.pages["driver-report"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "تقرير السائق اليومي",
		single_column: true,
	});

	$(page.wrapper).css("direction", "rtl");

	// Styles for better UI + print
	const style = document.createElement("style");
	style.textContent = `
	/* Toolbar */
	.dr-toolbar {
		display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;
		padding: 10px 4px 8px; border-bottom: 1px solid #e5e7eb;
	}
	.dr-tool {
		display: flex; flex-direction: column; gap: 4px;
		min-width: 200px; max-width: 280px; flex: 1 1 200px;
	}
	.dr-tool .label { font-size: 12px; color: #6b7280; font-weight: 600; padding-inline: 2px; }
	.dr-tool .body .control-label { display: none !important; }
	.dr-tool .body .control-input, .dr-tool .body input, .dr-tool .body .input-with-feedback {
		height: 30px; min-height: 30px; padding: 4px 8px; font-size: 13px; width: 100%;
	}
	.dr-toolbar-actions { display: flex; gap: 8px; align-items: center; margin-inline-start: auto; padding-bottom: 2px; }

	/* Cards and tables */
	.dr-results { padding: 12px 4px; }
	.card.dr-card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
	.card-header.dr-header {
		background-color: #d1ecf1; color: #0c5460;
		display: flex; justify-content: space-between; align-items: center;
		padding: 10px 12px;
	}
	.dr-header h3 { margin: 0; font-size: 16px; font-weight: 800; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
	.dr-header .meta { margin: 0; font-size: 13px; color: #0c5460; font-weight: 600; }
	.dr-names { font-size: 12px; font-weight: 700; color: #0c5460; opacity: .9; }
	.table.dr-table { font-size: 1.05rem; }
	.table.dr-table thead th { background:#f8fafc; font-weight:700; }
	.table.dr-table tfoot th, .table.dr-table tfoot td { background:#f8fafc; font-weight:700; }
	/* داخل نفس السطر بين السائق والمساعد */
.dr-names .spacer-inner {
	display: inline-block;
	width: 24px; /* غيّر الرقم حسب رغبتك للمسافة بين السائق والمساعد */
}

/* مسافة كبيرة بين فقرة الصباح وفقرة المساء */
.dr-names .spacer-outer {
	display: inline-block;
	width: 64px; /* غيّر الرقم لمسافة أكبر/أصغر بين الصباح والمساء */
}

/* يمكنك أيضاً فرض تباعد موحد ومساحة قابلة للالتفاف */
.dr-names {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 0; /* نتحكم يدوياً عبر spacers */
}
	/* Print view: print exactly what you see */
	@media print {
		.navbar, .page-head, .page-head .page-actions, .page-form, .btn, .dr-toolbar { display: none !important; }
		.page-container, .layout-main-section, .page-content, .container, body, html { margin:0; padding:0; }
		.dr-results { padding: 0; }
		.card.dr-card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 10px; }
		.card-header.dr-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		.table.dr-table { width: 100%; }
	}
	`;
	document.head.appendChild(style);

	// Toolbar (filters + actions)
	const toolbar = $(`
		<div class="dr-toolbar">
			<div class="dr-tool" data-tool="from_date">
				<div class="label">من تاريخ</div>
				<div class="body"><div data-field="from_date"></div></div>
			</div>
			<div class="dr-tool" data-tool="to_date">
				<div class="label">إلى تاريخ</div>
				<div class="body"><div data-field="to_date"></div></div>
			</div>
			<div class="dr-tool" data-tool="driver">
				<div class="label">السائق</div>
				<div class="body"><div data-field="driver"></div></div>
			</div>
			<div class="dr-toolbar-actions">
				<button class="btn btn-primary btn-sm" data-action="fetch"><i class="fa fa-search ms-1"></i> بحث</button>
				<button class="btn btn-default btn-sm" data-action="clear"><i class="fa fa-refresh ms-1"></i> تحديث</button>
				<button class="btn btn-secondary btn-sm" data-action="print"><i class="fa fa-print ms-1"></i> طباعة</button>
			</div>
		</div>
	`).appendTo(page.body);

	// Results container
	const results_container = $('<div class="dr-results"></div>').appendTo(page.body);

	// Controls
	const controls = {};

	function Control(df, parent_sel) {
		const M = {
			Link: frappe.ui.form.ControlLink,
			Date: frappe.ui.form.ControlDate,
			Data: frappe.ui.form.ControlData
		};
		const C = M[df.fieldtype] || frappe.ui.form.ControlData;
		return new C({ df, parent: $(parent_sel)[0], render_input: true });
	}

	controls.from_date = Control({ fieldname: "from_date", label: "من تاريخ", fieldtype: "Date", reqd: 1 }, toolbar.find('[data-tool="from_date"] [data-field="from_date"]'));
	controls.to_date = Control({ fieldname: "to_date", label: "إلى تاريخ", fieldtype: "Date", reqd: 1 }, toolbar.find('[data-tool="to_date"] [data-field="to_date"]'));
	controls.driver = Control({ fieldname: "driver", label: "السائق", fieldtype: "Link", options: "Driver" }, toolbar.find('[data-tool="driver"] [data-field="driver"]'));

	// Buttons
	const $btn_fetch = toolbar.find('[data-action="fetch"]');
	const $btn_clear = toolbar.find('[data-action="clear"]');
	const $btn_print = toolbar.find('[data-action="print"]');

	// Fetch data
	$btn_fetch.on("click", async function () {
		const from_date = controls.from_date.get_value();
		const to_date = controls.to_date.get_value();
		const driver = controls.driver.get_value();

		if (!from_date || !to_date) {
			frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.");
			return;
		}

		try {
			frappe.dom.freeze("جاري عرض البيانات...");
			const r = await frappe.call({
				method: "milk.milk.utils.get_driver_report",
				args: { from_date, to_date, driver },
			});
			const msg = r && r.message ? r.message : {};
			if (msg.status === "success") renderSectionsView(msg.data || []);
			else frappe.msgprint({ title: "خطأ", indicator: "red", message: msg.message || "فشل في عرض البيانات." });
		} catch (e) {
			console.error(e);
			frappe.msgprint({ title: "خطأ", indicator: "red", message: e.message || String(e) });
		} finally {
			frappe.dom.unfreeze();
		}
	});

	// Clear/refresh
	$btn_clear.on("click", function () {
		controls.from_date.set_value(null);
		controls.to_date.set_value(null);
		controls.driver.set_value(null);
		results_container.empty();
		frappe.show_alert({ message: "تم مسح البيانات وتحديث الصفحة.", indicator: "green" });
	});

	// Print current view as-is
	$btn_print.on("click", function () {
		const w = window.open('', '_blank');
		if (!w) {
			frappe.msgprint('فضلاً فعّل النوافذ المنبثقة للسماح بالطباعة.');
			return;
		}
		const headCSS = `
			<style>
			body, html { margin:0; padding:0; direction: rtl; font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif; }
			@page { size: A4 portrait; margin: 8mm; }
			.card { box-shadow: none !important; border:1px solid #e5e7eb; margin-bottom: 10px; }
			.card-header { background-color: #d1ecf1 !important; color: #0c5460 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
			.table { width: 100%; border-collapse: collapse; }
			.table th, .table td { border: 1px solid #dee2e6; padding: .5rem; }
			.table thead th { background:#f8fafc; }
			.badge { display:inline-block; padding:.35em .5em; font-weight:700; border-radius:.25rem; }
			.bg-success { background-color:#16a34a !important; color:#fff !important; }
			.bg-danger { background-color:#dc2626 !important; color:#fff !important; }
			</style>
		`;
		w.document.open();
		w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طباعة تقرير السائق</title>${headCSS}</head><body>${results_container.html()}</body></html>`);
		w.document.close();
		w.focus();
		setTimeout(() => w.print(), 300);
	});

	// Renderer
	function renderSectionsView(data) {
		results_container.empty();

		if (!data || !data.length) {
			results_container.html(`<div class="alert alert-warning">لا توجد بيانات.</div>`);
			return;
		}

		// Group data by driver and date, and keep names per shift
		const groupedData = data.reduce((acc, row) => {
			const driver = row.driver || "غير محدد";
			const date = row.date;

			if (!acc[driver]) acc[driver] = {};
			if (!acc[driver][date]) {
				acc[driver][date] = {
					rows: [],
					meta: {
						driver_name_morning: "",
						driver_helper_name_morning: "",
						driver_name_evening: "",
						driver_helper_name_evening: "",
					}
				};
			}

			// Capture shift-specific names if present (first non-empty per date)
			const m = acc[driver][date].meta;

			if (!m.driver_name_morning && row.driver_name_morning) m.driver_name_morning = row.driver_name_morning;
			if (!m.driver_helper_name_morning && row.driver_helper_name_morning) m.driver_helper_name_morning = row.driver_helper_name_morning;

			if (!m.driver_name_evening && row.driver_name_evening) m.driver_name_evening = row.driver_name_evening;
			if (!m.driver_helper_name_evening && row.driver_helper_name_evening) m.driver_helper_name_evening = row.driver_helper_name_evening;

			acc[driver][date].rows.push(row);
			return acc;
		}, {});

		// Build sections for each driver and date
		Object.keys(groupedData).forEach((driver) => {
			Object.keys(groupedData[driver]).forEach((date) => {
				const bucket = groupedData[driver][date];
				const rowsForSection = bucket.rows || [];
				const m = bucket.meta || {};

				const nameOrUnregistered = (v) => (v && String(v).trim() ? frappe.utils.escape_html(v) : "غير مسجل");

				// صباح
				const morningDriver = nameOrUnregistered(m.driver_name_morning);
				const morningHelper = nameOrUnregistered(m.driver_helper_name_morning);
				const morning_html = `الصباح السائق: ${morningDriver} - المساعد: ${morningHelper}`;

				// مساء
				const eveningDriver = nameOrUnregistered(m.driver_name_evening);
				const eveningHelper = nameOrUnregistered(m.driver_helper_name_evening);
				const evening_html = `المساء السائق: ${eveningDriver} - المساعد: ${eveningHelper}`;

				// Final combined string
				const names_html = `
						<span class="dr-names">
							<span class="shift morning">
								<span class="label">الصباح السائق:</span>
								<span class="value driver">${morningDriver}</span>
								<span class="spacer-inner"></span>
								<span class="label">المساعد:</span>
								<span class="value helper">${morningHelper}</span>
							</span>
							<span class="spacer-outer"></span>
							<span class="shift evening">
								<span class="label">المساء السائق:</span>
								<span class="value driver">${eveningDriver}</span>
								<span class="spacer-inner"></span>
								<span class="label">المساعد:</span>
								<span class="value helper">${eveningHelper}</span>
							</span>
						</span>
					`;

				const driverSection = $(`
					<div class="card dr-card rounded">
						<div class="card-header dr-header">
							<h3 class="mb-0">
								<span>${frappe.utils.escape_html(driver)}</span>
								${names_html}
							</h3>
							<p class="mb-0 meta">التاريخ: ${frappe.utils.escape_html(date)}</p>
						</div>
						<div class="card-body">
							<div class="table-responsive">
								<table class="table table-bordered table-hover text-end align-middle dr-table">
									<thead>
										<tr>
											<th>نوع الحليب</th>
											<th>صباح - الموردين</th>
											<th>صباح - السيارة</th>
											<th>فرق الصباح</th>
											<th>مساء - الموردين</th>
											<th>مساء - السيارة</th>
											<th>فرق المساء</th>
											<th>إجمالي - الموردين</th>
											<th>إجمالي - السيارة</th>
											<th>إجمالي الفرق</th>
										</tr>
									</thead>
									<tbody></tbody>
									<tfoot>
										<tr>
											<th>الإجمالي</th>
											<td class="total-collected-morning"></td>
											<td class="total-car-morning"></td>
											<td class="total-morning-diff"></td>
											<td class="total-collected-evening"></td>
											<td class="total-car-evening"></td>
											<td class="total-evening-diff"></td>
											<td class="total-collected-total"></td>
											<td class="total-car-total"></td>
											<td class="total-diff-total"></td>
										</tr>
									</tfoot>
								</table>
							</div>
						</div>
					</div>
				`);

				const tbody = driverSection.find("tbody");
				const tfoot = driverSection.find("tfoot");

				// Initialize totals
				let totals = {
					collected_morning: 0,
					car_morning: 0,
					morning_diff: 0,
					collected_evening: 0,
					car_evening: 0,
					evening_diff: 0,
					collected_total: 0,
					car_total: 0,
					total_diff: 0,
				};

				// Render rows and calculate totals
				rowsForSection.forEach((row) => {
					// Translate milk type to Arabic
					const milkTypeArabic =
						row.milk_type === "Cow" ? "بقر" :
						row.milk_type === "Buffalo" ? "جاموس" : (row.milk_type || "غير محدد");

					const morning_diff_class = row.morning_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";
					const evening_diff_class = row.evening_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";
					const total_diff_class = row.total_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";

					tbody.append(`
						<tr>
							<td>${frappe.utils.escape_html(milkTypeArabic)}</td>
							<td>${Number(row.collected_morning || 0)} كجم</td>
							<td>${Number(row.car_morning || 0)} كجم</td>
							<td><span class="badge ${morning_diff_class}">${Number(row.morning_diff || 0)} كجم</span></td>
							<td>${Number(row.collected_evening || 0)} كجم</td>
							<td>${Number(row.car_evening || 0)} كجم</td>
							<td><span class="badge ${evening_diff_class}">${Number(row.evening_diff || 0)} كجم</span></td>
							<td>${Number(row.collected_total || 0)} كجم</td>
							<td>${Number(row.car_total || 0)} كجم</td>
							<td><span class="badge ${total_diff_class}">${Number(row.total_diff || 0)} كجم</span></td>
						</tr>
					`);

					// Update totals
					totals.collected_morning += Number(row.collected_morning || 0);
					totals.car_morning += Number(row.car_morning || 0);
					totals.morning_diff += Number(row.morning_diff || 0);
					totals.collected_evening += Number(row.collected_evening || 0);
					totals.car_evening += Number(row.car_evening || 0);
					totals.evening_diff += Number(row.evening_diff || 0);
					totals.collected_total += Number(row.collected_total || 0);
					totals.car_total += Number(row.car_total || 0);
					totals.total_diff += Number(row.total_diff || 0);
				});

				// Append totals to the footer
				const fmt = (v) => (Number.isFinite(+v) ? +(+v).toFixed(2) : 0);
				tfoot.find(".total-collected-morning").text(`${fmt(totals.collected_morning)} كجم`);
				tfoot.find(".total-car-morning").text(`${fmt(totals.car_morning)} كجم`);
				tfoot.find(".total-morning-diff").text(`${fmt(totals.morning_diff)} كجم`);
				tfoot.find(".total-collected-evening").text(`${fmt(totals.collected_evening)} كجم`);
				tfoot.find(".total-car-evening").text(`${fmt(totals.car_evening)} كجم`);
				tfoot.find(".total-evening-diff").text(`${fmt(totals.evening_diff)} كجم`);
				tfoot.find(".total-collected-total").text(`${fmt(totals.collected_total)} كجم`);
				tfoot.find(".total-car-total").text(`${fmt(totals.car_total)} كجم`);
				tfoot.find(".total-diff-total").text(`${fmt(totals.total_diff)} كجم`);

				results_container.append(driverSection);
			});
		});
	}
};