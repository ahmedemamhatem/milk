import frappe
from frappe import _
from collections import defaultdict
from statistics import mean

def execute(filters=None):
    filters = filters or {}
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    driver = filters.get("driver")
    report_type = (filters.get("report_type") or "متوسط").strip()  # "الكل" أو "متوسط"

    if not from_date or not to_date:
        frappe.throw(_("الرجاء تحديد من تاريخ وإلى تاريخ"))

    # شروط مشتركة
    conds = [
        "date >= %(from_date)s",
        "date <= %(to_date)s",
        "docstatus = 1"
    ]
    params = {"from_date": from_date, "to_date": to_date}

    if driver:
        conds.append("driver = %(driver)s")
        params["driver"] = driver

    if report_type == "كل سجلات الجوده":
        # إرجاع كل السجلات ذات الجودة المفعّلة
        conds_all = conds + ["IFNULL(quality_enabled, 0) = 1"]
        where_all = " AND ".join(conds_all)

        columns = get_columns_all()
        rows = frappe.db.sql(
            f"""
            SELECT
                name,
                date,
                driver,
                CASE 
                    WHEN milk_type = 'Cow' THEN 'بقر'
                    WHEN milk_type = 'Buffalo' THEN 'جاموسي'
                    ELSE IFNULL(milk_type, '')
                END AS milk_type_ar,
                quantity,
                IFNULL(morning, 0) AS morning,
                IFNULL(evening, 0) AS evening,
                density, hardness, protein, pont, water
            FROM `tabCar Collection`
            WHERE {where_all}
            ORDER BY date, driver
            """,
            params,
            as_dict=True
        )

        out = []
        for r in rows:
            period = "صباحاً" if int(r.morning or 0) == 1 else ("مساءً" if int(r.evening or 0) == 1 else "غير محدد")
            out.append({
                "date": r.date,
                "driver": r.driver,
                "milk_type": r.milk_type_ar,
                "quantity": r.quantity,
                "period": period,
                "density": r.density,
                "hardness": r.hardness,
                "protein": r.protein,
                "pont": r.pont,
                "water": r.water,
            })
        return columns, out

    # report_type == "متوسط": تجميع حسب (الخط + نوع الحليب)
    where_clause = " AND ".join(conds)
    rows = frappe.db.sql(
        f"""
        SELECT
            driver,
            milk_type,
            date,
            quantity,
            IFNULL(quality_enabled, 0) AS quality_enabled,
            IFNULL(morning, 0) AS morning,
            IFNULL(evening, 0) AS evening,
            density, hardness, protein, pont, water
        FROM `tabCar Collection`
        WHERE {where_clause}
        """,
        params,
        as_dict=True,
    )

    groups = defaultdict(list)
    for r in rows:
        key = (r.driver, r.milk_type)
        groups[key].append(r)

    data = []
    for (drv, milk), items in sorted(groups.items(), key=lambda k: (k[0][0] or "", k[0][1] or "")):
        total_qty = sum((i.quantity or 0) for i in items)
        total_qty_quality = sum((i.quantity or 0) for i in items if int(i.quality_enabled or 0) == 1)

        # فلترة العناصر المفعّلة للجودة مرة واحدة
        enabled_items = [i for i in items if int(i.quality_enabled or 0) == 1]

        samples_morning = sum(1 for i in enabled_items if int(i.morning or 0) == 1)
        samples_evening = sum(1 for i in enabled_items if int(i.evening or 0) == 1)
        samples_total = len(enabled_items)

        def avg(field):
            vals = [i.get(field) for i in enabled_items if i.get(field) is not None]
            return round(mean(vals), 4) if vals else None

        avg_density = avg("density")
        avg_hardness = avg("hardness")
        avg_protein = avg("protein")
        avg_pont = avg("pont")
        avg_water = avg("water")

        data.append({
            "driver": drv,
            "milk_type": "بقر" if milk == "Cow" else "جاموسي" if milk == "Buffalo" else (milk or ""),
            "total_qty": total_qty,
            "total_qty_quality": total_qty_quality,
            "samples_morning": samples_morning,
            "samples_evening": samples_evening,
            "samples_total": samples_total,
            "avg_density": avg_density,
            "avg_hardness": avg_hardness,
            "avg_protein": avg_protein,
            "avg_pont": avg_pont,
            "avg_water": avg_water,
        })

    columns = get_columns_avg()
    return columns, data


def get_columns_avg():
    return [
        {"label": _("الخط"), "fieldname": "driver", "fieldtype": "Link", "options": "Driver", "width": 170},
        {"label": _("نوع الحليب"), "fieldname": "milk_type", "fieldtype": "Data", "width": 110},

        {"label": _("إجمالي الكمية"), "fieldname": "total_qty", "fieldtype": "Float", "precision": "2", "width": 130},
        {"label": _("الكمية (مع الجودة)"), "fieldname": "total_qty_quality", "fieldtype": "Float", "precision": "2", "width": 170},

        {"label": _("عدد العينات صباحاً"), "fieldname": "samples_morning", "fieldtype": "Int", "width": 140},
        {"label": _("عدد العينات مساءً"), "fieldname": "samples_evening", "fieldtype": "Int", "width": 140},
        {"label": _("إجمالي العينات"), "fieldname": "samples_total", "fieldtype": "Int", "width": 130},

        {"label": _("متوسط الكثافة"), "fieldname": "avg_density", "fieldtype": "Float", "precision": "4", "width": 130},
        {"label": _("متوسط الصلابة"), "fieldname": "avg_hardness", "fieldtype": "Float", "precision": "4", "width": 130},
        {"label": _("متوسط البروتين (%)"), "fieldname": "avg_protein", "fieldtype": "Percent", "precision": "2", "width": 150},
        {"label": _("متوسط البنط"), "fieldname": "avg_pont", "fieldtype": "Float", "precision": "2", "width": 120},
        {"label": _("متوسط الماء (%)"), "fieldname": "avg_water", "fieldtype": "Percent", "precision": "2", "width": 140},
    ]


def get_columns_all():
    return [
        {"label": _("التاريخ"), "fieldname": "date", "fieldtype": "Date", "width": 110},
        {"label": _("الخط"), "fieldname": "driver", "fieldtype": "Link", "options": "Driver", "width": 140},
        {"label": _("نوع الحليب"), "fieldname": "milk_type", "fieldtype": "Data", "width": 100},
        {"label": _("الكمية"), "fieldname": "quantity", "fieldtype": "Float", "precision": "2", "width": 110},
        {"label": _("الفترة"), "fieldname": "period", "fieldtype": "Data", "width": 100},
        {"label": _("الكثافة"), "fieldname": "density", "fieldtype": "Float", "precision": "4", "width": 100},
        {"label": _("الصلابة"), "fieldname": "hardness", "fieldtype": "Float", "precision": "2", "width": 100},
        {"label": _("البروتين (%)"), "fieldname": "protein", "fieldtype": "Percent", "precision": "2", "width": 110},
        {"label": _("البنط"), "fieldname": "pont", "fieldtype": "Float", "precision": "2", "width": 90},
        {"label": _("الماء (%)"), "fieldname": "water", "fieldtype": "Percent", "precision": "2", "width": 100},
    ]