import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class CarCollection(Document):
    def validate(self):
        """
        Validation to ensure no duplicate entries for the same Driver, Date,
        and Morning/Evening combination, with Egyptian Arabic messages.
        """
        # Check for existing records with the same Driver, Date, and Morning/Evening
        filters = {
            "driver": self.driver,
            "date": self.date,
            "milk_type": self.milk_type,
            "docstatus": ["<", 2],  
        }

        if self.morning:
            filters["morning"] = 1
        elif self.evening:
            filters["evening"] = 1

        # Exclude the current record (for updates)
        if self.name:
            filters["name"] = ["!=", self.name]

        existing_records = frappe.db.exists("Car Collection", filters)
        if existing_records:
            frappe.throw(
                f"في سجل موجود بالفعل للسائق '{self.driver}' بتاريخ '{self.date}' بنفس اختيار صباحاً/مساءً 😅"
            )

        # Ensure only one of Morning or Evening is selected
        if self.morning and self.evening:
            frappe.throw("ماينفعش تحدد الصبح والمساء مع بعض 😬. اختار واحد بس.")

        # Ensure at least one is selected
        if not self.morning and not self.evening:
            frappe.throw("لازم تحدد صباحاً أو مساءً ⏰")

        # Auto-set the other to 0
        if self.morning:
            self.evening = 0
        elif self.evening:
            self.morning = 0

    def on_submit(self):
        """
        On submit, create a Stock Entry of type 'Material Receipt' for the collected milk.
        """
        # Fetch the item based on milk type from Milk Setting
        milk_setting = frappe.get_single("Milk Setting")
        item_code = None

        if self.milk_type == "Cow":
            item_code = milk_setting.cow_item
        elif self.milk_type == "Buffalo":
            item_code = milk_setting.buffalo_item

        if not item_code:
            frappe.throw(f"الإعدادات مش مضبوطة 🐄. مفيش صنف محدد لنوع الحليب '{self.milk_type}'.")

        # Create a Stock Entry
        stock_entry = frappe.get_doc({
            "doctype": "Stock Entry",
            "posting_date": nowdate(),
            "company": milk_setting.company,
            "stock_entry_type": "Material Receipt",
            "items": [
                {
                    "item_code": item_code,
                    "qty": self.quantity,
                    "t_warehouse": self.warehouse
                }
            ]
        })
        stock_entry.insert(ignore_permissions=True)
        stock_entry.submit()
        
