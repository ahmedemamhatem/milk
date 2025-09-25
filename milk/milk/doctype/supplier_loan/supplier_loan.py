import frappe
from frappe.model.document import Document
from datetime import datetime, timedelta

class SupplierLoan(Document):
    def validate(self):
        # Validate fields and build schedule before saving
        self._validate_core_fields()
        self._build_schedule()

    def on_submit(self):
        # Create Journal Entry on submit and link back
        je_name = self._create_journal_entry_on_submit()
        # Store JE name on the loan doc
        self.db_set("journal_entry", je_name, update_modified=False)
        frappe.msgprint(f"تم إنشاء قيد اليومية رقم: {je_name}")

    def on_cancel(self):
        # Cancel linked Journal Entry if exists
        je_name = getattr(self, "journal_entry", None)
        if not je_name:
            return

        if not frappe.db.exists("Journal Entry", je_name):
            return

        je = frappe.get_doc("Journal Entry", je_name)

        # If JE is submitted, cancel it
        if je.docstatus == 1:
            try:
                je.cancel()
                frappe.msgprint(f"تم إلغاء قيد اليومية المرتبط: {je.name}")
            except Exception as e:
                frappe.throw(f"تعذر إلغاء قيد اليومية المرتبط: {je.name}. السبب: {frappe.get_traceback()}")
        # If already canceled, nothing to do
        # If in draft, delete it to keep things clean (optional)
        elif je.docstatus == 0:
            je.delete()

    def _create_journal_entry_on_submit(self):
        # Fetch Milk Setting (holds supplier loan account and optional company)
        settings = get_milk_settings()
        if not settings:
            frappe.throw("إعدادات Milk Setting غير متاحة.")

        # Resolve company: prefer document company, else Milk Setting company
        company = getattr(self, "company", None) or settings.company
        if not company:
            frappe.throw("من فضلك حدّد الشركة على المستند أو في إعدادات Milk Setting.")

        # Validate amount
        amount = float(self.amount or 0)
        if amount <= 0:
            frappe.throw("المبلغ لازم يكون أكبر من صفر لإنشاء القيد.")

        # Get Supplier Loan Account from Milk Setting
        loan_account = settings.supplier_loan_account
        if not loan_account:
            frappe.throw("من فضلك حدّد حساب قرض المورد في إعدادات Milk Setting.")

        # Get credit account from Mode of Payment (defaults by company)
        mop = self.mode_of_payment
        if not mop:
            frappe.throw("من فضلك اختر وسيلة الدفع (Mode of Payment).")
        credit_account = get_account_from_mode_of_payment(mop, company)
        if not credit_account:
            frappe.throw(f"لا يوجد حساب مربوط بوسيلة الدفع '{mop}' للشركة '{company}'. من فضلك حدّده في Mode of Payment.")

        # Posting date preference: first_date > date > today
        posting_date = self.first_date or self.date or frappe.utils.nowdate()

        # Create Journal Entry
        je = frappe.new_doc("Journal Entry")
        je.voucher_type = "Supplier Loan Payment"
        je.company = company
        je.posting_date = posting_date
        je.user_remark = f"قرض مورد رقم {self.name}"

        # Set custom link back to Supplier Loan (custom field on JE)
        je.custom_supplier_loan = self.name

        # Set party info from document supplier
        party_type = "Supplier"
        party = getattr(self, "supplier", None)

        # Debit row: Supplier Loan Account (attach supplier party if available)
        debit_row = {
            "account": loan_account,
            "debit_in_account_currency": amount,
            "credit_in_account_currency": 0
        }
        if party:
            debit_row.update({
                "party_type": party_type,
                "party": party,
            })
        je.append("accounts", debit_row)

        # Credit row: Mode of Payment account
        credit_row = {
            "account": credit_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": amount
        }
        je.append("accounts", credit_row)

        # Save and submit the Journal Entry
        je.flags.ignore_permissions = True
        je.insert()
        je.submit()

        return je.name

    def _validate_core_fields(self):
        # Required fields
        if not self.first_date:
            frappe.throw("من فضلك اختر أول تاريخ للسداد.")
        if not self.loan_type:
            frappe.throw("من فضلك اختر نوع القرض.")
        if not self.amount or self.amount <= 0:
            frappe.throw("المبلغ الكلي لازم يكون أكبر من صفر.")

        # Normalize logic based on loan_type
        lt = (self.loan_type or "").strip().lower()

        if lt == "one time":
            # For one-time loans: weekly_amount = amount, no_of_weeks = 1
            self.weekly_amount = int(self.amount) if float(self.amount).is_integer() else self.amount
            self.no_of_weeks = 1

        elif lt == "weekly":
            # Validate presence of weekly_amount or no_of_weeks
            has_weekly = bool(self.weekly_amount) and float(self.weekly_amount) > 0
            has_weeks = bool(self.no_of_weeks) and int(self.no_of_weeks) > 0

            if not (has_weekly or has_weeks):
                frappe.throw("يجب إدخال مبلغ الأسبوع أو عدد الأسابيع.")

            # Derive missing value ensuring exact divisibility
            if has_weeks and not has_weekly:
                if float(self.amount) % int(self.no_of_weeks) != 0:
                    frappe.throw("المبلغ غير قابل للقسمة بالتساوي على عدد الأسابيع. عدّل المبلغ أو عدد الأسابيع.")
                self.weekly_amount = int(float(self.amount) / int(self.no_of_weeks))

            if has_weekly and not has_weeks:
                if float(self.amount) % int(self.weekly_amount) != 0:
                    frappe.throw("المبلغ ليس مضاعفًا لمبلغ الأسبوع. عدّل المبلغ أو مبلغ الأسبوع.")
                self.no_of_weeks = int(float(self.amount) / int(self.weekly_amount))

            # Enforce integer weekly_amount and positive weeks
            if not float(self.weekly_amount).is_integer():
                frappe.throw("مبلغ الأسبوع يجب أن يكون عددًا صحيحًا.")
            if int(self.no_of_weeks) <= 0:
                frappe.throw("عدد الأسابيع يجب أن يكون عددًا صحيحًا موجبًا.")

            # Ensure total matches
            if float(self.weekly_amount) * int(self.no_of_weeks) != float(self.amount):
                frappe.throw("حاصل ضرب مبلغ الأسبوع × عدد الأسابيع يجب أن يساوي المبلغ الكلي.")

            # Normalize to int
            self.weekly_amount = int(self.weekly_amount)
            self.no_of_weeks = int(self.no_of_weeks)

    def _build_schedule(self):
        # Clear existing schedule and build anew based on loan_type
        self.set("supplier_loan_table", [])
        start_date = _to_date(self.first_date)

        if (self.loan_type or "").strip().lower() == "one time":
            # Single installment on first_date
            self.append("supplier_loan_table", {
                "date": start_date,
                "amount": float(self.amount)
            })
            return

        if (self.loan_type or "").strip().lower() == "weekly":
            # Weekly installments for no_of_weeks starting at first_date
            weeks = int(self.no_of_weeks or 0)
            weekly_amt = int(self.weekly_amount or 0)
            if weeks <= 0 or weekly_amt <= 0:
                frappe.throw("عدد الأسابيع ومبلغ الأسبوع يجب أن يكونا أكبر من صفر.")
            for i in range(weeks):
                d = start_date + timedelta(days=7 * i)
                self.append("supplier_loan_table", {
                    "date": d,
                    "amount": weekly_amt
                })

def _to_date(d):
    # Convert to date if value is datetime or string
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, str):
        return datetime.strptime(d, "%Y-%m-%d").date()
    return d

def get_milk_settings():
    # Fetch Milk Setting single doctype
    try:
        return frappe.get_single("Milk Setting")
    except Exception:
        return None

def get_account_from_mode_of_payment(mode_of_payment, company):
    # Get default account for a Mode of Payment for the given company
    mop = frappe.get_doc("Mode of Payment", mode_of_payment)
    # Standard ERPNext child table "accounts" with fields company and default_account
    for row in getattr(mop, "accounts", []) or []:
        if row.company == company and row.default_account:
            return row.default_account
    # Fallback: if any account defined, pick the first with default_account
    if getattr(mop, "accounts", None):
        for row in mop.accounts:
            if row.default_account:
                return row.default_account
    # Some setups have default_account directly on Mode of Payment
    if hasattr(mop, "default_account") and mop.default_account:
        return mop.default_account
    return None