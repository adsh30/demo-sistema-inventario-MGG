/* ============================================================
   MGG · Inventario · Repository
   Acceso a datos de productos. Único punto que toca Store para
   esta tabla. En producto: cliente Supabase con misma interfaz.
   ============================================================ */
(function () {
  const TABLE = 'productos';

  const InventarioRepo = {
    all() { return Store.list(TABLE); },
    findById(id) { return Store.get(TABLE, id); },
    findBySku(sku) { return Store.list(TABLE).find(p => p.sku === sku); },
    activos() { return Store.list(TABLE, p => p.estado === 'activo'); },
    stockBajo() { return Store.list(TABLE, p => p.stock < p.stockMin); },
    create(data) { return Store.insert(TABLE, data); },
    update(id, patch) { return Store.update(TABLE, id, patch); },
    remove(id) { Store.remove(TABLE, id); },
    /** Incrementa stock (usado al recibir órdenes). */
    incrementStock(id, qty) {
      const p = Store.get(TABLE, id);
      if (!p) return null;
      return Store.update(TABLE, id, { stock: (p.stock || 0) + qty });
    },
    subscribe(fn) { return Store.subscribe(TABLE, fn); },
    table: TABLE,
  };

  window.InventarioRepo = InventarioRepo;
})();
