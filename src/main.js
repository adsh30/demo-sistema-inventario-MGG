/* ============================================================
   MGG · Bootstrap
   Compone el monolito modular: kernel (shared) → módulos → router.
   ============================================================ */
(function () {

  // 1. Sesión obligatoria
  const session = Auth.ensure();
  if (!session) return;

  // 2. Seed inicial
  Seed.seed();

  // 2.b Escaneo inicial de reabastecimiento — notifica a admin los productos
  //     que están por debajo de su umbral según la política vigente.
  Restock.notifyPending();
  // Re-evaluar cada vez que cambie el inventario (edición / recepción de orden).
  Store.subscribe('productos', () => Restock.notifyPending());

  // 3. Hidratar UI de usuario
  document.getElementById('userName').textContent = session.name || session.email;
  document.getElementById('userRole').textContent = session.role === 'admin' ? 'Administradora' : 'Analista';
  document.getElementById('userAvatar').textContent = (session.name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('logoutBtn').addEventListener('click', () => { Sound.stop(); Auth.logout(); });

  // Ocultar entradas del sidebar que requieren un rol específico
  document.querySelectorAll('.sidebar a[data-require-role]').forEach(a => {
    if (session.role !== a.dataset.requireRole) a.style.display = 'none';
  });

  // Click en la campana o cualquier parte del topbar detiene el sonido en curso
  document.querySelector('.topbar').addEventListener('click', () => Sound.stop(), true);

  // Desbloquear el AudioContext tras el primer gesto del usuario (requisito autoplay).
  const unlockAudio = () => Sound.init();
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  // Buscador global → redirige a inventario con query
  const search = document.getElementById('globalSearch');
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      sessionStorage.setItem('mgg.search', e.target.value.trim());
      Router.go('inventario');
      e.target.value = '';
    }
  });

  // 4. Badges (sidebar + topbar)
  function refreshBadges() {
    const pend = OrdenesRepo.pendientes().length;
    const b = document.getElementById('pendBadge');
    if (pend > 0) { b.textContent = pend; b.style.display = 'inline-flex'; }
    else { b.style.display = 'none'; }

    const dot = document.getElementById('notifDot');
    const unread = Notify.unreadCount();
    dot.style.display = unread > 0 ? 'block' : 'none';
  }
  Store.subscribe('ordenes', refreshBadges);
  Store.subscribe('notificaciones', refreshBadges);
  refreshBadges();

  // Notificaciones (panel simple en modal)
  document.getElementById('notifBtn').addEventListener('click', () => {
    const items = Notify.forCurrentRole().slice(0, 20);
    const body = items.length
      ? `<div class="feed">${items.map(n => `
          <div class="feed-item">
            <div class="pin">${n.kind === 'success' ? '✓' : n.kind === 'warning' ? '⚠' : n.kind === 'error' ? '🚨' : '◔'}</div>
            <div class="body">
              <div class="title">${Fmt.esc(n.title)}</div>
              <div class="meta">${Fmt.esc(n.message)} · ${Fmt.relTime(n.at)}</div>
            </div>
          </div>`).join('')}</div>`
      : UI.emptyState('Sin notificaciones.', '◇');
    const footer = `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-primary" id="markRead">Marcar todas leídas</button>`;
    UI.openModal({ title: 'Notificaciones', body, footer });
    const mr = document.getElementById('markRead');
    if (mr) mr.addEventListener('click', () => { Notify.markAllRead(); UI.closeModal(); UI.toast('Notificaciones marcadas como leídas'); });
  });

  // 5. Registrar módulos en el router
  Router.register('dashboard',   Modules.Dashboard,    { title: 'Dashboard' });
  Router.register('inventario',  Modules.Inventario,   { title: 'Inventario' });
  Router.register('proveedores', Modules.Proveedores,  { title: 'Proveedores' });
  Router.register('ordenes',     Modules.Ordenes,      { title: 'Órdenes de Pedido' });
  Router.register('facturacion', Modules.Facturacion,  { title: 'Facturación' });
  Router.register('usuarios',    Modules.Usuarios,     { title: 'Usuarios y Roles', requireRole: 'admin' });
  Router.register('ajustes',     Modules.Ajustes,      { title: 'Ajustes' });

  // 6. Arrancar
  if (!location.hash) location.hash = '#/dashboard';
  else Router.render();

  // Exposición para debug en consola
  window.MGG = {
    Store, Auth, Seed, UI, Fmt, Router, Notify, Config, Restock, Sound,
    repos: { InventarioRepo, MovimientosRepo, ProveedoresRepo, OrdenesRepo, FacturasRepo, UsuariosRepo },
    ctrl: { OrdenesCtrl },
  };
})();
