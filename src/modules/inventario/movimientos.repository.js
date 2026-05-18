/* ============================================================
   MGG · Inventario · Movimientos (kardex)
   Bitácora vertical de cada producto. Único punto que debería
   modificar el stock — cualquier vía (alta, edición, recepción
   de orden, consumo de proceso, transferencia) lo llama.

   Tipos de movimiento:
     creacion       → alta del producto, delta = stock inicial
     ajuste         → edición manual del stock
     entrada_orden  → recepción de una orden de pedido
     salida_consumo → consumo en proceso (ej. Horno 1) · Fase 2
     transferencia  → entre almacenes · Fase 2
   ============================================================ */
(function () {
  const TABLE = 'movimientos';

  const TIPOS = {
    creacion:       { label: 'Alta de producto',     icon: '✨', color: 'info'    },
    ajuste:         { label: 'Ajuste manual',        icon: '⚙',  color: 'info'    },
    entrada_orden:  { label: 'Entrada por orden',    icon: '⬇',  color: 'success' },
    salida_consumo: { label: 'Consumo en proceso',   icon: '🔥', color: 'warning' },
    transferencia:  { label: 'Transferencia',        icon: '↔',  color: 'info'    },
  };

  function all() {
    return Store.list(TABLE).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }

  function porProducto(productoId) {
    return Store.list(TABLE, m => m.productoId === productoId)
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }

  /**
   * Registra un movimiento y actualiza el stock del producto.
   * @param {object} payload
   * @param {string} payload.productoId
   * @param {keyof TIPOS} payload.tipo
   * @param {number} payload.delta              positivo (entrada) o negativo (salida)
   * @param {string} [payload.actor]            email del usuario; default = sesión actual
   * @param {string} [payload.refTipo]          'orden' | 'proceso' | 'manual'
   * @param {string} [payload.refId]            id de la entidad referenciada
   * @param {string} [payload.refCodigo]        código humano (ej. 'OP-2026-0003')
   * @param {string} [payload.detalle]          texto libre adicional
   * @param {string} [payload.proveedorId]      cuando aplica (recepción de orden)
   */
  function registrar(payload) {
    const p = Store.get('productos', payload.productoId);
    if (!p) throw new Error('Producto no encontrado');
    if (!TIPOS[payload.tipo]) throw new Error(`Tipo de movimiento inválido: ${payload.tipo}`);

    const delta = Number(payload.delta) || 0;
    const stockAntes = p.stock || 0;
    const stockDespues = Math.max(0, stockAntes + delta);

    // Único punto que toca productos.stock
    Store.update('productos', payload.productoId, { stock: stockDespues });

    const session = Auth.get();
    return Store.insert(TABLE, {
      productoId: payload.productoId,
      tipo: payload.tipo,
      delta,
      stockAntes,
      stockDespues,
      actor: payload.actor || (session && session.email) || 'sistema',
      actorName: payload.actorName || (session && session.name) || null,
      refTipo: payload.refTipo || 'manual',
      refId: payload.refId || null,
      refCodigo: payload.refCodigo || null,
      proveedorId: payload.proveedorId || null,
      detalle: payload.detalle || null,
      at: payload.at || new Date().toISOString(),
    });
  }

  function subscribe(fn) { return Store.subscribe(TABLE, fn); }

  window.MovimientosRepo = { all, porProducto, registrar, subscribe, TIPOS };
})();
