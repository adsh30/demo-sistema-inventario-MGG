/* ============================================================
   MGG · Shared · Router (hash-based)
   Cada módulo se registra con Router.register(name, renderFn).
   ============================================================ */
(function () {
  const routes = new Map();
  const cleanups = [];

  function register(name, renderFn, opts) {
    routes.set(name, {
      render: renderFn,
      title: (opts && opts.title) || name,
      requireRole: opts && opts.requireRole, // ej. 'admin' — opcional
    });
  }

  function go(route) {
    if (location.hash !== '#/' + route) location.hash = '#/' + route;
    else render();
  }

  function currentRoute() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
  }

  /** Permite que un módulo registre una limpieza al cambiar de ruta */
  function onLeave(fn) { cleanups.push(fn); }

  function runCleanups() {
    while (cleanups.length) { try { cleanups.pop()(); } catch (e) { console.error(e); } }
  }

  function render() {
    runCleanups();
    const { name, params } = currentRoute();
    const view = document.getElementById('view');
    const route = routes.get(name);

    // Toda la nav lateral (mainNav + systemNav, etc.) usa data-route
    document.querySelectorAll('.sidebar a[data-route]').forEach(a => {
      a.classList.toggle('active', a.dataset.route === name);
    });

    if (!route) {
      view.innerHTML = UI.emptyState('Módulo no encontrado.', '⚠');
      document.getElementById('crumbTitle').textContent = '404';
      return;
    }

    // Guard de rol: si la ruta exige un rol específico y el usuario no lo tiene.
    if (route.requireRole) {
      const session = window.Auth && Auth.get();
      if (!session || session.role !== route.requireRole) {
        view.innerHTML = `<div class="card"><h3>Acceso denegado</h3><p class="muted">Esta sección requiere el rol <strong>${Fmt.esc(route.requireRole)}</strong>. Tu rol actual no tiene permiso.</p></div>`;
        document.getElementById('crumbTitle').textContent = 'Acceso denegado';
        return;
      }
    }

    document.getElementById('crumbTitle').textContent = route.title;
    try {
      route.render({ view, params });
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="card"><h3>Error al renderizar el módulo</h3><pre>${Fmt.esc(e.message)}</pre></div>`;
    }
  }

  window.Router = { register, go, render, currentRoute, onLeave };
  window.addEventListener('hashchange', render);
})();
