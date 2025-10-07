frappe.provide("milk");

frappe.pages["milk"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "",
    single_column: true,
  });

  const $container = $(render_milk_workspace_html());
  $(page.body).empty().append($container);

  inject_mw_css();
  apply_mw_background();

  // Permissions: keep visible; mark usable/disabled (+ red tag + popup)
  enforce_requirements_keep_visible($container);

  ensure_milk_icon_fallback();
  bind_route_clicks_disable_aware($container);
  animate_entrance($container[0]);
};

function render_milk_workspace_html() {
  return `
<div class="mw-container" dir="rtl" lang="ar">
  <main id="milk-workspace" class="mw-page" aria-label="الواجهة السريعة">
    <section class="mw-section" aria-labelledby="sec-all">
      <h2 class="mw-section-title" id="sec-all">
        <span></span>
      </h2>

      <div class="mw-grid with-breaks">
        <!-- Row 1 -->
        <a class="mw-card" data-route="car-collect" data-requires-page="car-collect">
          <span class="mw-card-icon" aria-hidden="true">🚚</span>
          <span class="mw-card-label">استلام سياره</span>
        </a>
        <a class="mw-card" data-route="milk_collection" data-requires-page="milk_collection">
          <span class="mw-card-icon" aria-hidden="true">🥛</span>
          <span class="mw-card-label">تسجيل اللم اليومي</span>
        </a>
        <a class="mw-card" data-route="driver-report" data-requires-page="driver-report">
          <span class="mw-card-icon" aria-hidden="true">🧑‍✈️</span>
          <span class="mw-card-label">تقرير فرق سائق يومي</span>
        </a>
        <a class="mw-card" data-route="Weekly Supplier Payment" data-requires-doctype="Weekly Supplier Payment">
          <span class="mw-card-icon" aria-hidden="true">📅</span>
          <span class="mw-card-label">كشف الموردين الاسبوعي</span>
        </a>

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 2 -->
        <a class="mw-card" data-route="Supplier" data-requires-doctype="Supplier">
          <span class="mw-card-icon" aria-hidden="true">🏪</span>
          <span class="mw-card-label">قائمه موردين</span>
        </a>
        <a class="mw-card" data-route="Item" data-requires-doctype="Item">
          <span class="mw-card-icon" aria-hidden="true">📦</span>
          <span class="mw-card-label">قائمه الاصناف</span>
        </a>
        <a class="mw-card" data-route="Driver" data-requires-doctype="Driver">
          <span class="mw-card-icon" aria-hidden="true">🛣️</span>
          <span class="mw-card-label">قائمه الخطوط</span>
        </a>
        <a class="mw-card" data-route="Village" data-requires-doctype="Village">
          <span class="mw-card-icon" aria-hidden="true">🏘️</span>
          <span class="mw-card-label">القري</span>
        </a>

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 3 -->
        <a class="mw-card" data-route="milk-setting" data-requires-page="milk-setting">
          <span class="mw-card-icon" aria-hidden="true">⚙️</span>
          <span class="mw-card-label">اعدادات عامه</span>
        </a>
        <a class="mw-card" data-route="Car Collection" data-requires-doctype="Car Collection">
          <span class="mw-card-icon" aria-hidden="true">📋</span>
          <span class="mw-card-label">قائمه استلام السيارات</span>
        </a>
        <a class="mw-card" data-route="Milk Collection" data-requires-doctype="Milk Collection">
          <span class="mw-card-icon" aria-hidden="true">🗂️</span>
          <span class="mw-card-label">قائمه اللم اليومي</span>
        </a>
        <a class="mw-card" data-route="analysys" data-requires-page="analysys">
          <span class="mw-card-icon" aria-hidden="true">📊</span>
          <span class="mw-card-label">احصائيات</span>
        </a>

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 4 -->
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

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 5 -->
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

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 6 -->
        <a class="mw-card" data-route="Supplier Loan" data-requires-doctype="Supplier Loan">
          <span class="mw-card-icon" aria-hidden="true">🤝</span>
          <span class="mw-card-label">سلف الموردين</span>
        </a>
        <a class="mw-card" data-route="Supplier Deduction" data-requires-doctype="Supplier Deduction">
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

        <div class="mw-break" role="separator" aria-hidden="true"></div>

        <!-- Row 7 -->
        <a class="mw-card" data-route="daily-milk-quality" data-requires-page="daily-milk-quality">
          <span class="mw-card-icon" aria-hidden="true">🧪</span>
          <span class="mw-card-label">تسجيل الجوده</span>
        </a>
        <a class="mw-card" data-route="Milk Quality" data-requires-doctype="Milk Quality">
          <span class="mw-card-icon" aria-hidden="true">🗂️</span>
          <span class="mw-card-label">قائمه تسجيلات الجوده</span>
        </a>
        <a class="mw-card" data-route="query-report/Milk Quality" data-requires-page="query-report/Milk Quality">
          <span class="mw-card-icon" aria-hidden="true">📈</span>
          <span class="mw-card-label">تقرير الجوده</span>
        </a>
        <a class="mw-card" data-route="query-report/Car Collection Quality" data-requires-page="query-report/Car Collection Quality">
          <span class="mw-card-icon" aria-hidden="true">📈</span>
          <span class="mw-card-label">تقرير الجوده للخطوط</span>
        </a>
        <a class="mw-card" data-route="milk-quality-dashboa" data-requires-page="milk-quality-dashboa">
          <span class="mw-card-icon" aria-hidden="true">📊</span>
          <span class="mw-card-label">احصائيات الجوده</span>
        </a>
      </div>
    </section>
  </main>
</div>
`;
}

/* ----------------------- Styles + subtle background ----------------------- */
function inject_mw_css() {
  if (document.getElementById("mw-style")) return;
  const css = `
/* ===================== THEME TOKENS (Blue) ===================== */
.mw-container {
  --brand: #2563eb;             /* Blue 600 */
  --brand-500: #3b82f6;         /* Blue 500 */
  --brand-700: #1d4ed8;         /* Blue 700 */
  --text: #0f172a;
  --muted: #64748b;
  --border: #e6eaf2;
  --border-strong: #d5dbea;
  --surface: #ffffff;
  --surface-2: #f7f9fc;
  --disabled-bg: #f3f6fb;

  --shadow-sm: 0 2px 6px rgba(2, 6, 23, .06), 0 8px 18px rgba(2, 6, 23, .05);
  --shadow-lg: 0 12px 24px rgba(2, 6, 23, .10), 0 28px 60px rgba(2, 6, 23, .12);

  --gloss: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 70%);
}

/* ===================== BACKGROUND (More visible) ===================== */
body .mw-bg-layer {
  position: fixed;
  inset: 0;
  background-position: center top;
  background-repeat: no-repeat;
  background-size: contain;    /* not large: keep original aspect without filling entire screen */
  opacity: .20;                /* visible but subtle */
  filter: none;                /* no blur */
  pointer-events: none;
  z-index: 0;
  transition: opacity .25s ease, background-size .25s ease;
}

/* Light vignette to keep cards readable */
body .mw-bg-layer::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(130% 85% at 50% 12%,
      rgba(255,255,255,0.14),
      rgba(255,255,255,0.08) 45%,
      rgba(255,255,255,0.00) 80%);
  pointer-events: none;
}

/* Top glow + soft shade */
body .mw-bg-layer::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.0) 40%);
  mix-blend-mode: lighten;
  pointer-events: none;
}

/* Dark mode background tuning */
html.dark body .mw-bg-layer {
  opacity: .22;
  filter: none; /* keep sharp */
}
html.dark body .mw-bg-layer::before {
  background:
    radial-gradient(130% 85% at 50% 12%,
      rgba(0,0,0,0.24),
      rgba(0,0,0,0.12) 45%,
      rgba(0,0,0,0.00) 80%);
}
html.dark body .mw-bg-layer::after {
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0.0) 40%);
  mix-blend-mode: normal;
}

/* Optional: stronger presence on very small screens */
@media (max-width: 480px) {
  body .mw-bg-layer {
    background-size: contain;
    opacity: .22;
  }
}

/* ===================== LAYOUT/BASICS ===================== */
.mw-container, .mw-page { position: relative; z-index: 1; }

.mw-section { margin-bottom: 22px; }
.mw-section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--muted);
  margin: 0 0 10px;
}

/* Grid */
.mw-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}
.mw-grid.with-breaks .mw-break {
  grid-column: 1 / -1;
  height: 0; border: 0; border-top: 1px dashed #dae2f2;
  margin: 6px 0 10px 0;
}
@media (max-width: 1200px) { .mw-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 820px)  { .mw-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .mw-grid { grid-template-columns: 1fr; gap: 18px; } }

/* ===================== CARDS ===================== */
/* Base: blue accent, glassy surface, breathing-ready */
.mw-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  min-height: 124px;
  text-decoration: none; color: inherit;

  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(120% 120% at 50% -5%, rgba(59,130,246,.10), rgba(59,130,246,0) 35%),
    linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.96)),
    var(--surface);
  backdrop-filter: saturate(1.05) blur(0.2px);
  box-shadow: var(--shadow-sm);

  transition:
    transform .25s cubic-bezier(.2,.7,.2,1),
    box-shadow .28s ease,
    border-color .18s ease,
    background .28s ease,
    opacity .35s ease,
    filter .25s ease;
  opacity: 0;
  transform: translateY(12px) scale(.985);
  will-change: transform, box-shadow;
  perspective: 1000px;
  transform-style: preserve-3d;
  overflow: hidden;
}

/* Glossy sweep */
.mw-card::before {
  content: "";
  position: absolute; inset: 0;
  background: var(--gloss);
  transform: translateX(-140%);
  opacity: 0;
  transition: transform .9s ease, opacity .35s ease;
  pointer-events: none;
}

/* Blue focus halo container (animated) */
.mw-card::after {
  content: "";
  position: absolute; inset: -1px; border-radius: 18px;
  box-shadow: 0 0 0 0 rgba(37,99,235,.28);
  opacity: 0; pointer-events: none;
  transition: box-shadow .25s ease, opacity .2s ease;
}

/* Content */
.mw-card-icon {
  font-size: 32px;
  line-height: 1;
  transform: translateZ(30px);
  transition: transform .22s ease, filter .2s ease, opacity .2s ease;
}
.mw-card-label {
  font-weight: 800;
  text-align: center;
  font-size: 14.5px;
  line-height: 1.35;
  color: #0b1324;
  padding-inline: 10px;
  transform: translateZ(20px);
}

/* Hover/focus: lift, blue border, breathing shadow, glossy sweep */
.mw-card.usable:hover,
.mw-card.usable:focus-visible {
  transform: translateY(-8px) scale(1.02);
  border-color: color-mix(in srgb, var(--brand) 32%, var(--border-strong));
  background:
    radial-gradient(120% 120% at 50% -5%, rgba(59,130,246,.12), rgba(59,130,246,0) 40%),
    linear-gradient(180deg, #fafdff, #ffffff);
  box-shadow:
    0 14px 30px rgba(37, 99, 235, .12),
    0 26px 70px rgba(2, 6, 23, .14);
  animation: mw-shadow-breathe 1.8s ease-in-out infinite;
}
@keyframes mw-shadow-breathe {
  0%, 100% {
    box-shadow:
      0 14px 30px rgba(37, 99, 235, .12),
      0 26px 70px rgba(2, 6, 23, .14);
  }
  50% {
    box-shadow:
      0 18px 36px rgba(37, 99, 235, .16),
      0 32px 84px rgba(2, 6, 23, .18);
  }
}

.mw-card.usable:hover::before,
.mw-card.usable:focus-visible::before {
  opacity: .95;
  transform: translateX(140%);
}
.mw-card.usable:hover .mw-card-icon,
.mw-card.usable:focus-visible .mw-card-icon {
  transform: translateZ(30px) translateY(-2px) scale(1.06);
}
.mw-card.usable:focus-visible::after {
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(59,130,246,.28), 0 0 0 8px rgba(59,130,246,.12);
}

/* Pressed */
.mw-card.usable:active {
  transform: translateY(-3px) scale(0.997);
  transition-duration: .08s;
  animation: none;
}

/* Disabled */
.mw-card.disabled {
  cursor: not-allowed;
  pointer-events: auto; /* keep events for popover */
  opacity: 0.78;
  background:
    linear-gradient(180deg, var(--disabled-bg), #fff);
  border-style: dashed;
  border-color: #cdd6ea;
  filter: saturate(.9);
  box-shadow: none;
}
.mw-card.disabled .mw-card-icon { filter: grayscale(100%) opacity(.65); }
.mw-card.disabled .mw-card-label { color: #6b7280; }

/* Red "no permission" tag */
.mw-card.disabled .mw-ribbon {
  position: absolute;
  top: 8px;
  inset-inline-start: 8px;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11.5px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: .2px;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(239,68,68,.35);
}

/* Remove sweep/focus ring on disabled */
.mw-card.disabled::before, .mw-card.disabled::after { display: none; }

/* Entrance animation */
.mw-card.mw-in {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition-duration: .65s;
}

/* Keyboard outline */
.mw-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-500) 55%, transparent);
  outline-offset: 2px;
}

/* Dark mode cards */
html.dark .mw-card {
  background:
    radial-gradient(120% 120% at 50% -5%, rgba(37,99,235,.10), rgba(37,99,235,0) 35%),
    linear-gradient(180deg, rgba(17,24,39,.88), rgba(17,24,39,.94));
  border-color: #334155;
  box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 24px rgba(0,0,0,.35);
}
html.dark .mw-card.usable:hover,
html.dark .mw-card.usable:focus-visible {
  border-color: color-mix(in srgb, var(--brand) 38%, #334155);
  background:
    radial-gradient(120% 120% at 50% -5%, rgba(59,130,246,.16), rgba(59,130,246,0) 40%),
    linear-gradient(180deg, rgba(30,41,59,.96), rgba(17,24,39,.96));
}
html.dark .mw-card-label { color: #e5e7eb; }
html.dark .mw-card.disabled {
  background: linear-gradient(180deg, #0b1220, #111827);
  border-color: #475569;
}

/* ===================== REDUCED MOTION ===================== */
@media (prefers-reduced-motion: reduce) {
  .mw-card,
  .mw-card::before,
  .mw-card::after,
  .mw-card-icon,
  .mw-bg-layer {
    transition: none !important;
    animation: none !important;
  }
}
`;
  const style = document.createElement("style");
  style.id = "mw-style";
  style.textContent = css;
  document.head.appendChild(style);
}

/* Subtle, non-stretched background */
function apply_mw_background() {
  const BG_SRC = "/assets/milk/images/milken.jpg";

  function ensureBgLayer() {
    let bg = document.querySelector("body > .mw-bg-layer");
    if (!bg) {
      bg = document.createElement("div");
      bg.className = "mw-bg-layer";
      document.body.prepend(bg);
    }
    return bg;
  }

  const run = () => {
    const bg = ensureBgLayer();
    const img = new Image();
    img.onload = () => { bg.style.backgroundImage = "url('" + BG_SRC + "')"; };
    img.onerror = () => { console.warn("[Milk Workspace] Background NOT found:", BG_SRC); bg.style.backgroundImage = ""; };
    img.src = BG_SRC + "?v=" + Date.now();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

/* ----------------------- Popup helpers ----------------------- */
function ensurePermPopover() {
  let el = document.getElementById("mw-perm-popover");
  if (el) return el;
  el = document.createElement("div");
  el.id = "mw-perm-popover";
  el.style.position = "fixed";
  el.style.zIndex = "999999";
  el.style.maxWidth = "320px";
  el.style.background = "#111827";
  el.style.color = "#fff";
  el.style.padding = "10px 12px";
  el.style.borderRadius = "10px";
  el.style.boxShadow = "0 12px 30px rgba(0,0,0,.25)";
  el.style.fontSize = "12px";
  el.style.lineHeight = "1.5";
  el.style.display = "none";
  el.style.pointerEvents = "none";
  el.style.wordWrap = "break-word";
  el.innerHTML =
    '<div style="font-weight:800;margin-bottom:6px">' +
    __("Permissions needed") +
    '</div><ul class="mw-perm-list" style="margin:0;padding-inline-start:16px"></ul>';
  document.body.appendChild(el);
  return el;
}
function setPermPopoverContent(reasons) {
  const pop = ensurePermPopover();
  const ul = pop.querySelector(".mw-perm-list");
  ul.innerHTML = "";
  (reasons || []).slice(0, 10).forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    ul.appendChild(li);
  });
}
function showPermPopoverAt(x, y) {
  const pop = ensurePermPopover();
  const px = Math.min(window.innerWidth - 20, Math.max(0, x + 12));
  const py = Math.min(window.innerHeight - 20, Math.max(0, y + 12));
  pop.style.left = px + "px";
  pop.style.top = py + "px";
  pop.style.display = "block";
}
function hidePermPopover() {
  const pop = document.getElementById("mw-perm-popover");
  if (pop) pop.style.display = "none";
}
function attachPermHover(el, reasons) {
  if (reasons && reasons.length) {
    el.dataset.permReasons = JSON.stringify(reasons);
  }
  const getReasons = () => {
    try {
      if (el.dataset.permReasons) return JSON.parse(el.dataset.permReasons);
    } catch {}
    const list = [];
    const dt = el.getAttribute("data-requires-doctype");
    const pg = el.getAttribute("data-requires-page");
    const fields = (el.getAttribute("data-requires-fields") || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    if (dt) {
      list.push(`read: ${dt}`);
      fields.forEach(f => {
        if (f.includes(".")) list.push(`field read: ${f}`);
        else list.push(`field read: ${dt}.${f}`);
      });
    } else if (pg) {
      if (pg.startsWith("query-report/"))
        list.push(`run report: ${pg.slice("query-report/".length)}`);
      else
        list.push(`open page: ${pg}`);
      fields.forEach(f => { if (f.includes(".")) list.push(`field read: ${f}`); });
    }
    if (!list.length) list.push(__("Insufficient permission"));
    return list;
  };

  function onEnter(e) {
    if (!el.classList.contains("disabled")) return;
    const r = getReasons();
    setPermPopoverContent(r);
    const p = e?.touches ? e.touches[0] : e;
    showPermPopoverAt(p?.clientX || 0, p?.clientY || 0);
  }
  function onMove(e) {
    if (!el.classList.contains("disabled")) return;
    const p = e?.touches ? e.touches[0] : e;
    showPermPopoverAt(p?.clientX || 0, p?.clientY || 0);
  }
  function onLeave() { hidePermPopover(); }

  if (!el._mwPermHoverBound) {
    el._mwPermHoverBound = true;
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("focus", onEnter);
    el.addEventListener("blur", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    el.addEventListener("touchend", onLeave);
  }
}

/* ----------------------- Permissions (batch + red tag + popup) ----------------------- */
async function enforce_requirements_keep_visible($root) {
  // Gather cards
  const cards = Array.from($root.find(".mw-card")).map((el, idx) => {
    const id = el.getAttribute("id") || el.getAttribute("data-id") || el.getAttribute("data-route") || `card-${idx}`;
    el.dataset.cardId = id;
    const fields = (el.getAttribute("data-requires-fields") || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    return {
      id,
      doctype: el.getAttribute("data-requires-doctype") || null,
      page: el.getAttribute("data-requires-page") || null,
      fields
    };
  });

  function ensureRibbon(el) {
    let tag = el.querySelector(".mw-ribbon");
    if (!tag) {
      tag = document.createElement("span");
      tag.className = "mw-ribbon";
      tag.textContent = "لا صلاحية";
      el.appendChild(tag);
    }
  }

  function removeRibbon(el) {
    const tag = el.querySelector(".mw-ribbon");
    if (tag) tag.remove();
  }

  function paint(el, allowed) {
    // Reset
    el.classList.remove("disabled", "usable");
    el.removeAttribute("aria-disabled");
    el.removeAttribute("tabindex");
    el.removeAttribute("aria-describedby");
    if (el.getAttribute("title") === __("ليست لديك صلاحية لفتح هذه الشاشة")) {
      el.removeAttribute("title");
    }
    removeRibbon(el);

    if (!allowed) {
      el.classList.add("disabled");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("title", __("ليست لديك صلاحية لفتح هذه الشاشة"));
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-describedby", "mw-perm-popover");
      ensureRibbon(el);
      return "disabled";
    } else {
      el.classList.add("usable");
      return "usable";
    }
  }

  // Detect privileged quickly
  const roles = (frappe.boot?.user?.roles || []).map(r => String(r || "").toLowerCase());
  const is_privileged =
    roles.includes("milk admin") ||
    roles.includes("system manager") ||
    (String(frappe.session?.user || "").toLowerCase() === "administrator");

  if (is_privileged) {
    $root.find(".mw-card").each(function () {
      paint(this, true);
    });
    return;
  }

  if (!cards.length) return;

  // Backend batch call
  try {
    const r = await frappe.call({
      method: "milk.milk.page.milk.api.check_card_access",
      args: { cards }
    });
    const msg = r && r.message ? r.message : {};
    const allowedMap = msg.allowed || {};
    const reasonsMap = msg.reasons || {};
    $root.find(".mw-card").each(function () {
      const id = this.dataset.cardId;
      const ok = id && id in allowedMap ? !!allowedMap[id] : false;
      const reasons = (reasonsMap && reasonsMap[id]) || null;
      const state = paint(this, ok);
      if (state === "disabled") {
        attachPermHover(this, reasons || null);
      }
    });
  } catch (e) {
    // Fallback: basic checks; still attach popup inference
    $root.find(".mw-card").each(function () {
      const dt = this.getAttribute("data-requires-doctype");
      const pg = this.getAttribute("data-requires-page");
      let ok = true;
      try {
        if (dt) ok = !!(frappe.perm && typeof frappe.perm.has_perm === "function" && frappe.perm.has_perm(dt, 0, "read"));
        else if (pg) {
          const pages = (frappe.boot?.allowed_pages || []).map(x => (x && x.name) || x).filter(Boolean);
          ok = pages.includes(pg);
        }
      } catch {
        ok = false;
      }
      const state = paint(this, ok);
      if (state === "disabled") attachPermHover(this, null);
    });
  }
}

/* ----------------------- Icon fallback ----------------------- */
function ensure_milk_icon_fallback() {
  // No external image icons now; nothing to patch.
}

/* ----------------------- Entrance Animation ----------------------- */
function enable_card_parallax(root) {
  const cards = root.querySelectorAll(".mw-card");
  cards.forEach(card => {
    let raf = null;

    function onMove(e) {
      if (!card.classList.contains("usable")) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;   // -0.5..0.5
      const dy = (e.clientY - cy) / rect.height;  // -0.5..0.5
      const maxTilt = 5; // degrees
      const rx = (-dy * maxTilt);
      const ry = (dx * maxTilt);
      const tz = 18; // px

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `translateY(-6px) scale(1.02) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        card.style.transition = "transform .08s ease";
      });
    }

    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      card.style.transition = "transform .25s cubic-bezier(.2,.7,.2,1)";
      card.style.transform = ""; // let hover/focus CSS take over
    }

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    card.addEventListener("blur", onLeave);
  });
}

// Optional: slightly stronger entrance stagger
function animate_entrance(root) {
  const cards = root.querySelectorAll(".mw-card");
  cards.forEach((card, i) => {
    const delay = i * 60;
    const tilt = (Math.random() * 0.6 - 0.3).toFixed(2);
    card.style.transitionDelay = delay + "ms";
    card.style.transform += ` rotate(${tilt}deg)`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.classList.add("mw-in");
        setTimeout(() => { card.style.transform = ""; }, 680 + delay);
      }, 16);
    });
  });
}

/* ----------------------- Routing (disable-aware; no view/list; soft refresh) ----------------------- */
function bind_route_clicks_disable_aware($root) {
  const DOCTYPE_MAP = new Set([
    "Weekly Supplier Payment",
    "Supplier",
    "Item",
    "Driver",
    "Village",
    "Car Collection",
    "Milk Collection",
    "Supplier Loan",
    "Supplier Deduction",
    "Milk Quality",
  ]);

  $root.on("click", "a.mw-card", function (e) {
    const isDisabled = this.classList.contains("disabled") || this.getAttribute("aria-disabled") === "true";
    if (isDisabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const route = this.getAttribute("data-route");
    if (!route) return;

    if (route.startsWith("query-report/")) {
      const report_name = route.slice("query-report/".length);
      frappe.set_route("query-report", report_name);
    } else if (DOCTYPE_MAP.has(route)) {
      frappe.set_route("List", route);
    } else {
      frappe.set_route(route);
    }

    const try_soft_refresh = () => {
      const r = frappe.get_route ? frappe.get_route() : null;
      if (Array.isArray(r) && r.length) {
        const [type, name] = r;

        if (type === "List") {
          const lv = window.cur_list || (frappe.container && frappe.container.page && frappe.container.page.listview);
          if (lv && typeof lv.refresh === "function") { lv.refresh(); return true; }
          if (frappe.views?.listview?.refresh) { frappe.views.listview.refresh(); return true; }
        }

        if (type === "query-report") {
          if (window.cur_report && typeof window.cur_report.refresh === "function") { cur_report.refresh(); return true; }
          const reg = frappe.query_reports && frappe.query_reports[name];
          if (reg?.report?.refresh) { reg.report.refresh(); return true; }
        }

        if (type === "Form" && window.cur_frm?.refresh) {
          window.cur_frm.refresh(); return true;
        }
      }
      return false;
    };

    const on_router_change = () => {
      let tries = 0;
      const max = 10;
      const t = setInterval(() => {
        tries += 1;
        if (try_soft_refresh() || tries >= max) clearInterval(t);
      }, 120);
    };

    document.addEventListener("frappe.router.change", on_router_change, { once: true });
    setTimeout(on_router_change, 400);
  });
}