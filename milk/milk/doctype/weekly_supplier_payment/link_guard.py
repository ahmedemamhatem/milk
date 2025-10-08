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
    When canceling Weekly Supplier Payment:
    - Cancel all linked Journal Entries first.
    - Clear JE links on the WSP.
    - Revert Milk Entries Log entries captured in doc.ledgers
      (paid -> 0, weekly_supplier_payment -> NULL).
    """
    # 1) Cancel linked JEs
    je_names = frappe.get_all(
        "Journal Entry",
        filters={"custom_weekly_supplier_payment": doc.name, "docstatus": 1},
        pluck="name",
    )

    for je_name in je_names or []:
        je = frappe.get_doc("Journal Entry", je_name)
        try:
            je.cancel()
        except Exception as e:
            frappe.throw(_("تعذر إلغاء القيد {0} المرتبط بهذا الكشف. السبب: {1}").format(je_name, str(e)))

    # 2) Clear JE links on the WSP
    frappe.db.set_value(
        "Weekly Supplier Payment",
        doc.name,
        {
            "invoice_entry": None,
            "loan_refund_entry": None,
            "deduction_entry": None,
            "payment_entry": None,
        },
        update_modified=False,
    )

    # 3) Revert Milk Entries Log entries (from doc.ledgers)
    try:
        ledgers_raw = (doc.ledgers or "").strip()

        # Parse names from JSON array (preferred) or CSV
        try:
            names = frappe.parse_json(ledgers_raw) if ledgers_raw else []
            if not isinstance(names, list):
                names = []
        except Exception:
            names = [x.strip() for x in ledgers_raw.split(",") if x.strip()]

        if names:
            # Deduplicate while preserving order
            seen = set()
            unique_names = []
            for n in names:
                if n and n not in seen:
                    seen.add(n)
                    unique_names.append(n)

            # Bulk update in chunks for performance
            chunksize = 1000
            for i in range(0, len(unique_names), chunksize):
                chunk = unique_names[i:i+chunksize]
                if not chunk:
                    continue
                placeholders = ", ".join(["%s"] * len(chunk))
                frappe.db.sql(
                    f"""
                    UPDATE `tabMilk Entries Log`
                    SET paid = 0,
                        weekly_supplier_payment = NULL
                    WHERE name IN ({placeholders})
                    """,
                    chunk,
                )

            frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Revert Milk Entries Log on WSP cancel failed")