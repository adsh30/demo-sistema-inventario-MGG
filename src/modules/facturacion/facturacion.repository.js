/* ============================================================
   MGG · Facturación · Repository
   ============================================================ */
(function () {
  const TABLE = 'facturas';

  window.FacturasRepo = {
    all() { return Store.list(TABLE).sort((a, b) => (b.emision || '').localeCompare(a.emision || '')); },
    findById(id) { return Store.get(TABLE, id); },
    porOrden(ordenId) { return Store.list(TABLE, f => f.ordenId === ordenId); },
    pendientes() { return Store.list(TABLE, f => f.estado === 'pendiente'); },
    pagadas() { return Store.list(TABLE, f => f.estado === 'pagada'); },
    update(id, patch) { return Store.update(TABLE, id, patch); },
    subscribe(fn) { return Store.subscribe(TABLE, fn); },
    table: TABLE,
  };
})();
