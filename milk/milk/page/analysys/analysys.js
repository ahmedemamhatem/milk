frappe.pages['analysys'].on_page_load = function(wrapper) {
    $(wrapper).html(`
        <style>
            .analysis-rtl { direction: rtl; font-family: 'Cairo', 'Tajawal', Arial, sans-serif; background: #f8f9fa; min-height: 100vh; padding-bottom: 32px;}
            .filter-bar-rtl {display:flex;gap:10px;align-items:center;justify-content:flex-end;margin: 32px 12px 12px 12px; flex-wrap: wrap;}
            .filter-bar-rtl label {margin-left: 8px;}
            .cards-rtl {display: flex;gap: 20px;justify-content: center;margin: 10px 0 36px 0;flex-wrap: wrap;}
            .card-rtl {background: #fff;border-radius: 12px;box-shadow: 0 2px 8px rgba(41,72,125,0.10);padding: 22px 24px;flex: 1 1 180px;min-width: 180px;max-width: 270px;text-align: center;}
            .card-title-rtl {font-size: 1em;color: #8da0bc;margin-bottom: 8px;}
            .card-value-rtl {font-size: 2.2em;font-weight: bold;color: #29487d;}
            .charts-pair-row { display: flex; gap: 28px; margin-bottom: 28px; flex-wrap: wrap;}
            .chart-box-rtl {background: #fff;border-radius: 12px;padding: 22px 18px 8px 18px;
                box-shadow: 0 2px 8px rgba(41,72,125,0.07);min-height: 410px;display: flex;flex-direction: column;flex:1 1 0;min-width: 320px;max-width: 100%;}
            .chart-title-rtl {font-size: 1.1em;color: #29487d;font-weight: 500;margin-bottom: 12px;text-align: right;}
            .chart-canvas-rtl {width: 100% !important; min-height: 320px !important; max-height: 340px !important; height: 340px !important; background: #fff;}
            @media (max-width: 900px) {
                .charts-pair-row {flex-direction: column;}
                .chart-box-rtl {min-width: 0;}
            }
            @media (max-width: 650px) {
                .cards-rtl { flex-direction: column; gap: 12px; }
                .card-rtl { max-width: 100%; padding: 16px 8px; }
            }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <div class="analysis-rtl">
            <div class="filter-bar-rtl">
                <label for="date-from">من تاريخ:</label>
                <input type="date" id="date-from" style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;">
                <label for="date-to">إلى تاريخ:</label>
                <input type="date" id="date-to" style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;">
                <button id="refresh-btn" style="padding:4px 18px;border-radius:6px;background:#29487d;color:#fff;border:none;cursor:pointer;">تحديث</button>
            </div>
            <div class="cards-rtl">
                <div class="card-rtl"><div class="card-title-rtl">عدد الموردين</div><div class="card-value-rtl" id="suppliers-count-rtl">-</div></div>
                <div class="card-rtl"><div class="card-title-rtl">عدد الخطوط</div><div class="card-value-rtl" id="drivers-count-rtl">-</div></div>
                <div class="card-rtl"><div class="card-title-rtl">عدد القرى</div><div class="card-value-rtl" id="villages-count-rtl">-</div></div>
                <div class="card-rtl"><div class="card-title-rtl">إجمالي الكمية</div><div class="card-value-rtl" id="total-qty-rtl">-</div></div>
                <div class="card-rtl"><div class="card-title-rtl">إجمالي المبلغ</div><div class="card-value-rtl" id="total-amount-rtl">-</div></div>
                <div class="card-rtl"><div class="card-title-rtl">متوسط سعر الكيلو</div><div class="card-value-rtl" id="avg-kg-rate-rtl">-</div></div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">أعلى ١٠ قرى بالكمية</div>
                    <canvas id="chart-villages-rtl" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">أعلى ١٠ موردين بالكمية</div>
                    <canvas id="chart-suppliers-rtl" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">أعلى ٥ خطوط بالكمية</div>
                    <canvas id="chart-drivers-rtl" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">عدد القرى لكل خط</div>
                    <canvas id="chart-village-count-per-driver" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي الكمية لكل خط (Pie)</div>
                    <canvas id="chart-qty-per-driver-pie" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">توزيع الكمية حسب الأيام</div>
                    <canvas id="chart-qty-per-day" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي المبلغ لكل خط (Doughnut)</div>
                    <canvas id="chart-amount-per-driver" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">متوسط الكمية لكل خط (Radar)</div>
                    <canvas id="chart-avg-qty-per-driver" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي المبلغ لكل مورد (PolarArea)</div>
                    <canvas id="chart-amount-per-supplier" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي المبلغ لكل قرية (Pie)</div>
                    <canvas id="chart-amount-per-village" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
            <div class="charts-pair-row">
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي الكمية لكل مورد (Line)</div>
                    <canvas id="chart-qty-per-supplier" class="chart-canvas-rtl"></canvas>
                </div>
                <div class="chart-box-rtl">
                    <div class="chart-title-rtl">إجمالي الكمية لكل قرية (Bar)</div>
                    <canvas id="chart-qty-per-village" class="chart-canvas-rtl"></canvas>
                </div>
            </div>
        </div>
    `);

    // Distinct color palettes
    const palettes = {
        main: ["#29487d","#2883c5","#4e9d7c","#fca311","#e15554","#7768ae","#3bb273","#e86af0","#f7b801","#f95738","#1e90ff","#8a2be2","#20b2aa","#fa8072","#b8860b","#228b22","#dc143c","#2f4f4f","#ff69b4","#ff6347"],
        pie: ["#f3722c","#f8961e","#f9844a","#f9c74f","#90be6d","#43aa8b","#577590","#277da1","#4e9d7c","#fca311","#e15554","#f95738"],
        suppliers: ["#2d6a4f","#40916c","#52b788","#74c69d","#95d5b2","#b7e4c7","#d8f3dc","#f48c06","#f9c74f","#f9844a"],
        drivers: ["#f72585","#b5179e","#7209b7","#560bad","#480ca8","#3a0ca3","#4361ee","#4895ef","#4cc9f0"],
        day: ["#1d3557","#457b9d","#a8dadc","#f1faee","#e63946"],
        amount: ["#003049","#d62828","#f77f00","#fcbf49","#eae2b7","#2ec4b6","#ffbf69","#a9def9","#e4c1f9","#fdffb6"]
    };

    // Chart.js loader
    function loadChartJs(callback) {
        if (window.Chart) return callback();
        var script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Chart helpers
    function renderBarChart(ctxId, data, colors, maxTicks = 10, opts = {}) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{ label: opts.label || 'الكمية', data: data.map(d => d.value), backgroundColor: colors, borderRadius: 7 }]
            },
            options: Object.assign({
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
                scales: {
                    x: { ticks: { font: { family: "'Cairo','Tajawal',Arial,sans-serif" }, maxTicksLimit: maxTicks }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { callback: value => value.toLocaleString('en-US'), font: { family: "'Cairo','Tajawal',Arial,sans-serif" } }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { rtl: true, callbacks: { label: context => ' ' + context.parsed.y.toLocaleString('en-US') }, bodyFont: { family: "'Cairo','Tajawal',Arial,sans-serif" } }
                }
            }, opts)
        });
    }
    function renderPieChart(ctxId, data, colors, opts = {}) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'pie',
            data: { labels: data.map(d => d.name), datasets: [{ label: opts.label || '', data: data.map(d => d.value), backgroundColor: colors }] },
            options: Object.assign({
                responsive: true,
                plugins: { legend: { rtl: true, position: 'right', labels: { font: { family: "'Cairo','Tajawal',Arial,sans-serif" } } }, tooltip: { rtl: true, callbacks: { label: context => context.label + ': ' + context.parsed.toLocaleString('en-US') } } }
            }, opts)
        });
    }
    function renderDoughnutChart(ctxId, data, colors, opts = {}) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: data.map(d => d.name), datasets: [{ label: opts.label || '', data: data.map(d => d.value), backgroundColor: colors }] },
            options: Object.assign({
                responsive: true,
                plugins: { legend: { rtl: true, position: 'right', labels: { font: { family: "'Cairo','Tajawal',Arial,sans-serif" } } }, tooltip: { rtl: true } }
            }, opts)
        });
    }
    function renderPolarAreaChart(ctxId, data, colors, opts = {}) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'polarArea',
            data: { labels: data.map(d => d.name), datasets: [{ label: opts.label || '', data: data.map(d => d.value), backgroundColor: colors }] },
            options: Object.assign({
                responsive: true,
                plugins: { legend: { rtl: true, position: 'right', labels: { font: { family: "'Cairo','Tajawal',Arial,sans-serif" } } }, tooltip: { rtl: true } }
            }, opts)
        });
    }
    function renderRadarChart(ctxId, data, colors, opts = {}) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'radar',
            data: { labels: data.map(d => d.name), datasets: [{ label: opts.label || '', data: data.map(d => d.value), backgroundColor: colors[0]+'33', borderColor: colors[0], pointBackgroundColor: colors }] },
            options: Object.assign({
                responsive: true,
                plugins: { legend: { rtl: true }, tooltip: { rtl: true } }
            }, opts)
        });
    }
    function renderLineChart(ctxId, labels, data, color) {
        const ctx = document.getElementById(ctxId).getContext('2d');
        if (ctx._chartInstance) ctx._chartInstance.destroy();
        ctx._chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'الكمية', data: data, backgroundColor: color+'22', borderColor: color, fill: true, tension: 0.25 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { font: { family: "'Cairo','Tajawal',Arial,sans-serif" } } },
                    y: { beginAtZero: true, ticks: { callback: v=>v.toLocaleString('en-US'), font: { family: "'Cairo','Tajawal',Arial,sans-serif" } } }
                },
                plugins: { legend: { display: false }, tooltip: { rtl: true } }
            }
        });
    }

    function fetch_and_render() {
        loadChartJs(function() {
            let from = document.getElementById('date-from').value;
            let to = document.getElementById('date-to').value;
            let frappe_filters = [];
            if (from) frappe_filters.push(["date", ">=", from]);
            if (to) frappe_filters.push(["date", "<=", to]);
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Milk Entries Log",
                    fields: ["village", "supplier", "driver", "quantity", "amount", "date"],
                    limit_page_length: 2000,
                    filters: frappe_filters
                },
                callback: function(r) {
                    if (!r.message) return;
                    let entries = r.message;
                    let total_qty = entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
                    let total_amount = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                    let avg_kg_rate = (total_qty ? total_amount / total_qty : 0);

                    let suppliers = Array.from(new Set(entries.map(e=>e.supplier))).filter(x=>x && x!="-");
                    let drivers = Array.from(new Set(entries.map(e=>e.driver))).filter(x=>x && x!="-");
                    let villages = Array.from(new Set(entries.map(e=>e.village))).filter(x=>x && x!="-");

                    document.getElementById('suppliers-count-rtl').textContent = suppliers.length.toLocaleString('en-US');
                    document.getElementById('drivers-count-rtl').textContent = drivers.length.toLocaleString('en-US');
                    document.getElementById('villages-count-rtl').textContent = villages.length.toLocaleString('en-US');
                    document.getElementById('total-qty-rtl').textContent = total_qty.toLocaleString('en-US');
                    document.getElementById('total-amount-rtl').textContent = total_amount.toLocaleString('en-US', {minimumFractionDigits: 2});
                    document.getElementById('avg-kg-rate-rtl').textContent = avg_kg_rate.toLocaleString('en-US', {minimumFractionDigits: 2});

                    function groupSum(data, key, field='quantity') {
                        const result = {};
                        data.forEach(row => {
                            let k = row[key] || "غير محدد";
                            result[k] = (result[k] || 0) + (parseFloat(row[field]) || 0);
                        });
                        return result;
                    }
                    function groupAvg(data, key, field='quantity') {
                        const sums = {}, counts = {}, avg = {};
                        data.forEach(row => {
                            let k = row[key] || "غير محدد";
                            sums[k] = (sums[k]||0) + (parseFloat(row[field])||0);
                            counts[k] = (counts[k]||0) + 1;
                        });
                        Object.keys(sums).forEach(k => avg[k] = counts[k] ? sums[k]/counts[k] : 0);
                        return avg;
                    }
                    function topN(obj, n) {
                        return Object.entries(obj)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, n)
                            .map(([name, value]) => ({ name, value }));
                    }
                    // Chart 1: Top 10 Villages by Quantity (Bar)
                    renderBarChart('chart-villages-rtl', topN(groupSum(entries, "village"), 10), palettes.main);
                    // Chart 2: Top 10 Suppliers by Quantity (Bar)
                    renderBarChart('chart-suppliers-rtl', topN(groupSum(entries, "supplier"), 10), palettes.suppliers);
                    // Chart 3: Top 5 خطوط by Quantity (Bar)
                    renderBarChart('chart-drivers-rtl', topN(groupSum(entries, "driver"), 5), palettes.drivers, 5);
                    // Chart 4: Village count per خط (Bar)
                    let driverVillageMap = {};
                    entries.forEach(e => {
                        let driver = e.driver || "غير محدد";
                        let village = e.village || "غير محدد";
                        if (!driverVillageMap[driver]) driverVillageMap[driver] = new Set();
                        driverVillageMap[driver].add(village);
                    });
                    let driverVillageCount = Object.entries(driverVillageMap).map(([driver, vSet]) => ({
                        name: driver, value: vSet.size
                    })).sort((a,b)=>b.value-a.value);
                    renderBarChart('chart-village-count-per-driver', driverVillageCount, palettes.day);
                    // Chart 5: إجمالي الكمية لكل خط (Pie)
                    renderPieChart('chart-qty-per-driver-pie', topN(groupSum(entries, "driver"), 10), palettes.pie);
                    // Chart 6: توزيع الكمية حسب الأيام (Line)
                    let daySum = {};
                    entries.forEach(e => {
                        let day = e.date ? e.date : "غير محدد";
                        daySum[day] = (daySum[day]||0) + (parseFloat(e.quantity)||0);
                    });
                    let daysSorted = Object.keys(daySum).sort();
                    renderLineChart('chart-qty-per-day', daysSorted, daysSorted.map(d=>daySum[d]), palettes.drivers[0]);
                    // Chart 7: إجمالي المبلغ لكل خط (Doughnut)
                    renderDoughnutChart('chart-amount-per-driver', topN(groupSum(entries, "driver", "amount"), 10), palettes.amount, {label:'المبلغ'});
                    // Chart 8: متوسط الكمية لكل خط (Radar)
                    renderRadarChart('chart-avg-qty-per-driver', topN(groupAvg(entries, "driver", "quantity"), 10), palettes.drivers, {label:'متوسط الكمية'});
                    // Chart 9: إجمالي المبلغ لكل مورد (PolarArea)
                    renderPolarAreaChart('chart-amount-per-supplier', topN(groupSum(entries, "supplier", "amount"), 10), palettes.suppliers, {label:'المبلغ'});
                    // Chart 10: إجمالي المبلغ لكل قرية (Pie)
                    renderPieChart('chart-amount-per-village', topN(groupSum(entries, "village", "amount"), 10), palettes.main, {label:'المبلغ'});
                    // Chart 11: إجمالي الكمية لكل مورد (Line)
                    let qtyPerSupplier = topN(groupSum(entries, "supplier"), 10);
                    renderLineChart('chart-qty-per-supplier', qtyPerSupplier.map(d=>d.name), qtyPerSupplier.map(d=>d.value), palettes.suppliers[0]);
                    // Chart 12: إجمالي الكمية لكل قرية (Bar)
                    renderBarChart('chart-qty-per-village', topN(groupSum(entries, "village"), 10), palettes.main, 10);
                }
            });
        });
    }

    // Set default date values to this month
    let today = new Date();
    let firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10);
    let lastDay = new Date(today.getFullYear(), today.getMonth()+1, 0).toISOString().slice(0,10);
    document.getElementById('date-from').value = firstDay;
    document.getElementById('date-to').value = lastDay;

    document.getElementById('refresh-btn').onclick = fetch_and_render;
    fetch_and_render();
};