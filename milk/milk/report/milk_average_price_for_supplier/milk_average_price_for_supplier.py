# file: milk/milk/report/milk_average_price_for_supplier/milk_average_price_for_supplier.py

import frappe
from frappe.utils import getdate

@frappe.whitelist()
def execute(filters=None):
    filters = filters or {}
    from_date = getdate(filters.get("from_date")) if filters.get("from_date") else getdate(frappe.utils.month_start(getdate()))
    to_date = getdate(filters.get("to_date")) if filters.get("to_date") else getdate(frappe.utils.month_end(getdate()))
    supplier_filter = filters.get("supplier")

    # معدل البونت من إعدادات اللبن، الافتراضي 4
    pont_rate = 4
    try:
        ms = frappe.get_cached_doc("Milk Setting", "Milk Setting")
        if getattr(ms, "pont_rate", None):
            pont_rate = float(ms.pont_rate)
    except Exception:
        pass

    suppliers = frappe.get_all(
        "Supplier",
        filters={
            "disabled": 0,
            "custom_pont_size_rate": 0,      # احذف إذا لا تريد الاستبعاد
            "custom_milk_supplier": 1,
            **({"name": supplier_filter} if supplier_filter else {})
        },
        fields=[
            "name",
            "supplier_name",
            "custom_cow",
            "custom_cow_price",
            "custom_buffalo",
            "custom_buffalo_price",
        ],
        order_by="supplier_name asc"
    )

    avg_by_supplier = _get_avg_pont_map(from_date, to_date)

    columns = [
        {"label": "المورد", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 220},
        {"label": "النوع", "fieldname": "type", "fieldtype": "Data", "width": 90},
        {"label": "السعر الحالي", "fieldname": "current_rate", "fieldtype": "precision", "width": 120},
        {"label": "متوسط البونت", "fieldname": "avg_pont", "fieldtype": "Float", "precision": 2, "width": 120},
        {"label": "معدل البونت", "fieldname": "pont_rate", "fieldtype": "Float", "precision": 2, "width": 100},
        {"label": "السعر المحتسب", "fieldname": "calc_price", "fieldtype": "precision", "width": 140},
        {"label": "الفرق", "fieldname": "diff", "fieldtype": "precision", "width": 120},
    ]

    data = []
    add_separate_diff_row = False  # غيّر إلى True لإضافة صف مستقل للفرق بعد كل صف

    def add_rows_for_type(sup_name, type_label, current_rate, avg_pont_val):
        calc_price = round(avg_pont_val * pont_rate, 2)
        diff = round(calc_price - float(current_rate or 0), 2)

        # الصف الأساسي
        base_row = {
            "supplier": sup_name,
            "type": type_label,
            "current_rate": float(current_rate or 0),
            "avg_pont": avg_pont_val,
            "pont_rate": pont_rate,
            "calc_price": calc_price,
            "diff": diff,
        }
        data.append(base_row)

        # صف الفرق المستقل (اختياري)
        if add_separate_diff_row:
            data.append({
                "supplier": sup_name,
                "type": "فرق",
                "current_rate": None,
                "avg_pont": None,
                "pont_rate": None,
                "calc_price": None,
                "diff": diff,
            })

    for sup in suppliers:
        avg_pont = round(float(avg_by_supplier.get(sup.name, 0)), 2) if avg_by_supplier.get(sup.name) is not None else 0.0

        if int(sup.custom_cow or 0) == 1:
            add_rows_for_type(sup.name, "أبقار", sup.custom_cow_price, avg_pont)

        if int(sup.custom_buffalo or 0) == 1:
            add_rows_for_type(sup.name, "جاموس", sup.custom_buffalo_price, avg_pont)

    return columns, data


def _get_avg_pont_map(from_date, to_date):
    """
    إرجاع قاموس {supplier: avg_pont} خلال الفترة، باستخدام تاريخ الجدول الأب tabMilk Quality.
    """
    sql = """
        select
            smq.supplier as supplier,
            avg(coalesce(smq.pont, 0)) as avg_pont
        from `tabSupplier Milk Quality` smq
        join `tabMilk Quality` mq
            on mq.name = smq.parent and smq.parenttype = 'Milk Quality'
        where mq.`date` between %(from_date)s and %(to_date)s
        group by smq.supplier
    """
    rows = frappe.db.sql(sql, {"from_date": from_date, "to_date": to_date}, as_dict=True)
    return {r.supplier: float(r.avg_pont or 0) for r in rows}