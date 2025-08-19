frappe.pages["driver-report"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "تقرير السائق اليومي",
        single_column: true,
    });

    $(page.wrapper).css("direction", "rtl");

    // --- Filters ---
    const filter_card = $(`
        <div class="card mb-3 p-3 shadow-sm border-0">
            <div class="row g-3 align-items-center"></div>
        </div>
    `).appendTo(page.body);

    const filter_row = filter_card.find(".row");
    let filters = {};

    filters.from_date = page.add_field({
        fieldname: "from_date",
        label: "من تاريخ",
        fieldtype: "Date",
        reqd: 1,
        container: $('<div class="col-md-3"></div>').appendTo(filter_row),
    });
    filters.to_date = page.add_field({
        fieldname: "to_date",
        label: "إلى تاريخ",
        fieldtype: "Date",
        reqd: 1,
        container: $('<div class="col-md-3"></div>').appendTo(filter_row),
    });
    filters.driver = page.add_field({
        fieldname: "driver",
        label: "السائق",
        fieldtype: "Link",
        options: "Driver",
        container: $('<div class="col-md-3"></div>').appendTo(filter_row),
    });

    const button_container = $('<div class="col-md-3 d-flex gap-2"></div>').appendTo(filter_row);
    const fetch_button = $('<button class="btn btn-primary w-50"><i class="fa fa-search ms-1"></i> بحث</button>').appendTo(button_container);
    const clear_button = $('<button class="btn btn-outline-secondary w-50"><i class="fa fa-refresh ms-1"></i> تحديث</button>').appendTo(button_container);

    const results_container = $('<div class="mt-3"></div>').appendTo(page.body);

    // --- Fetch Data ---
    fetch_button.on("click", function () {
        const from_date = filters.from_date.get_value();
        const to_date = filters.to_date.get_value();
        const driver = filters.driver.get_value();

        if (!from_date || !to_date) frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.");

        frappe.call({
            method: "milk.milk.utils.get_driver_report",
            args: { from_date, to_date, driver },
            callback: function (response) {
                if (response.message.status === "success") renderSectionsView(response.message.data);
                else frappe.msgprint({ title: "خطأ", indicator: "red", message: response.message.message });
            },
        });
    });

    // --- Clear Filters ---
    clear_button.on("click", function () {
        filters.from_date.set_value(null);
        filters.to_date.set_value(null);
        filters.driver.set_value(null);
        results_container.empty();
        frappe.show_alert({ message: "تم مسح البيانات وتحديث الصفحة.", indicator: "green" });
    });

    // --- Render Results ---
    function renderSectionsView(data) {
        results_container.empty();

        if (!data || !data.length) {
            results_container.html(`<div class="alert alert-warning">لا توجد بيانات.</div>`);
            return;
        }

        // Group data by driver and date
        const groupedData = data.reduce((acc, row) => {
            const driver = row.driver || "غير محدد";
            const date = row.date;

            if (!acc[driver]) acc[driver] = {};
            if (!acc[driver][date]) acc[driver][date] = [];
            acc[driver][date].push(row);

            return acc;
        }, {});

        // Build sections for each driver and date
        Object.keys(groupedData).forEach((driver) => {
            Object.keys(groupedData[driver]).forEach((date) => {
                const driverSection = $(`
                    <div class="card shadow-sm rounded mb-5">
                        <div class="card-header" style="background-color: #d1ecf1; color: black; display: flex; justify-content: space-between; align-items: center;">
                            <h3 class="mb-0">${driver}</h3>
                            <p class="mb-0">التاريخ: ${date}</p>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover text-end align-middle" style="font-size:1.1rem;">
                                    <thead class="bg-light">
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
                                    <tfoot class="bg-light">
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
                groupedData[driver][date].forEach((row) => {
                    // Translate milk type to Arabic
                    const milkTypeArabic = row.milk_type === "Cow" ? "بقر" : row.milk_type === "Buffalo" ? "جاموس" : "غير محدد";

                    const morning_diff_class = row.morning_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";
                    const evening_diff_class = row.evening_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";
                    const total_diff_class = row.total_diff >= 0 ? "bg-success text-white" : "bg-danger text-white";

                    tbody.append(`
                        <tr>
                            <td>${milkTypeArabic}</td>
                            <td>${row.collected_morning} كجم</td>
                            <td>${row.car_morning} كجم</td>
                            <td><span class="badge ${morning_diff_class}">${row.morning_diff} كجم</span></td>
                            <td>${row.collected_evening} كجم</td>
                            <td>${row.car_evening} كجم</td>
                            <td><span class="badge ${evening_diff_class}">${row.evening_diff} كجم</span></td>
                            <td>${row.collected_total} كجم</td>
                            <td>${row.car_total} كجم</td>
                            <td><span class="badge ${total_diff_class}">${row.total_diff} كجم</span></td>
                        </tr>
                    `);

                    // Update totals
                    totals.collected_morning += row.collected_morning;
                    totals.car_morning += row.car_morning;
                    totals.morning_diff += row.morning_diff;
                    totals.collected_evening += row.collected_evening;
                    totals.car_evening += row.car_evening;
                    totals.evening_diff += row.evening_diff;
                    totals.collected_total += row.collected_total;
                    totals.car_total += row.car_total;
                    totals.total_diff += row.total_diff;
                });

                // Append totals to the footer
                tfoot.find(".total-collected-morning").text(`${totals.collected_morning} كجم`);
                tfoot.find(".total-car-morning").text(`${totals.car_morning} كجم`);
                tfoot.find(".total-morning-diff").text(`${totals.morning_diff} كجم`);
                tfoot.find(".total-collected-evening").text(`${totals.collected_evening} كجم`);
                tfoot.find(".total-car-evening").text(`${totals.car_evening} كجم`);
                tfoot.find(".total-evening-diff").text(`${totals.evening_diff} كجم`);
                tfoot.find(".total-collected-total").text(`${totals.collected_total} كجم`);
                tfoot.find(".total-car-total").text(`${totals.car_total} كجم`);
                tfoot.find(".total-diff-total").text(`${totals.total_diff} كجم`);

                results_container.append(driverSection);
            });
        });
    }
};