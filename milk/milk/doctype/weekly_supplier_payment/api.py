# frappe-bench/apps/milk/milk/milk/doctype/weekly_supplier_payment/api.py
import frappe
from frappe import _
from frappe.utils import getdate, add_days, flt
from collections import defaultdict
import random
import string

def _random_ref_no(n=10):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))

def _f(v):
    try:
        return float(v or 0)
    except Exception:
        return 0.0

def _has_field(doctype: str, fieldname: str) -> bool:
    try:
        return fieldname in frappe.get_meta(doctype).fields_map
    except Exception:
        return False

def allocate_supplier_loan_from_refund(posting_date, supplier_refund_map, refund_je_name: str):
    """
    Allocate refund amounts to pending Supplier Loan Table rows FIFO by date.

    Child row updates:
      - pending_amount decreases
      - paied set to 1 when pending_amount hits 0
      - if child field 'journal_entry' exists, stamp refund_je_name on fully-paid rows

    Returns:
      dict allocated_by_parent: {supplier_loan_parent_name: allocated_amount_in_this_call}
    """
    if not supplier_refund_map or not refund_je_name:
        return {}

    supplier_refund_map = {sup: round(flt(amt), 2) for sup, amt in (supplier_refund_map or {}).items() if flt(amt) > 0}
    if not supplier_refund_map:
        return {}

    suppliers = list(supplier_refund_map.keys())
    placeholders = ", ".join(["%s"] * len(suppliers))

    rows = frappe.db.sql(
        f"""
        SELECT
            slt.name as row_name,
            slt.parent as parent,
            slt.date as date,
            slt.pending_amount as pending_amount,
            sl.supplier as supplier
        FROM `tabSupplier Loan Table` slt
        INNER JOIN `tabSupplier Loan` sl ON slt.parent = sl.name
        WHERE slt.paied = 0
          AND slt.docstatus = 1
          AND sl.docstatus = 1
          AND slt.date <= %s
          AND sl.supplier IN ({placeholders})
        ORDER BY sl.supplier, slt.date, slt.name
        """,
        tuple([posting_date] + suppliers),
        as_dict=True
    )

    has_journal_link = _has_field("Supplier Loan Table", "journal_entry")

    by_supplier = {}
    for r in rows:
        by_supplier.setdefault(r["supplier"], []).append(r)

    allocated_by_parent = defaultdict(float)

    for sup in suppliers:
        balance = supplier_refund_map.get(sup, 0.0)
        if balance <= 0:
            continue

        for r in by_supplier.get(sup, []):
            if balance <= 0:
                break

            row_name = r["row_name"]
            parent_name = r["parent"]
            pending = float(r["pending_amount"] or 0)
            if pending <= 0:
                continue

            allocate = min(balance, pending)
            new_pending = round(pending - allocate, 2)
            balance = round(balance - allocate, 2)

            update_vals = {"pending_amount": new_pending}
            if new_pending <= 0.00001:
                update_vals["pending_amount"] = 0
                update_vals["paied"] = 1
                if has_journal_link:
                    update_vals["journal_entry"] = refund_je_name

            frappe.db.set_value("Supplier Loan Table", row_name, update_vals, update_modified=False)
            allocated_by_parent[parent_name] += allocate

        if balance > 0.00001:
            frappe.logger().info(f"[Milk] Refund allocation: supplier {sup} has unallocated balance {balance} on {posting_date}")

    frappe.db.commit()
    return dict(allocated_by_parent)

def update_supplier_loan_parents(allocated_by_parent: dict, reverse=False):
    """
    Update Supplier Loan parent documents based on allocated amounts.

    If reverse = False (allocation):
      - total_paid += allocated (if field exists)
      - pending_amount -= allocated (if field exists; floored to 0)
      - status = 'Paid' if pending_amount <= 0 (if status field exists)

    If reverse = True (rollback):
      - total_paid -= allocated (>= 0) (if field exists)
      - pending_amount += allocated (if field exists)
      - status = 'Active' if pending_amount > 0 and status was 'Paid' (if status field exists)
    """
    if not allocated_by_parent:
        return

    sl_meta = frappe.get_meta("Supplier Loan")
    f_map = sl_meta.fields_map

    for parent_name, alloc in (allocated_by_parent or {}).items():
        if alloc <= 0:
            continue

        current = frappe.db.get_value(
            "Supplier Loan",
            parent_name,
            ["total_paid", "pending_amount", "status"],
            as_dict=True
        ) or {}

        updates = {}

        if "total_paid" in f_map:
            new_total_paid = round((current.get("total_paid") or 0) + (-alloc if reverse else alloc), 2)
            if new_total_paid < 0:
                new_total_paid = 0
            updates["total_paid"] = new_total_paid

        if "pending_amount" in f_map:
            new_pending = round((current.get("pending_amount") or 0) + (alloc if reverse else -alloc), 2)
            if new_pending < 0:
                new_pending = 0
            updates["pending_amount"] = new_pending

            if "status" in f_map:
                if new_pending <= 0:
                    updates["status"] = "Paid"
                else:
                    if (current.get("status") or "").lower() == "paid":
                        updates["status"] = "Active"

        if updates:
            frappe.db.set_value("Supplier Loan", parent_name, updates, update_modified=False)

    frappe.db.commit()

def reverse_allocation_for_refund_je(refund_je_name: str):
    """
    Reverse the loan allocation done by a specific Supplier Loan Refund JE,
    without relying on per-row allocated tracking.

    Strategy:
    - Read the refund JE lines (debits to Payable with party=Supplier) to reconstruct supplier_refund_map.
    - For each supplier, re-simulate FIFO but in reverse:
        For eligible rows (date <= refund JE posting_date), add back amounts to rows
        starting from the latest affected row? No: to keep determinism we revert in reverse FIFO order:
        we walk eligible rows in reverse of allocation order (i.e., descending by date then name),
        adding back up to the refund amount, clearing paied when pending_amount becomes > 0.
    - Adjust Supplier Loan parents accordingly.
    """
    if not refund_je_name:
        return

    je = frappe.get_doc("Journal Entry", refund_je_name)
    posting_date = je.posting_date

    # Build supplier_refund_map from the actual JE
    company = je.company
    # Find the company payable account(s) is tricky; we just look at debit lines with party_type Supplier
    supplier_refund_map = defaultdict(float)
    for acc in je.accounts:
        if (acc.party_type == "Supplier") and flt(acc.debit_in_account_currency) > 0:
            supplier_refund_map[acc.party] += float(acc.debit_in_account_currency or 0)
    supplier_refund_map = {k: round(v, 2) for k, v in supplier_refund_map.items() if v > 0}
    if not supplier_refund_map:
        return

    suppliers = list(supplier_refund_map.keys())
    placeholders = ", ".join(["%s"] * len(suppliers))

    # Fetch eligible rows (same eligibility as allocation, but we'll traverse in reverse allocation order)
    rows = frappe.db.sql(
        f"""
        SELECT
            slt.name as row_name,
            slt.parent as parent,
            slt.date as date,
            slt.amount as amount,
            slt.pending_amount as pending_amount,
            sl.supplier as supplier,
            slt.paied as paied
        FROM `tabSupplier Loan Table` slt
        INNER JOIN `tabSupplier Loan` sl ON slt.parent = sl.name
        WHERE slt.docstatus = 1
          AND sl.docstatus = 1
          AND slt.date <= %s
          AND sl.supplier IN ({placeholders})
        ORDER BY sl.supplier, slt.date DESC, slt.name DESC
        """,
        tuple([posting_date] + suppliers),
        as_dict=True
    )

    by_supplier = {}
    for r in rows:
        by_supplier.setdefault(r["supplier"], []).append(r)

    reversed_by_parent = defaultdict(float)

    for sup in suppliers:
        to_reverse = supplier_refund_map.get(sup, 0.0)
        if to_reverse <= 0:
            continue

        for r in by_supplier.get(sup, []):
            if to_reverse <= 0:
                break

            row_name = r["row_name"]
            parent_name = r["parent"]
            row_amount = float(r["amount"] or 0)
            pending = float(r["pending_amount"] or 0)

            # Maximum we can add back on this row is original full row amount minus current pending
            already_paid_on_row = max(0.0, round(row_amount - pending, 2))
            if already_paid_on_row <= 0:
                continue

            give_back = min(to_reverse, already_paid_on_row)
            new_pending = round(pending + give_back, 2)

            update_vals = {"pending_amount": new_pending}
            if new_pending > 0.00001:
                update_vals["paied"] = 0

            frappe.db.set_value("Supplier Loan Table", row_name, update_vals, update_modified=False)

            to_reverse = round(to_reverse - give_back, 2)
            reversed_by_parent[parent_name] += give_back

        if to_reverse > 0.00001:
            frappe.logger().info(f"[Milk] Refund reverse: supplier {sup} had leftover {to_reverse} not reapplied on {posting_date}")

    frappe.db.commit()

    if reversed_by_parent:
        update_supplier_loan_parents(reversed_by_parent, reverse=True)

@frappe.whitelist()
def make_weekly_supplier_journals(docname: str, mode_of_payment: str):
    """
    Create Journal Entries from Weekly Supplier Payment using fields on the doc/rows.
    Links each created JE to the WSP via custom_weekly_supplier_payment.
    Allocates loan repayments from the Supplier Loan Refund JE, and supports reversal on cancel.
    """
    if not docname or not mode_of_payment:
        frappe.throw(_("Document name and Mode of Payment are required."))

    doc = frappe.get_doc("Weekly Supplier Payment", docname)
    doc.check_permission("submit")
    if doc.docstatus != 1:
        frappe.throw(_("يمكن إنشاء القيود بعد اعتماد المستند فقط."))

    # Settings and accounts
    milk_setting = frappe.get_single("Milk Setting")
    if not milk_setting:
        frappe.throw("مستند إعدادات اللبن غير موجود.")
    company = milk_setting.company
    if not company:
        frappe.throw("شركة غير محددة في إعدادات اللبن.")

    company_doc = frappe.get_doc("Company", company)

    stock_adjustment_account = getattr(company_doc, "stock_adjustment_account", None)
    if not stock_adjustment_account:
        frappe.throw(f"حساب Stock Adjustment غير مضبوط في الشركة '{company}'.")

    payable_account = (
        getattr(company_doc, "default_payable_account", None)
        or getattr(company_doc, "creditors_account", None)
        or getattr(company_doc, "accounts_payable", None)
    )
    if not payable_account:
        frappe.throw(f"الحساب الدائن (Payable) غير مضبوط في الشركة '{company}'.")

    supplier_loan_account = getattr(milk_setting, "supplier_loan_account", None)
    supplier_deduction_account = getattr(milk_setting, "supplier_deduction_account", None)

    # Mode of Payment default account
    mop_account = None
    mop_doc = frappe.get_doc("Mode of Payment", mode_of_payment)
    for acc in getattr(mop_doc, "accounts", []) or []:
        if acc.company == company and acc.default_account:
            mop_account = acc.default_account
            break
    if not mop_account:
        frappe.throw(f"لا يوجد حساب افتراضي مضبوط لوسيلة الدفع '{mode_of_payment}' في الشركة '{company}'.")

    start_date = getdate(doc.start_date)
    end_date = add_days(start_date, 6)
    posting_date = start_date

    rows = doc.get("weekly_pay_table") or []
    if not rows:
        return {"status": "error", "message": "لا توجد صفوف في كشف الأسبوع."}

    created_jes = {}

    # 1) Accrual JE
    from collections import defaultdict as dd
    accrual_by_supplier = dd(float)
    for r in rows:
        sup = (r.supplier or "").strip()
        if not sup:
            continue
        accrual_by_supplier[sup] += _f(getattr(r, "total_week_amount", 0))

    total_amount_doc = round(_f(doc.total_amount), 2)
    total_accrual_rows = round(sum(accrual_by_supplier.values()), 2)
    debit_total = total_amount_doc if abs(total_accrual_rows - total_amount_doc) <= 0.01 else total_accrual_rows

    je1_accounts = [{
        "account": stock_adjustment_account,
        "debit_in_account_currency": debit_total,
        "credit_in_account_currency": 0,
    }]
    for sup, amt in sorted(accrual_by_supplier.items()):
        if amt <= 0:
            continue
        je1_accounts.append({
            "account": payable_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": round(amt, 2),
            "party_type": "Supplier",
            "party": sup,
        })

    je1 = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Milk Accrual for Supplier",
        "company": company,
        "posting_date": posting_date,
        "accounts": je1_accounts,
        "user_remark": f"إثبات لبن عن الفترة {start_date} إلى {end_date} - من كشف {doc.name}",
        "custom_weekly_supplier_payment": doc.name,
    })
    je1.insert()
    je1.submit()
    created_jes["journal_entry_accrual"] = je1.name

    # 2) Loan Refund JE (source for loan allocation)
    refund_je_name = None
    refund_by_supplier = dd(float)
    for r in rows:
        sup = (r.supplier or "").strip()
        if not sup:
            continue
        sl = _f(getattr(r, "supplier_loan", 0))
        if sl > 0:
            refund_by_supplier[sup] += sl

    if sum(refund_by_supplier.values()) > 0:
        if not supplier_loan_account:
            frappe.throw("من فضلك حدّد حساب قرض المورد في إعدادات اللبن (Supplier Loan Account).")

        refund_accounts = []
        for sup, amt in sorted(refund_by_supplier.items()):
            if amt <= 0:
                continue
            # Dr Payable (Supplier)
            refund_accounts.append({
                "account": payable_account,
                "debit_in_account_currency": round(amt, 2),
                "credit_in_account_currency": 0,
                "party_type": "Supplier",
                "party": sup,
            })
            # Cr Supplier Loan Account (Supplier)
            refund_accounts.append({
                "account": supplier_loan_account,
                "debit_in_account_currency": 0,
                "credit_in_account_currency": round(amt, 2),
                "party_type": "Supplier",
                "party": sup,
            })

        refund_je = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Supplier Loan Refund",
            "company": company,
            "posting_date": posting_date,
            "accounts": refund_accounts,
            "user_remark": f"استرداد أقساط قرض المورد عن الفترة {start_date} إلى {end_date} - من كشف {doc.name}",
            "custom_weekly_supplier_payment": doc.name,
        })
        refund_je.insert()
        refund_je.submit()
        refund_je_name = refund_je.name
        created_jes["journal_entry_loan_refund"] = refund_je_name

        # Allocate refunds to loan schedule and update parent loans
        try:
            # Build actual supplier refund amounts from JE lines (debits to Payable party)
            supplier_refund_map = {}
            for acc in refund_je.accounts:
                if acc.party_type == "Supplier" and flt(acc.debit_in_account_currency) > 0:
                    supplier_refund_map[acc.party] = supplier_refund_map.get(acc.party, 0.0) + float(acc.debit_in_account_currency or 0)

            allocated_by_parent = allocate_supplier_loan_from_refund(posting_date, supplier_refund_map, refund_je.name)
            update_supplier_loan_parents(allocated_by_parent, reverse=False)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Refund allocation failed")

    # 3) Milk Supplier Deduction JE (optional)
    deduction_je_name = None
    deductions_by_supplier = dd(float)
    for r in rows:
        sup = (r.supplier or "").strip()
        if not sup:
            continue
        damt = _f(getattr(r, "deduction_amount", 0))
        if damt > 0:
            deductions_by_supplier[sup] += damt

    if sum(deductions_by_supplier.values()) > 0:
        if not supplier_deduction_account:
            frappe.throw("من فضلك حدّد حساب خصومات المورد (Milk Supplier Deduction Account) في إعدادات اللبن.")
        ded_accounts = []
        for sup, damt in sorted(deductions_by_supplier.items()):
            if damt <= 0:
                continue
            ded_accounts.append({
                "account": supplier_deduction_account,
                "debit_in_account_currency": round(damt, 2),
                "credit_in_account_currency": 0,
            })
            ded_accounts.append({
                "account": payable_account,
                "debit_in_account_currency": 0,
                "credit_in_account_currency": round(damt, 2),
                "party_type": "Supplier",
                "party": sup,
            })
        ded_je = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Milk Supplier Deduction",
            "company": company,
            "posting_date": posting_date,
            "accounts": ded_accounts,
            "user_remark": f"خصومات الموردين للفترة {start_date} إلى {end_date} - من كشف {doc.name}",
            "custom_weekly_supplier_payment": doc.name,
        })
        ded_je.insert()
        ded_je.submit()
        deduction_je_name = ded_je.name
        created_jes["journal_entry_deduction"] = deduction_je_name

    # 4) Payment JE (cash out)
    rows_total_pay = 0.0
    pay_by_supplier = dd(float)
    for r in rows:
        sup = (r.supplier or "").strip()
        if not sup:
            continue
        amt = _f(getattr(r, "total_amount_to_pay", 0))
        pay_by_supplier[sup] += amt
        rows_total_pay += amt

    header_total_pay = round(_f(doc.total_payment), 2)
    credit_total = header_total_pay if abs(rows_total_pay - header_total_pay) <= 0.01 else round(rows_total_pay, 2)

    ref_no = _random_ref_no()
    pay_accounts = []
    for sup, amt in sorted(pay_by_supplier.items()):
        if amt <= 0:
            continue
        pay_accounts.append({
            "account": payable_account,
            "debit_in_account_currency": round(amt, 2),
            "credit_in_account_currency": 0,
            "party_type": "Supplier",
            "party": sup,
        })
    pay_accounts.append({
        "account": mop_account,
        "debit_in_account_currency": 0,
        "credit_in_account_currency": credit_total,
    })

    je2 = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": "Milk Payment for Supplier",
        "company": company,
        "posting_date": posting_date,
        "accounts": pay_accounts,
        "cheque_no": ref_no,
        "cheque_date": posting_date,
        "user_remark": f"صرف لبن عن الفترة {start_date} إلى {end_date} عبر {mode_of_payment} - من كشف {doc.name}",
        "custom_weekly_supplier_payment": doc.name,
    })
    je2.insert()
    je2.submit()
    created_jes["journal_entry_payment"] = je2.name

    # Save links on parent
    frappe.db.set_value("Weekly Supplier Payment", doc.name, {
        "invoice_entry": je1.name,
        "loan_refund_entry": refund_je_name,
        "deduction_entry": deduction_je_name,
        "payment_entry": je2.name
    }, update_modified=False)

    return {"status": "success", "message": "تم إنشاء القيود وربطها بكشف الأسبوع.", **created_jes}