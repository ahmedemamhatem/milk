import frappe
@frappe.whitelist()
def handle_invoice_cancel_or_delete(doc, method):
    """
    On cancel or delete of a purchase invoice, update Milk Entries Log to remove the link and mark as unpaid.
    """
    try:
        if doc.doctype == "Purchase Invoice":
            # Fetch all logs linked to this invoice
            logs = frappe.get_all(
                "Milk Entries Log",
                filters={"purchase_invoice": doc.name},
                fields=["name"]
            )

            for log in logs:
                # Update the logs to remove the invoice link and mark as unpaid
                frappe.db.set_value("Milk Entries Log", log["name"], {
                    "purchase_invoice": None,
                    "paid": 0
                })

            frappe.db.commit()

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in handle_invoice_cancel_or_delete")
        frappe.throw(f"Failed to update logs for invoice {doc.name}: {str(e)}")
        

def validate_supplier(doc, method):
    """
    Recalculate amounts for all unpaid Milk Entries Logs related to this supplier.
    Triggered on validation of the Supplier doctype.
    """
    try:
        # Fetch unpaid milk entry logs for this supplier
        logs = frappe.get_all(
            "Milk Entries Log",
            filters={"supplier": doc.name, "paid": 0},
            fields=["name", "milk_type", "quantity", "pont"]
        )

        # Get supplier-specific settings
        custom_pont_size_rate = doc.custom_pont_size_rate or 0

        # Process each Milk Entries Log
        for log in logs:
            # Determine rate based on milk type
            if log.get("milk_type") == "Cow":
                rate = doc.custom_cow_price if doc.custom_cow else 0
            elif log.get("milk_type") == "Buffalo":
                rate = doc.custom_buffalo_price if doc.custom_buffalo else 0
            else:
                rate = 0

            # Calculate the amount
            quantity = log.get("quantity") or 0
            pont = log.get("pont") or 0
            if custom_pont_size_rate == 0:
                amount = rate * quantity
            else:
                amount = rate * quantity * pont

            # Update the Milk Entries Log
            frappe.db.set_value("Milk Entries Log", log.get("name"), {
                "rate": rate,
                "amount": amount
            })

    except Exception as e:
        frappe.log_error(message=str(e), title="Supplier Validation Error")
        frappe.throw(f"An error occurred while recalculating Milk Entries Log amounts: {str(e)}")