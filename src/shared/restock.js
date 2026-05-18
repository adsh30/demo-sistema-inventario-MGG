/* ============================================================
   MGG · Shared · Restock
   Política de reabastecimiento + clasificación ABC (Pareto).

   ──────────────────────────────────────────────────────────────
   El método ABC es la aplicación del principio de Pareto sobre
   el inventario: el ~80% del valor suele concentrarse en el
   ~20% de los SKUs. Esa minoría (clase A) merece mayor control
   y un umbral de reabastecimiento más estricto.

     Clase A → 0% – 80%   del valor acumulado (los críticos)
     Clase B → 80% – 95%
     Clase C → 95% – 100% (los marginales)

   La política define qué porcentaje del `stockMin` dispara la
   alerta de reabastecimiento. En modo ABC, ese porcentaje se
   ajusta por clase (los A se reponen antes que los C).
   ──────────────────────────────────────────────────────────────
   ============================================================ */
(function () {
  const POLICY_KEY = 'restockPolicy';

  const DEFAULT_POLICY = {
    mode: 'abc',                                       // 'simple' | 'abc' | 'detallado'
    thresholdGlobal: 100,                              // % de stockMin (simple · y fallback en detallado)
    thresholdsByClass: { A: 120, B: 100, C: 80 },     // % de stockMin por clase (modo ABC)
    updatedBy: null,
    updatedAt: null,
  };

  function getPolicy() { return { ...DEFAULT_POLICY, ...Config.get(POLICY_KEY, {}) }; }

  function setPolicy(patch) {
    if (!Auth.isAdmin()) throw new Error('Solo la administradora puede modificar la política de reabastecimiento');
    const session = Auth.get();
    const next = {
      ...getPolicy(), ...patch,
      updatedBy: session.email,
      updatedAt: new Date().toISOString(),
    };
    Config.set(POLICY_KEY, next);
    return next;
  }

  /**
   * Clasificación ABC (Pareto) por valor de inventario (stock × precio).
   * Devuelve Map<productoId, 'A'|'B'|'C'>.
   */
  function classifyABC(productos) {
    const result = new Map();
    const items = (productos || [])
      .filter(p => p.estado === 'activo')
      .map(p => ({ id: p.id, valor: (p.stock || 0) * (p.precio || 0) }))
      .filter(x => x.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    const total = items.reduce((a, x) => a + x.valor, 0);
    if (total === 0) {
      // Sin valor de inventario aún: todo C por defecto.
      (productos || []).forEach(p => result.set(p.id, 'C'));
      return result;
    }
    let acumulado = 0;
    items.forEach(x => {
      acumulado += x.valor;
      const ratio = acumulado / total;
      if (ratio <= 0.80) result.set(x.id, 'A');
      else if (ratio <= 0.95) result.set(x.id, 'B');
      else result.set(x.id, 'C');
    });
    // Productos sin valor (stock 0 o precio 0) → C
    (productos || []).forEach(p => { if (!result.has(p.id)) result.set(p.id, 'C'); });
    return result;
  }

  /** Umbral efectivo (en unidades) que dispara la alerta. */
  function effectiveThreshold(producto, policy, classMap) {
    policy = policy || getPolicy();
    const min = producto.stockMin || 0;
    const pct = effectivePct(producto, policy, classMap);
    return Math.ceil(min * (pct / 100));
  }

  /**
   * Porcentaje efectivo que aplica al producto, según el modo de política.
   *   - simple    → `thresholdGlobal` para todos.
   *   - abc       → `thresholdsByClass[clase]` según la clasificación Pareto.
   *   - detallado → `producto.restockPct` si está definido, sino `thresholdGlobal` como fallback.
   */
  function effectivePct(producto, policy, classMap) {
    policy = policy || getPolicy();
    if (policy.mode === 'detallado') {
      if (producto.restockPct != null && producto.restockPct !== '') return Number(producto.restockPct);
      return policy.thresholdGlobal != null ? policy.thresholdGlobal : 100;
    }
    if (policy.mode === 'abc') {
      const klass = (classMap && classMap.get(producto.id)) || 'C';
      return policy.thresholdsByClass[klass] != null ? policy.thresholdsByClass[klass] : 100;
    }
    return policy.thresholdGlobal != null ? policy.thresholdGlobal : 100;
  }

  /** ¿Este producto tiene un `restockPct` propio? (independiente del modo activo). */
  function hasCustomPct(producto) {
    return producto.restockPct != null && producto.restockPct !== '';
  }

  function needsRestock(producto, policy, classMap) {
    return (producto.stock || 0) <= effectiveThreshold(producto, policy, classMap);
  }

  /** Productos que requieren reabastecimiento según la política vigente. */
  function scan(productos) {
    productos = productos || InventarioRepo.activos();
    const policy = getPolicy();
    const classMap = classifyABC(productos);
    return productos
      .filter(p => p.estado === 'activo' && needsRestock(p, policy, classMap))
      .map(p => ({
        ...p,
        _klass: classMap.get(p.id),
        _threshold: effectiveThreshold(p, policy, classMap),
      }));
  }

  /** Crea notificaciones para todos los pendientes (deduplicadas por producto). */
  function notifyPending() {
    if (!window.Notify) return 0;
    const pendings = scan();
    pendings.forEach(p => {
      const critical = (p.stock || 0) < (p.stockMin || 0);
      Notify.push({
        to: 'admin',
        kind: critical ? 'error' : 'warning',
        title: critical ? '⚠ Stock CRÍTICO' : 'Reabastecimiento requerido',
        message: critical
          ? `${p.sku} · ${p.nombre}: stock ${p.stock} POR DEBAJO del mínimo (${p.stockMin}) · operación en riesgo`
          : `${p.sku} · ${p.nombre} (stock ${p.stock} ≤ umbral ${p._threshold} · clase ${p._klass || '—'})`,
        link: '#/inventario',
        // Distintos dedupKey para crítico vs warning → el usuario recibe ambos avisos si pasa de uno a otro
        dedupKey: `restock:${critical ? 'crit' : 'warn'}:${p.id}`,
      });
    });
    return pendings.length;
  }

  window.Restock = {
    getPolicy, setPolicy,
    classifyABC, effectiveThreshold, effectivePct, hasCustomPct, needsRestock,
    scan, notifyPending,
    DEFAULT_POLICY,
  };
})();
