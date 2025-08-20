import frappe
import json
from datetime import datetime
import frappe
from frappe.utils import getdate, add_days, nowdate
import frappe
from datetime import datetime
from frappe.utils import now
from datetime import datetime, timedelta
from datetime import datetime, timedelta
import frappe


@frappe.whitelist()
def get_average_quantity(supplier, milk_type, days=10):
    """
    Calculate the average morning or evening quantities for the supplier over the last `days`.
    Args:
        supplier (str): The supplier name.
        days (int or str): The number of days to calculate the average for.
    Returns:
        dict: A dictionary containing the average morning and evening quantities.
    """
    import datetime

    # Convert days to integer, if it's a string
    days = int(days)

    # Get the last `days` dates
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)

    # Fetch milk entries for the supplier within the date range
    milk_entries = frappe.db.get_all(
        "Milk Entries Log",
        filters={
            "supplier": supplier,
            "date": ["between", [start_date, end_date]]
        },
        fields=["morning", "evening", "quantity"]
    )

    # Initialize totals and counters
    total_morning = 0
    total_evening = 0
    morning_count = 0
    evening_count = 0

    # Process each milk entry
    for entry in milk_entries:
        if entry.get("morning", 0) == 1: 
            if entry.get("quantity", 0) > 0:
                total_morning += entry.get("quantity", 0)
                morning_count += 1

        if entry.get("evening", 0) == 1:  
            if entry.get("quantity", 0) > 0:
                total_evening += entry.get("quantity", 0)
                evening_count += 1

    # Calculate averages
    average_morning = total_morning / morning_count if morning_count > 0 else 0
    average_evening = total_evening / evening_count if evening_count > 0 else 0

    return {
        "morning": average_morning,
        "evening": average_evening
    }

@frappe.whitelist()
def get_drivers():
    return frappe.get_all("Driver", fields=["name"])

@frappe.whitelist()
def get_villages(driver=None):
    if driver:
        return frappe.get_all("Village", filters={"driver_responsible": driver}, fields=["name"])
    return []

      
@frappe.whitelist()
def get_company_from_milk_settings():
    """
    Fetch the company from Milk Setting.
    """
    try:
        company = frappe.db.get_single_value("Milk Setting", "company")
        if not company:
            frappe.throw("لم يتم ضبط الشركة في إعدادات الحليب 😅")
        return company
    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Company from Milk Setting")
        frappe.throw("حدث خطأ أثناء الحصول على إعدادات الشركة 😢")


@frappe.whitelist()
def get_grouped_supplier_report(selected_date, supplier=None, driver=None, village=None):
    try:
        # Parse start date and generate 7-day range
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=6)

        # Filters for the query
        filters = {
            "date": ["between", [start_date.date(), end_date.date()]],
        }
        if supplier:
            filters["supplier"] = supplier
        if driver:
            filters["driver"] = driver
        if village:
            filters["village"] = village

        # Fetch records from Milk Entries Log
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "supplier", "milk_type", "quantity", "amount", "village"]
        )

        # Fetch all villages and their drivers
        village_data = frappe.get_all(
            "Village",
            fields=["village_name", "driver_responsible"]
        )
        village_driver_map = {v["village_name"]: v["driver_responsible"] for v in village_data}

        # Grouped data structure
        grouped_data = {}

        for record in records:
            village_name = record.get("village", "Unknown Village")
            driver_name = village_driver_map.get(village_name, "Unknown Driver")
            supplier_name = record.get("supplier")
            milk_type = record.get("milk_type")

            # Initialize driver group
            if driver_name not in grouped_data:
                grouped_data[driver_name] = {"villages": {}, "total_qty": 0, "total_amount": 0}

            # Initialize village group under driver
            if village_name not in grouped_data[driver_name]["villages"]:
                grouped_data[driver_name]["villages"][village_name] = {"suppliers": {}, "total_qty": 0, "total_amount": 0}

            # Initialize supplier group under village
            if supplier_name not in grouped_data[driver_name]["villages"][village_name]["suppliers"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name] = {
                    "milk_types": {}, "total_qty": 0, "total_amount": 0
                }

            # Initialize milk type under supplier
            if milk_type not in grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type] = {
                    "qty": 0, "amount": 0
                }

            # Update quantities and amounts
            milk_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type]
            milk_data["qty"] += record["quantity"]
            milk_data["amount"] += record["amount"]

            # Update supplier totals
            supplier_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]
            supplier_data["total_qty"] += record["quantity"]
            supplier_data["total_amount"] += record["amount"]

            # Update village totals
            village_data = grouped_data[driver_name]["villages"][village_name]
            village_data["total_qty"] += record["quantity"]
            village_data["total_amount"] += record["amount"]

            # Update driver totals
            driver_data = grouped_data[driver_name]
            driver_data["total_qty"] += record["quantity"]
            driver_data["total_amount"] += record["amount"]

        return {"status": "success", "data": grouped_data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Grouped Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
         
@frappe.whitelist()
def get_supplier_report_seven_days(selected_date, supplier=None, driver=None, village=None):
    try:
        # Parse start date and generate the 7-day range
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        days_of_week = [start_date + timedelta(days=i) for i in range(7)]

        # Arabic day names mapping
        arabic_days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
        arabic_numbers = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")

        # Filters for the query
        filters = {
            "date": ["between", [start_date.date(), (start_date + timedelta(days=6)).date()]],
        }
        if supplier:
            filters["supplier"] = supplier
        if driver:
            filters["driver"] = driver
        if village:
            filters["village"] = village

        # Fetch records for the given week
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "supplier", "milk_type", "morning", "evening", "quantity", "amount", "pont", "driver", "village"]
        )

        # Group data by supplier and milk type
        grouped_data = {}
        for record in records:
            supplier_name = record["supplier"]
            milk_type = record["milk_type"]

            # Fetch supplier-specific details
            supplier_doc = frappe.get_doc("Supplier", supplier_name)
            custom_villages = supplier_doc.custom_villages or "غير محدد"
            cow_price = supplier_doc.custom_cow_price or 0
            buffalo_price = supplier_doc.custom_buffalo_price or 0
            custom_pont_size_rate = supplier_doc.custom_pont_size_rate or 0
            rate = cow_price if milk_type == "Cow" else buffalo_price
            encrypted_rate = rate * 90  # Encrypted rate calculation

            # Initialize supplier and milk type grouping
            key = (supplier_name, milk_type)
            if key not in grouped_data:
                grouped_data[key] = {
                    "supplier_name": supplier_name,
                    "custom_villages": custom_villages,
                    "milk_type": milk_type,
                    "custom_pont_size_rate": custom_pont_size_rate,
                    "encrypted_rate": encrypted_rate,  # Include encrypted rate
                    "days": {day.date(): {"day_name": f"{arabic_days[day.weekday()]} - {day.strftime('%d').translate(arabic_numbers)}",
                                          "morning": {"qty": 0, "amount": 0, "pont": 0},
                                          "evening": {"qty": 0, "amount": 0, "pont": 0}} for day in days_of_week},
                    "total_morning": 0,
                    "total_evening": 0,
                    "total_quantity": 0,
                    "total_amount": 0,  # Initialize total amount
                    "driver": record.get("driver"),
                    "village": record.get("village"),
                }

            # Populate morning and evening data
            date_key = record["date"]
            if date_key in grouped_data[key]["days"]:
                if record["morning"] == 1:
                    grouped_data[key]["days"][date_key]["morning"]["qty"] += record["quantity"]
                    grouped_data[key]["days"][date_key]["morning"]["amount"] += record["amount"]
                    grouped_data[key]["days"][date_key]["morning"]["pont"] = record["pont"]
                if record["evening"] == 1:
                    grouped_data[key]["days"][date_key]["evening"]["qty"] += record["quantity"]
                    grouped_data[key]["days"][date_key]["evening"]["amount"] += record["amount"]
                    grouped_data[key]["days"][date_key]["evening"]["pont"] = record["pont"]

                # Update totals
                grouped_data[key]["total_morning"] += record["quantity"] if record["morning"] == 1 else 0
                grouped_data[key]["total_evening"] += record["quantity"] if record["evening"] == 1 else 0
                grouped_data[key]["total_amount"] += record["amount"]

        # Finalize data
        final_data = []
        for (supplier_name, milk_type), data in grouped_data.items():
            data["total_quantity"] = data["total_morning"] + data["total_evening"]

            # Convert days dict to list for frontend rendering
            data["days"] = list(data["days"].values())

            final_data.append(data)

        return {"status": "success", "data": final_data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
    
@frappe.whitelist()
def get_driver_report(from_date, to_date, driver=None):
    """
    Generate a daily report comparing milk collected from suppliers (Milk Entries Log)
    and car collection (Car Collection), grouped by milk type for each driver within the specified date range.
    """
    try:
        # Validate input
        if not from_date or not to_date:
            frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.")

        # Filter conditions for driver (optional)
        driver_condition = f"AND driver = %(driver)s" if driver else ""

        # Query Milk Entries Log: Collected Morning and Evening Totals by Milk Type
        milk_entries_query = f"""
            SELECT
                driver,
                date,
                milk_type,
                SUM(CASE WHEN morning = 1 THEN quantity ELSE 0 END) AS collected_morning,
                SUM(CASE WHEN evening = 1 THEN quantity ELSE 0 END) AS collected_evening
            FROM
                `tabMilk Entries Log`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date, milk_type
        """

        milk_entries = frappe.db.sql(
            milk_entries_query,
            {"from_date": from_date, "to_date": to_date, "driver": driver},
            as_dict=True,
        )

        # Query Car Collection: Calculate Morning and Evening Totals by Milk Type
        car_collection_query = f"""
            SELECT
                driver,
                date,
                milk_type,
                SUM(CASE WHEN morning = 1 THEN quantity ELSE 0 END) AS car_morning,
                SUM(CASE WHEN evening = 1 THEN quantity ELSE 0 END) AS car_evening
            FROM
                `tabCar Collection`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date, milk_type
        """

        car_collection = frappe.db.sql(
            car_collection_query,
            {"from_date": from_date, "to_date": to_date, "driver": driver},
            as_dict=True,
        )

        # Merge Data from Both Sources
        report_data = {}

        # Populate Milk Entries Log Data
        for entry in milk_entries:
            key = (entry["driver"], entry["date"], entry["milk_type"])
            report_data[key] = {
                "driver": entry["driver"],
                "date": entry["date"],
                "milk_type": entry["milk_type"],
                "collected_morning": float(entry["collected_morning"] or 0),
                "collected_evening": float(entry["collected_evening"] or 0),
                "car_morning": 0,
                "car_evening": 0,
            }

        # Populate Car Collection Data
        for entry in car_collection:
            key = (entry["driver"], entry["date"], entry["milk_type"])
            if key not in report_data:
                report_data[key] = {
                    "driver": entry["driver"],
                    "date": entry["date"],
                    "milk_type": entry["milk_type"],
                    "collected_morning": 0,
                    "collected_evening": 0,
                }
            report_data[key]["car_morning"] = float(entry["car_morning"] or 0)
            report_data[key]["car_evening"] = float(entry["car_evening"] or 0)

        # Calculate Differences and Totals
        final_report = []
        for key, data in report_data.items():
            collected_total = data["collected_morning"] + data["collected_evening"]
            car_total = data["car_morning"] + data["car_evening"]
            morning_diff = data["car_morning"] - data["collected_morning"]
            evening_diff = data["car_evening"] - data["collected_evening"]
            total_diff = car_total - collected_total

            final_report.append({
                "driver": data["driver"],
                "date": data["date"],
                "milk_type": data["milk_type"],
                "collected_morning": data["collected_morning"],
                "car_morning": data["car_morning"],
                "morning_diff": morning_diff,
                "collected_evening": data["collected_evening"],
                "car_evening": data["car_evening"],
                "evening_diff": evening_diff,
                "collected_total": collected_total,
                "car_total": car_total,
                "total_diff": total_diff,
            })

        # Sort by date, driver, and milk type
        final_report.sort(key=lambda x: (x["date"], x["driver"], x["milk_type"]))

        return {"status": "success", "data": final_report}

    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Driver Daily Report")
        return {
            "status": "error",
            "message": f"حدث خطأ أثناء جلب التقرير: {str(e)}"
        }
        
@frappe.whitelist()
def insert_car_collection(data):
    
    try:
        data = json.loads(data)

        # Required fields validation
        required_fields = ["driver", "warehouse", "quantity", "date", "milk_type"]
        for field in required_fields:
            if not data.get(field):
                frappe.throw(f"مطلوب حقل '{field}' 😅")

        # Date validation
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            frappe.throw("التاريخ لازم يكون بالصيغة YYYY-MM-DD 📅")

        # Quantity validation
        try:
            quantity = float(data["quantity"])
            if quantity <= 0:
                frappe.throw("الكمية لازم تكون رقم موجب 👍")
        except ValueError:
            frappe.throw("الكمية لازم تكون رقم صحيح 🧮")

        # Milk type validation
        if data["milk_type"] not in ["Cow", "Buffalo"]:
            frappe.throw("نوع الحليب لازم يكون يا Cow يا Buffalo 🐄🐃")

        # Time validation
        morning = int(data.get("morning", 0))
        evening = int(data.get("evening", 0))
        milk_type = data.get("milk_type")
        if not morning and not evening:
            frappe.throw("اختار صباحاً أو مساءً ⏰")

        # Duplicate check
        if frappe.get_all(
            "Car Collection",
            filters={
                "driver": data["driver"],
                "date": data["date"],
                "milk_type": milk_type,
                "morning": morning,
                "evening": evening
            },
            limit_page_length=1
        ):
            frappe.throw("فيه سجل بنفس السائق، التاريخ، والوقت 😬")
        company = get_company_from_milk_settings()
        # Insert document
        doc = frappe.get_doc({
            "doctype": "Car Collection",
            "driver": data["driver"],
            "warehouse": data["warehouse"],
            "quantity": quantity,
            "company": company,
            "date": data["date"],
            "morning": morning,
            "evening": evening,
            "milk_type": data["milk_type"]
        })
        doc.insert()
        doc.submit()

        frappe.msgprint("✅ تم حفظ بيانات استلام السيارة بنجاح!")
        return {"message": "✅ تم حفظ بيانات استلام السيارة بنجاح!", "docname": doc.name}

    except json.JSONDecodeError:
        frappe.throw("البيانات اللي بعتهالك مش JSON 😅")
    except Exception as e:
        frappe.throw(f"حصل خطأ: {str(e)} 😢")

    
@frappe.whitelist()
def validate_supplier_data(driver, village, collection_date, milk_entries):
    """
    Validate milk entries against historical data for each supplier.
    """
    try:
        collection_date = getdate(collection_date)
        one_month_ago = add_days(collection_date, -30)
        milk_entries = frappe.parse_json(milk_entries)

        warnings = []
        for entry in milk_entries:
            supplier = entry.get("supplier")
            milk_type = entry.get("milk_type")
            quantity = entry.get("morning_quantity") or 0  # Add evening_quantity if needed

            # Fetch historical data for the supplier
            historical_data = frappe.db.sql("""
                SELECT quantity
                FROM `tabMilk Entries Log`
                WHERE supplier = %(supplier)s
                  AND milk_type = %(milk_type)s
                  AND date BETWEEN %(start_date)s AND %(end_date)s
            """, {
                "supplier": supplier,
                "milk_type": milk_type,
                "start_date": one_month_ago,
                "end_date": collection_date
            }, as_dict=True)

            # Calculate average quantity and acceptable range
            if historical_data:
                quantities = [d.quantity for d in historical_data]
                avg_quantity = sum(quantities) / len(quantities)
                acceptable_range = (avg_quantity * 0.5, avg_quantity * 1.5)

                # Check if the current quantity is within the acceptable range
                if quantity < acceptable_range[0] or quantity > acceptable_range[1]:
                    warnings.append(
                        f"الجامع '{supplier}' ({milk_type}): الكمية {quantity} مش طبيعية 🤔. "
                        f"المتوسط المتوقع: من {acceptable_range[0]:.2f} لـ {acceptable_range[1]:.2f}."
                    )

        if warnings:
            return {"status": "warning", "warnings": warnings}
        else:
            return {"status": "success", "warnings": []}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في فحص تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ: {str(e)} 😢"}


@frappe.whitelist()
def get_suppliers(driver, collection_date, villages=None):
    """
    Fetch suppliers, load draft, or load submitted milk collection based on the driver, villages, and date.
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق وتاريخ الجمع عشان نجيب الموردين 😅")

        if not villages or not isinstance(villages, list):
            villages = []  # Default to an empty list if no villages are provided

        # Check for existing Milk Collection documents
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {"driver": driver, "collection_date": collection_date},
            ["name", "docstatus"],
            as_dict=True
        )

        # Handle submitted document
        if existing_doc and existing_doc["docstatus"] == 1:
            submitted_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            return {
                "status": "submitted",
                "milk_entries": submitted_doc.milk_entries,
                "message": f"تسجيل اللبن للسائق '{driver}' والتاريخ '{collection_date}' متسلم بالفعل ✅"
            }

        # Handle draft document
        if existing_doc and existing_doc["docstatus"] == 0:
            draft_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            # Process draft entries to include custom_pont_size_rate
            return {
                "status": "draft",
                "milk_entries": process_milk_entries(draft_doc.milk_entries),
                "message": "في مسودة موجودة، ممكن تكمل إدخال البيانات ✍️"
            }

        # New entries logic (if no draft or submitted document exists)
        filters = {"custom_driver_in_charge": driver}
        if villages:
            filters["custom_villages"] = ["in", villages]

        suppliers = frappe.get_all(
            "Supplier",
            filters=filters,
            fields=["name", "custom_cow", "custom_buffalo", "custom_cow_price", "custom_buffalo_price", "custom_pont_size_rate"]
        )

        if not suppliers:
            return {
                "status": "no_suppliers",
                "suppliers": [],
                "message": f"لا يوجد موردين للسائق '{driver}' والقرى المحددة 😞"
            }

        # Process suppliers for new milk entries
        processed_suppliers = []
        for supplier in suppliers:
            supplier_name = supplier.get("name") or "غير معروف"
            milk_types = []
            if supplier.get("custom_cow"):
                milk_types.append("Cow")
            if supplier.get("custom_buffalo"):
                milk_types.append("Buffalo")

            pont_size_rate = supplier.get("custom_pont_size_rate", 0)

            processed_suppliers.append({
                "supplier": supplier_name,
                "milk_type": ",".join(milk_types),
                "custom_pont_size_rate": pont_size_rate,
                "morning_quantity": 0,
                "evening_quantity": 0,
                "morning_pont": 0 if pont_size_rate == 0 else None,
                "evening_pont": 0 if pont_size_rate == 0 else None,
                "cow_price": supplier.get("custom_cow_price", 0),
                "buffalo_price": supplier.get("custom_buffalo_price", 0),
            })

        return {
            "status": "new",
            "suppliers": processed_suppliers,
            "message": f"تم جلب الموردين للسائق '{driver}' والقرى المحددة ✅"
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في جلب الموردين 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنجيب الموردين 😢: {str(e)}"}
    

def process_milk_entries(milk_entries):
    """
    Process draft milk entries to ensure valid supplier names, milk types,
    and respect the supplier's custom_pont_size_rate for editable ponts.
    """
    processed_entries = []
    for entry in milk_entries:
        supplier_name = entry.get("supplier")
        
        if supplier_name:
            # Fetch supplier's custom_pont_size_rate
            supplier = frappe.get_doc("Supplier", supplier_name)
            custom_pont_size_rate = supplier.custom_pont_size_rate or 0
        else:
            custom_pont_size_rate = 0

        processed_entries.append({
            "supplier": supplier_name or "غير معروف",  # Fallback for missing supplier
            "milk_type": entry.get("milk_type"),
            "morning_quantity": entry.get("morning_quantity", 0),
            "evening_quantity": entry.get("evening_quantity", 0),
            "morning_pont": entry.get("morning_pont", 0),
            "evening_pont": entry.get("evening_pont", 0),
            "custom_pont_size_rate": custom_pont_size_rate,  # Include supplier's pont rate for frontend logic
        })
    return processed_entries
    
    
@frappe.whitelist()
def submit_milk_collection(driver, village, collection_date, milk_entries=None):
    """
    Submit the Milk Collection document. If no draft exists, create a new document and submit it.
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نقدر نسلم تسجيل اللبن 😅")
        if not milk_entries:
            frappe.throw("مطلوب إدخال بيانات الحليب عشان نقدر نسلمها 😬")

        milk_entries = frappe.parse_json(milk_entries)
        company = get_company_from_milk_settings()

        # Check for an existing draft document
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "docstatus": 0  # Only drafts
            },
            "name"
        )

        if existing_doc:
            # Update and submit the existing draft
            doc = frappe.get_doc("Milk Collection", existing_doc)
            doc.milk_entries = []  # Clear existing entries
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                })
            doc.submit()  # Submit the updated document

            message = f"✅ تم تسليم تسجيل اللبن '{doc.name}' بنجاح يا معلم!"
        
        else:
            # No draft exists, create a new document and submit it
            doc = frappe.new_doc("Milk Collection")
            doc.driver = driver
            doc.village = village
            doc.collection_date = collection_date
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                })
            doc.insert()
            doc.submit()  # Submit the newly created document

            message = f"✅ ملقناش مسودة فعملنا واحدة جديدة وسلمنا تسجيل اللبن '{doc.name}' بنجاح!"

        frappe.db.commit()  # Commit changes to the database
        frappe.msgprint(message)
        return {"status": "success", "message": message}

    except Exception as e:
        # Log and return an error message
        frappe.log_error(message=str(e), title="خطأ في تسليم تسجيل اللبن 🐄")
        return {
            "status": "error",
            "message": f"حصل خطأ وإحنا بنسلم تسجيل اللبن 😢: {str(e)}"
        }
        
        
@frappe.whitelist()
def check_existing_milk_collection(driver, village, collection_date):
    """
    Check if a Milk Collection document exists for the given driver, village, and date.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نفحص تسجيل اللبن 😅")

        # Check for existing Milk Collection
        existing_doc = frappe.get_all(
            "Milk Collection",
            filters={
                "driver": driver,
                "village": village,
                "collection_date": collection_date
            },
            fields=["name", "docstatus"]
        )

        # Handle existing document cases
        if existing_doc:
            if existing_doc[0]["docstatus"] == 1:
                return {
                    "status": "submitted",
                    "message": f"تسجيل اللبن '{existing_doc[0]['name']}' متسلم بالفعل ✅"
                }
            elif existing_doc[0]["docstatus"] == 0:
                doc = frappe.get_doc("Milk Collection", existing_doc[0]["name"])
                return {
                    "status": "draft",
                    "data": {
                        "entries": doc.milk_entries,
                        "message": f"تم تحميل مسودة '{existing_doc[0]['name']}' ✍️"
                    }
                }

        # No document found
        return {"status": "none", "message": "ملقناش أي جمع حليب بالمعطيات اللي حددتها 😬"}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في فحص تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنفحص تسجيل اللبن 😢: {str(e)}"}
  

@frappe.whitelist()
def save_milk_collection(driver, village, collection_date, milk_entries):
    """
    Save or update milk collection data as a draft.
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نحفظ المسودة 😅")
        if not milk_entries:
            frappe.throw("مطلوب إدخال بيانات الحليب عشان نحفظ 😬")

        milk_entries = frappe.parse_json(milk_entries)

        # Check for an existing draft document
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "docstatus": 0  # Only drafts
            },
            "name"
        )

        if existing_doc:
            # Update the existing draft
            doc = frappe.get_doc("Milk Collection", existing_doc)
            doc.milk_entries = []  # Clear existing entries
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0 if rate is 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0 if rate is 0
                })
            doc.save()
            frappe.msgprint(f"✍️ تم تحديث مسودة تسجيل اللبن '{doc.name}' بنجاح!")
        else:
            # Create a new draft document if none exists
            doc = frappe.get_doc({
                "doctype": "Milk Collection",
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "milk_entries": [
                    {
                        "supplier": entry.get("supplier"),
                        "milk_type": entry.get("milk_type"),
                        "morning_quantity": entry.get("morning_quantity", 0),
                        "evening_quantity": entry.get("evening_quantity", 0),
                        "morning_pont": entry.get("morning_pont", 0) if frappe.get_doc("Supplier", entry.get("supplier")).get("custom_pont_size_rate", 0) else 0,
                        "evening_pont": entry.get("evening_pont", 0) if frappe.get_doc("Supplier", entry.get("supplier")).get("custom_pont_size_rate", 0) else 0,
                    }
                    for entry in milk_entries
                ]
            })
            doc.insert()
            frappe.msgprint(f"✍️ تم حفظ مسودة جديدة لتسجيل اللبن '{doc.name}' بنجاح!")

        frappe.db.commit()
        return {"status": "success", "message": f"مسودة تسجيل اللبن '{doc.name}' تم حفظها بنجاح!"}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في حفظ مسودة تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنحفظ المسودة 😢: {str(e)}"}