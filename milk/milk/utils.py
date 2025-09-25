import frappe
import json
import random
import string
from frappe.utils import getdate, add_days, nowdate, now_datetime, today, flt
from datetime import datetime, timedelta


@frappe.whitelist()
def get_weekly_supplier_loan_totals(selected_date):
    if not selected_date:
        frappe.throw("من فضلك أدخل تاريخًا صحيحًا.")
    start_date = getdate(selected_date)
    end_date = add_days(start_date, 6)

    rows = frappe.db.sql(
        """
        SELECT sl.supplier as supplier, SUM(slt.amount) as total_loan
        FROM `tabSupplier Loan Table` slt
        INNER JOIN `tabSupplier Loan` sl ON slt.parent = sl.name
        WHERE sl.docstatus = 1
          AND IFNULL(slt.paied, 0) = 0
          AND slt.date BETWEEN %s AND %s
        GROUP BY sl.supplier
        """,
        (start_date, end_date),
        as_dict=True,
    )
    result = {r["supplier"]: float(r["total_loan"] or 0) for r in rows or []}
    return {"status": "success", "data": result, "start": str(start_date), "end": str(end_date)}


@frappe.whitelist()
def disable_inactive_milk_suppliers():
    """
    Disable suppliers (custom_milk_supplier == 1) if they have no milk entries
    or only zero-quantity entries for the last 12 consecutive days.
    """
    suppliers = frappe.get_all(
        "Supplier",
        filters={"custom_milk_supplier": 1, "disabled": 0},
        fields=["name"]
    )

    start_date = add_days(today(), -12)
    end_date = today()

    to_disable = []

    for s in suppliers:
        logs = frappe.get_all(
            "Milk Entries Log",
            filters={
                "supplier": s.name,
                "date": ["between", [start_date, end_date]],
            },
            fields=["quantity"],
            limit=1000
        )

        if not logs:
            to_disable.append(s.name)
            continue

        # if all quantities are zero -> disable
        if all(flt(log.get("quantity") or 0) == 0 for log in logs):
            to_disable.append(s.name)

    if to_disable:
        for sup in to_disable:
            frappe.db.set_value("Supplier", sup, "disabled", 1)
        frappe.db.commit()


@frappe.whitelist()
def get_suppliers_with_villages(driver=None, village=None):
    suppliers = frappe.get_all(
        "Supplier",
        filters={"disabled": 0, "custom_milk_supplier": 1},
        fields=["name", "supplier_name", "custom_driver_in_charge", "custom_cow", "custom_buffalo"],
        limit=5000
    )

    supplier_names = [s["name"] for s in suppliers] or ["___none___"]

    child_rows = frappe.get_all(
        "Supplier Village",  # adjust if your child doctype differs
        filters={"parent": ["in", supplier_names]},
        fields=["parent", "village", "custom_sort", "idx"],
        order_by="parent asc, custom_sort asc, idx asc"
    )

    by_parent = {}
    for row in child_rows:
        if village and (row.get("village") or "") != village:
            continue
        by_parent.setdefault(row["parent"], []).append({
            "village": row.get("village"),
            "custom_sort": row.get("custom_sort") if row.get("custom_sort") is not None else (row.get("idx") or 999999)
        })

    result = []
    for s in suppliers:
        if driver and (s.get("custom_driver_in_charge") or "") != driver:
            continue

        villages = by_parent.get(s["name"], [])
        if village and not villages:
            continue

        result.append({
            "supplier": s["name"],
            "supplier_name": s.get("supplier_name") or s["name"],
            "driver": s.get("custom_driver_in_charge") or "",
            "milk_types": {
                "cow": int(s.get("custom_cow") or 0),
                "buffalo": int(s.get("custom_buffalo") or 0),
            },
            "villages": villages
        })

    return result



@frappe.whitelist()
def _random_ref_no(prefix="MILK"):
    # 12-char random alphanumeric ref no
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    return f"{prefix}-{rand}"


def floor_to_multiple(value, base):
    # Floor value to nearest lower multiple of 'base'
    value = float(value or 0)
    base = float(base or 0)
    if base <= 0:
        return value
    return float(int(value // base) * base)

def _random_ref_no(length=10):
    # Generate a pseudo reference number
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
@frappe.whitelist()
def create_accrual_and_payment_journal_entries(selected_date, mode_of_payment, supplier=None, driver=None, village=None, throw_on_paid=False):
    """
    Creates:
      1) Accrual JE: Dr Stock Adjustment (single), Cr Payable (per supplier, with party).
      2) Supplier Loan Refund JE (same week window, only rows with paied=0):
         Dr Payable (per supplier, with party), Cr Supplier Loan Account (per supplier, with party).
         Marks each used loan row: paied=1 and journal_entry=<refund JE name>.
      3) Payment JE: pays net = earnings - loan refund per supplier, then floors to nearest 5 EGP.
         Dr Payable (per supplier, with party) with the floored net,
         Cr Mode of Payment (single line). Any remainder stays payable.

    Updates Milk Entries Log for earnings:
      - invoice_entry = accrual JE name
      - payment_entry = payment JE name
      - paid = 1
    """

    if not selected_date:
        frappe.throw("من فضلك أدخل تاريخًا صحيحًا.")

    try:
        posting_date = getdate(selected_date)

        # Settings
        milk_setting = frappe.get_single("Milk Setting")
        if not milk_setting:
            frappe.throw("مستند Milk Setting غير موجود. من فضلك قم بإعداده أولًا.")
        company = milk_setting.company
        if not company:
            frappe.throw("شركة غير محددة في إعدادات Milk Setting.")

        # Company accounts
        company_doc = frappe.get_doc("Company", company)

        # Stock Adjustment Account
        stock_adjustment_account = getattr(company_doc, "stock_adjustment_account", None)
        if not stock_adjustment_account:
            frappe.throw(f"حساب Stock Adjustment غير مضبوط في الشركة '{company}'.")

        # Default Payable Account
        payable_account = (
            getattr(company_doc, "default_payable_account", None)
            or getattr(company_doc, "creditors_account", None)
            or getattr(company_doc, "accounts_payable", None)
        )
        if not payable_account:
            frappe.throw(f"الحساب الدائن (Payable) غير مضبوط في الشركة '{company}'.")

        # Mode of Payment account
        mop_account = None
        mop_doc = frappe.get_doc("Mode of Payment", mode_of_payment)
        for acc in getattr(mop_doc, "accounts", []) or []:
            if acc.company == company and acc.default_account:
                mop_account = acc.default_account
                break
        if not mop_account:
            frappe.throw(f"لا يوجد حساب افتراضي مضبوط لوسيلة الدفع '{mode_of_payment}' في الشركة '{company}'.")

        # Date window
        start_date = getdate(selected_date)
        end_date = add_days(start_date, 6)

        # 1) Earnings: grouped supplier report
        report_data = get_grouped_supplier_report_pay(selected_date, supplier, driver, village)
        if report_data["status"] != "success":
            return {"status": "error", "message": report_data["message"]}
        data = report_data["data"]

        supplier_totals = {}     # earnings per supplier
        logs_by_supplier = {}    # unpaid milk logs by supplier for link-back

        for driver_name, driver_data in data.items():
            for village_name, village_data in driver_data.get("villages", {}).items():
                for supplier_name, supplier_data in village_data.get("suppliers", {}).items():
                    supplier_total = 0.0
                    supplier_logs = []

                    for milk_type, milk_data in supplier_data.get("milk_types", {}).items():
                        qty = float(milk_data.get("qty") or 0)
                        amount = float(milk_data.get("amount") or 0)
                        if qty <= 0 or amount == 0:
                            continue

                        logs = frappe.get_all(
                            "Milk Entries Log",
                            filters={
                                "supplier": supplier_name,
                                "milk_type": milk_type,
                                "paid": 0,
                                "invoice_entry": ["is", "not set"],
                                "payment_entry": ["is", "not set"],
                                "date": ["between", [start_date, end_date]],
                            },
                            fields=["name", "paid", "invoice_entry", "payment_entry"]
                        )

                        for log in logs:
                            if log.get("invoice_entry") or log.get("payment_entry") or log.get("paid") == 1:
                                if throw_on_paid:
                                    frappe.throw(f"السجل {log['name']} مرتبط بالفعل بقيد يومية.")
                                continue
                            if log["paid"]:
                                if throw_on_paid:
                                    frappe.throw(f"السجل {log['name']} تم سداده بالفعل.")
                                else:
                                    continue
                            supplier_logs.append(log["name"])

                        supplier_total += amount

                    if supplier_total > 0:
                        supplier_totals[supplier_name] = round(supplier_totals.get(supplier_name, 0.0) + supplier_total, 2)
                        if supplier_logs:
                            logs_by_supplier.setdefault(supplier_name, []).extend(supplier_logs)

        if not supplier_totals:
            return {"status": "error", "message": "لا توجد مبالغ للقيد. لم يتم إنشاء أي قيود يومية."}

        # 2) Accrual JE (full earnings)
        grand_total_original = round(sum(supplier_totals.values()), 2)

        je1_accounts = []
        je1_accounts.append({
            "account": stock_adjustment_account,
            "debit_in_account_currency": grand_total_original,
            "credit_in_account_currency": 0,
        })
        for sup, amt in supplier_totals.items():
            if amt <= 0:
                continue
            je1_accounts.append({
                "account": payable_account,
                "debit_in_account_currency": 0,
                "credit_in_account_currency": amt,
                "party_type": "Supplier",
                "party": sup,
            })

        je1 = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Milk Accrual for Supplier",
            "company": company,
            "posting_date": posting_date,
            "accounts": je1_accounts,
            "user_remark": f"إثبات لبن عن الفترة {start_date} إلى {end_date}",
        })
        je1.insert()
        je1.submit()

        # 3) Supplier Loan Refund JE (only paied = 0 rows in window)
        loan_rows = frappe.db.sql(
            """
            SELECT sl.supplier as supplier, slt.amount as amount, slt.name as row_name
            FROM `tabSupplier Loan Table` slt
            INNER JOIN `tabSupplier Loan` sl ON slt.parent = sl.name
            WHERE sl.docstatus = 1
              AND IFNULL(slt.paied, 0) = 0
              AND slt.date BETWEEN %s AND %s
            """,
            (start_date, end_date),
            as_dict=True,
        )

        refund_by_supplier = {}
        rows_by_supplier = {}
        for r in loan_rows or []:
            sup = r.get("supplier")
            amt = float(r.get("amount") or 0)
            row_name = r.get("row_name")
            if not sup or amt <= 0 or not row_name:
                continue
            refund_by_supplier[sup] = round(refund_by_supplier.get(sup, 0.0) + amt, 2)
            rows_by_supplier.setdefault(sup, []).append(row_name)

        refund_je_name = None
        if refund_by_supplier:
            loan_account = getattr(milk_setting, "supplier_loan_account", None)
            if not loan_account:
                frappe.throw("من فضلك حدّد حساب قرض المورد في إعدادات Milk Setting.")

            refund_accounts = []
            for sup, amt in refund_by_supplier.items():
                if amt <= 0:
                    continue
                refund_accounts.append({
                    "account": payable_account,
                    "debit_in_account_currency": amt,
                    "credit_in_account_currency": 0,
                    "party_type": "Supplier",
                    "party": sup,
                })
                refund_accounts.append({
                    "account": loan_account,
                    "debit_in_account_currency": 0,
                    "credit_in_account_currency": amt,
                    "party_type": "Supplier",
                    "party": sup,
                })

            refund_je = frappe.get_doc({
                "doctype": "Journal Entry",
                "voucher_type": "Supplier Loan Refund",
                "company": company,
                "posting_date": posting_date,
                "accounts": refund_accounts,
                "user_remark": f"استرداد أقساط قرض المورد عن الفترة {start_date} إلى {end_date}",
            })
            refund_je.insert()
            refund_je.submit()
            refund_je_name = refund_je.name

            # Mark each used loan row
            for sup, row_names in rows_by_supplier.items():
                for row_name in row_names:
                    frappe.db.set_value("Supplier Loan Table", row_name, {
                        "paied": 1,
                        "journal_entry": refund_je_name
                    })

        # 4) Payment JE: pay net (earnings - loan refund), floored to nearest 5
        je2_accounts = []
        supplier_adjusted = []  # include net logic in report

        grand_total_paid = 0.0
        for sup, earnings_amt in supplier_totals.items():
            refund_amt = float(refund_by_supplier.get(sup, 0.0)) if refund_by_supplier else 0.0
            net = max(0.0, round(earnings_amt - refund_amt, 2))  # net cannot be negative
            paid_amount = floor_to_multiple(net, 5)               # floor to 5
            paid_amount = round(paid_amount, 2)
            remainder = round(net - paid_amount, 2)               # remains payable

            if paid_amount > 0:
                je2_accounts.append({
                    "account": payable_account,
                    "debit_in_account_currency": paid_amount,
                    "credit_in_account_currency": 0,
                    "party_type": "Supplier",
                    "party": sup,
                })
                grand_total_paid += paid_amount

            supplier_adjusted.append({
                "supplier": sup,
                "earnings": round(earnings_amt, 2),
                "loan_refund": round(refund_amt, 2),
                "net": net,
                "paid_amount": paid_amount,
                "remainder": remainder
            })

        if grand_total_paid <= 0:
            # No payable reached threshold after loan refunds
            # Still return the earlier entries if created
            return {
                "status": "error",
                "message": "لا توجد مبالغ للسداد بعد خصم أقساط القرض أو أقل من 5 جنيه للصرف.",
                "journal_entry_accrual": je1.name,
                "journal_entry_loan_refund": refund_je_name,
                "suppliers": supplier_adjusted,
                "window": {"start": str(start_date), "end": str(end_date)},
            }

        # Credit: single line to MOP account with reference fields
        reference_no = _random_ref_no()
        je2_accounts.append({
            "account": mop_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": round(grand_total_paid, 2),
            "reference_no": reference_no,
            "reference_date": posting_date,
        })

        je2 = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Milk Payment for Supplier",  # or "Cash Entry"
            "company": company,
            "posting_date": posting_date,
            "accounts": je2_accounts,
            "cheque_no": reference_no,
            "cheque_date": posting_date,
            "user_remark": f"صرف لبن (صافي بعد خصم القرض) عن الفترة {start_date} إلى {end_date} عبر {mode_of_payment}",
        })
        je2.insert()
        je2.submit()

        # Update milk logs with JE links and mark paid
        updated_logs = []
        for sup, log_names in logs_by_supplier.items():
            for log_name in log_names:
                frappe.db.set_value("Milk Entries Log", log_name, {
                    "invoice_entry": je1.name,
                    "payment_entry": je2.name,
                    "paid": 1
                })
                updated_logs.append(log_name)

        frappe.db.commit()

        return {
            "status": "success",
            "message": "تم إنشاء قيود: إثبات كامل، استرداد أقساط القرض، وصرف صافي بعد الخصم بمضاعفات 5 جنيه.",
            "journal_entry_accrual": je1.name,
            "journal_entry_loan_refund": refund_je_name,
            "journal_entry_payment": je2.name,
            "reference_no": reference_no,
            "totals": {
                "earnings_total": round(grand_total_original, 2),
                "loan_refund_total": round(sum(refund_by_supplier.values()) if refund_by_supplier else 0.0, 2),
                "paid_total": round(grand_total_paid, 2),
                "remaining_payable_total": round(grand_total_original - (sum(refund_by_supplier.values()) if refund_by_supplier else 0.0) - grand_total_paid, 2),
            },
            "suppliers": supplier_adjusted,
            "loan_refund_suppliers": [{"supplier": s, "refund_amount": a} for s, a in (refund_by_supplier or {}).items()],
            "updated_logs": updated_logs,
            "window": {"start": str(start_date), "end": str(end_date)},
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create_accrual_and_payment_journal_entries")
        return {"status": "error", "message": str(e)}
    
    
@frappe.whitelist()
def get_average_quantity(supplier, milk_type, days=10):
    """
    Calculate the average morning or evening quantities for the supplier over the last `days`.
    Args:
        supplier (str): The supplier name.
        days (int or str): The number of days to calculate the average for.
    Returns:
        dict: A dictionary containing the average morning and evening quantities.
    """
    import datetime

    # Convert days to integer, if it's a string
    days = int(days)

    # Get the last `days` dates
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)

    # Fetch milk entries for the supplier within the date range
    milk_entries = frappe.db.get_all(
        "Milk Entries Log",
        filters={
            "supplier": supplier,
            "date": ["between", [start_date, end_date]]
        },
        fields=["morning", "evening", "quantity"]
    )

    # Initialize totals and counters
    total_morning = 0
    total_evening = 0
    morning_count = 0
    evening_count = 0

    # Process each milk entry
    for entry in milk_entries:
        if entry.get("morning", 0) == 1: 
            if entry.get("quantity", 0) > 0:
                total_morning += entry.get("quantity", 0)
                morning_count += 1

        if entry.get("evening", 0) == 1:  
            if entry.get("quantity", 0) > 0:
                total_evening += entry.get("quantity", 0)
                evening_count += 1

    # Calculate averages
    average_morning = total_morning / morning_count if morning_count > 0 else 0
    average_evening = total_evening / evening_count if evening_count > 0 else 0

    return {
        "morning": average_morning,
        "evening": average_evening
    }

@frappe.whitelist()
def get_drivers():
    return frappe.get_all("Driver", fields=["name"])

@frappe.whitelist()
def get_villages(driver=None):
    if driver:
        return frappe.get_all("Village", filters={"driver_responsible": driver}, fields=["name"])
    return []

      
@frappe.whitelist()
def get_company_from_milk_settings():
    """
    Fetch the company from Milk Setting.
    """
    try:
        company = frappe.db.get_single_value("Milk Setting", "company")
        if not company:
            frappe.throw("لم يتم ضبط الشركة في إعدادات الحليب 😅")
        return company
    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Company from Milk Setting")
        frappe.throw("حدث خطأ أثناء الحصول على إعدادات الشركة 😢")


@frappe.whitelist()
def get_grouped_supplier_report(selected_date, supplier=None, driver=None, village=None):
    try:
        # Parse start date and generate 7-day range
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=6)

        # Filters for the query
        filters = {
            "date": ["between", [start_date.date(), end_date.date()]],
            
        }
        if supplier:
            filters["supplier"] = supplier
        if driver:
            filters["driver"] = driver
        if village:
            filters["village"] = village

        # Fetch records from Milk Entries Log
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "supplier", "milk_type", "quantity", "amount", "village"]
        )

        # Fetch all villages and their drivers
        village_data = frappe.get_all(
            "Village",
            fields=["village_name", "driver_responsible"]
        )
        village_driver_map = {v["village_name"]: v["driver_responsible"] for v in village_data}

        # Grouped data structure
        grouped_data = {}

        for record in records:
            village_name = record.get("village", "Unknown Village")
            driver_name = village_driver_map.get(village_name, "Unknown Driver")
            supplier_name = record.get("supplier")
            milk_type = record.get("milk_type")

            # Initialize driver group
            if driver_name not in grouped_data:
                grouped_data[driver_name] = {"villages": {}, "total_qty": 0, "total_amount": 0}

            # Initialize village group under driver
            if village_name not in grouped_data[driver_name]["villages"]:
                grouped_data[driver_name]["villages"][village_name] = {"suppliers": {}, "total_qty": 0, "total_amount": 0}

            # Initialize supplier group under village
            if supplier_name not in grouped_data[driver_name]["villages"][village_name]["suppliers"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name] = {
                    "milk_types": {}, "total_qty": 0, "total_amount": 0
                }

            # Initialize milk type under supplier
            if milk_type not in grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type] = {
                    "qty": 0, "amount": 0
                }

            # Update quantities and amounts
            milk_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type]
            milk_data["qty"] += record["quantity"]
            milk_data["amount"] += record["amount"]

            # Update supplier totals
            supplier_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]
            supplier_data["total_qty"] += record["quantity"]
            supplier_data["total_amount"] += record["amount"]

            # Update village totals
            village_data = grouped_data[driver_name]["villages"][village_name]
            village_data["total_qty"] += record["quantity"]
            village_data["total_amount"] += record["amount"]

            # Update driver totals
            driver_data = grouped_data[driver_name]
            driver_data["total_qty"] += record["quantity"]
            driver_data["total_amount"] += record["amount"]

        return {"status": "success", "data": grouped_data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Grouped Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
@frappe.whitelist()
def get_grouped_supplier_report_pay(selected_date, supplier=None, driver=None, village=None):
    try:
        # Parse start date and generate 7-day range
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        end_date = start_date + timedelta(days=6)

        # Filters for the query
        filters = {
            "date": ["between", [start_date.date(), end_date.date()]],
            "paid": 0,
            "invoice_entry": ["is", "not set"],
            "payment_entry": ["is", "not set"],
            
        }
        if supplier:
            filters["supplier"] = supplier
        if driver:
            filters["driver"] = driver
        if village:
            filters["village"] = village

        # Fetch records from Milk Entries Log
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "supplier", "milk_type", "quantity", "amount", "village"]
        )

        # Fetch all villages and their drivers
        village_data = frappe.get_all(
            "Village",
            fields=["village_name", "driver_responsible"]
        )
        village_driver_map = {v["village_name"]: v["driver_responsible"] for v in village_data}

        # Grouped data structure
        grouped_data = {}

        for record in records:
            village_name = record.get("village", "Unknown Village")
            driver_name = village_driver_map.get(village_name, "Unknown Driver")
            supplier_name = record.get("supplier")
            milk_type = record.get("milk_type")

            # Initialize driver group
            if driver_name not in grouped_data:
                grouped_data[driver_name] = {"villages": {}, "total_qty": 0, "total_amount": 0}

            # Initialize village group under driver
            if village_name not in grouped_data[driver_name]["villages"]:
                grouped_data[driver_name]["villages"][village_name] = {"suppliers": {}, "total_qty": 0, "total_amount": 0}

            # Initialize supplier group under village
            if supplier_name not in grouped_data[driver_name]["villages"][village_name]["suppliers"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name] = {
                    "milk_types": {}, "total_qty": 0, "total_amount": 0
                }

            # Initialize milk type under supplier
            if milk_type not in grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"]:
                grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type] = {
                    "qty": 0, "amount": 0
                }

            # Update quantities and amounts
            milk_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]["milk_types"][milk_type]
            milk_data["qty"] += record["quantity"]
            milk_data["amount"] += record["amount"]

            # Update supplier totals
            supplier_data = grouped_data[driver_name]["villages"][village_name]["suppliers"][supplier_name]
            supplier_data["total_qty"] += record["quantity"]
            supplier_data["total_amount"] += record["amount"]

            # Update village totals
            village_data = grouped_data[driver_name]["villages"][village_name]
            village_data["total_qty"] += record["quantity"]
            village_data["total_amount"] += record["amount"]

            # Update driver totals
            driver_data = grouped_data[driver_name]
            driver_data["total_qty"] += record["quantity"]
            driver_data["total_amount"] += record["amount"]

        return {"status": "success", "data": grouped_data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Grouped Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
         
@frappe.whitelist()
def get_supplier_report_seven_days(selected_date, supplier=None, driver=None, village=None):
    try:
        # Parse start date and generate the 7-day range
        start_date = datetime.strptime(selected_date, "%Y-%m-%d")
        days_of_week = [start_date + timedelta(days=i) for i in range(7)]

        # Arabic day names mapping
        arabic_days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
        arabic_numbers = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")

        # Filters for the query
        filters = {
            "date": ["between", [start_date.date(), (start_date + timedelta(days=6)).date()]],
        }
        if supplier:
            filters["supplier"] = supplier
        if driver:
            filters["driver"] = driver
        if village:
            filters["village"] = village

        # Fetch records for the given week
        records = frappe.get_all(
            "Milk Entries Log",
            filters=filters,
            fields=["date", "supplier", "milk_type", "morning", "evening", "quantity", "amount", "pont", "driver", "village"]
        )

        # Group data by supplier and milk type
        grouped_data = {}
        for record in records:
            supplier_name = record["supplier"]
            milk_type = record["milk_type"]

            # Fetch supplier-specific details
            supplier_doc = frappe.get_doc("Supplier", supplier_name)
            custom_villages = supplier_doc.custom_villages or "غير محدد"
            cow_price = supplier_doc.custom_cow_price or 0
            buffalo_price = supplier_doc.custom_buffalo_price or 0
            custom_pont_size_rate = supplier_doc.custom_pont_size_rate or 0
            rate = cow_price if milk_type == "Cow" else buffalo_price
            encrypted_rate = rate * 90  # Encrypted rate calculation

            # Initialize supplier and milk type grouping
            key = (supplier_name, milk_type)
            if key not in grouped_data:
                grouped_data[key] = {
                    "supplier_name": supplier_name,
                    "custom_villages": custom_villages,
                    "milk_type": milk_type,
                    "custom_pont_size_rate": custom_pont_size_rate,
                    "encrypted_rate": encrypted_rate,  # Include encrypted rate
                    "days": {day.date(): {"day_name": f"{arabic_days[day.weekday()]} - {day.strftime('%d').translate(arabic_numbers)}",
                                          "morning": {"qty": 0, "amount": 0, "pont": 0},
                                          "evening": {"qty": 0, "amount": 0, "pont": 0}} for day in days_of_week},
                    "total_morning": 0,
                    "total_evening": 0,
                    "total_quantity": 0,
                    "total_amount": 0,  # Initialize total amount
                    "driver": record.get("driver"),
                    "village": record.get("village"),
                }

            # Populate morning and evening data
            date_key = record["date"]
            if date_key in grouped_data[key]["days"]:
                if record["morning"] == 1:
                    grouped_data[key]["days"][date_key]["morning"]["qty"] += record["quantity"]
                    grouped_data[key]["days"][date_key]["morning"]["amount"] += record["amount"]
                    grouped_data[key]["days"][date_key]["morning"]["pont"] = record["pont"]
                if record["evening"] == 1:
                    grouped_data[key]["days"][date_key]["evening"]["qty"] += record["quantity"]
                    grouped_data[key]["days"][date_key]["evening"]["amount"] += record["amount"]
                    grouped_data[key]["days"][date_key]["evening"]["pont"] = record["pont"]

                # Update totals
                grouped_data[key]["total_morning"] += record["quantity"] if record["morning"] == 1 else 0
                grouped_data[key]["total_evening"] += record["quantity"] if record["evening"] == 1 else 0
                grouped_data[key]["total_amount"] += record["amount"]

        # Finalize data
        final_data = []
        for (supplier_name, milk_type), data in grouped_data.items():
            data["total_quantity"] = data["total_morning"] + data["total_evening"]

            # Convert days dict to list for frontend rendering
            data["days"] = list(data["days"].values())

            final_data.append(data)

        return {"status": "success", "data": final_data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Supplier Report Error")
        return {"status": "error", "message": str(e)}
    
    
@frappe.whitelist()
def get_driver_report(from_date, to_date, driver=None):
    """
    Generate a daily report comparing milk collected from suppliers (Milk Entries Log)
    and car collection (Car Collection), grouped by milk type for each driver within the specified date range.
    """
    try:
        # Validate input
        if not from_date or not to_date:
            frappe.throw("يرجى تحديد التاريخ من وإلى للحصول على التقرير.")

        # Filter conditions for driver (optional)
        driver_condition = f"AND driver = %(driver)s" if driver else ""

        # Query Milk Entries Log: Collected Morning and Evening Totals by Milk Type
        milk_entries_query = f"""
            SELECT
                driver,
                date,
                milk_type,
                SUM(CASE WHEN morning = 1 THEN quantity ELSE 0 END) AS collected_morning,
                SUM(CASE WHEN evening = 1 THEN quantity ELSE 0 END) AS collected_evening
            FROM
                `tabMilk Entries Log`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date, milk_type
        """

        milk_entries = frappe.db.sql(
            milk_entries_query,
            {"from_date": from_date, "to_date": to_date, "driver": driver},
            as_dict=True,
        )

        # Query Car Collection: Calculate Morning and Evening Totals by Milk Type
        car_collection_query = f"""
            SELECT
                driver,
                date,
                milk_type,
                SUM(CASE WHEN morning = 1 THEN quantity ELSE 0 END) AS car_morning,
                SUM(CASE WHEN evening = 1 THEN quantity ELSE 0 END) AS car_evening
            FROM
                `tabCar Collection`
            WHERE
                date BETWEEN %(from_date)s AND %(to_date)s
                {driver_condition}
            GROUP BY
                driver, date, milk_type
        """

        car_collection = frappe.db.sql(
            car_collection_query,
            {"from_date": from_date, "to_date": to_date, "driver": driver},
            as_dict=True,
        )

        # Merge Data from Both Sources
        report_data = {}

        # Populate Milk Entries Log Data
        for entry in milk_entries:
            key = (entry["driver"], entry["date"], entry["milk_type"])
            report_data[key] = {
                "driver": entry["driver"],
                "date": entry["date"],
                "milk_type": entry["milk_type"],
                "collected_morning": float(entry["collected_morning"] or 0),
                "collected_evening": float(entry["collected_evening"] or 0),
                "car_morning": 0,
                "car_evening": 0,
            }

        # Populate Car Collection Data
        for entry in car_collection:
            key = (entry["driver"], entry["date"], entry["milk_type"])
            if key not in report_data:
                report_data[key] = {
                    "driver": entry["driver"],
                    "date": entry["date"],
                    "milk_type": entry["milk_type"],
                    "collected_morning": 0,
                    "collected_evening": 0,
                }
            report_data[key]["car_morning"] = float(entry["car_morning"] or 0)
            report_data[key]["car_evening"] = float(entry["car_evening"] or 0)

        # Calculate Differences and Totals
        final_report = []
        for key, data in report_data.items():
            collected_total = data["collected_morning"] + data["collected_evening"]
            car_total = data["car_morning"] + data["car_evening"]
            morning_diff = data["car_morning"] - data["collected_morning"]
            evening_diff = data["car_evening"] - data["collected_evening"]
            total_diff = car_total - collected_total

            final_report.append({
                "driver": data["driver"],
                "date": data["date"],
                "milk_type": data["milk_type"],
                "collected_morning": data["collected_morning"],
                "car_morning": data["car_morning"],
                "morning_diff": morning_diff,
                "collected_evening": data["collected_evening"],
                "car_evening": data["car_evening"],
                "evening_diff": evening_diff,
                "collected_total": collected_total,
                "car_total": car_total,
                "total_diff": total_diff,
            })

        # Sort by date, driver, and milk type
        final_report.sort(key=lambda x: (x["date"], x["driver"], x["milk_type"]))

        return {"status": "success", "data": final_report}

    except Exception as e:
        frappe.log_error(str(e), "Error Fetching Driver Daily Report")
        return {
            "status": "error",
            "message": f"حدث خطأ أثناء جلب التقرير: {str(e)}"
        }
        
@frappe.whitelist()
def insert_car_collection(data):
    
    try:
        data = json.loads(data)

        # Required fields validation
        required_fields = ["driver", "warehouse", "quantity", "date", "milk_type"]
        for field in required_fields:
            if not data.get(field):
                frappe.throw(f"مطلوب حقل '{field}' 😅")

        # Date validation
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            frappe.throw("التاريخ لازم يكون بالصيغة YYYY-MM-DD 📅")

        # Quantity validation
        try:
            quantity = float(data["quantity"])
            if quantity <= 0:
                frappe.throw("الكمية لازم تكون رقم موجب 👍")
        except ValueError:
            frappe.throw("الكمية لازم تكون رقم صحيح 🧮")

        # Milk type validation
        if data["milk_type"] not in ["Cow", "Buffalo"]:
            frappe.throw("نوع الحليب لازم يكون يا Cow يا Buffalo 🐄🐃")

        # Time validation
        morning = int(data.get("morning", 0))
        evening = int(data.get("evening", 0))
        milk_type = data.get("milk_type")
        if not morning and not evening:
            frappe.throw("اختار صباحاً أو مساءً ⏰")

        # Duplicate check
        if frappe.get_all(
            "Car Collection",
            filters={
                "driver": data["driver"],
                "date": data["date"],
                "milk_type": milk_type,
                "morning": morning,
                "evening": evening
            },
            limit_page_length=1
        ):
            frappe.throw("فيه سجل بنفس السائق، التاريخ، والوقت 😬")
        company = get_company_from_milk_settings()
        # Insert document
        doc = frappe.get_doc({
            "doctype": "Car Collection",
            "driver": data["driver"],
            "warehouse": data["warehouse"],
            "quantity": quantity,
            "company": company,
            "date": data["date"],
            "morning": morning,
            "evening": evening,
            "milk_type": data["milk_type"]
        })
        doc.insert()
        doc.submit()

        frappe.msgprint("✅ تم حفظ بيانات استلام السيارة بنجاح!")
        return {"message": "✅ تم حفظ بيانات استلام السيارة بنجاح!", "docname": doc.name}

    except json.JSONDecodeError:
        frappe.throw("البيانات اللي بعتهالك مش JSON 😅")
    except Exception as e:
        frappe.throw(f"حصل خطأ: {str(e)} 😢")

    
@frappe.whitelist()
def validate_supplier_data(driver, village, collection_date, milk_entries):
    """
    Validate milk entries against historical data for each supplier.
    """
    try:
        collection_date = getdate(collection_date)
        one_month_ago = add_days(collection_date, -30)
        milk_entries = frappe.parse_json(milk_entries)

        warnings = []
        for entry in milk_entries:
            supplier = entry.get("supplier")
            milk_type = entry.get("milk_type")
            quantity = entry.get("morning_quantity") or 0  # Add evening_quantity if needed

            # Fetch historical data for the supplier
            historical_data = frappe.db.sql("""
                SELECT quantity
                FROM `tabMilk Entries Log`
                WHERE supplier = %(supplier)s
                  AND milk_type = %(milk_type)s
                  AND date BETWEEN %(start_date)s AND %(end_date)s
            """, {
                "supplier": supplier,
                "milk_type": milk_type,
                "start_date": one_month_ago,
                "end_date": collection_date
            }, as_dict=True)

            # Calculate average quantity and acceptable range
            if historical_data:
                quantities = [d.quantity for d in historical_data]
                avg_quantity = sum(quantities) / len(quantities)
                acceptable_range = (avg_quantity * 0.5, avg_quantity * 1.5)

                # Check if the current quantity is within the acceptable range
                if quantity < acceptable_range[0] or quantity > acceptable_range[1]:
                    warnings.append(
                        f"الجامع '{supplier}' ({milk_type}): الكمية {quantity} مش طبيعية 🤔. "
                        f"المتوسط المتوقع: من {acceptable_range[0]:.2f} لـ {acceptable_range[1]:.2f}."
                    )

        if warnings:
            return {"status": "warning", "warnings": warnings}
        else:
            return {"status": "success", "warnings": []}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في فحص تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ: {str(e)} 😢"}


@frappe.whitelist()
def _parse_villages_list(cv):
    """
    Normalize Supplier.custom_villages into a simple list of village names.
    Accepts JSON string, CSV string, or list/dict structures.
    """
    out = []
    if not cv:
        return out

    # already a list (from db or child table stored as JSON)
    if isinstance(cv, list):
        for item in cv:
            if not item:
                continue
            if isinstance(item, str):
                v = item.strip()
                if v:
                    out.append(v)
            elif isinstance(item, dict):
                v = str(item.get("village") or item.get("village_name") or item.get("value") or item.get("name") or "").strip()
                if v:
                    out.append(v)
        return out

    # JSON string or CSV string
    if isinstance(cv, str):
        s = cv.strip()
        if not s:
            return out
        # try JSON first
        try:
            arr = json.loads(s)
            if isinstance(arr, list):
                for item in arr:
                    if not item:
                        continue
                    if isinstance(item, str):
                        v = item.strip()
                        if v:
                            out.append(v)
                    elif isinstance(item, dict):
                        v = str(item.get("village") or item.get("village_name") or item.get("value") or item.get("name") or "").strip()
                        if v:
                            out.append(v)
                return out
        except Exception:
            # not JSON; fall back to CSV
            out.extend([v.strip() for v in s.split(",") if v.strip()])
            return out

    return out


def _entry_with_pont_rate(row):
    """
    Ensure draft/submitted milk entries include custom_pont_size_rate if present on row.
    """
    d = frappe._dict(row.as_dict() if hasattr(row, "as_dict") else row)
    # Normalize expected keys; fallback defaults to avoid frontend crashes
    d.setdefault("supplier", d.get("supplier_name") or d.get("supplier"))
    d.setdefault("supplier_name", d.get("supplier_name") or d.get("supplier"))
    d.setdefault("milk_type", d.get("milk_type") or "")
    d.setdefault("morning_quantity", d.get("morning_quantity") or 0)
    d.setdefault("evening_quantity", d.get("evening_quantity") or 0)
    d.setdefault("morning_pont", d.get("morning_pont") or 0)
    d.setdefault("evening_pont", d.get("evening_pont") or 0)
    d.setdefault("village", d.get("village") or d.get("village_name") or "")
    d.setdefault("custom_sort", d.get("custom_sort") or None)
    d.setdefault("custom_pont_size_rate", d.get("custom_pont_size_rate") or 0)
    return d


def process_milk_entries(entries):
    """
    Normalize draft rows to include fields the frontend expects.
    """
    return [_entry_with_pont_rate(e) for e in entries]


@frappe.whitelist()
def get_suppliers(driver, collection_date, villages=None):
    """
    Fetch suppliers, or load draft/submitted milk collection based on the driver, villages, and date.

    Returns:
      {
        status: 'submitted' | 'draft' | 'new' | 'no_suppliers' | 'error',
        milk_entries?: [],
        suppliers?: [],
        message: str,
      }
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق وتاريخ الجمع عشان نجيب الموردين 😅")

        # Normalize villages: [] means "all"
        if not villages or not isinstance(villages, list):
            villages = []

        # 1) Check for an existing Milk Collection document (by driver + date)
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {"driver": driver, "collection_date": collection_date},
            ["name", "docstatus"],
            as_dict=True
        )

        # Submitted
        if existing_doc and existing_doc.get("docstatus") == 1:
            submitted_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            return {
                "status": "submitted",
                "milk_entries": [ _entry_with_pont_rate(r) for r in submitted_doc.milk_entries ],
                "message": f"تسجيل اللبن للسائق '{driver}' والتاريخ '{collection_date}' متسلم بالفعل ✅"
            }

        # Draft
        if existing_doc and existing_doc.get("docstatus") == 0:
            draft_doc = frappe.get_doc("Milk Collection", existing_doc["name"])
            return {
                "status": "draft",
                "milk_entries": process_milk_entries(draft_doc.milk_entries),
                "message": "في مسودة موجودة، ممكن تكمل إدخال البيانات ✍️"
            }

        # 2) New entries: fetch suppliers for this driver
        # Combine filters correctly (your original code overwrote driver filter).
        base_filters = {
            "disabled": 0,
            "custom_milk_supplier": 1,
            "custom_driver_in_charge": driver
        }

        # Fetch candidate suppliers (we'll apply village filter in Python for robustness)
        suppliers = frappe.get_all(
            "Supplier",
            filters=base_filters,
            fields=[
                "name",
                "supplier_name",
                "custom_cow",
                "custom_buffalo",
                "custom_villages",
                "custom_cow_price",
                "custom_buffalo_price",
                "custom_pont_size_rate",
                "custom_sort"
            ],
            order_by="COALESCE(custom_sort, 999999), supplier_name asc"
        )

        if not suppliers:
            return {
                "status": "no_suppliers",
                "suppliers": [],
                "message": f"لا يوجد موردين للسائق '{driver}' والقرى المحددة 😞"
            }

        # Apply villages filter if provided
        selected_villages = [v.strip() for v in villages if isinstance(v, str) and v.strip()]
        filtered_suppliers = []
        for sup in suppliers:
            sup_villages = _parse_villages_list(sup.get("custom_villages"))
            if selected_villages:
                # keep supplier if any intersection
                if not any(v in sup_villages for v in selected_villages):
                    continue
            filtered_suppliers.append(sup)

        if not filtered_suppliers:
            return {
                "status": "no_suppliers",
                "suppliers": [],
                "message": f"لا يوجد موردين للسائق '{driver}' والقرى المحددة 😞"
            }

        # Build processed suppliers payload
        processed_suppliers = []
        for sup in filtered_suppliers:
            sup_name = sup.get("supplier_name") or sup.get("name") or "غير معروف"
            sup_villages = _parse_villages_list(sup.get("custom_villages"))
            milk_types = []
            if sup.get("custom_cow"):
                milk_types.append("Cow")
            if sup.get("custom_buffalo"):
                milk_types.append("Buffalo")

            pont_size_rate = sup.get("custom_pont_size_rate") or 0

            processed_suppliers.append({
                "supplier": sup.get("name"),
                "supplier_name": sup_name,
                "custom_villages": sup_villages,       # normalized list for the frontend
                "milk_type": ",".join(milk_types),     # "Cow,Buffalo" ...
                "custom_pont_size_rate": pont_size_rate,
                "morning_quantity": 0,
                "evening_quantity": 0,
                "morning_pont": 0 if not pont_size_rate else 0,
                "evening_pont": 0 if not pont_size_rate else 0,
                "cow_price": sup.get("custom_cow_price") or 0,
                "buffalo_price": sup.get("custom_buffalo_price") or 0,
                "custom_sort": sup.get("custom_sort"),
                # Provide a default village for grouping if only one present
                "village": sup_villages[0] if sup_villages else ""
            })

        return {
            "status": "new",
            "suppliers": processed_suppliers,
            "message": f"تم جلب الموردين للسائق '{driver}' والقرى المحددة ✅"
        }

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="خطأ في جلب الموردين 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنجيب الموردين 😢: {frappe.as_unicode(e)}"}
      

def process_milk_entries(milk_entries):
    """
    Process draft milk entries to ensure valid supplier names, milk types,
    and respect the supplier's custom_pont_size_rate for editable ponts.
    """
    processed_entries = []
    for entry in milk_entries:
        supplier_name = entry.get("supplier")
        
        if supplier_name:
            # Fetch supplier's custom_pont_size_rate
            supplier = frappe.get_doc("Supplier", supplier_name)
            custom_pont_size_rate = supplier.custom_pont_size_rate or 0
        else:
            custom_pont_size_rate = 0

        processed_entries.append({
            "supplier": supplier_name or "غير معروف",  # Fallback for missing supplier
            "milk_type": entry.get("milk_type"),
            "morning_quantity": entry.get("morning_quantity", 0),
            "evening_quantity": entry.get("evening_quantity", 0),
            "morning_pont": entry.get("morning_pont", 0),
            "evening_pont": entry.get("evening_pont", 0),
            "custom_pont_size_rate": custom_pont_size_rate,  # Include supplier's pont rate for frontend logic
        })
    return processed_entries
    
    
@frappe.whitelist()
def submit_milk_collection(driver, village, collection_date, milk_entries=None):
    """
    Submit the Milk Collection document. If no draft exists, create a new document and submit it.
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نقدر نسلم تسجيل اللبن 😅")
        if not milk_entries:
            frappe.throw("مطلوب إدخال بيانات الحليب عشان نقدر نسلمها 😬")

        milk_entries = frappe.parse_json(milk_entries)
        company = get_company_from_milk_settings()

        # Check for an existing draft document
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "docstatus": 0  # Only drafts
            },
            "name"
        )

        if existing_doc:
            # Update and submit the existing draft
            doc = frappe.get_doc("Milk Collection", existing_doc)
            doc.milk_entries = []  # Clear existing entries
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                })
            doc.submit()  # Submit the updated document

            message = f"✅ تم تسليم تسجيل اللبن '{doc.name}' بنجاح يا معلم!"
        
        else:
            # No draft exists, create a new document and submit it
            doc = frappe.new_doc("Milk Collection")
            doc.driver = driver
            doc.village = village
            doc.collection_date = collection_date
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0
                })
            doc.insert()
            doc.submit()  # Submit the newly created document

            message = f"✅ ملقناش مسودة فعملنا واحدة جديدة وسلمنا تسجيل اللبن '{doc.name}' بنجاح!"

        frappe.db.commit()  # Commit changes to the database
        frappe.msgprint(message)
        return {"status": "success", "message": message}

    except Exception as e:
        # Log and return an error message
        frappe.log_error(message=str(e), title="خطأ في تسليم تسجيل اللبن 🐄")
        return {
            "status": "error",
            "message": f"حصل خطأ وإحنا بنسلم تسجيل اللبن 😢: {str(e)}"
        }
        
        
@frappe.whitelist()
def check_existing_milk_collection(driver, village, collection_date):
    """
    Check if a Milk Collection document exists for the given driver, village, and date.
    """
    try:
        # Validate inputs
        if not driver or not village or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نفحص تسجيل اللبن 😅")

        # Check for existing Milk Collection
        existing_doc = frappe.get_all(
            "Milk Collection",
            filters={
                "driver": driver,
                "village": village,
                "collection_date": collection_date
            },
            fields=["name", "docstatus"]
        )

        # Handle existing document cases
        if existing_doc:
            if existing_doc[0]["docstatus"] == 1:
                return {
                    "status": "submitted",
                    "message": f"تسجيل اللبن '{existing_doc[0]['name']}' متسلم بالفعل ✅"
                }
            elif existing_doc[0]["docstatus"] == 0:
                doc = frappe.get_doc("Milk Collection", existing_doc[0]["name"])
                return {
                    "status": "draft",
                    "data": {
                        "entries": doc.milk_entries,
                        "message": f"تم تحميل مسودة '{existing_doc[0]['name']}' ✍️"
                    }
                }

        # No document found
        return {"status": "none", "message": "ملقناش أي جمع حليب بالمعطيات اللي حددتها 😬"}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في فحص تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنفحص تسجيل اللبن 😢: {str(e)}"}
  

@frappe.whitelist()
def save_milk_collection(driver, village, collection_date, milk_entries):
    """
    Save or update milk collection data as a draft.
    """
    try:
        # Validate inputs
        if not driver or not collection_date:
            frappe.throw("مطلوب تحديد السائق، القرية، والتاريخ عشان نحفظ المسودة 😅")
        if not milk_entries:
            frappe.throw("مطلوب إدخال بيانات الحليب عشان نحفظ 😬")

        milk_entries = frappe.parse_json(milk_entries)

        # Check for an existing draft document
        existing_doc = frappe.db.get_value(
            "Milk Collection",
            {
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "docstatus": 0  # Only drafts
            },
            "name"
        )

        if existing_doc:
            # Update the existing draft
            doc = frappe.get_doc("Milk Collection", existing_doc)
            doc.milk_entries = []  # Clear existing entries
            for entry in milk_entries:
                # Fetch supplier's custom_pont_size_rate
                supplier_name = entry.get("supplier")
                if supplier_name:
                    supplier = frappe.get_doc("Supplier", supplier_name)
                    custom_pont_size_rate = supplier.get("custom_pont_size_rate", 0)
                else:
                    custom_pont_size_rate = 0

                # Append entry with processed ponts
                doc.append("milk_entries", {
                    "supplier": supplier_name,
                    "milk_type": entry.get("milk_type"),
                    "morning_quantity": entry.get("morning_quantity", 0),
                    "evening_quantity": entry.get("evening_quantity", 0),
                    "morning_pont": entry.get("morning_pont", 0) if custom_pont_size_rate else 0,  # Default to 0 if rate is 0
                    "evening_pont": entry.get("evening_pont", 0) if custom_pont_size_rate else 0,  # Default to 0 if rate is 0
                })
            doc.save()
            frappe.msgprint(f"✍️ تم تحديث مسودة تسجيل اللبن '{doc.name}' بنجاح!")
        else:
            # Create a new draft document if none exists
            doc = frappe.get_doc({
                "doctype": "Milk Collection",
                "driver": driver,
                "village": village,
                "collection_date": collection_date,
                "milk_entries": [
                    {
                        "supplier": entry.get("supplier"),
                        "milk_type": entry.get("milk_type"),
                        "morning_quantity": entry.get("morning_quantity", 0),
                        "evening_quantity": entry.get("evening_quantity", 0),
                        "morning_pont": entry.get("morning_pont", 0) if frappe.get_doc("Supplier", entry.get("supplier")).get("custom_pont_size_rate", 0) else 0,
                        "evening_pont": entry.get("evening_pont", 0) if frappe.get_doc("Supplier", entry.get("supplier")).get("custom_pont_size_rate", 0) else 0,
                    }
                    for entry in milk_entries
                ]
            })
            doc.insert()
            frappe.msgprint(f"✍️ تم حفظ مسودة جديدة لتسجيل اللبن '{doc.name}' بنجاح!")

        frappe.db.commit()
        return {"status": "success", "message": f"مسودة تسجيل اللبن '{doc.name}' تم حفظها بنجاح!"}

    except Exception as e:
        frappe.log_error(message=str(e), title="خطأ في حفظ مسودة تسجيل اللبن 🐄")
        return {"status": "error", "message": f"حصل خطأ وإحنا بنحفظ المسودة 😢: {str(e)}"}