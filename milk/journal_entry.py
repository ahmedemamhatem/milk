import frappe

def on_cancel_journal_entry(doc, method=None):
    """
    When a Journal Entry is cancelled:
    - Find Milk Entries Log docs that reference this JE in payment_entry or invoice_entry.
    - Clear the matching field(s).
    - If both fields are empty after clearing, set paid = 0.
    """
    if getattr(doc, "custom_supplier_loan", None):
        frappe.throw("لا يمكنك إلغاء قيد اليومية المرتبط بقرض مورد مباشرة. من فضلك ألغِ القرض أولًا.")

    if not doc or not getattr(doc, "name", None):
        return

    je_name = doc.name

    # Fetch all Milk Entries Log docs that reference this Journal Entry in either field
    logs_payment = frappe.get_all(
        "Milk Entries Log",
        filters={"payment_entry": je_name},
        fields=["name"]
    )
    logs_invoice = frappe.get_all(
        "Milk Entries Log",
        filters={"invoice_entry": je_name},
        fields=["name"]
    )

    # De-duplicate names
    names = {r["name"] for r in (logs_payment + logs_invoice)}

    if not names:
        return

    for name in names:
        mel = frappe.get_doc("Milk Entries Log", name)

        changed = False

        if mel.payment_entry == je_name:
            mel.payment_entry = None
            changed = True

        if mel.invoice_entry == je_name:
            mel.invoice_entry = None
            changed = True

        # If both links are empty, mark unpaid
        if not mel.payment_entry and not mel.invoice_entry:
            if mel.paid != 0:
                mel.paid = 0
                changed = True

        if changed:
            # Allow updating submitted docs if necessary
            mel.flags.ignore_validate_update_after_submit = True
            mel.save(ignore_permissions=True)

    # Optionally commit if this runs in a context that doesn't auto-commit
    # frappe.db.commit()