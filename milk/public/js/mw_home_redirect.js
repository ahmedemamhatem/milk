// Redirect '#/app' and '#/app/home' to '#/app/milk-work'.
// Safe, minimal, and only affects those exact routes.

(function () {
  const TARGET = '#/app/milk';

  function redirectIfHome() {
    const h = window.location.hash || '';
    if (
      h === '#/app' ||
      h.startsWith('#/app?') ||
      h === '#/app/home' ||
      h.startsWith('#/app/home?')
    ) {
      if (h !== TARGET && !h.startsWith(TARGET)) {
        window.location.replace(TARGET);
      }
    }
  }

  redirectIfHome();
  window.addEventListener('hashchange', redirectIfHome);
})();