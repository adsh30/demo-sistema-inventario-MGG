/* ============================================================
   MGG · Shared · Notifications
   Centro de notificaciones in-app. En Fase 2 se conecta al flujo
   de licitación (notifica a proveedores/roles correspondientes).
   ============================================================ */
(function () {
  const TABLE = 'notificaciones';

  // Debounce del sonido: si llegan varias notificaciones seguidas
  // (ej. al inicio Restock.notifyPending genera N) sonamos una sola vez.
  let soundPending = false;
  function scheduleSound() {
    if (soundPending) return;
    soundPending = true;
    setTimeout(() => {
      soundPending = false;
      if (!window.Config || !window.Sound || !window.Auth) return;
      const enabled = Config.get('user.notif.enabled', true);
      if (!enabled) return;
      Sound.alert();
    }, 400);
  }

  /**
   * Crea una notificación. Si se pasa `dedupKey` y ya existe una notificación
   * NO leída con el mismo dedupKey para el mismo rol, no se crea otra.
   * Útil para alertas recurrentes (ej. stock bajo) que no deben spamear.
   */
  function push({ to, kind, title, message, link, dedupKey }) {
    to = to || 'all';
    if (dedupKey) {
      const existing = Store.list(TABLE).find(n =>
        !n.read && n.dedupKey === dedupKey && (n.to === to || n.to === 'all')
      );
      if (existing) return existing;
    }
    const notif = Store.insert(TABLE, {
      to,                            // rol destinatario: 'admin' | 'analista' | 'all'
      kind: kind || 'info',
      title, message,
      link: link || null,
      dedupKey: dedupKey || null,
      read: false,
      at: new Date().toISOString(),
    });

    // Disparar sonido solo si la notif va dirigida al usuario actual.
    const session = window.Auth && Auth.get();
    if (session && (to === 'all' || to === session.role)) scheduleSound();

    return notif;
  }

  function forCurrentRole() {
    const s = Auth.get();
    if (!s) return [];
    return Store.list(TABLE)
      .filter(n => n.to === 'all' || n.to === s.role)
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }

  function unreadCount() { return forCurrentRole().filter(n => !n.read).length; }

  function markAllRead() {
    const s = Auth.get(); if (!s) return;
    Store.list(TABLE).forEach(n => {
      if ((n.to === 'all' || n.to === s.role) && !n.read) Store.update(TABLE, n.id, { read: true });
    });
  }

  function clear() { Store.replace(TABLE, []); }

  window.Notify = { push, forCurrentRole, unreadCount, markAllRead, clear };
})();
