# frappe-bench/apps/milk/milk/milk/doctype/weekly_supplier_payment/link_guard.py
import frappe
from frappe import _

def on_cancel_journal_entry(doc, method):
    """
    Prevent canceling a Journal Entry if it's linked to a Weekly Supplier Payment.
    """
    wsp = getattr(doc, "custom_weekly_supplier_payment", None)
    if wsp:
        frappe.throw(_("لا يمكن إلغاء هذا القيد لأنه مرتبط بكشف أسبوعي: {0}").format(wsp))

def on_cancel_weekly_supplier_payment(doc, method):
    """
    When canceling Weekly Supplier Payment, cancel all linked Journal Entries first.
    Throws if any cannot be canceled.
    """
    je_names = frappe.get_all(
        "Journal Entry",
        filters={"custom_weekly_supplier_payment": doc.name, "docstatus": 1},
        pluck="name",
    )

    for je_name in je_names or []:
        je = frappe.get_doc("Journal Entry", je_name)
        # Try to cancel; if blocked, raise a clear error
        try:
            je.cancel()
        except Exception as e:
            frappe.throw(_("تعذر إلغاء القيد {0} المرتبط بهذا الكشف. السبب: {1}").format(je_name, str(e)))

    # Optionally clear links on the WSP
    frappe.db.set_value("Weekly Supplier Payment", doc.name, {
        "invoice_entry": None,
        "loan_refund_entry": None,
        "deduction_entry": None,
        "payment_entry": None
    }, update_modified=False)