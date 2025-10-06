import frappe
import json
from datetime import datetime
from frappe import _

@frappe.whitelist()
def get_company_from_milk_settings():
    """
    Fetch the company from Milk Setting.
    """
    try:
        company = frappe.db.get_single_value("Milk Setting", "company")
        if not company:
            frappe.throw(_("لم يتم ضبط الشركة في إعدادات الحليب 😅"))
        return company
    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Company from Milk Setting")
        frappe.throw(_("حدث خطأ أثناء الحصول على إعدادات الشركة 😢"))

def _to_float_or_none(val):
    if val is None or val == "":
        return None
    try:
        return float(val)
    except Exception:
        return None

@frappe.whitelist()
def insert_car_collection(data):
    """
    Insert a Car Collection document from JSON payload.
    Expected JSON keys:
      - driver (Link to Driver) [required]
      - warehouse (Link to Warehouse) [required]
      - quantity (number > 0) [required]
      - date (YYYY-MM-DD) [required]
      - milk_type ("Cow" | "Buffalo") [required]
      - morning (0|1) [required if evening is 0]
      - evening (0|1) [required if morning is 0]
      - driver_name (Data) [optional]
      - driver_helper_name (Data) [optional]
      - density (Float) [optional]
      - hardness (Float) [optional]
      - protein (Float, 0-100) [optional]
      - pont (Float) [optional]
      - water (Float, 0-100) [optional]
    """
    try:
        data = json.loads(data or "{}")

        # Required fields
        required_fields = ["driver", "warehouse", "quantity", "date", "milk_type"]
        for field in required_fields:
            if not data.get(field):
                frappe.throw(_("مطلوب حقل '{0}' 😅").format(field))

        # Date validation
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            frappe.throw(_("التاريخ لازم يكون بالصيغة YYYY-MM-DD 📅"))

        # Quantity validation
        try:
            quantity = float(str(data["quantity"]).strip())
            if quantity <= 0:
                frappe.throw(_("الكمية لازم تكون رقم موجب 👍"))
        except Exception:
            frappe.throw(_("الكمية لازم تكون رقم صحيح 🧮"))

        # Milk type validation
        if data["milk_type"] not in ["Cow", "Buffalo"]:
            frappe.throw(_("نوع الحليب لازم يكون يا Cow يا Buffalo 🐄🐃"))

        # Time validation
        morning = int(data.get("morning", 0) or 0)
        evening = int(data.get("evening", 0) or 0)
        if not morning and not evening:
            frappe.throw(_("اختار صباحاً أو مساءً ⏰"))

        # Optional text fields (trim + length guard)
        driver_name = (data.get("driver_name") or "").strip()
        driver_helper_name = (data.get("driver_helper_name") or "").strip()
        if len(driver_name) > 140:
            frappe.throw(_("اسم السائق طويل جدًا (أقصى حد 140 حرف) ✂️"))
        if len(driver_helper_name) > 140:
            frappe.throw(_("اسم مساعد السائق طويل جدًا (أقصى حد 140 حرف) ✂️"))

        # Optional numeric quality fields
        density = _to_float_or_none(data.get("density"))
        hardness = _to_float_or_none(data.get("hardness"))
        protein = _to_float_or_none(data.get("protein"))
        pont = _to_float_or_none(data.get("pont"))
        water = _to_float_or_none(data.get("water"))

        # Ranges if provided
        if protein is not None and not (0 <= protein <= 100):
            frappe.throw(_("قيمة البروتين يجب أن تكون بين 0 و 100"))
        if water is not None and not (0 <= water <= 100):
            frappe.throw(_("قيمة الماء يجب أن تكون بين 0 و 100"))
        if density is not None and density < 0:
            frappe.throw(_("قيمة الكثافة يجب أن تكون موجبة"))
        if hardness is not None and hardness < 0:
            frappe.throw(_("قيمة الصلابة يجب أن تكون موجبة"))
        if pont is not None and pont < 0:
            frappe.throw(_("قيمة Pont يجب أن تكون موجبة"))

        # Duplicate check (same driver, date, milk_type, time slice)
        duplicate = frappe.get_all(
            "Car Collection",
            filters={
                "driver": data["driver"],
                "date": data["date"],
                "milk_type": data["milk_type"],
                "morning": morning,
                "evening": evening,
            },
            limit_page_length=1,
        )
        if duplicate:
            frappe.throw(_("فيه سجل بنفس السائق، التاريخ، والوقت 😬"))

        company = get_company_from_milk_settings()

        # Build document
        doc = frappe.get_doc({
            "doctype": "Car Collection",
            "driver": data["driver"],
            "warehouse": data["warehouse"],
            "quantity": quantity,
            "company": company,
            "date": data["date"],
            "morning": morning,
            "evening": evening,
            "milk_type": data["milk_type"],
            "driver_name": driver_name,
            "driver_helper_name": driver_helper_name,
            # New fields
            "density": density,
            "hardness": hardness,
            "protein": protein,
            "pont": pont,
            "water": water,
        })

        doc.insert()
        # Submit if workflow requires submission
        try:
            doc.submit()
        except Exception:
            frappe.db.commit()

        frappe.msgprint(_("✅ تم حفظ بيانات استلام السيارة بنجاح!"))
        return {"message": "✅ تم حفظ بيانات استلام السيارة بنجاح!", "docname": doc.name}

    except json.JSONDecodeError:
        frappe.throw(_("البيانات اللي بعتهالك مش JSON 😅"))
    except Exception as e:
        frappe.throw(_("حصل خطأ: {0} 😢").format(str(e)))