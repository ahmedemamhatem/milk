// file: milk/public/js/milk.js (adjust path to your app and hooks)
// hooks.py example: app_include_js = ["assets/milk/js/milk.js"]

frappe.provide("milk");

// Desk page: /app/milk
frappe.pages["milk"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Milk",
    single_column: true,
  });

  const $container = $(render_milk_workspace_html());
  $(page.body).empty().append($container);

  // Minimal custom CSS for cards (remove this if you want 100% default)
  inject_mw_css();

  // Permissions gating
  enforce_requirements($container);

  // Icon fallback
  ensure_milk_icon_fallback();

  // Route handling to avoid %23 encoding
  bind_route_clicks($container);
};

/* ----------------------- HTML ----------------------- */
function render_milk_workspace_html() {
  return `
  <div class="mw-container" dir="rtl" lang="ar">
    <main id="milk-workspace" class="mw-page" aria-label="الواجهة السريعة">
      <header class="mw-header" aria-hidden="true">
        <div class="mw-header-inner"></div>
      </header>

      <!-- عمليات سريعة -->
      <section class="mw-section" aria-labelledby="sec-quick-ops">
        <h2 class="mw-section-title" id="sec-quick-ops">
          <span class="mw-section-icon" aria-hidden="true">⚡</span>
          <span>عمليات سريعة</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="car-collect" data-requires-page="car-collect">
            <span class="mw-card-icon" aria-hidden="true">🚚</span>
            <span class="mw-card-label">استلام سياره</span>
          </a>
          <a class="mw-card" data-route="milk_collection" data-requires-doctype="Milk Collection">
            <span class="mw-card-icon" aria-hidden="true">
              <img src="/assets/milk/images/259397.png" alt="Milk">
            </span>
            <span class="mw-card-label">تسجيل اللم اليومي</span>
          </a>
          <a class="mw-card" data-route="driver-report" data-requires-page="driver-report">
            <span class="mw-card-icon" aria-hidden="true">🧑‍✈️</span>
            <span class="mw-card-label">تقرير فرق سائق يومي</span>
          </a>
          <a class="mw-card" data-route="weekly-supplier-payment/view/list" data-requires-doctype="Weekly Supplier Payment">
            <span class="mw-card-icon" aria-hidden="true">📅</span>
            <span class="mw-card-label">كشف الموردين الاسبوعي</span>
          </a>
        </div>
      </section>

      <!-- السجلات -->
      <section class="mw-section" aria-labelledby="sec-records">
        <h2 class="mw-section-title" id="sec-records">
          <span class="mw-section-icon" aria-hidden="true">📚</span>
          <span>السجلات</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="supplier/view/list" data-requires-doctype="Supplier">
            <span class="mw-card-icon" aria-hidden="true">🏪</span>
            <span class="mw-card-label">قائمه موردين</span>
          </a>
          <a class="mw-card" data-route="item/view/list" data-requires-doctype="Item">
            <span class="mw-card-icon" aria-hidden="true">📦</span>
            <span class="mw-card-label">قائمه الاصناف</span>
          </a>
          <a class="mw-card" data-route="driver/view/list" data-requires-doctype="Driver">
            <span class="mw-card-icon" aria-hidden="true">🛣️</span>
            <span class="mw-card-label">قائمه الخطوط</span>
          </a>
          <a class="mw-card" data-route="village/view/list" data-requires-doctype="Village">
            <span class="mw-card-icon" aria-hidden="true">🏘️</span>
            <span class="mw-card-label">القري</span>
          </a>
        </div>
      </section>

      <!-- إعدادات وتقارير -->
      <section class="mw-section" aria-labelledby="sec-settings">
        <h2 class="mw-section-title" id="sec-settings">
          <span class="mw-section-icon" aria-hidden="true">🛠️</span>
          <span>إعدادات وتقارير</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="milk-setting" data-requires-page="milk-setting">
            <span class="mw-card-icon" aria-hidden="true">⚙️</span>
            <span class="mw-card-label">اعدادات عامه</span>
          </a>
          <a class="mw-card" data-route="car-collection/view/list" data-requires-doctype="Car Collection">
            <span class="mw-card-icon" aria-hidden="true">📋</span>
            <span class="mw-card-label">قائمه استلام السيارات</span>
          </a>
          <a class="mw-card" data-route="milk-collection/view/list" data-requires-doctype="Milk Collection">
            <span class="mw-card-icon" aria-hidden="true">🗂️</span>
            <span class="mw-card-label">قائمه اللم اليومي</span>
          </a>
          <a class="mw-card" data-route="analysys" data-requires-page="analysys">
            <span class="mw-card-icon" aria-hidden="true">📊</span>
            <span class="mw-card-label">احصائيات</span>
          </a>
        </div>
      </section>

      <!-- الفواتير والحركة -->
      <section class="mw-section" aria-labelledby="sec-invoices">
        <h2 class="mw-section-title" id="sec-invoices">
          <span class="mw-section-icon" aria-hidden="true">💼</span>
          <span>الفواتير والحركة</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="fast-purchase-invoic" data-requires-page="fast-purchase-invoic">
            <span class="mw-card-icon" aria-hidden="true">🧾</span>
            <span class="mw-card-label">فاتوره شراء</span>
          </a>
          <a class="mw-card" data-route="fast-sales-invoice" data-requires-page="fast-sales-invoice">
            <span class="mw-card-icon" aria-hidden="true">🧾</span>
            <span class="mw-card-label">فاتوره بيع</span>
          </a>
          <a class="mw-card" data-route="stock-transfer" data-requires-page="stock-transfer">
            <span class="mw-card-icon" aria-hidden="true">🔄</span>
            <span class="mw-card-label">تحويل مخزني</span>
          </a>
          <a class="mw-card" data-route="manufacture" data-requires-page="manufacture">
            <span class="mw-card-icon" aria-hidden="true">🏭</span>
            <span class="mw-card-label">التصنيع</span>
          </a>
        </div>
      </section>

      <!-- الخزينة والمصروفات -->
      <section class="mw-section" aria-labelledby="sec-cash">
        <h2 class="mw-section-title" id="sec-cash">
          <span class="mw-section-icon" aria-hidden="true">🏦</span>
          <span>الخزينة والمصروفات</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="fast-payment" data-requires-page="fast-payment">
            <span class="mw-card-icon" aria-hidden="true">💳</span>
            <span class="mw-card-label">تسجيل تحصيل / دفع</span>
          </a>
          <a class="mw-card" data-route="fast-expense" data-requires-page="fast-expense">
            <span class="mw-card-icon" aria-hidden="true">💸</span>
            <span class="mw-card-label">اضافه مصروف</span>
          </a>
          <a class="mw-card" data-route="query-report/Stock Details" data-requires-page="query-report/Stock Details">
            <span class="mw-card-icon" aria-hidden="true">📦</span>
            <span class="mw-card-label">تقرير ارصده المخازن</span>
          </a>
          <a class="mw-card" data-route="query-report/Mode Of Payment Balance" data-requires-page="query-report/Mode Of Payment Balance">
            <span class="mw-card-icon" aria-hidden="true">🏦</span>
            <span class="mw-card-label">تقرير ارصده الخزنه</span>
          </a>
        </div>
      </section>

      <!-- الموردين والعملاء -->
      <section class="mw-section" aria-labelledby="sec-suppliers">
        <h2 class="mw-section-title" id="sec-suppliers">
          <span class="mw-section-icon" aria-hidden="true">👥</span>
          <span>الموردين والعملاء</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="supplier-loan/view/list" data-requires-doctype="Supplier Loan">
            <span class="mw-card-icon" aria-hidden="true">🤝</span>
            <span class="mw-card-label">سلف الموردين</span>
          </a>
          <a class="mw-card" data-route="supplier-deduction/view/list" data-requires-doctype="Supplier Deduction">
            <span class="mw-card-icon" aria-hidden="true">⚖️</span>
            <span class="mw-card-label">خصم موردين (جوده)</span>
          </a>
          <a class="mw-card" data-route="query-report/Supplier Ledger" data-requires-page="query-report/Supplier Ledger">
            <span class="mw-card-icon" aria-hidden="true">📒</span>
            <span class="mw-card-label">ارصده الموردين</span>
          </a>
          <a class="mw-card" data-route="query-report/Customer Ledger" data-requires-page="query-report/Customer Ledger">
            <span class="mw-card-icon" aria-hidden="true">📗</span>
            <span class="mw-card-label">ارصده العملاء</span>
          </a>
        </div>
      </section>

      <!-- الجودة -->
      <section class="mw-section" aria-labelledby="sec-quality">
        <h2 class="mw-section-title" id="sec-quality">
          <span class="mw-section-icon" aria-hidden="true">🧪</span>
          <span>الجودة</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="daily-milk-quality" data-requires-page="daily-milk-quality">
            <span class="mw-card-icon" aria-hidden="true">🧪</span>
            <span class="mw-card-label">تسجيل الجوده</span>
          </a>
          <a class="mw-card" data-route="milk-quality/view/list" data-requires-doctype="Milk Quality">
            <span class="mw-card-icon" aria-hidden="true">🗂️</span>
            <span class="mw-card-label">قائمه تسجيلات الجوده</span>
          </a>
          <a class="mw-card" data-route="query-report/Milk Quality" data-requires-page="query-report/Milk Quality">
            <span class="mw-card-icon" aria-hidden="true">📈</span>
            <span class="mw-card-label">تقرير الجوده</span>
          </a>
          <a class="mw-card" data-route="milk-quality-dashboa" data-requires-page="milk-quality-dashboa">
            <span class="mw-card-icon" aria-hidden="true">📊</span>
            <span class="mw-card-label">احصائيات الجوده</span>
          </a>
        </div>
      </section>

      <!-- تقارير التسعير -->
      <section class="mw-section" aria-labelledby="sec-pricing">
        <h2 class="mw-section-title" id="sec-pricing">
          <span class="mw-section-icon" aria-hidden="true">💹</span>
          <span>تقارير التسعير</span>
        </h2>
        <div class="mw-grid">
          <a class="mw-card" data-route="query-report/Milk Average Price For supplier" data-requires-page="query-report/Milk Average Price For supplier">
            <span class="mw-card-icon" aria-hidden="true">💹</span>
            <span class="mw-card-label">متوسط السعر العادل للموردين</span>
          </a>
        </div>
      </section>

      <footer class="mw-footer" aria-hidden="true"></footer>
    </main>
  </div>
  `;
}

/* ----------------------- Minimal CSS (optional) ----------------------- */
function inject_mw_css() {
  if (document.getElementById("mw-style")) return;
  const css = `
.mw-section { margin-bottom: 20px; }
.mw-section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-muted, #6b7280); margin: 0 0 10px; }
.mw-section-icon { width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; background: var(--bg-light, #f8fafc); color: var(--primary, #5e64ff); border: 1px solid var(--border-color, #e5e7eb); font-size: 13px; }

.mw-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1200px) { .mw-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 820px)  { .mw-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .mw-grid { grid-template-columns: 1fr; } }

.mw-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px;
  text-decoration: none; color: inherit; border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px;
  background: var(--card-bg, #fff);
}
.mw-card-icon { font-size: 26px; line-height: 1; }
.mw-card-label { font-weight: 700; text-align: center; font-size: 14px; line-height: 1.3; padding-inline: 6px; }

/* Milk image icon sizing (data-route based) */
a.mw-card[data-route="milk_collection"] .mw-card-icon {
  width: 25px; height: 25px; display: inline-flex; align-items: center; justify-content: center; font-size: 0; line-height: 1; margin-inline-end: 6px;
}
a.mw-card[data-route="milk_collection"] .mw-card-icon img {
  width: 25px; height: 25px; display: block; object-fit: contain;
}
`;
  const style = document.createElement("style");
  style.id = "mw-style";
  style.textContent = css;
  document.head.appendChild(style);
}

/* ----------------------- Permissions (sync) ----------------------- */
function enforce_requirements($root) {
  $root.find(".mw-card").each(function () {
    const el = this;
    const doctype = el.getAttribute("data-requires-doctype");
    try {
      if (doctype && frappe.perm && typeof frappe.perm.has_perm === "function") {
        const allowed = frappe.perm.has_perm(doctype, 0, "read");
        if (!allowed) el.style.display = "none";
      }
    } catch (e) {
      // ignore
    }
  });
}

/* ----------------------- Icon fallback ----------------------- */
function ensure_milk_icon_fallback() {
  const img = document.querySelector('a.mw-card[data-route="milk_collection"] .mw-card-icon img');
  if (img) {
    img.addEventListener(
      "error",
      () => {
        const iconWrap = img.parentElement;
        img.remove();
        if (iconWrap && !iconWrap.textContent.trim()) iconWrap.textContent = "🥛";
      },
      { once: true }
    );
  }
}

/* ----------------------- Routing ----------------------- */
function bind_route_clicks($root) {
  $root.on("click", "a.mw-card", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const route = this.getAttribute("data-route");
    if (!route) return;

    const parts = route.split("/");
    if (parts[0] === "query-report") {
      const report_name = parts.slice(1).join("/");
      frappe.set_route("query-report", report_name);
      return;
    }
    if (parts.length > 1) {
      frappe.set_route(parts);
    } else {
      frappe.set_route(route);
    }
  });
}