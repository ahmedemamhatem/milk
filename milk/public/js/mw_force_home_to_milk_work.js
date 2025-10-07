(function () {
  const TARGET = 'app/milk';
  const LEGACY_MILK_WORK = 'app/milk-work';

  // Normalize route strings like '#/app/home', '/app/home', 'app/home' -> 'app/home'
  function norm(route) {
    if (!route) return '';
    route = String(route).trim();

    // If the route contains a hash followed by another /app/... route, peel off to the inner-most app route
    // Examples:
    //   '/app/milk#/app/milk' -> '/app/milk'
    //   '#/app/milk#/#/app/milk' -> '#/app/milk'
    //   '#app/milk#/app/milk' -> '#app/milk'
    // Strategy: find the last '/app/' occurrence and keep from there, preserving leading '#' if it existed.
    const hadHash = route.startsWith('#');
    const idx = route.lastIndexOf('/app/');
    if (idx > -1) {
      let prefix = hadHash ? '#' : '';
      route = prefix + route.slice(idx);
    }

    route = route.replace(/^#\//, '').replace(/^#/, '').replace(/^\//, '');
    return route;
  }

  function isHomeOrLegacy(route) {
    const r = norm(route);
    return (
      r === 'app' ||
      r.startsWith('app?') ||
      r === 'app/home' ||
      r.startsWith('app/home?') ||
      r === LEGACY_MILK_WORK ||
      r.startsWith(LEGACY_MILK_WORK + '?')
    );
  }

  // Returns true if the route is the target already
  function isTarget(route) {
    const r = norm(route);
    return r === TARGET || r.startsWith(TARGET + '?');
  }

  // If current URL is messy like '/app/milk#/app/milk', normalize to '#/app/milk'
  function hasNestedTarget() {
    const raw = (window.location.pathname + window.location.search + window.location.hash) || '';
    if (!raw.includes('/app/')) return false;
    const first = raw.indexOf('/app/');
    const last = raw.lastIndexOf('/app/');
    if (last > first) {
      // more than one '/app/' segment present => nested/duplicated
      // only normalize if inner-most resolves to TARGET
      const inner = norm(raw.slice(last));
      return inner === TARGET || inner.startsWith(TARGET + '?');
    }
    return false;
  }

  // Redirect current location if necessary
  function redirectIfMatch() {
    const raw = (window.location.pathname + window.location.search + window.location.hash) || '';
    const currentHash = window.location.hash || '';
    const currentPath = window.location.pathname + (window.location.search || '');
    const r = norm(currentHash || currentPath);

    if (isHomeOrLegacy(r) || hasNestedTarget()) {
      const targetHash = '#/' + TARGET;
      if (window.location.hash !== targetHash) {
        window.location.replace(targetHash);
      } else if (window.location.pathname !== '/app') {
        // Ensure path itself is /app when hash is correct
        history.replaceState(null, '', '/app' + targetHash);
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
        if (!dr || dr === 'app/home' || dr === 'app' || dr === LEGACY_MILK_WORK) {
          frappe.desk_settings.default_route = TARGET;
        }
      }
    } catch (e) {}

    // 2) Intercept router.navigate calls that try to go to home or legacy or nested duplicates
    try {
      const origNav = frappe.router.navigate.bind(frappe.router);
      frappe.router.navigate = function (route, opts) {
        const r = norm(route);
        if (isHomeOrLegacy(r)) {
          return origNav(TARGET, opts);
        }
        // If navigation target normalizes to TARGET, ensure we pass TARGET (clean)
        if (isTarget(r)) {
          return origNav(TARGET, opts);
        }
        return origNav(route, opts);
      };
    } catch (e) {}

    // 3) Intercept Desktop home
    try {
      if (frappe.desktop && typeof frappe.desktop.show_home === 'function') {
        const origShowHome = frappe.desktop.show_home.bind(frappe.desktop);
        frappe.desktop.show_home = function () {
          return frappe.router.navigate(TARGET);
        };
      }
    } catch (e) {}

    // 4) Intercept anchor clicks that point to home, legacy, or nested target
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target && e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        // Convert absolute to app-relative before norm
        let rel = href.startsWith('#') ? href : href.replace(location.origin, '');
        const r = norm(rel);
        if (isHomeOrLegacy(r) || isTarget(r)) {
          e.preventDefault();
          window.location.hash = '#/' + TARGET;
        } else if (rel.includes('/app/') && hasNestedLike(rel)) {
          e.preventDefault();
          window.location.hash = '#/' + TARGET;
        }
      },
      true
    );

    return true;
  }

  // Check nested/duplicate app route within a given href-like string
  function hasNestedLike(str) {
    if (!str.includes('/app/')) return false;
    const first = str.indexOf('/app/');
    const last = str.lastIndexOf('/app/');
    if (last > first) {
      const inner = norm(str.slice(last));
      return inner === TARGET || inner.startsWith(TARGET + '?');
    }
    return false;
  }

  function boot() {
    // Immediate normalization/redirect if needed
    redirectIfMatch();

    // Try to patch router multiple times since Desk loads async
    const tries = [0, 50, 150, 300, 600, 1200];
    tries.forEach((t) =>
      setTimeout(() => {
        patchRouter();
        redirectIfMatch();
      }, t)
    );

    // Keep enforcing on route changes
    const rerun = () => setTimeout(redirectIfMatch, 0);
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