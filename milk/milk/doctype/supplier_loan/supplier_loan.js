frappe.ui.form.on("Supplier Loan", {
  refresh(frm) {
    set_descriptions_ar(frm);
    apply_mode_by_loan_type(frm);
  },

  onload_post_render(frm) {
    apply_mode_by_loan_type(frm);
  },

  loan_type(frm) {
    apply_mode_by_loan_type(frm);
  },

  amount(frm) {
    if (isOneTime(frm)) {
      // في One Time نخلي الأسبوعي = المبلغ، والأسابيع = 1
      set_one_time_values(frm);
    } else {
      recalc_from_changed_field(frm, "amount");
    }
  },

  weekly_amount(frm) {
    if (!isOneTime(frm)) {
      recalc_from_changed_field(frm, "weekly_amount");
    }
  },

  no_of_weeks(frm) {
    if (!isOneTime(frm)) {
      recalc_from_changed_field(frm, "no_of_weeks");
    }
  },

  validate(frm) {
    if (isOneTime(frm)) {
      // تأكيد القيم ونفس الوقت نخليهم أعداد صحيحة ومغلقين
      set_one_time_values(frm);
      return; // مفيش تحقق إضافي في وضع One Time
    }

    // وضع Weekly: نفس التحقق السابق
    const amount = toNumber(frm.doc.amount);
    const weekly = toNumber(frm.doc.weekly_amount);
    const weeks = toNumber(frm.doc.no_of_weeks);

    const hasWeekly = isPositiveNumber(weekly);
    const hasWeeks = isPositiveNumber(weeks);

    if (!hasWeekly && !hasWeeks) {
      frappe.msgprint({
        title: "بيانات ناقصة",
        message: "من فضلك دخّل يا مبلغ الأسبوع أو عدد الأسابيع (لازم يكونوا أعداد صحيحة).",
        indicator: "red",
      });
      frappe.validated = false;
      return;
    }

    if (hasWeekly && !isInteger(weekly)) {
      suggestInteger("مبلغ الأسبوع", weekly);
      frappe.validated = false;
      return;
    }
    if (hasWeeks && !isInteger(weeks)) {
      suggestInteger("عدد الأسابيع", weeks);
      frappe.validated = false;
      return;
    }

    if (isPositiveNumber(amount) && hasWeekly && hasWeeks) {
      if (!nearlyEqual(weekly * weeks, amount)) {
        frappe.msgprint({
          title: "القيم مش راكبة",
          message: "مبلغ الأسبوع × عدد الأسابيع لازم يساوي المبلغ الكلي.",
          indicator: "red",
        });
        frappe.validated = false;
        return;
      }
    }

    if (isPositiveNumber(amount)) {
      if (hasWeekly && !hasWeeks) {
        const derivedWeeks = amount / weekly;
        if (!isInteger(derivedWeeks)) {
          suggestDerived("عدد الأسابيع", derivedWeeks, {
            tryWeeks: nearestDivisorsForAmount(amount),
          });
          frappe.validated = false;
          return;
        }
      }
      if (hasWeeks && !hasWeekly) {
        const derivedWeekly = amount / weeks;
        if (!isInteger(derivedWeekly)) {
          suggestDerived("مبلغ الأسبوع", derivedWeekly, {
            tryWeekly: nearestDivisorsForAmount(amount),
          });
          frappe.validated = false;
          return;
        }
      }
    }
  },
});

/* ========== وضع One Time ========== */
function isOneTime(frm) {
  return (frm.doc.loan_type || "").toLowerCase() === "one time";
}
function isWeekly(frm) {
  return (frm.doc.loan_type || "").toLowerCase() === "weekly";
}
function set_one_time_values(frm) {
  const amount = toNumber(frm.doc.amount) || 0;
  // weekly_amount = amount (عدد صحيح)، no_of_weeks = 1
  frm.set_value("weekly_amount", Math.trunc(amount)); // لو amount فيه كسور هنقصّه
  frm.set_value("no_of_weeks", 1);

  // قفل الحقول
  frm.set_df_property("weekly_amount", "read_only", 1);
  frm.set_df_property("no_of_weeks", "read_only", 1);

  // وصف توضيحي
  frm.set_df_property("weekly_amount", "description", "وضع دفعة واحدة: مبلغ الأسبوع = المبلغ كله، وعدد الأسابيع = 1.");
  frm.set_df_property("no_of_weeks", "description", "وضع دفعة واحدة: مبلغ الأسبوع = المبلغ كله، وعدد الأسابيع = 1.");
}
function apply_mode_by_loan_type(frm) {
  if (isOneTime(frm)) {
    set_one_time_values(frm);
  } else if (isWeekly(frm)) {
    // فك القفل في وضع Weekly
    frm.set_df_property("weekly_amount", "read_only", 0);
    frm.set_df_property("no_of_weeks", "read_only", 0);
    set_descriptions_ar(frm);
  } else {
    // لأنواع أخرى إن وجدت: نفس فك القفل والشرح العام
    frm.set_df_property("weekly_amount", "read_only", 0);
    frm.set_df_property("no_of_weeks", "read_only", 0);
    set_descriptions_ar(frm);
  }
}

/* ========== وضع Weekly: إعادة الحساب والرسائل ========== */
function recalc_from_changed_field(frm, changed) {
  const amount = toNumber(frm.doc.amount);
  let weekly = toNumber(frm.doc.weekly_amount);
  let weeks = toNumber(frm.doc.no_of_weeks);

  const canCompute = isPositiveNumber(amount);

  if (changed === "weekly_amount") {
    if (canCompute && isPositiveNumber(weekly)) {
      const derived = amount / weekly;
      if (isInteger(derived)) {
        frm.set_value("no_of_weeks", derived);
      } else {
        frm.set_value("no_of_weeks", null);
        showNonInteger("عدد الأسابيع", derived, "عدّل مبلغ الأسبوع بحيث (المبلغ ÷ مبلغ الأسبوع) يطلع عدد صحيح.");
      }
    } else if (!isPositiveNumber(weekly)) {
      frm.set_value("no_of_weeks", null);
    }
  } else if (changed === "no_of_weeks") {
    if (canCompute && isPositiveNumber(weeks)) {
      const derived = amount / weeks;
      if (isInteger(derived)) {
        frm.set_value("weekly_amount", derived);
      } else {
        frm.set_value("weekly_amount", null);
        showNonInteger("مبلغ الأسبوع", derived, "عدّل عدد الأسابيع بحيث (المبلغ ÷ عدد الأسابيع) يطلع عدد صحيح.");
      }
    } else if (!isPositiveNumber(weeks)) {
      frm.set_value("weekly_amount", null);
    }
  } else if (changed === "amount") {
    if (isPositiveNumber(weeks) && canCompute) {
      const derived = amount / weeks;
      if (isInteger(derived)) {
        frm.set_value("weekly_amount", derived);
      } else {
        frm.set_value("weekly_amount", null);
        showNonInteger("مبلغ الأسبوع", derived, "عدّل المبلغ أو عدد الأسابيع بحيث الناتج يطلع عدد صحيح.");
      }
    } else if (isPositiveNumber(weekly) && canCompute) {
      const derived = amount / weekly;
      if (isInteger(derived)) {
        frm.set_value("no_of_weeks", derived);
      } else {
        frm.set_value("no_of_weeks", null);
        showNonInteger("عدد الأسابيع", derived, "عدّل المبلغ أو مبلغ الأسبوع بحيث الناتج يطلع عدد صحيح.");
      }
    }
  }
}

/* ========== رسائل AR ========== */
function set_descriptions_ar(frm) {
  frm.set_df_property("weekly_amount", "description", "لازم تدخل يا إمّا مبلغ الأسبوع أو عدد الأسابيع (الاتنين أعداد صحيحة).");
  frm.set_df_property("no_of_weeks", "description", "لازم تدخل يا إمّا مبلغ الأسبوع أو عدد الأسابيع (الاتنين أعداد صحيحة).");
}

function showNonInteger(fieldLabel, value, hint) {
  const nearest = nearestIntegers(value);
  frappe.msgprint({
    title: "لازم يكون عدد صحيح",
    message:
      `${fieldLabel} هيطلع ${formatNumber(value)} وده مش عدد صحيح.<br>` +
      `جرّب ${nearest.lower} أو ${nearest.upper}.<br>` +
      (hint || ""),
    indicator: "orange",
  });
}

function suggestInteger(fieldLabel, value) {
  const nearest = nearestIntegers(value);
  frappe.msgprint({
    title: `${fieldLabel} لازم يبقى عدد صحيح`,
    message: `${fieldLabel} دلوقتي ${formatNumber(value)}. جرّب ${nearest.lower} أو ${nearest.upper}.`,
    indicator: "red",
  });
}

function suggestDerived(targetLabel, derivedValue, { tryWeeks, tryWeekly } = {}) {
  const nearest = nearestIntegers(derivedValue);
  let suggestion = `${targetLabel} هيطلع ${formatNumber(derivedValue)} وده مش عدد صحيح. جرّب ${nearest.lower} أو ${nearest.upper}.`;

  if (tryWeeks && tryWeeks.length) {
    suggestion += `<br>ممكن تختار عدد أسابيع يكون قاسم للمبلغ: ${tryWeeks.join(", ")}.`;
  }
  if (tryWeekly && tryWeekly.length) {
    suggestion += `<br>ممكن تختار مبلغ أسبوع يكون قاسم للمبلغ: ${tryWeekly.join(", ")}.`;
  }

  frappe.msgprint({
    title: `${targetLabel} لازم يبقى عدد صحيح`,
    message: suggestion,
    indicator: "red",
  });
}

/* ========== أدوات أرقام ========== */
function nearestIntegers(x) {
  const lower = Math.floor(x);
  const upper = Math.ceil(x);
  return { lower, upper };
}

function nearestDivisorsForAmount(amount, limit = 12) {
  if (!isPositiveInteger(amount)) return [];
  const divisors = new Set();
  for (let i = 1; i <= Math.min(limit, amount); i++) {
    if (amount % i === 0) {
      divisors.add(i);
      divisors.add(amount / i);
    }
  }
  return Array.from(divisors).sort((a, b) => a - b);
}

function toNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function isPositiveNumber(v) {
  return typeof v === "number" && isFinite(v) && v > 0;
}
function isInteger(v) {
  return typeof v === "number" && Number.isInteger(v);
}
function isPositiveInteger(v) {
  return isInteger(v) && v > 0;
}
function nearlyEqual(a, b, eps = 0.000001) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= eps;
}
function formatNumber(n) {
  if (n == null) return "";
  return Number(n.toFixed(6)).toString();
}