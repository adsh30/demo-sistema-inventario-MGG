/* ============================================================
   MGG · Proveedores · Repository
   ============================================================ */
(function () {
  const TABLE = 'proveedores';

  window.ProveedoresRepo = {
    all() { return Store.list(TABLE); },
    activos() { return Store.list(TABLE, p => p.estado === 'activo'); },
    findById(id) { return Store.get(TABLE, id); },
    findByRif(rif) { return Store.list(TABLE).find(p => p.rif === rif); },
    create(data) { return Store.insert(TABLE, data); },
    update(id, patch) { return Store.update(TABLE, id, patch); },
    remove(id) { Store.remove(TABLE, id); },
    /** Proveedores que ofrecen una categoría (útil para reasignar en órdenes) */
    porCategoria(cat) {
      return Store.list(TABLE, p => p.estado === 'activo' && (p.categorias || []).includes(cat));
    },
    subscribe(fn) { return Store.subscribe(TABLE, fn); },
    table: TABLE,
  };
})();
