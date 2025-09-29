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
    - Uniqueness: If supplier is custom_milk_supplier, ensure custom_sort is unique within same driver.
    - Recalculate amounts for unpaid Milk Entries Log after the newest Weekly Supplier Payment's to_date
      that includes this supplier in Weekly Pay Table. If no payment exists, recalc all unpaid logs.
    """
    try:
        # ---------------------------
        # Uniqueness validation
        # ---------------------------
        if getattr(doc, "custom_milk_supplier", 0):
            villages = getattr(doc, "custom_villages", None)
            driver = getattr(doc, "custom_driver_in_charge", None)
            current_sort = getattr(doc, "custom_sort", None)

            if current_sort not in (None, "", 0):
                peers = frappe.get_all(
                    "Supplier",
                    filters={
                        "name": ["!=", doc.name],
                        "custom_milk_supplier": 1,
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
        # Only AFTER the newest Weekly Supplier Payment to_date for this supplier
        # -----------------------------------------
        wsp_child_doctype = "Weekly Pay Table"      # child table containing 'supplier' and parent link
        wsp_parent_doctype = "Weekly Supplier Payment"  # parent contains start_date, to_date, docstatus

        # 1) Find all parent payment docs that include this supplier
        child_rows = frappe.get_all(
            wsp_child_doctype,
            filters={"supplier": doc.name},
            fields=["parent"],
            distinct=True
        )
        parent_names = [r["parent"] for r in child_rows] if child_rows else []

        newest_to_date = None
        if parent_names:
            # Get parents excluding cancelled; pick the newest by to_date
            parents = frappe.get_all(
                wsp_parent_doctype,
                filters={
                    "name": ["in", parent_names],
                    "docstatus": ["!=", 2]
                },
                fields=["name", "to_date"],
                order_by="to_date desc",
                limit_page_length=1
            )
            if parents:
                newest_to_date = parents[0].get("to_date")

        # 2) Build filters for unpaid logs; if cutoff exists, only after that date
        log_filters = {"supplier": doc.name, "paid": 0}
        if newest_to_date:
            # date field on Milk Entries Log is 'date' per your code; change if different
            log_filters["date"] = [">", newest_to_date]

        logs = frappe.get_all(
            "Milk Entries Log",
            filters=log_filters,
            fields=["name", "milk_type", "quantity", "pont", "date"]
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