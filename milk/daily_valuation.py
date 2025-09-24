import frappe
from frappe.utils import getdate, nowdate, add_days

def run_previous_month_milk_valuation(commit=True, use_stock_revaluation=True):
    """
    Compute valuation for the last 30 days (inclusive), ending today.
    - Aggregates Milk Entries Log by milk_type in [today-30, today].
    - valuation_rate = total_amount / total_qty per milk_type.
    - Ignores any milk_type where total_qty <= 0 (e.g., negative or zero).
    - Maps milk_type -> item_code using 'Milk Setting' (cow_item, buffalo_item).
    - Updates valuation via Stock Reconciliation (GL-accurate) or direct Bin update.

    Args:
        commit (bool): Commit DB changes at the end.
        use_stock_revaluation (bool): True to create Stock Reconciliation per warehouse; False to update tabBin directly.
    """
    to_date = str(getdate(nowdate()))
    from_date = str(add_days(to_date, -30))

    # Aggregate by milk_type within date range
    rows = frappe.db.sql(
        """
        SELECT
            milk_type,
            COALESCE(SUM(quantity), 0) AS total_qty,
            COALESCE(SUM(amount), 0)   AS total_amount
        FROM `tabMilk Entries Log`
        WHERE date BETWEEN %s AND %s
        GROUP BY milk_type
        HAVING COALESCE(SUM(quantity), 0) > 0
        AND COALESCE(SUM(amount), 0) > 0
        """,
        (from_date, to_date),
        as_dict=True,
    )

    if not rows:
        frappe.log_error(f"No Milk Entries Log rows between {from_date} and {to_date}", "Milk 30-Day Valuation")
        return

    # Fetch items and company from Single Doc "Milk Setting"
    settings = frappe.get_single("Milk Setting")
    cow_item = (settings.get("cow_item") or "").strip() or None
    buffalo_item = (settings.get("buffalo_item") or "").strip() or None
    company = (settings.get("company") or "").strip() or None

    if not company:
        frappe.throw("Milk Setting must have a company defined.")

    if not cow_item and not buffalo_item:
        frappe.throw("Milk Setting must have at least one of: cow_item, buffalo_item.")

    type_to_item = {
        "Cow": cow_item,
        "Buffalo": buffalo_item,
    }

    # Get the expense account for valuation from the company
    expenses_included_in_valuation = frappe.db.get_value(
        "Company", company, "expenses_included_in_valuation"
    )
    if not expenses_included_in_valuation:
        frappe.throw(f"Company '{company}' does not have 'Expenses Included In Valuation' defined.")

    updated = []
    for r in rows:
        milk_type = (r.milk_type or "").strip()
        total_qty = float(r.total_qty or 0)
        total_amount = float(r.total_amount or 0)

        # Ignore negative or zero total qty
        if total_qty <= 0:
            frappe.logger().info(
                f"Skipping {milk_type}: total_qty={total_qty} in range {from_date}..{to_date}"
            )
            continue

        valuation_rate = round(total_amount / total_qty, 6)
        item_code = type_to_item.get(milk_type)

        if not item_code:
            frappe.log_error(
                f"No mapped item for milk_type '{milk_type}'. Configure Milk Setting.",
                "Milk 30-Day Valuation"
            )
            continue

        posting_date = to_date  # use today as posting date

        try:
            if use_stock_revaluation:
                apply_valuation_via_stock_reconciliation(item_code, valuation_rate, posting_date, company, expenses_included_in_valuation)
            else:
                apply_valuation_direct_bin(item_code, valuation_rate)
            
            updated.append((milk_type, item_code, valuation_rate))
        except Exception as e:
            frappe.log_error(
                f"Failed to update valuation for {milk_type} (item: {item_code}): {str(e)}",
                "Milk Valuation Update Error"
            )

    if commit:
        frappe.db.commit()

    if updated:
        msg = "; ".join([f"{mt}: {it}@{vr}" for mt, it, vr in updated])
        frappe.logger().info(f"Milk 30-day valuation {from_date} -> {to_date}: {msg}")


def apply_valuation_direct_bin(item_code: str, valuation_rate: float):
    """
    Quick method (no GL impact): directly update tabBin.valuation_rate for all bins of the item.
    """
    try:
        frappe.db.sql(
            """
            UPDATE `tabBin`
            SET valuation_rate = %s
            WHERE item_code = %s
            """,
            (valuation_rate, item_code),
        )
        frappe.logger().info(f"Updated valuation rate for {item_code} to {valuation_rate} via direct bin update.")
    except Exception as e:
        frappe.log_error(
            f"Failed to directly update valuation rate for {item_code}: {str(e)}",
            "Direct Bin Update Error"
        )


def apply_valuation_via_stock_reconciliation(item_code: str, valuation_rate: float, posting_date: str, company: str, expenses_included_in_valuation: str):
    """
    Recommended: create Stock Reconciliation per warehouse for the item to set new valuation rate
    without changing quantity. Skips bins with qty <= 0 and valuation differences <= 1.
    """
    bins = frappe.db.sql(
        """
        SELECT warehouse, actual_qty, valuation_rate
        FROM `tabBin`
        WHERE item_code = %s
        """,
        (item_code,),
        as_dict=True,
    )
    if not bins:
        frappe.logger().warn(f"No bins found for item {item_code}; skipping revaluation.")
        return

    for b in bins:
        qty = float(b.actual_qty or 0)
        current_valuation_rate = float(b.valuation_rate or 0)

        # Ignore zero or negative bin quantities to avoid "Negative Quantity is not allowed"
        if qty <= 0:
            frappe.logger().info(f"Skipping bin for {item_code} in {b.warehouse} due to zero/negative quantity.")
            continue

        # Calculate the difference in valuation
        valuation_difference = abs(valuation_rate - current_valuation_rate)

        # Skip if the difference is less than or equal to 1
        if valuation_difference <= 1:
            frappe.logger().info(f"Skipping bin for {item_code} in {b.warehouse} due to insignificant valuation difference ({valuation_difference}).")
            continue

        try:
            sr = frappe.new_doc("Stock Reconciliation")
            sr.posting_date = posting_date
            sr.company = company
            sr.purpose = "Stock Reconciliation"
            sr.expense_account = expenses_included_in_valuation
            sr.append(
                "items",
                {
                    "item_code": item_code,
                    "warehouse": b.warehouse,
                    "qty": qty,
                    "valuation_rate": valuation_rate,
                },
            )
            sr.flags.ignore_permissions = True
            sr.insert()
            sr.submit()

            frappe.logger().info(f"Stock Reconciliation submitted for {item_code} in {b.warehouse} at rate {valuation_rate}. Difference: {valuation_difference}.")
        except Exception as e:
            frappe.log_error(
                f"Failed to create Stock Reconciliation for {item_code} in {b.warehouse}: {str(e)}",
                "Stock Reconciliation Error"
            )