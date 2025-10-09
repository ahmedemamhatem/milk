(function () {
  const WRAP_ID = 'mw-navbar-center-bundle';
  const STYLE_ID = 'mw-navbar-center-bundle-style';
  const BTN_HOME_ID = 'mw-btn-home';
  const BTN_QUAL_ID = 'mw-btn-qual';
  const BTN_COLL_ID = 'mw-btn-coll';
  const BTN_SALES_ID = 'mw-btn-sales';
  const ADMIN_HOME_ID = 'mw-btn-admin-home';
  const ROUTE_HOME = 'app/milk';
  const ROUTE_ADMIN_HOME = 'app/accounting';

  const MENU_ID = 'mw-actions-menu';
  const MENU_BTN_ID = 'mw-actions-trigger';
  const MOBILE_BREAKPOINT = 768; // px

  function isAdministrator() {
    try {
      const name = window.frappe?.boot?.user?.name || window.frappe?.session?.user || '';
      return String(name).toLowerCase() === 'administrator';
    } catch {}
    return false;
  }

  function hasMilkAdminRole() {
    try {
      const roles = window.frappe?.boot?.user?.roles || [];
      if (Array.isArray(roles)) {
        return roles.some((r) => String(r).toLowerCase() === 'milk admin');
      }
      if (roles && typeof roles === 'object') {
        return Object.keys(roles).some((k) => String(k).toLowerCase() === 'milk admin');
      }
    } catch {}
    return false;
  }

  function isPrivileged() {
    return isAdministrator() || hasMilkAdminRole();
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function go(route) {
    const r = (route || '').replace(/^#\//, '').replace(/^#/, '');
    if (window.frappe?.router?.navigate) frappe.router.navigate(r);
    else window.location.hash = '#/' + r;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    // Note: No blanket CSS to hide search here anymore.
    // We will selectively hide found search nodes via a data attribute.

    const css = `
      :root{
        --mw-gap: 8px;
        --mw-radius: 9999px;
        --mw-shadow: 0 6px 18px rgba(0,0,0,0.10);
        --mw-bg: rgba(255,255,255,0.72);
        --mw-border: 1px solid rgba(15,23,42,0.08);
        --mw-blur: saturate(1.1) blur(6px);
      }

      header.navbar, .navbar{ position: relative; }

      /* Center the wrapper in the middle of the bar */
      #${WRAP_ID}{
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: inline-flex;
        align-items: center;
        gap: var(--mw-gap);
        pointer-events: none;
        z-index: 5;
      }

      #${WRAP_ID} .mw-group{
        display: flex; align-items: center; gap: 8px;
        pointer-events: auto; padding: 4px; border-radius: var(--mw-radius);
        background: var(--mw-bg);
        box-shadow: var(--mw-shadow);
        backdrop-filter: var(--mw-blur);
        -webkit-backdrop-filter: var(--mw-blur);
        border: var(--mw-border);
      }

      #${WRAP_ID} .mw-btn{
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 12px; border-radius: var(--mw-radius);
        font-weight: 800; font-size: 13px; line-height: 1;
        border: 1px solid transparent; text-decoration: none; cursor: pointer;
        transition: transform 90ms ease, box-shadow 150ms ease, filter 160ms ease, opacity 160ms ease;
        white-space: nowrap;
      }
      #${WRAP_ID} .mw-ico{ font-size: 16px; line-height: 1; }
      #${WRAP_ID} .mw-ico img{ width: 18px; height: 18px; display: block; object-fit: contain; }

      /* Colors */
      #${BTN_HOME_ID}{
        color: #ffffff;
        background: linear-gradient(135deg, #16a34a 0%, #0ea5e9 100%);
        border-color: rgba(14,165,233,0.35);
        box-shadow: 0 2px 6px rgba(16,185,129,0.25), 0 6px 16px rgba(14,165,233,0.25);
      }
      #${BTN_HOME_ID}:hover{ filter: brightness(1.03); box-shadow: 0 4px 14px rgba(14,165,233,0.28); }
      #${BTN_HOME_ID}:active{ transform: translateY(1px) scale(0.99); }

      #${BTN_QUAL_ID}{
        color: #0f172a;
        background: linear-gradient(135deg, #f59e0b 0%, #fef3c7 100%);
        border-color: rgba(245,158,11,0.35);
        box-shadow: 0 2px 6px rgba(245,158,11,0.20), 0 6px 16px rgba(245,158,11,0.18);
      }
      #${BTN_QUAL_ID}:hover{ filter: brightness(1.03); box-shadow: 0 4px 14px rgba(245,158,11,0.25); }
      #${BTN_QUAL_ID}:active{ transform: translateY(1px) scale(0.99); }

      #${BTN_COLL_ID}{
        color: #0f172a;
        background: linear-gradient(135deg, #6366f1 0%, #e0e7ff 100%);
        border-color: rgba(99,102,241,0.35);
        box-shadow: 0 2px 6px rgba(99,102,241,0.22), 0 6px 16px rgba(99,102,241,0.20);
      }
      #${BTN_COLL_ID}:hover{ filter: brightness(1.03); box-shadow: 0 4px 14px rgba(99,102,241,0.26); }
      #${BTN_COLL_ID}:active{ transform: translateY(1px) scale(0.99); }

      #${BTN_SALES_ID}{
        color: #0f172a;
        background: linear-gradient(135deg, #14b8a6 0%, #38bdf8 100%);
        border-color: rgba(20,184,166,0.35);
        box-shadow: 0 2px 6px rgba(20,184,166,0.22), 0 6px 16px rgba(56,189,248,0.20);
      }
      #${BTN_SALES_ID}:hover{ filter: brightness(1.03); box-shadow: 0 4px 14px rgba(56,189,248,0.26); }
      #${BTN_SALES_ID}:active{ transform: translateY(1px) scale(0.99); }

      /* Privileged-only Accounting button */
      #${ADMIN_HOME_ID}{
        color: #0f172a;
        background: linear-gradient(135deg, #e5e7eb 0%, #ffffff 100%);
        border-color: rgba(15,23,42,0.18);
        box-shadow: 0 2px 6px rgba(15,23,42,0.14), 0 6px 16px rgba(15,23,42,0.10);
      }
      #${ADMIN_HOME_ID}:hover{ filter: brightness(1.02); box-shadow: 0 4px 14px rgba(15,23,42,0.18); }
      #${ADMIN_HOME_ID}:active{ transform: translateY(1px) scale(0.99); }

      /* Actions trigger (mobile only) */
      #${MENU_BTN_ID}{
        pointer-events: auto;
        display: none;
        align-items: center; gap: 8px;
        padding: 9px 12px; border-radius: var(--mw-radius);
        font-weight: 800; font-size: 13px; line-height: 1; cursor: pointer;
        background: linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%);
        color: #fff; border: 1px solid rgba(14,165,233,0.35);
        box-shadow: 0 2px 6px rgba(14,165,233,0.25), 0 6px 16px rgba(34,197,94,0.22);
      }
      #${MENU_BTN_ID}:hover{ filter: brightness(1.03); }

      /* Floating menu (popover) */
      #${MENU_ID}{
        position: absolute; inset: auto 12px 8px auto; transform: translateY(10px);
        background: #fff; border: 1px solid rgba(15,23,42,0.10);
        box-shadow: 0 12px 30px rgba(0,0,0,0.14);
        border-radius: 12px; padding: 8px; min-width: 220px;
        display: none; z-index: 9999;
      }
      #${MENU_ID}.open{ display: block; }
      #${MENU_ID} .menu-item{
        width: 100%; display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: 10px; cursor: pointer; border: none; background: transparent;
        font-weight: 700; font-size: 13px; color: #0f172a; text-align: start;
      }
      #${MENU_ID} .menu-item:hover{ background: #f3f4f6; }
      #${MENU_ID} .ico{ width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; }

      header.navbar .container, .navbar .container{
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }

      @media (max-width: ${MOBILE_BREAKPOINT}px){
        #${WRAP_ID}{ left: 50%; transform: translate(-50%, -50%); }
      }

      /* Only hide search nodes we explicitly mark via JS for non-admin users */
      .mw-hide-search-for-user { display: none !important; }
    `;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function findNavbar() {
    return (
      document.querySelector('header.navbar .container') ||
      document.querySelector('.navbar .container') ||
      document.querySelector('header.navbar') ||
      document.querySelector('.navbar') ||
      document.querySelector('nav.navbar')
    );
  }

  // Gently gate search: only hide existing search elements for non-admins; never override admin; don't force anything if absent.
  function gateNavbarSearch() {
    const admin = isAdministrator();
    const scope = findNavbar() || document;
    if (!scope) return;

    const selectors = [
      '.navbar-search',
      '.search-bar',
      '.navbar-form',
      '.global-search',
      '.search-input'
    ];

    const nodes = [];
    selectors.forEach(sel => {
      scope.querySelectorAll(sel).forEach(el => {
        // Collect unique elements only
        if (!nodes.includes(el)) nodes.push(el);
      });
    });

    // If nothing found, do nothing.
    if (!nodes.length) return;

    nodes.forEach(el => {
      if (admin) {
        el.classList.remove('mw-hide-search-for-user');
      } else {
        el.classList.add('mw-hide-search-for-user');
      }
    });
  }

  function ensureCenterBundle() {
    const navbar = findNavbar();
    if (!navbar) return;
    injectStyles();

    // Gate search without overriding if not present
    gateNavbarSearch();

    // Ensure wrapper
    let wrap = document.getElementById(WRAP_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = WRAP_ID;
    }

    // Ensure button group
    let group = wrap.querySelector('.mw-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'mw-group';
      wrap.appendChild(group);
    }

    // Primary buttons
    if (!document.getElementById(BTN_HOME_ID)) {
      const btn = document.createElement('button');
      btn.id = BTN_HOME_ID; btn.className = 'mw-btn'; btn.type = 'button';
      btn.innerHTML = `<span class="mw-ico">🏠</span><span>الصفحة الرئيسية</span>`;
      btn.addEventListener('click', (e) => { e.preventDefault(); go(ROUTE_HOME); });
      group.appendChild(btn);
    }

    if (!document.getElementById(BTN_QUAL_ID)) {
      const btn = document.createElement('button');
      btn.id = BTN_QUAL_ID; btn.className = 'mw-btn'; btn.type = 'button';
      btn.innerHTML = `<span class="mw-ico">🧪</span><span>طباعة مسودة الجوده</span>`;
      btn.addEventListener('click', (e) => { e.preventDefault(); openQualityDialog(); });
      group.appendChild(btn);
    }

    if (!document.getElementById(BTN_COLL_ID)) {
      const btn = document.createElement('button');
      btn.id = BTN_COLL_ID; btn.className = 'mw-btn'; btn.type = 'button';
      btn.innerHTML = `
        <span class="mw-ico" aria-hidden="true">
          <img src="/assets/milk/images/259397.png" alt="">
        </span>
        <span>طباعة مسودة التجميع</span>
      `;
      btn.addEventListener('click', (e) => { e.preventDefault(); openCollectionDialog(); });
      group.appendChild(btn);
    }

    if (!document.getElementById(BTN_SALES_ID)) {
      const btn = document.createElement('button');
      btn.id = BTN_SALES_ID; btn.className = 'mw-btn'; btn.type = 'button';
      btn.innerHTML = `<span class="mw-ico">🧾</span><span>طباعة نموذج مبيعات</span>`;
      btn.addEventListener('click', (e) => { e.preventDefault(); openSalesDialog(); });
      group.appendChild(btn);
    }

    // Privileged-only Accounting button
    createAdminHomeButton(group);

    // Actions trigger button (mobile only)
    let menuBtn = document.getElementById(MENU_BTN_ID);
    if (!menuBtn) {
      menuBtn = document.createElement('button');
      menuBtn.id = MENU_BTN_ID;
      menuBtn.type = 'button';
      menuBtn.innerHTML = `<span class="mw-ico">⚡</span><span>إجراءات</span>`;
      menuBtn.addEventListener('click', toggleMenu);
      wrap.appendChild(menuBtn);
    }

    // Actions menu
    let menu = document.getElementById(MENU_ID);
    if (!menu) {
      menu = document.createElement('div');
      menu.id = MENU_ID;
      menu.setAttribute('dir', 'rtl');
      let baseMenuHtml = `
        <button class="menu-item" data-act="home"><span class="ico">🏠</span><span>الصفحة الرئيسية</span></button>
        <button class="menu-item" data-act="qual"><span class="ico">🧪</span><span>طباعة مسودة الجوده</span></button>
        <button class="menu-item" data-act="coll"><span class="ico"><img src="/assets/milk/images/259397.png" alt="" style="width:18px;height:18px;object-fit:contain"></span><span>طباعة مسودة التجميع</span></button>
        <button class="menu-item" data-act="sales"><span class="ico">🧾</span><span>طباعة نموذج مبيعات</span></button>
      `;
      if (isPrivileged()) {
        baseMenuHtml += `
        <div style="border-top:1px solid #e5e7eb; margin:6px 0;"></div>
        <button class="menu-item" data-act="admin-home"><span class="ico">🧭</span><span>شاشة الحسابات</span></button>
        `;
      }
      menu.innerHTML = baseMenuHtml;

      menu.addEventListener('click', (e) => {
        const btn = e.target.closest('.menu-item');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        closeMenu();
        if (act === 'home') go(ROUTE_HOME);
        if (act === 'qual') openQualityDialog();
        if (act === 'coll') openCollectionDialog();
        if (act === 'sales') openSalesDialog();
        if (act === 'admin-home') go(ROUTE_ADMIN_HOME);
      });
      document.body.appendChild(menu);
      document.addEventListener('click', (e) => {
        const inside = e.target.closest('#' + MENU_ID) || e.target.closest('#' + MENU_BTN_ID);
        if (!inside) closeMenu();
      });
      window.addEventListener('resize', closeMenu);
      window.addEventListener('scroll', closeMenu, true);
    } else {
      // Sync role-sensitive item
      const adminItem = menu.querySelector('[data-act="admin-home"]');
      if (isPrivileged() && !adminItem) {
        const divider = document.createElement('div');
        divider.style.borderTop = '1px solid #e5e7eb';
        divider.style.margin = '6px 0';
        const btn = document.createElement('button');
        btn.className = 'menu-item';
        btn.setAttribute('data-act', 'admin-home');
        btn.innerHTML = `<span class="ico">🧭</span><span>شاشة الحسابات</span>`;
        menu.appendChild(divider);
        menu.appendChild(btn);
      } else if (!isPrivileged() && adminItem) {
        const divider = adminItem.previousElementSibling;
        if (divider && divider.tagName === 'DIV') divider.remove();
        adminItem.remove();
      }
    }

    // Attach wrapper to navbar if not already
    if (wrap.parentElement !== navbar) {
      navbar.appendChild(wrap);
    }

    // Mobile vs desktop visibility
    if (isMobile()) {
      group.style.display = 'none';
      document.getElementById(MENU_BTN_ID).style.display = 'inline-flex';
    } else {
      group.style.display = 'flex';
      document.getElementById(MENU_BTN_ID).style.display = 'none';
    }
  }

  function createAdminHomeButton(group) {
    const existing = document.getElementById(ADMIN_HOME_ID);
    if (isPrivileged()) {
      if (!existing) {
        const btn = document.createElement('button');
        btn.id = ADMIN_HOME_ID; btn.className = 'mw-btn'; btn.type = 'button';
        btn.title = 'الذهاب إلى شاشة الحسابات';
        btn.innerHTML = `<span class="mw-ico">🧭</span><span>شاشة الحسابات</span>`;
        btn.addEventListener('click', (e) => { e.preventDefault(); go(ROUTE_ADMIN_HOME); });
        group.appendChild(btn);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function toggleMenu() {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;
    if (menu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }
  function openMenu() {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(MENU_BTN_ID);
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    menu.style.top = (window.scrollY + r.bottom + 8) + 'px';
    menu.style.left = 'auto';
    menu.style.right = Math.max(8, window.innerWidth - (r.right)) + 'px';
    menu.classList.add('open');
  }
  function closeMenu() {
    const menu = document.getElementById(MENU_ID);
    if (menu) menu.classList.remove('open');
  }

  // Dialogs
  function openQualityDialog() {
    if (!window.frappe) return;
    const dlg = new frappe.ui.Dialog({
      title: __('طباعة مسودة الجوده'),
      fields: [
        { fieldtype:'Select', fieldname:'animal_type', label:'النوع', options:[{label:'بقر', value:'Cow'}, {label:'جاموس', value:'Buffalo'}], default:'Buffalo', reqd:1 },
        { fieldtype:'Select', fieldname:'session', label:'الفترة', options:[{label:'صباح', value:'morning'}, {label:'مساء', value:'evening'}], default:'morning', reqd:1 },
        { fieldtype:'Date', fieldname:'date', label:'التاريخ', default: frappe.datetime.get_today(), reqd:1 },
        { fieldtype:'Link', fieldname:'driver', label:'الخط', options:'Driver' , reqd:1},
        { fieldtype:'Link', fieldname:'village', label:'القرية', options:'Village' }
      ],
      primary_action_label: __('طباعة'),
      primary_action(values){ dlg.hide(); printQuality(values); }
    });
    dlg.$wrapper.attr('dir', 'rtl');
    dlg.show();
  }

  function openCollectionDialog() {
    if (!window.frappe) return;
    const dlg = new frappe.ui.Dialog({
      title: __('طباعة مسودة التجميع'),
      fields: [
        { fieldtype:'Date', fieldname:'collection_date', label:'تاريخ التجميع', default: frappe.datetime.get_today(), reqd:1 },
        { fieldtype:'Link', fieldname:'driver', label:'الخط', options:'Driver', reqd:1 },
        { fieldtype:'Link', fieldname:'village', label:'القرية', options:'Village' }
      ],
      primary_action_label: __('طباعة'),
      primary_action(values){ dlg.hide(); printCollection(values); }
    });
    dlg.$wrapper.attr('dir', 'rtl');
    dlg.show();
  }

  function openSalesDialog() {
    if (!window.frappe) return;
    const dlg = new frappe.ui.Dialog({
      title: __('طباعة نموذج مبيعات'),
      fields: [
        { fieldtype:'Date', fieldname:'posting_date', label:'تاريخ القيد', default: frappe.datetime.get_today(), reqd:1 },
        { fieldtype:'Link', fieldname:'customer_group', label:'مجموعة العملاء', options:'Customer Group' },
        { fieldtype:'Link', fieldname:'item_code', label:'الصنف', options:'Item', reqd:1 },
        { fieldtype:'Link', fieldname:'set_warehouse', label:'المخزن', options:'Warehouse' },
        { fieldtype:'Link', fieldname:'mode_of_payment', label:'طريقة الدفع', options:'Mode of Payment' },
        { fieldtype:'Int', fieldname:'limit_rows', label:'عدد العملاء (اختياري)', description:'اتركها فاضية لطباعة كل المجموعة', default: null }
      ],
      primary_action_label: __('طباعة'),
      primary_action(values){ dlg.hide(); printSalesBlank(values); }
    });
    dlg.$wrapper.attr('dir', 'rtl');
    dlg.show();
  }

  // Print Sales Blank
  async function printSalesBlank(values) {
  try {
    const date = values.posting_date || '';
    const group = values.customer_group || '';
    const item = values.item_code || '';
    const warehouse = values.set_warehouse || '';
    const mop = values.mode_of_payment || '';
    const limit_rows = values.limit_rows ? parseInt(values.limit_rows, 10) : null;

    if (!item) {
      frappe.throw(__('اختار الصنف قبل الطباعة.'));
      return;
    }
    if (!group) {
      frappe.throw(__('اختار مجموعة العملاء أو استخدم صفحة الفواتير السريعة لاختيار عملاء فرديين.'));
      return;
    }

    frappe.dom.freeze(__('جاري تجهيز نموذج المبيعات...'));

    const customers = await frappe.db.get_list('Customer', {
      fields: ['name', 'customer_name', 'disabled'],
      filters: [['customer_group', '=', group], ['disabled', '=', 0]],
      order_by: 'customer_name asc',
      limit: limit_rows && Number.isFinite(limit_rows) && limit_rows > 0 ? limit_rows : 1000
    });

    if (!customers || customers.length === 0) {
      frappe.msgprint(__('مافيش عملاء نشطين في المجموعة.'));
      return;
    }

    // Fetch balances safely
    let balances = {};
    try {
      const r = await frappe.call({
        method: 'milk.api.get_customer_balances',
        args: { customers: customers.map(c => c.name) }
      });
      balances = (r && r.message && typeof r.message === 'object') ? r.message : {};
    } catch (e) {
      console.warn('get_customer_balances failed:', e);
      balances = {};
    }

    // Build rows with a guaranteed numeric balance (default 0)
    const rows = customers.map((c) => {
      const raw = balances[c.name];
      const num = Number(raw);
      const balance = Number.isFinite(num) ? num : 0;
      return { name: c.name, balance };
    });

    const esc = (s) =>
      (s || '')
        .toString()
        .replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    // Typography and spacing upgrades for visibility
    const css = `
      *{box-sizing:border-box}
      html,body{height:100%}
      body{
        font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        color:#111827;
        margin:24px;
        font-size:14px;        /* bigger base font */
        line-height:1.5;       /* looser line height */
      }
      h1{
        font-size:22px;        /* bigger title */
        margin:0 0 12px 0;
        font-weight:700;
        letter-spacing:0.2px;
      }
      .meta{
        display:flex;
        gap:14px;
        flex-wrap:wrap;
        margin-bottom:12px
      }
      .meta .kv{
        background:#fafafa;
        border:1px solid #e5e7eb;
        border-radius:8px;
        padding:8px 10px;
        font-size:13px;
      }
      table{
        width:100%;
        border-collapse:separate;       /* separate for nicer borders & row height */
        border-spacing:0;
        table-layout:fixed;
      }
      th,td{
        border:1px solid #e5e7eb;
        padding:10px 10px;             /* larger padding */
        font-size:14px;                 /* bigger cell font */
        vertical-align:middle;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        height:40px;                    /* taller rows */
      }
      th{
        background:#f3f4f6;
        font-weight:600;
      }
      /* Adjust column widths: wider customer and note cells */
      col.idx{width:48px}
      col.cust{width:50%}
      col.qty{width:10%}
      col.paid{width:12%}
      col.old{width:14%}
      col.note{width:14%}

      /* Right align numbers for readability */
      td.num{text-align:right}

      /* Improve print clarity: larger margins and darker borders */
      @media print{
        body{margin:10mm; font-size:13pt}
        th,td{border-color:#d1d5db}
        .no-print{display:none !important}
      }
    `;

    const rows_html = rows.map((c, i) =>
      '<tr>'
        + '<td>' + (i + 1) + '</td>'
        + '<td title="' + esc(c.name) + '">' + esc(c.name) + '</td>'
        + '<td></td>'
        + '<td></td>'
        + '<td class="num">' + esc(c.balance.toFixed(2)) + '</td>'
        + '<td></td>'
      + '</tr>'
    ).join('');

    const html =
      '<!doctype html><html><head><meta charset="utf-8"><title>نموذج مبيعات</title><style>' + css + '</style></head>'
      + '<body onload="setTimeout(function(){window.print();}, 100)">'
      + '<h1>نموذج مبيعات</h1>'
      + '<div class="meta">'
        + '<div class="kv"><strong>التاريخ:</strong> ' + esc(date) + '</div>'
        + '<div class="kv"><strong>مجموعة العملاء:</strong> ' + esc(group) + '</div>'
        + '<div class="kv"><strong>الصنف:</strong> ' + esc(item) + '</div>'
        + (warehouse ? '<div class="kv"><strong>المخزن:</strong> ' + esc(warehouse) + '</div>' : '')
        + (mop ? '<div class="kv"><strong>طريقة الدفع:</strong> ' + esc(mop) + '</div>' : '')
      + '</div>'
      + '<table><colgroup>'
        + '<col class="idx"><col class="cust"><col class="qty"><col class="paid"><col class="old"><col class="note">'
      + '</colgroup>'
      + '<thead><tr>'
        + '<th>#</th><th>العميل</th><th>الكمية</th><th>المدفوع</th><th>الرصيد القديم</th><th>ملاحظة</th>'
      + '</tr></thead>'
      + '<tbody>' + rows_html + '</tbody></table>'
      + '<div class="no-print" style="margin-top:12px;"><button onclick="window.print()">طباعة</button></div>'
      + '</body></html>';

    openPrintHTML(html);
  } catch (e) {
    console.error(e);
    frappe.msgprint({ title: __('خطأ'), message: e.message || String(e), indicator: 'red' });
  } finally {
    frappe.dom.unfreeze();
  }
}

function openPrintHTML(html) {
  const w = window.open('', '_blank');
  if (!w) {
    frappe.msgprint(__('السماح بفتح النوافذ المنبثقة (Pop-ups) لإتمام الطباعة.'));
    return;
  }
  w.document.open();

  // Ensure an onload print trigger exists
  const autoPrintHtml = html.replace(
    /<body([^>]*)>/i,
    (m, attrs) => `<body${attrs} onload="setTimeout(function(){window.print();}, 100)">`
  );

  w.document.write(autoPrintHtml);
  w.document.close();

  try {
    w.addEventListener('afterprint', () => {
      try { w.close(); } catch (e) {}
    });
  } catch (e) {}
}

  
  function openPrintHTML(html) {
    const w = window.open('', '_blank');
    if (!w) { frappe?.msgprint?.(__('فضلاً فعّل النوافذ المنبثقة للسماح بالطباعة.')); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
  }

  // Print: Quality
  async function printQuality(values) {
    const esc = (window.frappe?.utils?.escape_html || ((x)=>x));
    const filters = {
      animal_type: values.animal_type || 'Buffalo',
      session: values.session || 'morning',
      date: values.date || frappe.datetime.get_today(),
      driver: values.driver || '',
      village: values.village || ''
    };
    try {
      frappe.dom.freeze(__('جاري تحضير المسودة...'));
      const r = await frappe.call({
        method: "milk.milk.page.daily_milk_quality.api.load_daily_quality",
        args: { driver: filters.driver, village: filters.village, date: filters.date }
      });
      const raw = r.message?.rows || [];

      const rows = (await Promise.all(raw.map(async (x, i) => {
        const id = x.supplier || '';
        if (!id) return null;
        const res = await frappe.db.get_value('Supplier', id, 'supplier_name');
        return { idx: i + 1, supplier_name: res?.message?.supplier_name || id };
      }))).filter(Boolean);

      const rowsHtml = rows.map(r => `
        <tr>
          <td class="idx">${r.idx}</td>
          <td class="start">${esc(r.supplier_name)}</td>
          <td></td><td></td><td></td><td></td><td></td>
        </tr>`).join('');

      const session_label = filters.session === 'evening' ? 'مساء' : 'صباح';
      const animal_label = filters.animal_type === 'Cow' ? 'بقر' : 'جاموس';

      openPrintHTML(`
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc('مسودة تسجيل جودة اللبن')}</title>
<style>
  :root{ --ink:#111827; --muted:#6b7280; --line:#d1d5db; }
  html,body{ margin:0; padding:0; color:var(--ink); background:#fff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans"; }
  .wrap{ padding:24px; }
  h1{ font-size:18px; margin:0 0 10px; text-align:center; }
  .meta{ display:flex; flex-wrap:wrap; gap:8px 16px; justify-content:center; color:var(--muted); font-weight:700; margin-bottom:14px; }
  .meta .item{ white-space:nowrap; }
  table{ width:100%; border-collapse:collapse; }
  th,td{ border:1px solid var(--line); padding:10px 8px; text-align:center; }
  th{ background:#f7f7f7; font-size:12px; color:#374151; }
  td{ height:36px; }
  td.start, th.start{ text-align:right; }
  td.idx{ width:48px; }
  @media print{ .wrap{ padding:0; } .print-hide{ display:none!important; } @page{ margin:14mm; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>${esc('مسودة تسجيل جودة اللبن')}</h1>
  <div class="meta">
    <div class="item">النوع: ${esc(animal_label)}</div>
    <div class="item">الفترة: ${esc(session_label)}</div>
    <div class="item">التاريخ: ${esc(filters.date)}</div>
    ${filters.driver ? `<div class="item">الخط: ${esc(filters.driver)}</div>` : ``}
    ${filters.village ? `<div class="item">القرية: ${esc(filters.village)}</div>` : ``}
  </div>
  <table>
    <thead><tr><th>#</th><th class="start">المورد</th><th>ماء</th><th>بروتين</th><th>كثافة</th><th>صلابة</th><th>بنط</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="print-hide" style="margin-top:12px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 12px; font-weight:700;">طباعة</button>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),150);</script>
</body>
</html>`);
    } catch (e) {
      console.error(e);
      frappe.msgprint(__('حدث خطأ أثناء التحضير للطباعة.'));
    } finally {
      frappe.dom.unfreeze();
    }
  }

  // Print: Collection
  async function printCollection(values) {
    const esc = (window.frappe?.utils?.escape_html || ((x)=>x));
    const selectedDriver = values.driver || '';
    const selectedVillage = values.village || '';

    try {
      frappe.dom.freeze(__('جاري تجهيز المسودة للطباعة...'));

      const suppliers = await frappe.db.get_list('Supplier', {
        fields: [
          'name','supplier_name','disabled','custom_milk_supplier','custom_driver_in_charge',
          'custom_villages','custom_buffalo','custom_cow','custom_sort'
        ],
        filters: { disabled: 0, custom_milk_supplier: 1 },
        limit: 5000
      });

      if (!suppliers || suppliers.length === 0) {
        frappe.msgprint(__('لا يوجد موردون نشطون بعلم المورد لبن.'));
        return;
      }

      const parseVillagesList = function (cv) {
        const out = [];
        if (!cv) return out;
        if (Array.isArray(cv)) {
          cv.forEach(item => {
            if (!item) return;
            if (typeof item === 'string') { const v = item.trim(); if (v) out.push(v); }
            else if (typeof item === 'object') {
              const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
              if (v) out.push(v);
            }
          });
          return out;
        }
        if (typeof cv === 'string') {
          const s = cv.trim();
          if (!s) return out;
          try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) {
              arr.forEach(item => {
                if (!item) return;
                if (typeof item === 'string') { const v = item.trim(); if (v) out.push(v); }
                else if (typeof item === 'object') {
                  const v = (item.village || item.village_name || item.value || item.name || '').toString().trim();
                  if (v) out.push(v);
                }
              });
              return out;
            }
          } catch (e) {
            s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
            return out;
          }
          s.split(',').map(x => x.trim()).filter(Boolean).forEach(v => out.push(v));
          return out;
        }
        return out;
      };

      const rows = [];
      suppliers.forEach(sup => {
        const driver_name = (sup.custom_driver_in_charge || '').toString().trim() || __('غير محدد');
        if (selectedDriver && driver_name !== selectedDriver) return;

        const villages = parseVillagesList(sup.custom_villages);
        if (!villages.length) return;

        const vUse = selectedVillage ? villages.filter(v => v === selectedVillage) : villages;
        if (!vUse.length) return;

        const sup_name = sup.supplier_name || sup.name;
        const sort_key = Number.isFinite(Number(sup.custom_sort)) && Number(sup.custom_sort) !== 0 ? Number(sup.custom_sort) : 999999;

        const add = (label) => vUse.forEach(vname => {
          rows.push({ driver: driver_name, village: vname, supplier: sup_name, milk_type: label, sort_key });
        });

        if (Number(sup.custom_cow) === 1) add('بقري');
        if (Number(sup.custom_buffalo) === 1) add('جاموسي');
      });

      if (!rows.length) {
        frappe.msgprint(__('لا توجد صفوف للطباعة بعد تطبيق الفلاتر.'));
        return;
      }

      rows.sort((a, b) => {
        if (a.driver !== b.driver) return a.driver.localeCompare(b.driver, 'ar');
        if (a.sort_key !== b.sort_key) return a.sort_key - b.sort_key;
        if (a.supplier !== b.supplier) return a.supplier.localeCompare(b.supplier, 'ar');
        return a.milk_type.localeCompare(b.milk_type, 'ar');
      });

      const byVillageMap = {};
      rows.forEach(r => { (byVillageMap[r.village] = byVillageMap[r.village] || []).push(r); });
      const villageNames = Object.keys(byVillageMap).sort((a, b) => a.localeCompare(b, 'ar'));

      let html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(__('مسودة تجميع الموردين'))}</title>
<style>
  :root{ --border:#0f172a; --muted:#627084; --text:#0f172a; }
  @page{ size: A4 portrait; margin: 8mm; }
  html, body{ margin:0; padding:0; color:var(--text); background:#fff; font-family:"Tajawal","Cairo",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Arabic","Noto Sans",sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .canvas{ width: 194mm; margin: 0 auto; overflow: hidden; box-sizing: border-box; }
  .fitwrap{ transform-origin: top center; }
  .hdr{ display:flex; justify-content:space-between; align-items:flex-end; margin:0 0 3mm 0; border-bottom:1.2px solid var(--border); padding-bottom:2mm; }
  .hdr .title{ font-size:14px; font-weight:800; }
  .hdr .meta{ font-size:10px; color:var(--muted); }
  .village{ margin: 3mm 0; page-break-inside: avoid; }
  .village-title{ font-weight:800; margin:0 0 1.5mm 0; font-size:11px; }
  .grid{ width:100%; border:1.2px solid var(--border); border-radius:0; overflow:hidden; box-sizing: border-box; }
  .row{ display:grid; grid-template-columns: 8mm 45mm 12mm 16mm 16mm 8mm 45mm 12mm 16mm 16mm; align-items: stretch; border-top:1px solid var(--border); min-height: 9.5mm; }
  .row:first-child{ border-top:none; }
  .cell{ padding:2.2mm 1.2mm; font-size:9.8px; border-inline-start:1px solid var(--border); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center; box-sizing: border-box; }
  .cell:first-child{ border-inline-start:none; }
  .start{ text-align:start; }
</style>
</head>
<body>
<div class="canvas">
  <div id="fitwrap" class="fitwrap scale-100">
    <div class="hdr">
      <div class="title">${esc(__('مسودة تسجيل اللبن'))} -- ${esc(rows[0]?.driver || __('غير محدد'))}</div>
    </div>
`;

      villageNames.forEach(villageName => {
        const group = byVillageMap[villageName];
        const N = group.length;
        const half = Math.ceil(N / 2);

        let rowsHtml = '';
        for (let i = 0; i < Math.max(half, N - half); i++) {
          const a = group[i] || null;
          const b = group[half + i] || null;
          const aIdx = a ? (i + 1) : '';
          const bIdx = b ? (half + i + 1) : '';

          rowsHtml += `
          <div class="row">
            <div class="cell">${aIdx}</div>
            <div class="cell start">${a ? esc(a.supplier) : ''}</div>
            <div class="cell">${a ? esc(a.milk_type) : ''}</div>
            <div class="cell"></div>
            <div class="cell"></div>
            <div class="cell">${bIdx}</div>
            <div class="cell start">${b ? esc(b.supplier) : ''}</div>
            <div class="cell">${b ? esc(b.milk_type) : ''}</div>
            <div class="cell"></div>
            <div class="cell"></div>
          </div>`;
        }

        html += `
      <div class="village">
        <div class="village-title">${esc(__('القرية'))}: ${esc(villageName || __('غير محدد'))}</div>
        <div class="grid">
          ${rowsHtml || `<div class="row"><div class="cell" style="grid-column:1 / -1; text-align:center; color:#777">${esc(__('لا توجد بيانات'))}</div></div>`}
        </div>
      </div>
`;
      });

      html += `
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body>
</html>`;

      openPrintHTML(html);
    } catch (e) {
      console.error(e);
      frappe.msgprint({ title: __('خطأ'), message: e.message || String(e), indicator: 'red' });
    } finally {
      frappe.dom.unfreeze();
    }
  }

  function boot() {
    const run = () => setTimeout(() => { ensureCenterBundle(); gateNavbarSearch(); }, 0);
    [0, 100, 300, 800, 1500].forEach(t => setTimeout(() => { ensureCenterBundle(); gateNavbarSearch(); }, t));
    window.addEventListener('resize', run);
    window.addEventListener('hashchange', run);
    document.addEventListener('frappe.router.change', run);
    if (window.frappe && frappe.after_ajax) frappe.after_ajax(run);

    // Observe navbar changes and re-gate search only if present
    const nav = document.querySelector('header.navbar') || document.querySelector('.navbar') || document.body;
    if (nav && !nav._mwObserved) {
      nav._mwObserved = true;
      new MutationObserver(() => { gateNavbarSearch(); ensureCenterBundle(); })
        .observe(nav, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();