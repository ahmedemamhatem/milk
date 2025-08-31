import frappe
from frappe.model.document import Document

class MilkCollection(Document):
    def on_submit(self):
        """
        Create a Milk Entries Log for each supplier and each entry (morning and evening) upon submission,
        even if the quantity is 0. Calculate rate and amount dynamically.
        """
        try:
            for entry in self.milk_entries:
                # Fetch supplier details
                supplier_doc = frappe.get_doc("Supplier", entry.supplier)
                custom_pont_size_rate = supplier_doc.custom_pont_size_rate or 0

                # Calculate rate based on milk type
                if entry.milk_type == "Cow":
                    rate = (
                        supplier_doc.custom_cow_price
                        if supplier_doc.custom_cow_price else 0
                    )
                elif entry.milk_type == "Buffalo":
                    rate = (
                        supplier_doc.custom_buffalo_price
                        if supplier_doc.custom_buffalo_price else 0
                    )
                else:
                    rate = 0

                # Calculate amount
                def calculate_amount(quantity, pont):
                    if custom_pont_size_rate == 0:
                        return rate * quantity
                    return rate * quantity * pont

                # Create a log for morning quantity
                frappe.get_doc({
                    "doctype": "Milk Entries Log",
                    "date": self.collection_date,
                    "milk_collection": self.name,
                    "day_name": self.day_name,
                    "driver": self.driver,
                    "milk_type": entry.milk_type,
                    "quantity": entry.morning_quantity or 0,
                    "morning": 1,
                    "supplier": entry.supplier,
                    "village": self.village,
                    "pont": entry.morning_pont,
                    "rate": rate,
                    "amount": calculate_amount(entry.morning_quantity or 0, entry.morning_pont)
                }).insert(ignore_permissions=True)

                # Create a log for evening quantity
                frappe.get_doc({
                    "doctype": "Milk Entries Log",
                    "date": self.collection_date,
                    "milk_collection": self.name,
                    "day_name": self.day_name,
                    "driver": self.driver,
                    "milk_type": entry.milk_type,
                    "quantity": entry.evening_quantity or 0,
                    "evening": 1,
                    "supplier": entry.supplier,
                    "village": self.village,
                    "pont": entry.evening_pont,
                    "rate": rate,
                    "amount": calculate_amount(entry.evening_quantity or 0, entry.evening_pont)
                }).insert(ignore_permissions=True)

            frappe.db.commit()

        except Exception as e:
            frappe.log_error(message=str(e), title="Create Milk Entries Log Error")
            frappe.throw(f"An error occurred while creating Milk Entries Log: {str(e)}")

    def validate(self):
        total_morning_quantity = 0
        total_evening_quantity = 0

        for entry in self.milk_entries:
            total_morning_quantity += entry.morning_quantity or 0
            total_evening_quantity += entry.evening_quantity or 0

        self.total_morning_quantity = total_morning_quantity
        self.total_evening_quantity = total_evening_quantity

        if self.collection_date:
            date_obj = frappe.utils.getdate(self.collection_date)
            arabic_days = {
                0: "الاثنين",
                1: "الثلاثاء",
                2: "الأربعاء",
                3: "الخميس",
                4: "الجمعة",
                5: "السبت",
                6: "الأحد",
            }
            self.day_name = arabic_days[date_obj.weekday()]

        filters = {
            "driver": self.driver,
            "village": self.village,
            "collection_date": self.collection_date,
            "docstatus": ["<", 2]
        }

        if self.name:
            filters["name"] = ["!=", self.name]

        if frappe.db.exists("Car Collection", filters):
            frappe.throw(f"⚠️ يوجد بالفعل جمع حليب لنفس السائق '{self.driver}' والقرية '{self.village}' بتاريخ '{self.collection_date}'.")

    def on_cancel(self):
        """
        Delete all linked Milk Entries Log records when the Milk Collection is canceled.
        """
        try:
            frappe.db.delete("Milk Entries Log", {"milk_collection": self.name})
            frappe.msgprint("تم حذف جميع سجلات إدخالات الحليب المرتبطة بنجاح ✅")
        except Exception as e:
            frappe.log_error(message=str(e), title="Error Deleting Milk Entries Log on Cancel")
            frappe.throw(f"حدث خطأ أثناء حذف سجلات إدخالات الحليب: {str(e)}")

    def on_trash(self):
        """
        Delete all linked Milk Entries Log records when the Milk Collection is deleted.
        """
        try:
            frappe.db.delete("Milk Entries Log", {"milk_collection": self.name})
            frappe.msgprint("تم حذف جميع سجلات إدخالات الحليب المرتبطة بنجاح ✅")
        except Exception as e:
            frappe.log_error(message=str(e), title="Error Deleting Milk Entries Log on Trash")
            frappe.throw(f"حدث خطأ أثناء حذف سجلات إدخالات الحليب: {str(e)}")
