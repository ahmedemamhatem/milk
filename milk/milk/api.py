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
    - If supplier is custom_milk_supplier: ensure custom_sort is unique within
      (custom_villages, custom_driver_in_charge). If there's a conflict, throw an error
      and include the next available number as a suggestion (do not set it automatically).
    - Recalculate amounts for all unpaid Milk Entries Log records for this supplier.
    Triggered on validation of the Supplier doctype.
    """
    try:
        # ---------------------------
        # Uniqueness validation
        # ---------------------------
        if getattr(doc, "custom_milk_supplier", 0):
            villages = getattr(doc, "custom_villages", None)
            driver = getattr(doc, "custom_driver_in_charge", None)
            current_sort = getattr(doc, "custom_sort", None)

            # Only validate when a sort number is provided
            if current_sort not in (None, "", 0):
                # Get all used sort numbers in the same (village, driver)
                peers = frappe.get_all(
                    "Supplier",
                    filters={
                        "name": ["!=", doc.name],
                        "custom_milk_supplier": 1,
                        "custom_villages": villages or "",
                        "custom_driver_in_charge": driver or "",
                    },
                    fields=["custom_sort"]
                )
                used_sorts = {
                    r.get("custom_sort")
                    for r in peers
                    if r.get("custom_sort") not in (None, "", 0)
                }

                if current_sort in used_sorts:
                    # Compute next available number (starting at current_sort)
                    n = int(current_sort)
                    while n in used_sorts:
                        n += 1
                    suggested = n

                    frappe.throw(
                        f"رقم الترتيب {current_sort} مستخدم قبل كده لنفس القرية ({villages}) ونفس السواق ({driver}). "
                        f"من فضلك اختار رقم ترتيب مختلف. الرقم المتاح المقترح: {suggested}.",
                        title="تعارض في رقم الترتيب"
                    )

        # -----------------------------------------
        # Recalculate unpaid Milk Entries Log rates
        # -----------------------------------------
        logs = frappe.get_all(
            "Milk Entries Log",
            filters={"supplier": doc.name, "paid": 0},
            fields=["name", "milk_type", "quantity", "pont"]
        )

        custom_pont_size_rate = doc.custom_pont_size_rate or 0

        for log in logs:
            milk_type = log.get("milk_type")
            if milk_type == "Cow":
                rate = doc.custom_cow_price if getattr(doc, "custom_cow", 0) else 0
            elif milk_type == "Buffalo":
                rate = doc.custom_buffalo_price if getattr(doc, "custom_buffalo", 0) else 0
            else:
                rate = 0

            quantity = log.get("quantity") or 0
            pont = log.get("pont") or 0

            amount = rate * quantity if custom_pont_size_rate == 0 else rate * quantity * pont

            frappe.db.set_value("Milk Entries Log", log.get("name"), {
                "rate": rate,
                "amount": amount
            })

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Supplier Validation Error")
        frappe.throw(f"حصل خطأ أثناء التحقق أو إعادة الحساب: {frappe.safe_decode(str(e))}")