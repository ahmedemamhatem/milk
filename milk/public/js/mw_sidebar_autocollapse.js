// Auto-hide sidebar on all workspaces for non–System Manager users.
// Uses native toggle; no custom button.

(function () {
  const EXEMPT_ROLE = 'System Manager';

  function isExemptUser() {
    try {
      if (window.frappe && frappe.boot) {
        const rolesA = Array.isArray(frappe.boot.user && frappe.boot.user.roles)
          ? frappe.boot.user.roles
          : null;
        const rolesB = Array.isArray(frappe.boot.user_roles) ? frappe.boot.user_roles : null;
        const roles = rolesA || rolesB || [];
        return roles.includes(EXEMPT_ROLE);
      }
    } catch (e) {}
    return false;
  }

  // We apply on all Desk routes; when data-route exists we consider it target
  function onDeskRoute() {
    return !!(document.body.getAttribute('data-route') || '');
  }

  function getSidebarEl() {
    return (
      document.querySelector('.desk-sidebar') ||
      document.querySelector('.standard-sidebar') ||
      document.querySelector('.layout-side-section') ||
      document.querySelector('.page-content .sidebar-section')
    );
  }

  function getCoreToggleButton() {
    return (
      document.querySelector('.desk-sidebar .sidebar-toggle') ||
      document.querySelector('.standard-sidebar .sidebar-toggle') ||
      document.querySelector('.layout-side-section .sidebar-toggle') ||
      document.querySelector('.page-container .sidebar-toggle') ||
      document.querySelector('[data-action="toggle-sidebar"]') ||
      document.querySelector('.navbar .sidebar-toggle') ||
      document.querySelector('.sidebar-toggle') ||
      null
    );
  }

  function isSidebarOpen() {
    const el = getSidebarEl();
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetWidth > 0;
  }

  function collapseIfNeeded() {
    if (isExemptUser()) {
      document.body.classList.remove('mw-sidebar-collapsed'); // remove fallback if any
      return;
    }
    if (!onDeskRoute()) {
      document.body.classList.remove('mw-sidebar-collapsed');
      return;
    }
    if (isSidebarOpen()) {
      const btn = getCoreToggleButton();
      if (btn) {
        btn.click(); // native behavior
      } else {
        document.body.classList.add('mw-sidebar-collapsed'); // fallback
      }
    }
  }

  function boot() {
    // Initial attempts (Desk renders async)
    [0, 120, 300, 600, 1000].forEach((t) => setTimeout(collapseIfNeeded, t));

    const rerun = () => {
      setTimeout(collapseIfNeeded, 0);
      setTimeout(collapseIfNeeded, 150);
    };

    window.addEventListener('hashchange', rerun);
    document.addEventListener('frappe.router.change', rerun);
    if (window.frappe && frappe.after_ajax) frappe.after_ajax(rerun);
  }

  // Ensure frappe.boot is ready (for roles) before running
  function initWhenBootReady() {
    if (window.frappe && frappe.boot) {
      boot();
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
      return;
    }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if ((window.frappe && frappe.boot) || tries > 40) {
        clearInterval(iv);
        boot();
      }
    }, 100);
  }

  initWhenBootReady();
})();