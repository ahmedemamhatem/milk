from datetime import datetime, timedelta
import frappe


def execute(filters=None):
    if not filters:
        filters = {}

    # Validate and parse the start date
    start_date = filters.get("date")
    if not start_date:
        frappe.throw("Please select a start date.")

    start_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_date = start_date + timedelta(days=6)

    # Build filters for the query
    query_filters = {
        "date": ["between", [start_date.date(), end_date.date()]],
    }
    if filters.get("supplier"):
        query_filters["supplier"] = filters["supplier"]
    if filters.get("driver"):
        query_filters["driver"] = filters["driver"]
    if filters.get("village"):
        query_filters["village"] = filters["village"]

    # Fetch data from the database
    records = frappe.get_all(
        "Milk Entries Log",
        filters=query_filters,
        fields=["supplier", "village", "driver", "milk_type", "quantity", "date"]
    )

    # Process the data to group by driver and village
    grouped_data = {}
    for record in records:
        driver = record.get("driver") or "No Driver"
        village = record.get("village") or "No Village"
        supplier = record.get("supplier")
        quantity = record.get("quantity") or 0

        # Fetch rates for the supplier
        supplier_doc = frappe.get_doc("Supplier", supplier)
        rate = supplier_doc.custom_cow_price if record.get("milk_type") == "Cow" else supplier_doc.custom_buffalo_price
        amount = quantity * rate

        # Initialize driver group
        if driver not in grouped_data:
            grouped_data[driver] = {}

        # Initialize village group under driver
        if village not in grouped_data[driver]:
            grouped_data[driver][village] = {
                "suppliers": [],
                "total_quantity": 0,
                "total_amount": 0
            }

        # Add supplier data to the village group
        grouped_data[driver][village]["suppliers"].append({
            "supplier": supplier,
            "quantity": quantity,
            "amount": amount
        })

        # Update totals for village
        grouped_data[driver][village]["total_quantity"] += quantity
        grouped_data[driver][village]["total_amount"] += amount

    # Build the report columns
    columns = [
        {"label": "Driver", "fieldname": "driver", "fieldtype": "Data", "width": 150},
        {"label": "Village", "fieldname": "village", "fieldtype": "Data", "width": 150},
        {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Data", "width": 150},
        {"label": "Total Quantity", "fieldname": "quantity", "fieldtype": "Float", "width": 120},
        {"label": "Total Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 120},
    ]

    # Build the report data
    data = []
    for driver, villages in grouped_data.items():
        for village, village_data in villages.items():
            # Append suppliers first
            for supplier_data in village_data["suppliers"]:
                data.append({
                    "driver": driver,
                    "village": village,
                    "supplier": supplier_data["supplier"],
                    "quantity": supplier_data["quantity"],
                    "amount": supplier_data["amount"]
                })

            # Append village totals
            data.append({
                "driver": "",
                "village": f"{village} (Total)",
                "supplier": "",
                "quantity": village_data["total_quantity"],
                "amount": village_data["total_amount"]
            })

        # Append driver totals
        driver_total_qty = sum(v["total_quantity"] for v in villages.values())
        driver_total_amount = sum(v["total_amount"] for v in villages.values())

        data.append({
            "driver": f"{driver} (Total)",
            "village": "",
            "supplier": "",
            "quantity": driver_total_qty,
            "amount": driver_total_amount
        })

    return columns, data