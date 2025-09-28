# -*- coding: utf-8 -*-
from __future__ import annotations

import frappe
from frappe.model.document import Document
from datetime import datetime, date as dt_date, datetime as dt_datetime
from typing import Dict, List, Tuple, Optional
from frappe.utils.pdf import get_pdf
import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import getdate

def _overlaps(s1, e1, s2, e2):
    return (s1 <= e2) and (s2 <= e1)

class WeeklySupplierPayment(Document):
    def validate(self):
        self.validate_duplicate_period_for_driver()

    def validate_duplicate_period_for_driver(self):
        if not self.driver or not self.start_date or not self.to_date:
            return

        s1 = getdate(self.start_date)
        e1 = getdate(self.to_date)

        # Fetch other docs for same driver with docstatus 0 or 1
        others = frappe.db.sql(
            """
            SELECT name, start_date, to_date, docstatus
            FROM `tabWeekly Supplier Payment`
            WHERE driver = %s
              AND docstatus IN (0, 1)
              AND name != %s
            """,
            (self.driver, self.name or ""),
            as_dict=True,
        )

        for o in others:
            s2 = getdate(o.start_date) if o.start_date else None
            e2 = getdate(o.to_date) if o.to_date else None
            if not s2 or not e2:
                continue
            if _overlaps(s1, e1, s2, e2):
                frappe.throw(
                    _("Duplicate weekly payment for driver {0} overlaps with {1} ({2} → {3}).")
                    .format(self.driver, o.name, o.start_date, o.to_date),
                    title=_("Duplicate Period")
                )


COW_LABEL = "بقري"
BUFFALO_LABEL = "جاموسي"
MEL_COW = "Cow"
MEL_BUFFALO = "Buffalo"

# Monday=0..Sunday=6
WEEKDAY_TO_PREFIX = {
    6: "sunday",
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
}


def _mel_type_from_label(label: Optional[str]) -> Optional[str]:
    if not label:
        return None
    l = str(label).strip().lower()
    if l in ("بقري", "cow"):
        return MEL_COW
    if l in ("جاموسي", "buffalo"):
        return MEL_BUFFALO
    return None


def _weekday_any(x) -> int:
    """
    Return weekday int Monday=0..Sunday=6 for a date-like value.
    Accepts ISO date string 'YYYY-MM-DD', datetime/date, or Frappe date str.
    """
    if not x:
        # default to Monday to avoid crash; caller should handle
        return 0
    try:
        if isinstance(x, str):
            # Try ISO first; fallback to only date-part
            ds = x.strip()
            if " " in ds:
                ds = ds.split(" ", 1)[0]
            return datetime.strptime(ds, "%Y-%m-%d").weekday()
        if isinstance(x, dt_date) and not isinstance(x, dt_datetime):
            return x.weekday()
        if isinstance(x, dt_datetime):
            return x.date().weekday()
        ds = str(x)
        if " " in ds:
            ds = ds.split(" ", 1)[0]
        return datetime.strptime(ds, "%Y-%m-%d").weekday()
    except Exception:
        # If bad value, default to Monday
        return 0


def _validate_parent(doc: "WeeklySupplierPayment"):
    if doc.docstatus != 0:
        frappe.throw("Only Draft documents can be updated.")
    if not doc.start_date or not doc.to_date:
        frappe.throw("Please set Start Date and To Date first.")
    if not getattr(doc, "driver", None):
        frappe.throw("Please select Driver first.")


def _normalize_text(s: Optional[str]) -> str:
    if not s:
        return ""
    t = str(s)
    # Normalize Arabic and standard spaces
    t = t.replace("\u00A0", " ").replace("\u200f", "").replace("\u200e", "")
    return " ".join(t.split()).strip().lower()


def _split_multi_villages(s: Optional[str]) -> List[str]:
    """
    Split a text field that may contain multiple village names, separated by commas, slashes, or new lines.
    """
    if not s:
        return []
    t = str(s).replace("\n", ",").replace("/", ",").replace("|", ",")
    parts = [p.strip() for p in t.split(",") if p and p.strip()]
    return parts


def _get_suppliers(driver: str, village: Optional[str]) -> List[dict]:
    """
    Fetch suppliers for the driver, optionally filtered by village (partial match allowed),
    then sort by custom_sort (non-zero first), then name.
    """
    filters = {
        "disabled": 0,
        "custom_milk_supplier": 1,
        "custom_driver_in_charge": driver,
    }
    fields = [
        "name",
        "supplier_name",
        "custom_sort",
        "custom_villages",
        "custom_buffalo",
        "custom_cow",
        "custom_cow_price",
        "custom_buffalo_price",
    ]
    suppliers = frappe.get_all(
        "Supplier",
        filters=filters,
        fields=fields,
        order_by="supplier_name asc",
        limit=10000,
    )

    if village:
        v_norm = _normalize_text(village)
        def matches(s: dict) -> bool:
            sv = s.get("custom_villages") or ""
            # Accept any match inside the multi-village field
            for part in _split_multi_villages(sv):
                if _normalize_text(part) == v_norm or v_norm in _normalize_text(part):
                    return True
            # Also try a raw contains as a fallback
            return v_norm in _normalize_text(sv)
        suppliers = [s for s in suppliers if matches(s)]

    def sort_key(s):
        sort_val = int(s.get("custom_sort") or 0)
        zero_tag = 1 if sort_val == 0 else 0
        name_key = (s.get("supplier_name") or s.get("name") or "").lower()
        # non-zero sort first (zero_tag=0), then by sort_val, then name
        return (zero_tag, sort_val if sort_val != 0 else 10**9, name_key)

    suppliers.sort(key=sort_key)
    return suppliers


def _safe_set(child, fieldname, value):
    if hasattr(child, fieldname):
        setattr(child, fieldname, value)


def _reset_day_fields(child):
    for prefix in ("sunday","monday","tuesday","wednesday","thursday","friday","saturday"):
        for timepart in ("morning","evening"):
            fname = f"{prefix}_{timepart}"
            if hasattr(child, fname):
                setattr(child, fname, 0)


def _fetch_milk_entries(
    supplier: str,
    milk_type_label: str,
    start_date: str,
    to_date: str,
    driver: Optional[str],
    village: Optional[str],
) -> List[dict]:
    """
    Fetch Milk Entries Log for a row: date range inclusive, unpaid, supplier, specific milk type,
    and optional driver/village filters. Order by date asc.
    """
    mel_type = _mel_type_from_label(milk_type_label)
    if not mel_type:
        return []

    filters = [
        ["Milk Entries Log", "date", ">=", start_date],
        ["Milk Entries Log", "date", "<=", to_date],
        ["Milk Entries Log", "paid", "=", 0],
        ["Milk Entries Log", "supplier", "=", supplier],
        ["Milk Entries Log", "milk_type", "=", mel_type],
    ]
    if driver:
        filters.append(["Milk Entries Log", "driver", "=", driver])
    if village:
        filters.append(["Milk Entries Log", "village", "=", village])

    fields = ["name", "date", "morning", "evening", "quantity"]
    return frappe.get_all(
        "Milk Entries Log",
        filters=filters,
        fields=fields,
        order_by="date asc, name asc",
        limit=100000,
    )


def _fill_row_from_entries(child, entries: List[dict]):
    """
    Populate day-wise quantities from entries and compute qty totals and total_week_amount.
    """
    _reset_day_fields(child)

    total_morning = 0.0
    total_evening = 0.0

    for e in entries:
        wd = _weekday_any(e.get("date"))
        prefix = WEEKDAY_TO_PREFIX.get(wd)
        if not prefix:
            continue

        qty = float(e.get("quantity") or 0)
        if int(e.get("morning") or 0) == 1:
            fname = f"{prefix}_morning"
            if hasattr(child, fname):
                setattr(child, fname, (getattr(child, fname) or 0) + qty)
            total_morning += qty
        if int(e.get("evening") or 0) == 1:
            fname = f"{prefix}_evening"
            if hasattr(child, fname):
                setattr(child, fname, (getattr(child, fname) or 0) + qty)
            total_evening += qty

    if hasattr(child, "total_morning_qty"):
        child.total_morning_qty = total_morning
    if hasattr(child, "total_evening_qty"):
        child.total_evening_qty = total_evening

    total_qty = total_morning + total_evening
    if hasattr(child, "total_qty"):
        child.total_qty = total_qty

    rate = float(getattr(child, "rate", 0) or 0)
    total_week_amount = rate * total_qty
    if hasattr(child, "total_week_amount"):
        child.total_week_amount = total_week_amount


def _fetch_supplier_loans_map(suppliers: List[str], to_date: str) -> Dict[str, float]:
    """
    supplier -> sum(pending_amount) for Supplier Loan Table where:
      - slt.paied = 0
      - slt.docstatus = 1 (submitted)
      - sl.docstatus = 1
      - slt.date <= to_date
      - sl.supplier in suppliers
    """
    suppliers = [s for s in (suppliers or []) if s]
    if not suppliers:
        return {}

    in_clause = ", ".join(["%s"] * len(suppliers))
    sql = f"""
        SELECT sl.supplier AS supplier, SUM(slt.pending_amount) AS pending_sum
        FROM `tabSupplier Loan Table` slt
        JOIN `tabSupplier Loan` sl ON slt.parent = sl.name
        WHERE slt.paied = 0
          AND slt.docstatus = 1
          AND sl.docstatus = 1
          AND slt.date <= %s
          AND sl.supplier IN ({in_clause})
        GROUP BY sl.supplier
    """
    params = [to_date] + suppliers
    rows = frappe.db.sql(sql, params, as_dict=True) or []

    result: Dict[str, float] = {}
    for r in rows:
        sup = r.get("supplier")
        if sup:
            result[sup] = float(r.get("pending_sum") or 0)
    return result


def _fetch_supplier_deductions_map(
    suppliers: List[str],
    start_date: str,
    to_date: str,
) -> Dict[Tuple[str, str], dict]:
    """
    (supplier, milk_flag["cow"|"buffalo"]) -> aggregated Supplier Deduction within date range:
      - percent_sum: sum of percent
      - amount_sum: sum of amount
    Only submitted (docstatus = 1). Milk flag applied per row.
    """
    suppliers = [s for s in (suppliers or []) if s]
    if not suppliers:
        return {}

    in_clause = ", ".join(["%s"] * len(suppliers))
    sql = f"""
        SELECT supplier,
               SUM(CASE WHEN COALESCE(cow,0) = 1 THEN COALESCE(percent,0) ELSE 0 END) AS percent_cow,
               SUM(CASE WHEN COALESCE(cow,0) = 1 THEN COALESCE(amount,0)  ELSE 0 END) AS amount_cow,
               SUM(CASE WHEN COALESCE(buffalo,0) = 1 THEN COALESCE(percent,0) ELSE 0 END) AS percent_buffalo,
               SUM(CASE WHEN COALESCE(buffalo,0) = 1 THEN COALESCE(amount,0)  ELSE 0 END) AS amount_buffalo
        FROM `tabSupplier Deduction`
        WHERE docstatus = 1
          AND supplier IN ({in_clause})
          AND date >= %s AND date <= %s
          AND (COALESCE(cow,0) = 1 OR COALESCE(buffalo,0) = 1)
        GROUP BY supplier
    """
    params = suppliers + [start_date, to_date]
    rows = frappe.db.sql(sql, params, as_dict=True) or []

    out: Dict[Tuple[str, str], dict] = {}
    for r in rows:
        sup = r.get("supplier")
        if not sup:
            continue
        pc = float(r.get("percent_cow") or 0)
        ac = float(r.get("amount_cow") or 0)
        if pc > 0 or ac > 0:
            out[(sup, "cow")] = {"percent_sum": pc, "amount_sum": ac}
        pb = float(r.get("percent_buffalo") or 0)
        ab = float(r.get("amount_buffalo") or 0)
        if pb > 0 or ab > 0:
            out[(sup, "buffalo")] = {"percent_sum": pb, "amount_sum": ab}
    return out


def _apply_money_logic(child):
    """
    After total_week_amount, deduction fields, and supplier_loan are set:
      - total_deduction_amount = supplier_loan + deduction_amount
      - total_amount = max(0, total_week_amount - total_deduction_amount)
      - less_5 = total_amount % 5
      - total_amount_to_pay = total_amount - less_5
    """
    total_week_amount = float(getattr(child, "total_week_amount", 0) or 0)
    supplier_loan = float(getattr(child, "supplier_loan", 0) or 0)
    deduction_amount = float(getattr(child, "deduction_amount", 0) or 0)

    # guard against negative/NaN
    if deduction_amount < 0:
        deduction_amount = 0.0

    total_deduction_amount = supplier_loan + deduction_amount
    if hasattr(child, "total_deduction_amount"):
        child.total_deduction_amount = total_deduction_amount

    total_amount = total_week_amount - total_deduction_amount
    if total_amount < 0:
        total_amount = 0.0
    # fix tiny float residuals (e.g., 4.999999999 -> 5.00 logic below)
    total_amount = round(total_amount + 1e-9, 6)

    if hasattr(child, "total_amount"):
        child.total_amount = total_amount

    less_5_val = total_amount % 5
    less_5_val = round(less_5_val, 2)
    if hasattr(child, "less_5"):
        child.less_5 = less_5_val

    if hasattr(child, "total_amount_to_pay"):
        child.total_amount_to_pay = round(total_amount - less_5_val, 2)


def _recompute_parent_totals(doc: "WeeklySupplierPayment"):
    t_week_amount = 0.0
    t_deduction_sum = 0.0

    t_morning = 0.0
    t_evening = 0.0
    t_week_qty = 0.0
    t_amount = 0.0
    t_less5 = 0.0
    t_loans = 0.0
    t_to_pay = 0.0

    for row in (doc.weekly_pay_table or []):
        t_week_amount += float(getattr(row, "total_week_amount", 0) or 0)
        t_deduction_sum += float(getattr(row, "total_deduction_amount", 0) or 0)

        t_morning += float(getattr(row, "total_morning_qty", 0) or 0)
        t_evening += float(getattr(row, "total_evening_qty", 0) or 0)
        t_week_qty += float(getattr(row, "total_qty", 0) or 0)
        t_amount += float(getattr(row, "total_amount", 0) or 0)
        t_less5 += float(getattr(row, "less_5", 0) or 0)
        t_loans += float(getattr(row, "supplier_loan", 0) or 0)
        t_to_pay += float(getattr(row, "total_amount_to_pay", 0) or 0)

    if hasattr(doc, "total_week_amount"):
        doc.total_week_amount = t_week_amount
    if hasattr(doc, "total_deduction_amount"):
        doc.total_deduction_amount = t_deduction_sum

    if hasattr(doc, "total_qty_morning"):
        doc.total_qty_morning = t_morning
    if hasattr(doc, "total_qty_evening"):
        doc.total_qty_evening = t_evening
    if hasattr(doc, "total_week_qty"):
        doc.total_week_qty = t_week_qty

    if hasattr(doc, "total_amount"):
        doc.total_amount = t_amount
    if hasattr(doc, "total_less_5"):
        doc.total_less_5 = t_less5
    if hasattr(doc, "total_loans"):
        doc.total_loans = t_loans
    if hasattr(doc, "total_payment"):
        doc.total_payment = t_to_pay


@frappe.whitelist()
def refresh_week_one_method(
    docname: str,
    driver: Optional[str] = None,
    village: Optional[str] = None,
    start_date: Optional[str] = None,
    to_date: Optional[str] = None,
):
    """
    Rebuild rows, fill quantities, apply Supplier Deductions (summed percent + amount),
    allocate Supplier Loans once per supplier across that supplier's rows,
    compute amounts, and aggregate parent totals.
    """
    if not docname:
        frappe.throw("docname is required")

    doc = frappe.get_doc("Weekly Supplier Payment", docname)

    if driver is not None:
        doc.driver = driver
    if village is not None:
        doc.village = village
    if start_date is not None:
        doc.start_date = start_date
    if to_date is not None:
        doc.to_date = to_date

    _validate_parent(doc)

    eff_driver = (doc.driver or "").strip()
    eff_village = (doc.village or "").strip() or None
    sdate = doc.start_date
    tdate = doc.to_date

    # 1) Clear child table
    doc.set("weekly_pay_table", [])

    # 2) Build rows from suppliers (cow/buffalo as separate rows if enabled)
    suppliers = _get_suppliers(driver=eff_driver, village=eff_village)

    for s in suppliers:
        sup_name = s.get("name")
        sup_display = s.get("supplier_name") or sup_name
        custom_sort_val = int(s.get("custom_sort") or 0)
        village_link = s.get("custom_villages") or ""
        has_cow = 1 if int(s.get("custom_cow") or 0) == 1 else 0
        has_buff = 1 if int(s.get("custom_buffalo") or 0) == 1 else 0
        if has_cow == 0 and has_buff == 0:
            continue

        if has_cow:
            child = doc.append("weekly_pay_table", {})
            _safe_set(child, "supplier", sup_name)
            _safe_set(child, "supplier_name", sup_display)
            _safe_set(child, "custom_sort", custom_sort_val)
            _safe_set(child, "village", village_link)
            _safe_set(child, "milk_type", COW_LABEL)
            _safe_set(child, "rate", s.get("custom_cow_price"))
            _safe_set(child, "custom_cow", 1)
            _safe_set(child, "custom_buffalo", 0)
            _reset_day_fields(child)
            for f in ("total_qty","total_amount","total_morning_qty","total_evening_qty","total_week_amount",
                      "supplier_loan","less_5","deduction_percent","deduction_amount","total_deduction_amount",
                      "total_amount_to_pay"):
                if hasattr(child, f):
                    setattr(child, f, 0)

        if has_buff:
            child = doc.append("weekly_pay_table", {})
            _safe_set(child, "supplier", sup_name)
            _safe_set(child, "supplier_name", sup_display)
            _safe_set(child, "custom_sort", custom_sort_val)
            _safe_set(child, "village", village_link)
            _safe_set(child, "milk_type", BUFFALO_LABEL)
            _safe_set(child, "rate", s.get("custom_buffalo_price"))
            _safe_set(child, "custom_cow", 0)
            _safe_set(child, "custom_buffalo", 1)
            _reset_day_fields(child)
            for f in ("total_qty","total_amount","total_morning_qty","total_evening_qty","total_week_amount",
                      "supplier_loan","less_5","deduction_percent","deduction_amount","total_deduction_amount",
                      "total_amount_to_pay"):
                if hasattr(child, f):
                    setattr(child, f, 0)

    # 3) Fill quantities per row from Milk Entries Log
    for child in (doc.weekly_pay_table or []):
        supplier = getattr(child, "supplier", None)
        milk_type_label = getattr(child, "milk_type", None)
        if not supplier or not milk_type_label:
            continue
        entries = _fetch_milk_entries(
            supplier=supplier,
            milk_type_label=milk_type_label,
            start_date=sdate,
            to_date=tdate,
            driver=eff_driver,
            village=eff_village,
        )
        _fill_row_from_entries(child, entries or [])

    # 4) Apply Supplier Deductions (aggregate sums within range by milk type)
    supplier_names = list({row.supplier for row in (doc.weekly_pay_table or []) if getattr(row, "supplier", None)})
    ded_map = _fetch_supplier_deductions_map(supplier_names, sdate, tdate)

    for child in (doc.weekly_pay_table or []):
        sup = getattr(child, "supplier", None)
        milk_flag = "cow" if int(getattr(child, "custom_cow", 0) or 0) == 1 else ("buffalo" if int(getattr(child, "custom_buffalo", 0) or 0) == 1 else None)
        if not sup or not milk_flag:
            continue

        agg = ded_map.get((sup, milk_flag), {"percent_sum": 0.0, "amount_sum": 0.0})
        percent_sum = float(agg.get("percent_sum") or 0)
        amount_sum = float(agg.get("amount_sum") or 0)
        if percent_sum < 0:
            percent_sum = 0.0  # clamp

        total_week_amount = float(getattr(child, "total_week_amount", 0) or 0)

        # Set summed percent
        if hasattr(child, "deduction_percent"):
            child.deduction_percent = percent_sum if percent_sum > 0 else 0.0

        # Combined deduction: amount from percent plus fixed amounts
        amount_from_percent = (total_week_amount * percent_sum / 100.0) if percent_sum > 0 else 0.0
        final_amount = amount_from_percent + (amount_sum if amount_sum > 0 else 0.0)
        if hasattr(child, "deduction_amount"):
            child.deduction_amount = final_amount

    # 5) Fetch Supplier Loan pending sums and allocate across rows per supplier
    loan_map = _fetch_supplier_loans_map(supplier_names, tdate)

    # Group rows by supplier, preserve current order
    rows_by_supplier: Dict[str, List] = {}
    for row in (doc.weekly_pay_table or []):
        rows_by_supplier.setdefault(row.supplier, []).append(row)

    for sup, rows in rows_by_supplier.items():
        remaining = float(loan_map.get(sup, 0) or 0)

        for row in rows:
            if remaining <= 0:
                if hasattr(row, "supplier_loan"):
                    row.supplier_loan = 0.0
                _apply_money_logic(row)
                continue

            # Cap loan allocation so the row doesn't go negative after deduction_amount
            total_week_amount = float(getattr(row, "total_week_amount", 0) or 0)
            deduction_amount = float(getattr(row, "deduction_amount", 0) or 0)
            cap = total_week_amount - deduction_amount
            if cap < 0:
                cap = 0.0

            alloc = min(remaining, cap)
            if hasattr(row, "supplier_loan"):
                row.supplier_loan = alloc

            remaining -= alloc
            _apply_money_logic(row)

        # any remaining is not applied this week

    # 6) Parent totals and save
    _recompute_parent_totals(doc)
    doc.save(ignore_permissions=True)

    return {
        "status": "success",
        "rows": len(doc.weekly_pay_table or []),
        "message": "Rows filled; deductions applied; supplier loans allocated; amounts computed; totals updated.",
        "name": doc.name,
        "effective_filters": {
          "driver": eff_driver,
          "village": eff_village,
          "start_date": sdate,
          "to_date": tdate,
        },
    }


@frappe.whitelist()
def print_weekly_payment_inline_pdf(name: str):
    """
    Generate PDF for Weekly Supplier Payment using inline HTML (no Print Format).

    Features:
    - Full utilization of A4 page width.
    - Professional styling for headers, tables, and cards.
    - Totals row with calculations for each supplier.
    - Cutting guide with clear layout.
    - Arabic support for numbers and text alignment (RTL).

    Endpoint:
      milk.milk.doctype.weekly_supplier_payment.weekly_supplier_payment.print_weekly_payment_inline_pdf
    """
    from frappe.utils.pdf import get_pdf

    doctype = "Weekly Supplier Payment"
    doc = frappe.get_doc(doctype, name)
    doc.check_permission("read")

    rows = list(doc.get("weekly_pay_table") or [])

    def _norm_village(v):
        v = (v or "").strip()
        return v if v else "غير محدد"

    def _sort_key(r):
        cs = int(getattr(r, "custom_sort", 0) or 0)
        zero_tag = 1 if cs == 0 else 0  # 0 goes last
        v = _norm_village(getattr(r, "village", None))
        sname = (getattr(r, "supplier_name", None) or getattr(r, "supplier", None) or "").lower()
        return (zero_tag, cs if cs != 0 else 10**9, v, sname)

    rows.sort(key=_sort_key)

    ctx = {
        "frappe": frappe,
        "_": frappe._,
        "doc": doc,
        "rows": rows,
    }

    html = """
    {% set BRAND = "ألبان العمري" %}

    {% macro fmt(n) -%}{{ ("%.2f"|format((n or 0) | float)) }}{%- endmacro %}
    {% macro fmt90(n) -%}{{ ("%.2f"|format(((n or 0) | float) * 90.0)) }}{%- endmacro %}

    {% macro to_ar_digits(s) -%}
      {%- set map = {"0":"٠","1":"١","2":"٢","3":"٣","4":"٤","5":"٥","6":"٦","7":"٧","8":"٨","9":"٩"} -%}
      {%- set t = (s|string) -%}
      {%- for k,v in map.items() %}{%- set t = t.replace(k, v) -%}{%- endfor -%}
      {{- t -}}
    {%- endmacro %}

    {% set AR_DIGITS_IN_TABLE = True %}

    <meta charset="utf-8">
<style>
  @page {
    size: A4;
    margin: 5mm; /* Reduced page margins */
  }
  body {
    direction: rtl;
    text-align: right;
    font-family: "Arial", sans-serif;
    font-size: 14px;
    color: #000;
    margin: 0;
    background-color: #fff;
  }

  .card {
    border: 1px solid #000; /* Thinner card border */
    border-radius: 4px; /* Less border rounding */
    margin-bottom: 10px; /* Reduced spacing between cards */
    padding: 8px 12px; /* Reduced padding inside the card */
    page-break-inside: avoid;
    background-color: #f9f9f9;
  }

  .hdr-band {
    font-size: 14px; /* Slightly smaller header font */
    font-weight: bold;
    margin-bottom: 6px; /* Reduced space below the header */
    padding: 6px 8px; /* Reduced padding inside header */
    border: 1px solid #000; /* Thinner border for header */
    background-color: #f1f1f1;
    text-align: center;
  }

  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px; /* Reduced space above table */
    font-size: 12px; /* Slightly smaller font for the table */
  }

  .info-table th,
  .info-table td {
    border: 1px solid #000; /* Thinner table borders */
    padding: 4px; /* Reduced cell padding */
    text-align: center;
    vertical-align: middle;
  }

  .info-table th {
    background-color: #e9e9e9;
    font-weight: bold;
  }

  .totals-line {
    font-size: 12px; /* Slightly smaller font for totals */
    font-weight: bold;
    margin-top: 6px; /* Reduced space above totals */
    text-align: right;
    line-height: 1.4; /* Reduced line spacing */
  }

  .totals-line .sep {
    margin: 0 6px; /* Reduced space between separators */
    color: #000;
  }

  .cut-row {
    position: relative;
    margin-top: 6px; /* Reduced spacing above cut line */
    border-top: 1px dashed #000;
  }

  .cut-row::before {
    content: "✂";
    position: absolute;
    top: -8px; /* Adjusted cut icon position */
    right: 0;
    background: #fff;
    padding: 0 4px;
    font-size: 10px; /* Smaller cut icon font size */
  }

  .contacts-sp {
    height: 4px; /* Reduced spacing for contact information */
  }

  .foot {
    text-align: center;
    margin-top: 6px; /* Reduced footer spacing */
    font-weight: bold;
    font-size: 11px; /* Slightly smaller footer font */
    color: #000;
  }

  .spacer {
    border-top: 1px dotted #000;
    margin: 8px 0; /* Reduced spacing for spacers */
  }

  .sup-hdr {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    font-size: 12px; /* Slightly smaller font for supplier headers */
    font-weight: bold;
    background-color: #f9f9f9;
    padding: 6px; /* Reduced padding */
    border: 1px solid #000; /* Thinner border */
    border-radius: 4px; /* Less border rounding */
    margin-bottom: 6px; /* Reduced spacing below header */
  }

  .sup-hdr span {
    margin: 0 4px; /* Reduced spacing between text */
    white-space: nowrap;
  }

  .sup-hdr .brand-name {
    color: #2c3e50;
    font-size: 13px; /* Slightly smaller brand name font */
    font-weight: 900;
  }

  .sup-hdr .supplier-name {
    color: #34495e;
    font-weight: 700;
  }

  .sup-hdr .village {
    color: #7f8c8d;
    font-weight: 600;
  }

  .sup-hdr .rate {
    color: #16a085;
    font-weight: 700;
  }

  .sup-hdr .sort {
    color: #c0392b;
    font-weight: 700;
  }

  .sep-pipe {
    color: #7f8c8d;
    padding: 0 4px; /* Reduced spacing for separators */
  }
</style>
    <div>
      <!-- First Card: Document Totals -->
      <div class="card">
        <div class="hdr-band">
          {{ _(BRAND) }} -- كشف أسبوعي - {{ frappe.utils.escape_html(doc.driver or "-") }} - 
          {{ to_ar_digits(frappe.utils.formatdate(doc.start_date, "dd/MM/yyyy")) }} إلى {{ to_ar_digits(frappe.utils.formatdate(doc.to_date, "dd/MM/yyyy")) }}
        </div>
        {% set total_week_amount = (doc.total_week_amount or 0) | float %}
        {% set total_deduction_amount = (doc.total_deduction_amount or 0) | float %}
        {% set total_loans = (doc.total_loans or 0) | float %}
        {% set total_amount = (doc.total_amount or 0) | float %}
        {% set total_less_5 = (doc.total_less_5 or 0) | float %}
        {% set total_payment = (doc.total_payment or 0) | float %}

        {% set deductions_net = (total_deduction_amount - total_loans) %}

        <div class="totals-line">
          <span>إجمالي الأسبوع: <strong>{{ "{:,.2f}".format(total_week_amount) }}</strong></span>
          <span class="sep">--</span>
          <span>إجمالي الخصومات: <strong>{{ "{:,.2f}".format(-deductions_net) }}</strong></span>
          <span class="sep">--</span>
          <span>إجمالي المسحوبات: <strong>{{ "{:,.2f}".format(-total_loans) }}</strong></span>
          <span class="sep">--</span>
          <span>الصافي قبل التقريب: <strong>{{ "{:,.2f}".format(total_amount) }}</strong></span>
          <span class="sep">--</span>
          <span>اجمالي التقريب: <strong>{{ "{:,.2f}".format(total_less_5) }}</strong></span>
          <span class="sep">--</span>
          <span>المبلغ للدفع: <strong>{{ "{:,.2f}".format(total_payment) }}</strong></span>
        </div>
      </div>
      <div class="spacer"></div>

      <!-- Supplier Cards -->
      {% for r in rows %}
      <div class="card">
        <!-- Supplier Header -->
        <div class="sup-hdr">
        <span class="brand-name">{{ _(BRAND) }}</span>
        <span class="sep-pipe">--</span>
        <span class="supplier-name">{{ frappe.utils.escape_html(r.supplier_name or r.supplier or "-") }}</span>
        <span class="sep-pipe">--</span>
        <span class="village">( {{ frappe.utils.escape_html(r.village or "غير محدد") }} )</span>
        <span class="sep-pipe">--</span>
        {% if r.rate %}
          <span class="rate">{{ to_ar_digits(fmt90(r.rate)) }}</span>
        {% endif %}
        {% if r.milk_type %}
           <span class="village">( {{ frappe.utils.escape_html(r.milk_type or "غير محدد") }} )</span>
          <span class="sep-pipe">--</span>
        {% endif %}
        <span class="sort">(<strong>{{ to_ar_digits(r.custom_sort or 0) }}</strong>)</span>
      </div>

        <!-- Milk Data Table -->
        <table class="info-table">
          <thead>
            <tr>
              <th>اليوم</th>
              <th>الأحد</th>
              <th>الاثنين</th>
              <th>الثلاثاء</th>
              <th>الأربعاء</th>
              <th>الخميس</th>
              <th>الجمعة</th>
              <th>السبت</th>
              <th>الاجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>الصباح</strong></td>
              {% for day in ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] %}
                <td>{{ fmt(r[day + "_morning"] or 0) }}</td>
              {% endfor %}
              <td><strong><strong>{{ to_ar_digits(fmt(r.total_morning_qty or 0)) }}</strong></strong></td>
            </tr>
            <tr>
              <td><strong>المساء</strong></td>
              {% for day in ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] %}
                <td>{{ fmt(r[day + "_evening"] or 0) }}</td>
              {% endfor %}
              <td><strong><strong>{{ to_ar_digits(fmt(r.total_evening_qty or 0)) }}</strong></strong></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>الإجمالي</td>
              <td colspan="7" class="totals-line">
                {% if AR_DIGITS_IN_TABLE %}
                  قيمة الأسبوع: <strong>{{ to_ar_digits(fmt(r.total_week_amount or 0)) }}</strong>
                {% else %}
                  صباح: <strong>{{ fmt(r.total_morning_qty or 0) }}</strong>
                  <span class="sep">--</span>
                  مساء: <strong>{{ fmt(r.total_evening_qty or 0) }}</strong>
                  <span class="sep">--</span>
                  الإجمالي: <strong>{{ fmt(r.total_qty or 0) }}</strong>
                  <span class="sep">--</span>
                  قيمة الأسبوع: <strong>{{ fmt(r.total_week_amount or 0) }}</strong>
                {% endif %}

                {% if r.deduction_amount and r.deduction_amount > 0 %}
                  <span class="sep">--</span>
                  خصم جوده: <strong>{{ fmt(r.deduction_amount) }}</strong>
                {% endif %}
                {% if r.supplier_loan and r.supplier_loan > 0 %}
                  <span class="sep">--</span>
                  مسحوب: <strong>{{ fmt(r.supplier_loan) }}</strong>
                {% endif %}
                
                {% if r.total_amount and r.total_amount != r.total_amount_to_pay %}
                  <span class="sep">--</span>
                  احمالي بعد الخصم: <strong>{{ fmt(r.total_amount) }}</strong>
                {% endif %}
                {% if r.less_5 and r.less_5 > 0 %}
                  <span class="sep">--</span>
                  أقل من 5: <strong>{{ fmt(r.less_5) }}</strong>
                {% endif %}
                
                <span class="sep">--</span>
                الصافي: <strong>{{ fmt(r.total_amount_to_pay) }}</strong>
              </td>
              <td>
              <strong>{{ to_ar_digits(fmt(r.total_qty or 0)) }}</strong>
              </td>
              
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div class="foot">
          الحسابات: ٠١٠١٨١١٥٤١٥١ — الحاج أحمد: ٠١١٢٦٩٥٤٧٠٠
        </div>
      </div>
      <div class="cut-row"></div>
      {% endfor %}
    </div>
    """

    rendered = frappe.render_template(html, ctx)
    pdf = get_pdf(rendered)

    filename = f"{doctype}-{name}.pdf"
    frappe.local.response.filename = filename
    frappe.local.response.filecontent = pdf
    frappe.local.response.type = "pdf"
    frappe.local.response.headers = {"Content-Disposition": f'inline; filename="{filename}"; filename*=UTF-8''{filename}'}