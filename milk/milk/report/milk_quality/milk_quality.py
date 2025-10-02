import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    columns = get_columns(filters)

    conditions = []
    params = {}

    if filters.get("driver"):
        conditions.append("mq.driver = %(driver)s")
        params["driver"] = filters.get("driver")

    if filters.get("village"):
        conditions.append("s.village = %(village)s")
        params["village"] = filters.get("village")

    if filters.get("supplier"):
        conditions.append("smq.supplier = %(supplier)s")
        params["supplier"] = filters.get("supplier")

    if filters.get("milk_type"):
        if filters["milk_type"] == "بقري":
            conditions.append("mq.cow = 1")
        elif filters["milk_type"] == "جاموسي":
            conditions.append("mq.buffalo = 1")

    if filters.get("from_date") and filters.get("to_date"):
        conditions.append("mq.date between %(from_date)s and %(to_date)s")
        params["from_date"] = filters["from_date"]
        params["to_date"] = filters["to_date"]

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    if filters.get("report_type") == "متوسط":
        # متوسط لكل مورد + نوع اللبن
        query = f"""
            SELECT
                smq.supplier as المورد,
                CASE 
                    WHEN mq.cow = 1 THEN 'بقري'
                    WHEN mq.buffalo = 1 THEN 'جاموسي'
                    ELSE 'غير معروف'
                END as نوع_اللبن,
                IFNULL(AVG(CAST(smq.water AS DECIMAL(10,2))), 0) as متوسط_مياه,
                IFNULL(AVG(CAST(smq.protein AS DECIMAL(10,2))), 0) as متوسط_بروتين,
                IFNULL(AVG(CAST(smq.density AS DECIMAL(10,2))), 0) as متوسط_كثافة,
                IFNULL(AVG(CAST(smq.hardness AS DECIMAL(10,2))), 0) as متوسط_صلابة,
                IFNULL(AVG(CAST(smq.pont AS DECIMAL(10,2))), 0) as متوسط_بونت
            FROM `tabMilk Quality` mq
            INNER JOIN `tabSupplier Milk Quality` smq ON smq.parent = mq.name
            LEFT JOIN `tabSupplier` s ON smq.supplier = s.name
            WHERE {where_clause}
            GROUP BY smq.supplier, نوع_اللبن
            ORDER BY smq.supplier, نوع_اللبن
        """
    else:
        # كل السجلات مع الفترة (صباح / مساء)
        query = f"""
            SELECT
                mq.date as التاريخ,
                mq.driver as السواق,
                smq.supplier as المورد,
                CASE 
                    WHEN mq.cow = 1 THEN 'بقري'
                    WHEN mq.buffalo = 1 THEN 'جاموسي'
                    ELSE 'غير معروف'
                END as نوع_اللبن,
                CASE
                    WHEN mq.morning = 1 THEN 'صباح'
                    WHEN mq.evening = 1 THEN 'مساء'
                    ELSE 'غير محدد'
                END as الفترة,
                smq.water as مياه,
                smq.protein as بروتين,
                smq.density as كثافة,
                smq.hardness as صلابة,
                smq.pont as بونت
            FROM `tabMilk Quality` mq
            INNER JOIN `tabSupplier Milk Quality` smq ON smq.parent = mq.name
            LEFT JOIN `tabSupplier` s ON smq.supplier = s.name
            WHERE {where_clause}
            ORDER BY mq.date, smq.supplier
        """

    data = frappe.db.sql(query, params, as_dict=True)
    return columns, data


def get_columns(filters):
    if filters.get("report_type") == "متوسط":
        return [
            {"label": "المورد", "fieldname": "المورد", "fieldtype": "Link", "options": "Supplier", "width": 200},
            {"label": "نوع اللبن", "fieldname": "نوع_اللبن", "fieldtype": "Data", "width": 120},
            {"label": "متوسط مياه", "fieldname": "متوسط_مياه", "fieldtype": "Float", "width": 120},
            {"label": "متوسط بروتين", "fieldname": "متوسط_بروتين", "fieldtype": "Float", "width": 120},
            {"label": "متوسط كثافة", "fieldname": "متوسط_كثافة", "fieldtype": "Float", "width": 120},
            {"label": "متوسط صلابة", "fieldname": "متوسط_صلابة", "fieldtype": "Float", "width": 120},
            {"label": "متوسط بونت", "fieldname": "متوسط_بونت", "fieldtype": "Float", "width": 120},
        ]
    else:
        return [
            {"label": "التاريخ", "fieldname": "التاريخ", "fieldtype": "Date", "width": 120},
            {"label": "السواق", "fieldname": "السواق", "fieldtype": "Link", "options": "Driver", "width": 150},
            {"label": "المورد", "fieldname": "المورد", "fieldtype": "Link", "options": "Supplier", "width": 200},
            {"label": "نوع اللبن", "fieldname": "نوع_اللبن", "fieldtype": "Data", "width": 120},
            {"label": "الفترة", "fieldname": "الفترة", "fieldtype": "Data", "width": 100},
            {"label": "مياه", "fieldname": "مياه", "fieldtype": "Float", "width": 120},
            {"label": "بروتين", "fieldname": "بروتين", "fieldtype": "Float", "width": 120},
            {"label": "كثافة", "fieldname": "كثافة", "fieldtype": "Float", "width": 120},
            {"label": "صلابة", "fieldname": "صلابة", "fieldtype": "Float", "width": 120},
            {"label": "بونت", "fieldname": "بونت", "fieldtype": "Float", "width": 120},
        ]
