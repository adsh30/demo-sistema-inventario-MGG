/* ============================================================
   MGG · Órdenes · Controller
   Reglas de negocio del flujo de orden de pedido.
   Estados:
     pendiente → aprobada → recibida
     pendiente → rechazada
     pendiente|aprobada → cancelada           (la empresa cancela / cliente pide cancelar)
     aprobada → desistida_proveedor           (proveedor no cumple) → puede reasignarse
     aprobada → aprobada (con nuevo proveedor) (cambio de proveedor)
   ============================================================ */
(function () {

  function appendHistorial(orden, evento, extra) {
    const s = Auth.get() || {};
    const entry = { at: new Date().toISOString(), evento, actor: s.email || 'sistema', ...(extra || {}) };
    return [...(orden.historial || []), entry];
  }

  function generarFactura(orden) {
    const facturas = Store.list('facturas');
    const numero = `FAC-${new Date().getFullYear()}-${String(facturas.length + 1).padStart(4, '0')}`;
    const subtotal = orden.total;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const vencimiento = new Date(); vencimiento.setDate(vencimiento.getDate() + 30);
    return Store.insert('facturas', {
      numero, ordenId: orden.id, proveedorId: orden.proveedorId,
      items: orden.items.map(i => ({ ...i })),
      subtotal, iva, total,
      estado: 'pendiente',
      emision: new Date().toISOString(),
      vencimiento: vencimiento.toISOString(),
    });
  }

  function anularFacturaDeOrden(ordenId, motivo) {
    const f = Store.list('facturas', x => x.ordenId === ordenId && x.estado === 'pendiente')[0];
    if (f) Store.update('facturas', f.id, { estado: 'anulada', motivoAnulacion: motivo || null });
    return f;
  }

  const OrdenesCtrl = {

    /** Crear nueva orden (analista). */
    crear({ proveedorId, items, notas }) {
      const s = Auth.get();
      const total = items.reduce((a, i) => a + i.cantidad * i.precio, 0);
      const orden = {
        codigo: OrdenesRepo.nextCodigo(),
        proveedorId,
        solicitanteEmail: s.email,
        solicitante: s.name,
        items: items.map(i => ({ ...i })),
        total, estado: 'pendiente', notas: (notas || '').trim(),
        historial: [{ at: new Date().toISOString(), evento: 'creada', actor: s.email }],
      };
      const saved = OrdenesRepo.create(orden);
      // Notificar a administradora
      Notify.push({
        to: 'admin', kind: 'info',
        title: 'Nueva orden de pedido',
        message: `${saved.codigo} requiere tu aprobación (${Fmt.money(saved.total)})`,
        link: '#/ordenes',
      });
      return saved;
    },

    /** Aprobar (solo admin) → genera factura. */
    aprobar(id) {
      const s = Auth.get();
      if (s.role !== 'admin') throw new Error('Solo la administradora puede aprobar');
      const o = OrdenesRepo.findById(id);
      if (!o || o.estado !== 'pendiente') return null;
      const patch = {
        estado: 'aprobada',
        aprobadaPor: s.email, aprobadaEn: new Date().toISOString(),
        historial: appendHistorial(o, 'aprobada'),
      };
      const updated = OrdenesRepo.update(id, patch);
      const fac = generarFactura(updated);
      Notify.push({ to: 'analista', kind: 'success',
        title: 'Orden aprobada',
        message: `${o.codigo} aprobada · factura ${fac.numero} generada`,
        link: '#/ordenes' });
      return { orden: updated, factura: fac };
    },

    /** Rechazar (solo admin). */
    rechazar(id, motivo) {
      const s = Auth.get();
      if (s.role !== 'admin') throw new Error('Solo la administradora puede rechazar');
      const o = OrdenesRepo.findById(id);
      if (!o || o.estado !== 'pendiente') return null;
      if (!motivo) throw new Error('Debes indicar un motivo');
      const updated = OrdenesRepo.update(id, {
        estado: 'rechazada',
        rechazadaPor: s.email, rechazadaEn: new Date().toISOString(),
        motivoRechazo: motivo,
        historial: appendHistorial(o, 'rechazada', { motivo }),
      });
      Notify.push({ to: 'analista', kind: 'warning',
        title: 'Orden rechazada',
        message: `${o.codigo}: ${motivo}`, link: '#/ordenes' });
      return updated;
    },

    /** Cancelar (empresa decide o cliente pide cancelar). Pendiente o aprobada. */
    cancelar(id, motivo) {
      const o = OrdenesRepo.findById(id);
      if (!o) return null;
      if (!['pendiente', 'aprobada'].includes(o.estado)) return null;
      if (!motivo) throw new Error('Debes indicar un motivo');
      const updated = OrdenesRepo.update(id, {
        estado: 'cancelada',
        canceladaEn: new Date().toISOString(),
        motivoCancelacion: motivo,
        historial: appendHistorial(o, 'cancelada', { motivo }),
      });
      if (o.estado === 'aprobada') anularFacturaDeOrden(id, motivo);
      Notify.push({ to: 'all', kind: 'warning',
        title: 'Orden cancelada',
        message: `${o.codigo}: ${motivo}`, link: '#/ordenes' });
      return updated;
    },

    /**
     * Desistimiento del proveedor: el proveedor no llegó a cumplir.
     * La orden queda en `desistida_proveedor` (reasignable). La factura asociada se anula.
     */
    desistirProveedor(id, motivo) {
      const o = OrdenesRepo.findById(id);
      if (!o || o.estado !== 'aprobada') return null;
      if (!motivo) throw new Error('Debes indicar por qué no cumplió el proveedor');
      const updated = OrdenesRepo.update(id, {
        estado: 'desistida_proveedor',
        desistidaEn: new Date().toISOString(),
        motivoDesistimiento: motivo,
        historial: appendHistorial(o, 'desistida_proveedor', { motivo, proveedorAnteriorId: o.proveedorId }),
      });
      anularFacturaDeOrden(id, 'Desistimiento del proveedor');
      Notify.push({ to: 'all', kind: 'warning',
        title: 'Proveedor desistió',
        message: `${o.codigo}: ${motivo}. La orden quedó abierta para reasignar.`,
        link: '#/ordenes' });
      return updated;
    },

    /**
     * Cambia o reasigna el proveedor de una orden activa (pendiente | aprobada | desistida_proveedor).
     * Si la orden estaba aprobada se anula su factura y se genera una nueva al re-aprobar.
     * El nuevo estado queda en `pendiente` para que la administradora re-apruebe con el nuevo proveedor.
     */
    cambiarProveedor(id, nuevoProveedorId, motivo) {
      const o = OrdenesRepo.findById(id);
      if (!o) return null;
      if (!['pendiente', 'aprobada', 'desistida_proveedor'].includes(o.estado)) return null;
      const nuevo = ProveedoresRepo.findById(nuevoProveedorId);
      if (!nuevo || nuevo.estado !== 'activo') throw new Error('Proveedor inválido o inactivo');
      if (nuevoProveedorId === o.proveedorId) throw new Error('Selecciona un proveedor distinto');

      const anteriorId = o.proveedorId;
      if (o.estado === 'aprobada') anularFacturaDeOrden(id, motivo || 'Cambio de proveedor');

      const updated = OrdenesRepo.update(id, {
        proveedorId: nuevoProveedorId,
        estado: 'pendiente',
        aprobadaEn: null, aprobadaPor: null,
        historial: appendHistorial(o, 'proveedor_cambiado', {
          motivo: motivo || null,
          proveedorAnteriorId: anteriorId,
          proveedorNuevoId: nuevoProveedorId,
        }),
      });
      Notify.push({ to: 'admin', kind: 'info',
        title: 'Orden reasignada a otro proveedor',
        message: `${o.codigo} ahora con ${nuevo.razonSocial}. Requiere nueva aprobación.`,
        link: '#/ordenes' });
      return updated;
    },

    /** Marcar orden aprobada como recibida → genera un movimiento `entrada_orden`
        por cada ítem (los movimientos son los que actualizan el stock). */
    recibir(id) {
      const o = OrdenesRepo.findById(id);
      if (!o || o.estado !== 'aprobada') return null;
      const prov = ProveedoresRepo.findById(o.proveedorId);
      o.items.forEach(it => {
        MovimientosRepo.registrar({
          productoId: it.productoId,
          tipo: 'entrada_orden',
          delta: it.cantidad,
          refTipo: 'orden',
          refId: o.id,
          refCodigo: o.codigo,
          proveedorId: o.proveedorId,
          detalle: `Recepción de ${it.cantidad} ${it.sku} · proveedor ${prov ? prov.razonSocial : '—'}`,
        });
      });
      return OrdenesRepo.update(id, {
        estado: 'recibida',
        recibidaEn: new Date().toISOString(),
        historial: appendHistorial(o, 'recibida'),
      });
    },
  };

  window.OrdenesCtrl = OrdenesCtrl;
})();
