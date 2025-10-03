frappe.pages['milk-quality-dashboa'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'لوحة مؤشرات جودة اللبن',
        single_column: true
    });

    // Filters
    let filters = {
        from_date: frappe.datetime.month_start(),
        to_date: frappe.datetime.month_end(),
        driver: '',
        animal: 'buffalo'
    };

    page.add_field({
        label: 'من تاريخ',
        fieldtype: 'Date',
        fieldname: 'from_date',
        default: filters.from_date,
        change() { filters.from_date = this.value; load_dashboard(); }
    });
    page.add_field({
        label: 'إلى تاريخ',
        fieldtype: 'Date',
        fieldname: 'to_date',
        default: filters.to_date,
        change() { filters.to_date = this.value; load_dashboard(); }
    });
    page.add_field({
        label: 'السائق',
        fieldtype: 'Link',
        options: 'Driver',
        fieldname: 'driver',
        change() { filters.driver = this.value; load_dashboard(); }
    });
    page.add_field({
        label: 'النوع',
        fieldtype: 'Select',
        fieldname: 'animal',
        options: [
            {label:'جاموس', value:'buffalo'},
            {label:'أبقار', value:'cow'}
        ],
        default: 'buffalo',
        change() { filters.animal = this.value; load_dashboard(); }
    });

    const container = $(`<div class="milk-dashboard p-3"></div>`).appendTo(page.body);

    // Styles
    const style = document.createElement('style');
    style.textContent = `
        :root{
            --c-bg:#f7f9fc; --c-card:#fff; --c-border:rgba(15,23,42,.08);
            --c-text:#0f172a; --c-mute:#475569;
            --c-primary:#2563eb; --c-info:#0284c7; --c-success:#16a34a; --c-danger:#dc2626; --c-neutral:#64748b;
        }
        .milk-dashboard{ color:var(--c-text); background:var(--c-bg); font-family:"Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif; }
        .milk-dashboard .card{ border-radius:14px; border:1px solid var(--c-border); background:var(--c-card); }

        /* Period summary */
        .period-summary{ text-align:center; padding:14px 10px; }
        .period-summary .title{ font-size:1.2rem; font-weight:900; margin-bottom:6px; }
        .period-summary .rowline{ display:flex; gap:10px; flex-wrap:wrap; justify-content:center; color:var(--c-mute); font-weight:700; }
        .period-summary .chip{ background:#f1f5f9; border:1px solid var(--c-border); border-radius:999px; padding:6px 10px; }
        .period-summary .sep{ color:#94a3b8; }

        /* KPI mini-cards */
        .kpis{ padding:10px 12px 14px; }
        .kpis-title{ text-align:center; font-weight:900; margin-bottom:10px; }

        .kpi-rows{ display:flex; flex-direction:column; gap:12px; align-items:center; }
        .kpi-row{
            display:flex; gap:12px; flex-wrap:wrap; justify-content:center;
            width:100%;
        }
        .kpi-card{
            min-width:180px; max-width:220px; flex:0 1 200px;
            border:1px solid var(--c-border); border-radius:12px; background:#fff;
            padding:12px 12px; text-align:center;
            box-shadow: 0 1px 0 rgba(15,23,42,.02);
        }
        .kpi-val{ font-weight:900; font-size:1.14rem; line-height:1; }
        .kpi-label{ margin-top:6px; color:var(--c-mute); font-weight:700; font-size:.92rem; }

        /* On very small screens: stack */
        @media (max-width:520px){
            .kpi-card{ min-width:140px; flex:1 1 46%; }
        }

        /* Lists */
        .two-lists{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media (max-width:992px){ .two-lists{ grid-template-columns:1fr; } }
        .list-card .list-group-item{ display:flex; align-items:center; justify-content:space-between; font-size:.98rem; }
        .idx-badge{ width:28px; height:28px; border-radius:8px; background:#e2e8f0; color:#0f172a; display:flex; align-items:center; justify-content:center; font-weight:800; }
        .list-left{ display:flex; align-items:center; gap:10px; min-width:0; }
        .name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:52vw; }
        .value-badge{ color:#0f172a; background:#f1f5f9; border-radius:999px; padding:6px 10px; font-weight:800; border:1px solid var(--c-border); min-width:70px; text-align:center; }

        /* Titles and chart */
        .section-title{ font-weight:900; font-size:1.1rem; text-align:center; margin:6px 0 10px; }
        .section-sub{ text-align:center; color:var(--c-mute); margin-top:-4px; margin-bottom:8px; }
        .toggle-bar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center; }
        .toggle-bar .btn{ border:1px solid var(--c-border); background:#fff; color:#0f172a; padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:700; }
        .toggle-bar .btn.active{ background:#e6f0ff; border-color:#bfdbfe; color:#1e3a8a; }
        .chart-card{ min-height:360px; }
    `;
    document.head.appendChild(style);

    // Utils
    function arDigits(str, enabled=false){
        if (!enabled) return str;
        const map = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩','.':'٫'};
        return String(str).replace(/[0-9.]/g, d => map[d] ?? d);
    }
    const useArabicDigits = false;
    function fmt(v, d=2){ if(v===null||v===undefined||isNaN(v)) return '-'; return arDigits(Number(v).toFixed(d), useArabicDigits); }

    const P = { primary:'#2563eb', info:'#0284c7', success:'#16a34a', danger:'#dc2626', neutral:'#64748b' };

    // Build KPI rows: first 3 centered in the first row, rest in the next row (centered)
    function kpiCards(summary){
        const items = [
            { label:'إجمالي الموردين', value: fmt(summary.total_suppliers,0)},
            { label:'إجمالي العينات',  value: fmt(summary.total_samples,0)},
            { label:'متوسط البروتين',  value: fmt(summary.avg_protein)},
            { label:'متوسط الماء',      value: fmt(summary.avg_water)},
            { label:'متوسط الكثافة',    value: fmt(summary.avg_density)},
            { label:'متوسط الصلابة',    value: fmt(summary.avg_hardness)},
            { label:'متوسط البونت',     value: fmt(summary.avg_pont)}
        ];
        const firstRow = items.slice(0, 3);
        const secondRow = items.slice(3);

        function renderRow(row){
            return `
                <div class="kpi-row">
                    ${row.map(it => `
                        <div class="kpi-card">
                            <div class="kpi-val">${it.value}</div>
                            <div class="kpi-label">${it.label}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="kpis">
                <div class="kpis-title">المجاميع والمتوسطات</div>
                <div class="kpi-rows">
                    ${renderRow(firstRow)}
                    ${secondRow.length ? renderRow(secondRow) : ''}
                </div>
            </div>
        `;
    }

    // List and chart helpers
    function listCard(title, items, colorVar = P.primary) {
        const li = (items && items.length)
            ? items.map((x, idx) => `
                <li class="list-group-item">
                    <div class="list-left">
                        <span class="idx-badge">${idx+1}</span>
                        <span class="name">${frappe.utils.escape_html(x.supplier)}</span>
                    </div>
                    <span class="value-badge" style="color:${colorVar}">${fmt(x.value)}</span>
                </li>
              `).join('')
            : `<li class="list-group-item text-muted">لا يوجد بيانات</li>`;
        return `
            <div class="card list-card h-100">
                <div class="card-header">${title}</div>
                <ul class="list-group list-group-flush">${li}</ul>
            </div>
        `;
    }
    function metricBlock(title, subtitle, bestList, worstList, color) {
        return `
            <div class="col-12 mb-3">
                <div class="card">
                    <div class="card-body">
                        <div class="section-title">${title}</div>
                        ${subtitle ? `<div class="section-sub">${subtitle}</div>` : ''}
                        <div class="two-lists mt-2">
                            ${listCard('أفضل 5 موردين', bestList, color)}
                            ${listCard('أسوأ 5 موردين', worstList, color)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    function chartCard(id, title, subtitle='', withToggle=true) {
        const sub = subtitle ? `<div class="section-sub">${subtitle}</div>` : '';
        const toggle = withToggle ? `
            <div class="toggle-bar mt-2">
                <span class="btn btn-ma active" data-target="${id}" data-mode="on">إظهار المتوسط المتحرك (7)</span>
                <span class="btn btn-ma-off" data-target="${id}" data-mode="off">إخفاء المتوسط المتحرك</span>
            </div>
        ` : '';
        return `
            <div class="col-12 mb-3">
                <div class="card chart-card">
                    <div class="card-body">
                        <div class="section-title">${title}</div>
                        ${sub}
                        ${toggle}
                        <div id="${id}" class="mt-2"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Charts
    let charts = {};
    function destroyCharts(){ Object.values(charts).forEach(ch=>{ try{ ch.destroy(); }catch(e){} }); charts = {}; }
    function movingAvg(arr, w){
        if(!Array.isArray(arr)||arr.length===0||w<=1) return new Array(arr.length).fill(null);
        const out=new Array(arr.length).fill(null); let sum=0;
        for(let i=0;i<arr.length;i++){ const v=Number(arr[i])||0; sum+=v; if(i>=w) sum-= (Number(arr[i-w])||0); if(i>=w-1) out[i]=sum/w; }
        return out;
    }

    function render(r){
        container.empty(); destroyCharts();
        if(!r.message){ container.html(`<p class="text-muted">لا يوجد بيانات</p>`); return; }

        const { summary, rankings, timeseries } = r.message;

        // Period summary
        const animalLabel = filters.animal === 'buffalo' ? 'جاموس' : 'أبقار';
        const fromStr = frappe.datetime.global_date_format ? frappe.datetime.str_to_user(filters.from_date) : filters.from_date;
        const toStr   = frappe.datetime.global_date_format ? frappe.datetime.str_to_user(filters.to_date)   : filters.to_date;
        const driverStr = filters.driver ? `السائق: ${frappe.utils.escape_html(filters.driver)}` : null;

        container.append(`
            <div class="card mb-3">
                <div class="period-summary">
                    <div class="title">ملخص الفترة (${animalLabel})</div>
                    <div class="rowline">
                        <span class="chip">من: ${fromStr}</span>
                        <span class="sep">—</span>
                        <span class="chip">إلى: ${toStr}</span>
                        ${driverStr ? `<span class="sep">—</span><span class="chip">${driverStr}</span>` : ''}
                        <span class="sep">—</span>
                        <span class="chip">النوع: ${animalLabel}</span>
                    </div>
                </div>
            </div>
        `);

        // KPIs (first 3 centered in first row, rest in next row)
        container.append(`<div class="card mb-3">${kpiCards(summary)}</div>`);

        // Timeseries
        const labels = (timeseries || []).map(x => x.date);
        const s = {
            protein:(timeseries||[]).map(x=>Number(x.protein||0)),
            water:(timeseries||[]).map(x=>Number(x.water||0)),
            density:(timeseries||[]).map(x=>Number(x.density||0)),
            hardness:(timeseries||[]).map(x=>Number(x.hardness||0)),
            pont:(timeseries||[]).map(x=>Number(x.pont||0)),
        };
        const ma = {
            protein: movingAvg(s.protein,7),
            water: movingAvg(s.water,7),
            density: movingAvg(s.density,7),
            hardness: movingAvg(s.hardness,7),
            pont: movingAvg(s.pont,7),
        };

        // Rankings
        function stableSort(items, metric, best=true) {
            const lowerIsBetter = (metric === 'water');
            const wantAsc = (best && lowerIsBetter) || (!best && !lowerIsBetter);
            const arr = (items || []).slice();
            arr.sort((a, b) => {
                const va = Number(a.value), vb = Number(b.value);
                if (!isFinite(va) && !isFinite(vb)) return 0;
                if (!isFinite(va)) return 1;
                if (!isFinite(vb)) return -1;
                if (va === vb) {
                    const sa = (a.supplier || '').toString();
                    const sb = (b.supplier || '').toString();
                    return sa.localeCompare(sb, 'ar');
                }
                return wantAsc ? (va - vb) : (vb - va);
            });
            return arr.slice(0, 5);
        }
        const best = {
            protein: stableSort(rankings.best.protein, 'protein', true),
            water:   stableSort(rankings.best.water, 'water', true),
            density: stableSort(rankings.best.density, 'density', true),
            hardness:stableSort(rankings.best.hardness, 'hardness', true),
            pont:    stableSort(rankings.best.pont, 'pont', true),
        };
        const worst = {
            protein: stableSort(rankings.worst.protein, 'protein', false),
            water:   stableSort(rankings.worst.water, 'water', false),
            density: stableSort(rankings.worst.density, 'density', false),
            hardness:stableSort(rankings.worst.hardness, 'hardness', false),
            pont:    stableSort(rankings.worst.pont, 'pont', false),
        };

        const blocks = $(`<div class="row"></div>`);
        blocks.append($(metricBlock('البروتين (أعلى أفضل)', 'أفضل وأسوأ الموردين حسب متوسط البروتين', best.protein, worst.protein, P.primary)));
        blocks.append($(metricBlock('الماء (أقل أفضل)', 'أفضل وأسوأ الموردين حسب متوسط الماء', best.water, worst.water, P.info)));
        blocks.append($(metricBlock('الكثافة (أعلى أفضل)', 'أفضل وأسوأ الموردين حسب متوسط الكثافة', best.density, worst.density, P.success)));
        blocks.append($(metricBlock('الصلابة (أعلى أفضل)', 'أفضل وأسوأ الموردين حسب متوسط الصلابة', best.hardness, worst.hardness, P.neutral)));
        blocks.append($(metricBlock('البونت (أعلى الأفضل)', 'أفضل وأسوأ الموردين حسب متوسط البونت', best.pont, worst.pont, P.danger)));
        container.append(blocks);

        // Trend chart
        const namesAr = { protein:'البروتين', water:'الماء', density:'الكثافة', hardness:'الصلابة', pont:'البونت' };
        const datasetsBase = [
            { name:namesAr.protein, values:s.protein },
            { name:namesAr.water, values:s.water },
            { name:namesAr.density, values:s.density },
            { name:namesAr.hardness, values:s.hardness },
            { name:namesAr.pont, values:s.pont },
        ];
        const datasetsMA = [
            { name:`${namesAr.protein} (متحرك 7)`, values:ma.protein },
            { name:`${namesAr.water} (متحرك 7)`, values:ma.water },
            { name:`${namesAr.density} (متحرك 7)`, values:ma.density },
            { name:`${namesAr.hardness} (متحرك 7)`, values:ma.hardness },
            { name:`${namesAr.pont} (متحرك 7)`, values:ma.pont },
        ];

        container.append($(chartCard('trendChart', 'الاتجاه اليومي للمتوسطات', `المتوسط اليومي لكل قياس خلال الفترة (${animalLabel})`, true)));

        if(charts.trend){ try{ charts.trend.destroy(); }catch(e){} }
        function buildTrend(showMA=true){
            const colorsBase = [P.primary, P.info, P.success, P.neutral, P.danger];
            const colorsMA   = ['#93c5fd','#67b3df','#7bdc9a','#cbd5e1','#fdcaca'];
            const ds = showMA ? datasetsBase.concat(datasetsMA) : datasetsBase;
            const cols = showMA ? colorsBase.concat(colorsMA) : colorsBase;
            charts.trend = new frappe.Chart('#trendChart', {
                data: { labels, datasets: ds },
                type: 'line',
                height: 360,
                colors: cols,
                axisOptions: { xAxisMode:'tick', yAxisMode:'tick', shortenYAxisNumbers:1 },
                lineOptions: { regionFill:0, heatline:0, dotSize:2, hideDots:0 }
            });
        }
        buildTrend(true);

        container.on('click', '.toggle-bar .btn', function(){
            const mode = this.getAttribute('data-mode');
            const group = $(this).closest('.toggle-bar');
            group.find('.btn').removeClass('active');
            $(this).addClass('active');
            buildTrend(mode === 'on');
        });
    }

    function load_dashboard(){
        frappe.call({
            method: "milk.milk.page.milk_quality_dashboa.milk_quality_dashboa.get_dashboard_data",
            args: { filters },
            callback: function(r){ render(r); }
        });
    }

    load_dashboard();
};