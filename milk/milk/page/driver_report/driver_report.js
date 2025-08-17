frappe.pages["driver-report"].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "تقرير السائق اليومي 🥛",
        single_column: true,
    });

    $(page.wrapper).css("direction","rtl");

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
        reqd:1, 
        container:$('<div class="col-md-3"></div>').appendTo(filter_row)
    });
    filters.to_date = page.add_field({ 
        fieldname: "to_date", 
        label: "إلى تاريخ", 
        fieldtype: "Date", 
        reqd:1, 
        container:$('<div class="col-md-3"></div>').appendTo(filter_row)
    });
    filters.driver = page.add_field({ 
        fieldname: "driver", 
        label: "السائق", 
        fieldtype: "Link", 
        options:"Driver", 
        container:$('<div class="col-md-3"></div>').appendTo(filter_row)
    });

    const button_container = $('<div class="col-md-3 d-flex gap-2"></div>').appendTo(filter_row);
    const fetch_button = $('<button class="btn btn-primary w-50"><i class="fa fa-search ms-1"></i> بحث</button>').appendTo(button_container);
    const clear_button = $('<button class="btn btn-outline-secondary w-50"><i class="fa fa-refresh ms-1"></i> تحديث</button>').appendTo(button_container);

    const results_container = $('<div class="mt-3"></div>').appendTo(page.body);

    fetch_button.on("click", function() {
        const from_date = filters.from_date.get_value();
        const to_date = filters.to_date.get_value();
        const driver = filters.driver.get_value();
        if(!from_date || !to_date) frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.");

        frappe.call({
            method:"milk.milk.utils.get_driver_report",
            args:{from_date,to_date,driver},
            callback:function(response){
                if(response.message.status==="success") renderDailyView(response.message.data);
                else frappe.msgprint({title:"خطأ",indicator:"red",message:response.message.message});
            }
        });
    });

    clear_button.on("click", function() {
        filters.from_date.set_value(null);
        filters.to_date.set_value(null);
        filters.driver.set_value(null);
        results_container.empty();
        frappe.show_alert({message:"تم مسح البيانات وتحديث الصفحة.",indicator:"green"});
    });

    function renderDailyView(data){
        results_container.empty();
        if(!data || !data.length){
            results_container.html(`<div class="alert alert-warning">لا توجد بيانات.</div>`);
            return;
        }

        const table = $(`
            <div class="table-responsive shadow-sm rounded">
                <table class="table table-bordered table-hover text-end align-middle mb-0" style="font-size:1.1rem;">
                    <thead class="bg-primary text-white" style="font-size:1.2rem;">
                        <tr>
                            <th>التاريخ</th>
                            <th>السائق</th>
                            <th>صباح -الموردين</th>
                            <th>صباح -السيارة</th>
                            <th>فرق الصباح</th>
                            <th>مساء -الموردين</th>
                            <th>مساء -السيارة</th>
                            <th>فرق المساء</th>
                            <th>إجمالي -الموردين</th>
                            <th>إجمالي -السيارة</th>
                            <th>إجمالي الفرق</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `);
        const tbody = table.find("tbody");

        data.forEach(row=>{
            const morning_diff_class = row.morning_diff>=0?"bg-success text-white":"bg-danger text-white";
            const evening_diff_class = row.evening_diff>=0?"bg-success text-white":"bg-danger text-white";
            const total_diff_class = row.total_diff>=0?"bg-success text-white":"bg-danger text-white";

            tbody.append(`
                <tr style="font-size:1.1rem;">
                    <td>${row.date}</td>
                    <td>${row.driver || "غير محدد"}</td>
                    <td>${row.collected_morning} كجم</td>
                    <td>${row.car_morning} كجم</td>
                    <td><span class="badge ${morning_diff_class}" style="font-size:1rem;">${row.morning_diff} كجم</span></td>
                    <td>${row.collected_evening} كجم</td>
                    <td>${row.car_evening} كجم</td>
                    <td><span class="badge ${evening_diff_class}" style="font-size:1rem;">${row.evening_diff} كجم</span></td>
                    <td>${row.collected_total} كجم</td>
                    <td>${row.car_total} كجم</td>
                    <td><span class="badge ${total_diff_class}" style="font-size:1rem;">${row.total_diff} كجم</span></td>
                </tr>
            `);
        });

        results_container.append(table);
    }
};
