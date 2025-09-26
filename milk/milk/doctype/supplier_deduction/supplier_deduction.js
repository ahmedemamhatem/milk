// Copyright (c) 2025, ahmed emam and contributors
// For license information, please see license.txt

frappe.ui.form.on("Supplier Deduction", {
    setup(frm) {
        // filter supplier: active + custom_milk_supplier
        frm.set_query("supplier", () => {
            return {
                filters: {
                    disabled: 0,
                    custom_milk_supplier: 1
                }
            };
        });
    },

    // auto-clear opposite fields
    cow(frm) {
        if (frm.doc.cow > 0) {
            frm.set_value("buffalo", 0);
        }
    },

    buffalo(frm) {
        if (frm.doc.buffalo > 0) {
            frm.set_value("cow", 0);
        }
    },

    percent(frm) {
        if (frm.doc.percent > 0) {
            frm.set_value("amount", 0);
        }
    },

    amount(frm) {
        if (frm.doc.amount > 0) {
            frm.set_value("percent", 0);
        }
    },

    validate(frm) {
        // percent OR amount check
        const has_percent = !!frm.doc.percent;
        const has_amount = !!frm.doc.amount;

        if (has_percent && has_amount) {
            frappe.throw(__("You can only set either Percent OR Amount, not both."));
        }
        if (!has_percent && !has_amount) {
            frappe.throw(__("You must set either Percent OR Amount."));
        }

        // buffalo and cow check
        if ((frm.doc.buffalo || 0) <= 0 && (frm.doc.cow || 0) <= 0) {
            frappe.throw(__("You must set either Cow OR Buffalo greater than zero."));
        }
    }
});

