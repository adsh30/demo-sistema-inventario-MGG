/* ============================================================
   MGG · Órdenes · Repository
   ============================================================ */
(function () {
  const TABLE = 'ordenes';

  window.OrdenesRepo = {
    all() { return Store.list(TABLE).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); },
    findById(id) { return Store.get(TABLE, id); },
    pendientes() { return Store.list(TABLE, o => o.estado === 'pendiente'); },
    porProveedor(proveedorId) { return Store.list(TABLE, o => o.proveedorId === proveedorId); },
    abiertas() {
      // pendiente | aprobada | desistida_proveedor (reasignable)
      return Store.list(TABLE, o => ['pendiente', 'aprobada', 'desistida_proveedor'].includes(o.estado));
    },
    create(data) { return Store.insert(TABLE, data); },
    update(id, patch) { return Store.update(TABLE, id, patch); },
    /** Genera el siguiente código OP-YYYY-#### */
    nextCodigo() {
      const year = new Date().getFullYear();
      const count = Store.list(TABLE).length + 1;
      return `OP-${year}-${String(count).padStart(4, '0')}`;
    },
    subscribe(fn) { return Store.subscribe(TABLE, fn); },
    table: TABLE,
  };
})();
