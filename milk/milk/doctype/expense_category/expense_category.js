frappe.ui.form.on("Expense Category", {
    setup: function(frm) {
        frm.set_query("expense_account", function() {
            return {
                filters: {
                    root_type: "Expense",
                    is_group: 0
                }
            };
        });
    }
});
