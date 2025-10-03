import frappe
from collections import defaultdict
from math import sqrt
import json
from datetime import datetime

@frappe.whitelist()
def get_dashboard_data(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters or "{}")
    filters = filters or {}

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    driver = filters.get("driver")
    village = filters.get("village")
    shift = filters.get("shift") or "both"     # morning | evening | both
    animal = filters.get("animal") or "both"   # cow | buffalo | both

    # Build conditions
    conditions = []
    values = {}

    if from_date and to_date:
        conditions.append("mq.date BETWEEN %(from_date)s AND %(to_date)s")
        values.update({"from_date": from_date, "to_date": to_date})

    if driver:
        conditions.append("mq.driver = %(driver)s")
        values["driver"] = driver

    if village:
        conditions.append("s.custom_villages = %(village)s")
        values["village"] = village

    if shift in ("morning", "evening"):
        # Fields morning, evening exist on Milk Quality
        if shift == "morning":
            conditions.append("mq.morning = 1")
        else:
            conditions.append("mq.evening = 1")

    if animal in ("cow", "buffalo"):
        field = "mq.cow" if animal == "cow" else "mq.buffalo"
        conditions.append(f"{field} = 1")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Fetch raw data
    rows = frappe.db.sql(f"""
        SELECT
            mq.date,
            smq.supplier,
            COALESCE(NULLIF(smq.water,''), 0) AS water,
            COALESCE(NULLIF(smq.protein,''), 0) AS protein,
            COALESCE(NULLIF(smq.density,''), 0) AS density,
            COALESCE(NULLIF(smq.hardness,''), 0) AS hardness,
            COALESCE(NULLIF(smq.pont,''), 0) AS pont
        FROM `tabMilk Quality` mq
        JOIN `tabSupplier Milk Quality` smq ON smq.parent = mq.name
        LEFT JOIN `tabSupplier` s ON s.name = smq.supplier
        WHERE {where_clause}
    """, values, as_dict=True)

    if not rows:
        return {
            "summary": {
                "total_suppliers": 0,
                "total_samples": 0,
                "avg_protein": 0,
                "avg_water": 0,
                "avg_density": 0,
                "avg_hardness": 0,
                "avg_pont": 0
            },
            "rankings": {
                "best": {"protein": [], "water": [], "density": [], "hardness": [], "pont": []},
                "worst": {"protein": [], "water": [], "density": [], "hardness": [], "pont": []}
            },
            "timeseries": [],
            "distributions": {"protein": [], "water": [], "density": [], "hardness": [], "pont": []},
            "correlations": {"matrix": {}},
            "outliers": {"protein": {"count":0}, "water": {"count":0}, "density": {"count":0}, "hardness": {"count":0}, "pont": {"count":0}}
        }

    metrics = ["protein", "water", "density", "hardness", "pont"]

    # Summary
    total_samples = len(rows)
    suppliers_set = set([r["supplier"] for r in rows if r.get("supplier")])
    total_suppliers = len(suppliers_set)

    def avg(field):
        vals = [to_float(r.get(field)) for r in rows if to_float(r.get(field)) is not None]
        return (sum(vals) / len(vals)) if vals else 0

    summary = {
        "total_suppliers": total_suppliers,
        "total_samples": total_samples,
        "avg_protein": avg("protein"),
        "avg_water": avg("water"),
        "avg_density": avg("density"),
        "avg_hardness": avg("hardness"),
        "avg_pont": avg("pont")
    }

    # Rankings: per supplier averages, best and worst 5
    supplier_stats = defaultdict(lambda: defaultdict(list))
    for r in rows:
        supplier = r.get("supplier") or "غير معروف"
        for m in metrics:
            v = to_float(r.get(m))
            if v is not None:
                supplier_stats[supplier][m].append(v)

    supplier_avg = []
    for supplier, data in supplier_stats.items():
        entry = {"supplier": supplier}
        for m in metrics:
            arr = data.get(m, [])
            entry[m] = sum(arr)/len(arr) if arr else None
        supplier_avg.append(entry)

    def top5(metric, reverse=True):
        # For "water", best means lower water (reverse=False).
        arr = [ {"supplier": e["supplier"], "value": e[metric]} for e in supplier_avg if e.get(metric) is not None ]
        if metric == "water":
            reverse = False  # lower is better
        arr.sort(key=lambda x: x["value"], reverse=reverse)
        return arr[:5]

    def bottom5(metric):
        # For "water", worst means higher water
        arr = [ {"supplier": e["supplier"], "value": e[metric]} for e in supplier_avg if e.get(metric) is not None ]
        if metric == "water":
            arr.sort(key=lambda x: x["value"], reverse=True)  # higher is worse
        else:
            arr.sort(key=lambda x: x["value"], reverse=False) # lower is worse
        return arr[:5]

    rankings = {
        "best":   { m: top5(m) for m in metrics },
        "worst":  { m: bottom5(m) for m in metrics }
    }

    # Time series daily averages
    daily = defaultdict(lambda: defaultdict(list))
    for r in rows:
        d = to_date_str(r.get("date"))
        for m in metrics:
            v = to_float(r.get(m))
            if v is not None:
                daily[d][m].append(v)
    timeseries = []
    for d in sorted(daily.keys()):
        item = {"date": d}
        for m in metrics:
            arr = daily[d][m]
            item[m] = sum(arr)/len(arr) if arr else 0
        timeseries.append(item)

    # Distributions (histograms): 10 buckets per metric
    distributions = {}
    for m in metrics:
        vals = [to_float(r.get(m)) for r in rows if to_float(r.get(m)) is not None]
        if not vals:
            distributions[m] = []
            continue
        mn, mx = min(vals), max(vals)
        if mn == mx:
            # single bucket
            distributions[m] = [{"label": f"{round(mn,2)}", "count": len(vals)}]
        else:
            buckets = histogram(vals, bins=10)
            distributions[m] = [{"label": f"{round(b['start'],2)}–{round(b['end'],2)}", "count": b["count"]} for b in buckets]

    # Correlations (Pearson)
    corr_matrix = {m: {} for m in metrics}
    for i, a in enumerate(metrics):
        for j, b in enumerate(metrics):
            if j < i:
                corr_matrix[a][b] = corr_matrix[b][a]
                continue
            pairs = []
            for r in rows:
                va = to_float(r.get(a))
                vb = to_float(r.get(b))
                if va is not None and vb is not None:
                    pairs.append((va, vb))
            if len(pairs) < 3:
                corr = 0
            else:
                xa, xb = zip(*pairs)
                corr = pearson(xa, xb)
            corr_matrix[a][b] = corr
    correlations = {"matrix": corr_matrix}

    # Outliers (IQR method)
    outliers = {}
    for m in metrics:
        vals = sorted([to_float(r.get(m)) for r in rows if to_float(r.get(m)) is not None])
        if len(vals) < 4:
            outliers[m] = {"count": 0}
            continue
        q1 = percentile(vals, 25)
        q3 = percentile(vals, 75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        count = sum(1 for v in vals if v < lower or v > upper)
        outliers[m] = {"count": count, "lower": lower, "upper": upper}

    return {
        "summary": summary,
        "rankings": rankings,
        "timeseries": timeseries,
        "distributions": distributions,
        "correlations": correlations,
        "outliers": outliers
    }


def to_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None

def to_date_str(v):
    if not v:
        return ""
    if isinstance(v, str):
        return v[:10]
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    return str(v)[:10]

def histogram(values, bins=10):
    mn, mx = min(values), max(values)
    width = (mx - mn) / bins if bins else 1
    if width == 0:
        return [{"start": mn, "end": mx, "count": len(values)}]
    counts = [0]*bins
    for v in values:
        if v == mx:
            idx = bins - 1
        else:
            idx = int((v - mn) / width)
            if idx < 0: idx = 0
            if idx >= bins: idx = bins - 1
        counts[idx] += 1
    out = []
    for i in range(bins):
        start = mn + i*width
        end = mn + (i+1)*width if i < bins-1 else mx
        out.append({"start": start, "end": end, "count": counts[i]})
    return out

def mean(arr):
    return sum(arr)/len(arr) if arr else 0

def pearson(a, b):
    n = len(a)
    if n < 2:
        return 0
    ma, mb = mean(a), mean(b)
    num = sum((x - ma)*(y - mb) for x, y in zip(a, b))
    da = sqrt(sum((x - ma)**2 for x in a))
    db = sqrt(sum((y - mb)**2 for y in b))
    if da == 0 or db == 0:
        return 0
    return num / (da * db)

def percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    k = (len(sorted_vals)-1) * (p/100.0)
    f = int(k)
    c = f + 1
    if c >= len(sorted_vals):
        return float(sorted_vals[f])
    d0 = sorted_vals[f] * (c - k)
    d1 = sorted_vals[c] * (k - f)
    return float(d0 + d1)