frappe.ui.form.on('Car Collection', {
    setup: function(frm) {
        // Filter the Warehouse field
        frm.set_query('warehouse', function() {
            return {
                filters: {
                    is_group: 0,   // Only non-group warehouses
                    disabled: 0    // Only active warehouses
                }
            };
        });
    },

    validate: function(frm) {
        // Ensure only one of Morning or Evening is set
        if (frm.doc.morning && frm.doc.evening) {
            frappe.throw(__('ماينفعش تحدد الصبح والمساء مع بعض 😅. اختار واحد بس.'));
        }

        // Ensure at least one is set
        if (!frm.doc.morning && !frm.doc.evening) {
            frappe.throw(__('لازم تحدد صباحاً أو مساءً ⏰.'));
        }

        // Auto-set the other to 0
        if (frm.doc.morning) {
            frm.set_value('evening', 0);
        } else if (frm.doc.evening) {
            frm.set_value('morning', 0);
        }
    },

    morning: function(frm) {
        if (frm.doc.morning) {
            frm.set_value('evening', 0); // Auto-clear Evening
        }
    },

    evening: function(frm) {
        if (frm.doc.evening) {
            frm.set_value('morning', 0); // Auto-clear Morning
        }
    }
});
