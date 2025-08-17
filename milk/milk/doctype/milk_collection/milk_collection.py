# Copyright (c) 2025, ahmed emam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import datetime

class MilkCollection(Document):
    def on_submit(self):
        """
        Create a Milk Entries Log for each supplier and each entry (morning and evening) upon submission,
        even if the quantity is 0.
        """
        try:
            # Loop through the child table 'milk_entries'
            for entry in self.milk_entries:
                # Create a log for morning quantity (even if 0)
                frappe.get_doc({
                    "doctype": "Milk Entries Log",
                    "date": self.collection_date,
                    "milk_collection": self.name,
                    "day_name": self.day_name,
                    "driver": self.driver,
                    "milk_type": entry.milk_type,
                    "quantity": entry.morning_quantity or 0,  # Default to 0 if None
                    "morning": 1,  # Morning = 1
                    "supplier": entry.supplier,
                    "village": self.village
                }).insert(ignore_permissions=True)

                # Create a log for evening quantity (even if 0)
                frappe.get_doc({
                    "doctype": "Milk Entries Log",
                    "date": self.collection_date,
                    "milk_collection": self.name,
                    "day_name": self.day_name,
                    "driver": self.driver,
                    "milk_type": entry.milk_type,
                    "quantity": entry.evening_quantity or 0,  # Default to 0 if None
                    "evening": 1,  # Evening = 1
                    "supplier": entry.supplier,
                    "village": self.village
                }).insert(ignore_permissions=True)

            # Commit the transaction
            frappe.db.commit()

        except Exception as e:
            # Log the error and throw an exception for debugging
            frappe.log_error(message=str(e), title="Create Milk Entries Log Error")
            frappe.throw(f"An error occurred while creating Milk Entries Log: {str(e)}")
        
        
    def validate(self):
        total_morning_quantity = 0
        total_evening_quantity = 0

        # Loop through the child table milk_entries
        for entry in self.milk_entries:
            total_morning_quantity += entry.morning_quantity or 0
            total_evening_quantity += entry.evening_quantity or 0

        # Update the parent fields
        self.total_morning_quantity = total_morning_quantity
        self.total_evening_quantity = total_evening_quantity

        # Ensure collection_date is set
        if self.collection_date:
            date_obj = frappe.utils.getdate(self.collection_date)

            # Map weekdays to Arabic names
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

        # Check for duplicate Car Collection for the same driver, village, and date
        filters = {
            "driver": self.driver,
            "village": self.village,
            "collection_date": self.collection_date,
            "docstatus": ["<", 2]  # Exclude cancelled docs
        }

        # Exclude the current doc if updating
        if self.name:
            filters["name"] = ["!=", self.name]

        if frappe.db.exists("Car Collection", filters):
            frappe.throw(f"⚠️ يوجد بالفعل جمع حليب لنفس السائق '{self.driver}' والقرية '{self.village}' بتاريخ '{self.collection_date}'.")

