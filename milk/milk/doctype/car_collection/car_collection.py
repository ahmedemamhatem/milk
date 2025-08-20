import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class CarCollection(Document):
    def validate(self):
        """
        Validation to ensure no duplicate entries for the same Driver, Date,
        and Morning/Evening combination, with Egyptian Arabic messages.
        """
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

        if self.name:
            filters["name"] = ["!=", self.name]

        if frappe.db.exists("Car Collection", filters):
            frappe.throw(
                f"في سجل موجود بالفعل للسائق '{self.driver}' بتاريخ '{self.date}' بنفس اختيار صباحاً/مساءً 😅"
            )

        if self.morning and self.evening:
            frappe.throw("ماينفعش تحدد الصبح والمساء مع بعض 😬. اختار واحد بس.")

        if not self.morning and not self.evening:
            frappe.throw("لازم تحدد صباحاً أو مساءً ⏰")

        if self.morning:
            self.evening = 0
        elif self.evening:
            self.morning = 0

    def on_submit(self):
        """
        On submit, create a Stock Entry of type 'Material Receipt' for the collected milk.
        """
        milk_setting = frappe.get_single("Milk Setting")
        item_code = None

        if self.milk_type == "Cow":
            item_code = milk_setting.cow_item
        elif self.milk_type == "Buffalo":
            item_code = milk_setting.buffalo_item

        if not item_code:
            frappe.throw(f"الإعدادات مش مضبوطة 🐄. مفيش صنف محدد لنوع الحليب '{self.milk_type}'.")

        stock_entry = frappe.get_doc({
            "doctype": "Stock Entry",
            "posting_date": nowdate(),
            "company": milk_setting.company,
            "custom_car_collection": self.name,  # link to this collection
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

    def on_cancel(self):
        """
        Cancel all Stock Entries linked to this Car Collection.
        """
        stock_entries = frappe.get_all("Stock Entry",
                                       filters={"custom_car_collection": self.name, "docstatus": 1},
                                       fields=["name"])
        for se in stock_entries:
            try:
                frappe.get_doc("Stock Entry", se.name).cancel()
            except Exception as e:
                frappe.log_error(f"Error cancelling Stock Entry {se.name}: {str(e)}")

    def before_delete(self):
        """
        Delete all Stock Entries linked to this Car Collection before deleting the doc.
        """
        stock_entries = frappe.get_all("Stock Entry",
                                       filters={"custom_car_collection": self.name},
                                       fields=["name"])
        for se in stock_entries:
            try:
                doc = frappe.get_doc("Stock Entry", se.name)
                if doc.docstatus == 1:
                    doc.cancel()
                doc.delete()
            except Exception as e:
                frappe.log_error(f"Error deleting Stock Entry {se.name}: {str(e)}")
