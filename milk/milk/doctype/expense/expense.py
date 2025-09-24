# Copyright (c) 2025, ahmed emam and contributors
# For license information, please see license.txt

# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate


class Expense(Document):
    def on_submit(self):
        create_journal_entry_on_submit(self)

    def on_cancel(self):
        cancel_linked_journal_entry(self)


def create_journal_entry_on_submit(doc, method=None):
    """
    Create Journal Entry for this Expense, referencing it via JE.custom_expense.
    - Debit: Expense account (doc.account)
    - Credit: Mode of Payment account (from MoP for the company)
    """
    # Prevent duplicates
    existing_je = frappe.db.get_value(
        "Journal Entry",
        {"custom_expense": doc.name},
        "name",
    )
    if existing_je:
        frappe.throw(f"Journal Entry {existing_je} already exists for this Expense.")

    amount = float(doc.amount or 0)
    if amount <= 0:
        frappe.throw("Amount must be greater than zero to create a Journal Entry.")

    company = get_company_from_accounts(doc)
    mop_account = get_mode_of_payment_account(doc.mode_of_payment, company)
    expense_account = doc.account

    if not mop_account:
        frappe.throw(f"Could not resolve account for Mode of Payment: {doc.mode_of_payment}")
    if not expense_account:
        frappe.throw("Expense account is required.")

    je = frappe.new_doc("Journal Entry")
    je.voucher_type = "Journal Entry"
    je.posting_date = doc.posting_date or nowdate()
    je.company = company
    je.custom_expense = doc.name
    je.user_remark = f"Auto-created from Expense {doc.name} - {doc.remarks or ''}"


    # GL rows
    je.append(
        "accounts",
        {
            "account": expense_account,
            "debit_in_account_currency": amount,
            "credit_in_account_currency": 0,
        },
    )
    je.append(
        "accounts",
        {
            "account": mop_account,
            "debit_in_account_currency": 0,
            "credit_in_account_currency": amount,
        },
    )

    je.insert()
    je.submit()

    doc.db_set("journal_entry", je.name, update_modified=False)


def cancel_linked_journal_entry(doc, method=None):
    """
    On cancel of Expense, cancel the linked Journal Entry that references it via custom_expense.
    """
    je_name = frappe.db.get_value(
        "Journal Entry",
        {"custom_expense": doc.name},
        "name",
    )
    if not je_name:
        return

    je = frappe.get_doc("Journal Entry", je_name)
    if je.docstatus == 1:
        je.cancel()


def get_company_from_accounts(doc):
    """
    Determine company from the selected expense account; fall back to Default Company.
    """
    if doc.account:
        acc_company = frappe.db.get_value("Account", doc.account, "company")
        if acc_company:
            return acc_company

    company = frappe.db.get_single_value("Global Defaults", "default_company")
    if not company:
        frappe.throw(
            "Could not determine Company. Ensure the Expense account has a company "
            "or set a Default Company in Global Defaults."
        )
    return company


def get_mode_of_payment_account(mode_of_payment, company):
    """
    Resolve the GL account linked to the Mode of Payment for the given company.
    """
    if not mode_of_payment or not company:
        return None

    mop_account = frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": mode_of_payment, "company": company},
        "default_account",
    )
    return mop_account