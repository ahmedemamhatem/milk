// Force Desk "Home" to go to app/milk-work by overriding router behavior.
// Works for both /app/home and #/app/home. No DOM clicks required.

(function () {
  const TARGET = 'app/milk-work';

  // Normalize route strings like '#/app/home', '/app/home', 'app/home' -> 'app/home'
  function norm(route) {
    if (!route) return '';
    route = String(route).trim();
    route = route.replace(/^#\//, '').replace(/^\//, '');
    return route;
  }

  // Redirect if current route is 'app' or 'app/home'
  function redirectIfHomeRoute() {
    const currentHash = window.location.hash || '';
    const currentPath = window.location.pathname || '';
    const r = norm(currentHash || currentPath);
    if (r === 'app' || r.startsWith('app?') || r === 'app/home' || r.startsWith('app/home?')) {
      const targetHash = '#/' + TARGET;
      if (window.location.hash !== targetHash) {
        // Use replace to avoid polluting history
        window.location.replace(targetHash);
      }
      return true;
    }
    return false;
  }

  // Patch Frappe router once it exists
  function patchRouter() {
    if (!(window.frappe && frappe.router)) return false;

    // 1) Default route override
    try {
      if (frappe.desk_settings) {
        const dr = norm(frappe.desk_settings.default_route);
        if (!dr || dr === 'app/home' || dr === 'app') {
          frappe.desk_settings.default_route = TARGET;
        }
      }
    } catch (e) {}

    // 2) Intercept router.navigate calls that try to go to home
    try {
      const origNav = frappe.router.navigate.bind(frappe.router);
      frappe.router.navigate = function (route, opts) {
        const r = norm(route);
        if (r === 'app' || r === 'app/home' || r.startsWith('app/home?')) {
          return origNav(TARGET, opts);
        }
        return origNav(route, opts);
      };
    } catch (e) {}

    // 3) Intercept open_page and show_home if present
    try {
      if (frappe.desktop && typeof frappe.desktop.show_home === 'function') {
        const origShowHome = frappe.desktop.show_home.bind(frappe.desktop);
        frappe.desktop.show_home = function () {
          return frappe.router.navigate(TARGET);
        };
      }
    } catch (e) {}

    // 4) Intercept clicks on anchors to home as a final fallback
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target && e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const r = norm(href.startsWith('#') ? href : href.replace(location.origin, ''));
        if (r === 'app' || r === 'app/home' || r.startsWith('app/home?')) {
          e.preventDefault();
          window.location.hash = '#/' + TARGET;
        }
      },
      true
    );

    return true;
  }

  function boot() {
    // Immediate redirect if we are already on home
    redirectIfHomeRoute();

    // Try to patch router multiple times since Desk loads async
    const tries = [0, 50, 150, 300, 600, 1200];
    tries.forEach((t) => setTimeout(() => { patchRouter(); redirectIfHomeRoute(); }, t));

    // Keep enforcing on route changes
    const rerun = () => setTimeout(redirectIfHomeRoute, 0);
    window.addEventListener('hashchange', rerun);
    document.addEventListener('frappe.router.change', rerun);
    if (window.frappe && frappe.after_ajax) frappe.after_ajax(rerun);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();