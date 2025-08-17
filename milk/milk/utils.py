import frappe
import json
import frappe
from frappe.utils import getdate, add_days, nowdate
import frappe
from datetime import datetime
from frappe.utils import now


def get_supplier_report_seven_days(selected_date, supplier=None):
    from datetime import datetime, timedelta

    try:
        # Parse the selected date
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        days_of_week = [start_date + timedelta(days=i) for i in range(7)]  # Generate all 7 days

        # Arabic day names mapping
        arabic_days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]

        # Prepare filters
        filters = {
            "date": ["between", [start_date.date(), (start_date + timedelta(days=6)).date()]],
        }
        if supplier:
            filters["supplier"] = supplier  # Add supplier filter if provided

        # Fetch records for the 7-day period
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "day_name", "supplier", "morning", "evening", "quantity", "milk_type"]
        )

        # Organize data by Supplier and Milk Type
        grouped_data = {}
        for record in records:
            supplier_name = record["supplier"]

            # Fetch supplier-specific rates
            supplier_doc = frappe.get_doc("Supplier", supplier_name)
            cow_price = supplier_doc.custom_cow_price or 0  # Default to 0 if not set
            buffalo_price = supplier_doc.custom_buffalo_price or 0  # Default to 0 if not set

            # Determine rate based on milk type
            milk_type = record["milk_type"]
            rate_per_kg = cow_price if milk_type == "Cow" else buffalo_price

            # Initialize supplier and milk type grouping
            if supplier_name not in grouped_data:
                grouped_data[supplier_name] = {
                    "supplier_name": supplier_name,
                    "milk_type": milk_type,
                    "week_start": str(start_date.date()),
                    "days": {day.date(): {"day_name": f"{arabic_days[day.weekday()]} - {day.strftime('%m-%d')}",
                                          "morning": 0, "evening": 0} for day in days_of_week},  # Initialize all days
                    "total_morning": 0,
                    "total_evening": 0,
                    "total_quantity": 0,
                    "rate": rate_per_kg,
                    "total_amount": 0,
                }

            # Populate actual records
            date_key = record["date"]
            if date_key in grouped_data[supplier_name]["days"]:
                # Assign quantities to morning and evening based on flags
                if record["morning"] == 1:
                    grouped_data[supplier_name]["days"][date_key]["morning"] = record["quantity"]
                if record["evening"] == 1:
                    grouped_data[supplier_name]["days"][date_key]["evening"] = record["quantity"]

        # Calculate totals for each supplier
        for supplier_data in grouped_data.values():
            for day_data in supplier_data["days"].values():
                supplier_data["total_morning"] += day_data["morning"]
                supplier_data["total_evening"] += day_data["evening"]

            supplier_data["total_quantity"] = supplier_data["total_morning"] + supplier_data["total_evening"]
            supplier_data["total_amount"] = supplier_data["total_quantity"] * supplier_data["rate"]

            # Convert days dictionary to a list for easier frontend rendering
            supplier_data["days"] = list(supplier_data["days"].values())

        return {"status": "success", "data": list(grouped_data.values())}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
    
@frappe.whitelist()
def get_driver_report(from_date, to_date, driver=None):
    """
    Generate a daily report comparing milk collected from suppliers (Milk Entries Log)
    and car collection (Car Collection) for each driver within the specified date range.
    """
    try:
        # Validate input
        if not from_date or not to_date:
            frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.")

        # Filter conditions for driver (optional)
        driver_condition = f"AND driver = %(driver)s" if driver else ""

        # Query Milk Entries Log: Collected Morning and Evening Totals
        milk_entries_query = f"""
            SELECT
                driver,
                date,
                SUM(morning) AS collected_morning,
                SUM(evening) AS collected_evening
            FROM
                `tabMilk Entries Log`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date
        """

        milk_entries = frappe.db.sql(
            milk_entries_query,
            {"from_date": from_date, "to_date": to_date, "driver": driver},
            as_dict=True,
        )

        # Query Car Collection: Car Morning and Evening Totals
        car_collection_query = f"""
            SELECT
                driver,
                date,
                SUM(morning) AS car_morning,
                SUM(evening) AS car_evening
            FROM
                `tabCar Collection`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date
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
            key = (entry["driver"], entry["date"])
            report_data[key] = {
                "driver": entry["driver"],
                "date": entry["date"],
                "collected_morning": entry["collected_morning"] or 0,
                "collected_evening": entry["collected_evening"] or 0,
                "car_morning": 0,
                "car_evening": 0,
            }

        # Populate Car Collection Data
        for entry in car_collection:
            key = (entry["driver"], entry["date"])
            if key not in report_data:
                report_data[key] = {
                    "driver": entry["driver"],
                    "date": entry["date"],
                    "collected_morning": 0,
                    "collected_evening": 0,
                }
            report_data[key]["car_morning"] = entry["car_morning"] or 0
            report_data[key]["car_evening"] = entry["car_evening"] or 0

        # Calculate Differences and Totals
        final_report = []
        for key, data in report_data.items():
            collected_total = data["collected_morning"] + data["collected_evening"]
            car_total = data["car_morning"] + data["car_evening"]
            morning_diff =  data["car_morning"] - data["collected_morning"]
            evening_diff = data["car_evening"] - data["collected_evening"]
            total_diff = car_total - collected_total

            final_report.append({
                "driver": data["driver"],
                "date": data["date"],
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

        # Sort by date and driver
        final_report.sort(key=lambda x: (x["date"], x["driver"]))

        return {"status": "success", "data": final_report}

    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Driver Daily Report")
        return {
            "status": "error",
            "message": f"حدث خطأ أثناء جلب التقرير: {str(e)}"
        }
        
        
@frappe.whitelist()
def insert_car_collection(data):
    import json
    from datetime import datetime

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
        if not morning and not evening:
            frappe.throw("اختار صباحاً أو مساءً ⏰")

        # Duplicate check
        if frappe.get_all(
            "Car Collection",
            filters={
                "driver": data["driver"],
                "date": data["date"],
                "morning": morning,
                "evening": evening
            },
            limit_page_length=1
        ):
            frappe.throw("فيه سجل بنفس السائق، التاريخ، والوقت 😬")

        # Insert document
        doc = frappe.get_doc({
            "doctype": "Car Collection",
            "driver": data["driver"],
            "warehouse": data["warehouse"],
            "quantity": quantity,
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
        frappe.log_error(message=str(e), title="خطأ في فحص جمع الحليب 🐄")
        return {"status": "error", "message": f"حصل خطأ: {str(e)} 😢"}

  

@frappe.whitelist()
def get_suppliers(driver, village, collection_date):
    """
    Fetch suppliers, load draft, or load submitted milk collection based on the driver, village, and date.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، وتاريخ الجمع عشان نجيب الموردين 😅")

        # Check for existing Milk Collection documents
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {"driver": driver, "village": village, "collection_date": collection_date},
            ["name", "docstatus"],
            as_dict=True
        )

        # Handle submitted document
        if existing_doc and existing_doc["docstatus"] == 1:
            submitted_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            return {
                "status": "submitted",
                "milk_entries": submitted_doc.milk_entries,
                "message": f"جمع الحليب للسائق '{driver}', القرية '{village}', والتاريخ '{collection_date}' متسلم بالفعل ✅"
            }

        # Handle draft document
        if existing_doc and existing_doc["docstatus"] == 0:
            draft_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            return {
                "status": "draft",
                "milk_entries": process_milk_entries(draft_doc.milk_entries),
                "message": "في مسودة موجودة، ممكن تكمل إدخال البيانات ✍️"
            }

        # Fetch suppliers
        suppliers = frappe.get_all(
            "Supplier",
            filters={"custom_driver_in_charge": driver, "custom_villages": village},
            fields=["name", "custom_cow", "custom_buffalo"]
        )

        if not suppliers:
            return {
                "status": "no_suppliers",
                "suppliers": [],
                "message": f"لا يوجد موردين للسائق '{driver}' والقرية '{village}' 😞"
            }

        # Process suppliers for new records
        processed_suppliers = []
        for supplier in suppliers:
            supplier_name = supplier.get("name") or "غير معروف"  # Fallback for missing names
            milk_types = []
            if supplier.get("custom_cow"):
                milk_types.append("Cow")
            if supplier.get("custom_buffalo"):
                milk_types.append("Buffalo")

            processed_suppliers.append({
                "supplier": supplier_name,
                "milk_type": ",".join(milk_types),
                "morning_quantity": 0,
                "evening_quantity": 0,
            })

        return {
            "status": "new",
            "suppliers": processed_suppliers,
            "message": f"تم جلب الموردين للسائق '{driver}' والقرية '{village}' 🐄"
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في جلب الموردين 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنجيب الموردين 😢: {str(e)}"}


def process_milk_entries(milk_entries):
    """
    Process milk entries (e.g., draft records) to ensure valid supplier names and milk types.
    """
    milk_type_map = {
        "Cow": "Cow",
        "Buffalo": "Buffalo"
    }

    processed_entries = []
    for entry in milk_entries:
        processed_entries.append({
            "supplier": entry.get("supplier") or "غير معروف",  # Fallback for missing supplier
            "milk_type": milk_type_map.get(entry.get("milk_type"), "غير معروف"),  # Map or fallback for milk type
            "morning_quantity": entry.get("morning_quantity", 0),
            "evening_quantity": entry.get("evening_quantity", 0),
        })

    return processed_entries
    
    
@frappe.whitelist()
def submit_milk_collection(driver, village, collection_date, milk_entries=None):
    """
    Submit the Milk Collection document. If no draft exists, create a new document and submit it.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نقدر نسلم جمع الحليب 😅")

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
            # Update and submit the existing draft
            doc = frappe.get_doc("Milk Collection", existing_doc)
            doc.milk_entries = []  # Clear existing entries
            for entry in milk_entries:
                doc.append("milk_entries", entry)
            doc.submit()  # Submit the updated document

            message = f"✅ تم تسليم جمع الحليب '{doc.name}' بنجاح يا معلم!"
        
        else:
            # No draft exists, create a new document and submit it
            doc = frappe.new_doc("Milk Collection")
            doc.driver = driver
            doc.village = village
            doc.collection_date = collection_date
            for entry in milk_entries:
                doc.append("milk_entries", entry)
            doc.insert()
            doc.submit()  # Submit the newly created document

            message = f"✅ ملقناش مسودة فعملنا واحدة جديدة وسلمنا جمع الحليب '{doc.name}' بنجاح!"

        frappe.db.commit()  # Commit changes to the database
        frappe.msgprint(message)
        return {"status": "success", "message": message}

    except Exception as e:
        # Log and return an error message
        frappe.log_error(message=str(e), title="خطأ في تسليم جمع الحليب 🐄")
        return {
            "status": "error",
            "message": f"حصل خطأ وإحنا بنسلم جمع الحليب 😢: {str(e)}"
        }
        
        
@frappe.whitelist()
def check_existing_milk_collection(driver, village, collection_date):
    """
    Check if a Milk Collection document exists for the given driver, village, and date.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نفحص جمع الحليب 😅")

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
                    "message": f"جمع الحليب '{existing_doc[0]['name']}' متسلم بالفعل ✅"
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
        frappe.log_error(message=str(e), title="خطأ في فحص جمع الحليب 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنفحص جمع الحليب 😢: {str(e)}"}

    
    

@frappe.whitelist()
def save_milk_collection(driver, village, collection_date, milk_entries):
    """
    Save or update milk collection data as a draft.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
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
                doc.append("milk_entries", entry)
            doc.save()
            frappe.msgprint(f"✍️ تم تحديث مسودة جمع الحليب '{doc.name}' بنجاح!")
        else:
            # Create a new draft document if none exists
            doc = frappe.get_doc({
                "doctype": "Milk Collection",
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "milk_entries": milk_entries
            })
            doc.insert()
            frappe.msgprint(f"✍️ تم حفظ مسودة جديدة لجمع الحليب '{doc.name}' بنجاح!")

        frappe.db.commit()
        return {"status": "success", "message": f"مسودة جمع الحليب '{doc.name}' تم حفظها بنجاح!"}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في حفظ مسودة جمع الحليب 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنحفظ المسودة 😢: {str(e)}"}
