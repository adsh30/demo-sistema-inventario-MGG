/* ============================================================
   MGG · Órdenes · View
   ============================================================ */
(function () {

  function renderShell({ filterText, filterEstado, viewMode }, session) {
    return `
      <div class="page-head">
        <div>
          <h1>Órdenes de pedido</h1>
          <p>${session.role === 'admin'
            ? 'Aprueba o rechaza las solicitudes generadas por las analistas. Gestiona cambios de proveedor y desistimientos.'
            : 'Crea solicitudes de pedido. La administradora aprueba antes de generar la factura.'}</p>
        </div>
        <div class="actions">
          <button class="btn btn-primary" id="newBtn">+ Nueva orden</button>
        </div>
      </div>

      <div class="filterbar">
        <input class="search" id="fText" placeholder="Buscar por código, proveedor, solicitante…" value="${Fmt.esc(filterText)}" />
        <select class="select" id="fEstado" style="max-width:220px" ${viewMode === 'kanban' ? 'disabled title="Filtro deshabilitado en vista Kanban"' : ''}>
          <option value="">Todos los estados</option>
          <option value="pendiente"           ${filterEstado === 'pendiente' ? 'selected' : ''}>Pendientes</option>
          <option value="aprobada"            ${filterEstado === 'aprobada' ? 'selected' : ''}>Aprobadas</option>
          <option value="desistida_proveedor" ${filterEstado === 'desistida_proveedor' ? 'selected' : ''}>Proveedor desistió</option>
          <option value="rechazada"           ${filterEstado === 'rechazada' ? 'selected' : ''}>Rechazadas</option>
          <option value="recibida"            ${filterEstado === 'recibida' ? 'selected' : ''}>Recibidas</option>
          <option value="cancelada"           ${filterEstado === 'cancelada' ? 'selected' : ''}>Canceladas</option>
        </select>
        <div class="view-toggle" role="tablist" aria-label="Modo de vista">
          <button data-view="kanban" class="${viewMode === 'kanban' ? 'active' : ''}" title="Vista Kanban">▦ Kanban</button>
          <button data-view="lista"  class="${viewMode === 'lista'  ? 'active' : ''}" title="Vista Lista">☰ Lista</button>
        </div>
      </div>

      <div id="boardHost"></div>`;
  }

  function renderTable(rows, session) {
    if (!rows.length) return `<div class="card">${UI.emptyState('Sin órdenes que coincidan.', '✉')}</div>`;
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Código</th><th>Proveedor</th><th>Solicitante</th>
            <th style="text-align:right">Ítems</th>
            <th style="text-align:right">Total</th>
            <th>Estado</th><th>Fecha</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(o => {
              const prov = ProveedoresRepo.findById(o.proveedorId);
              const canApprove = session.role === 'admin' && o.estado === 'pendiente';
              const canChange = ['pendiente', 'aprobada', 'desistida_proveedor'].includes(o.estado);
              return `<tr>
                <td class="mono">${Fmt.esc(o.codigo)}</td>
                <td>
                  <div>${Fmt.esc(prov ? prov.razonSocial : '—')}</div>
                  ${(o.historial || []).filter(h => h.evento === 'proveedor_cambiado').length
                    ? `<div class="muted" style="font-size:.72rem">↻ ${(o.historial || []).filter(h => h.evento === 'proveedor_cambiado').length} cambio(s) de proveedor</div>` : ''}
                </td>
                <td>
                  <div>${Fmt.esc(o.solicitante || '—')}</div>
                  <div class="muted" style="font-size:.75rem">${Fmt.esc(o.solicitanteEmail || '')}</div>
                </td>
                <td style="text-align:right" class="mono">${o.items.length}</td>
                <td style="text-align:right" class="mono">${Fmt.money(o.total)}</td>
                <td>${Fmt.statusBadge(o.estado)}</td>
                <td class="muted" style="font-size:.82rem">${Fmt.dateTime(o.createdAt)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-ghost" data-view="${o.id}">Ver</button>
                  ${canApprove ? `<button class="btn btn-sm btn-success" data-approve="${o.id}">Aprobar</button>` : ''}
                  ${canApprove ? `<button class="btn btn-sm btn-danger"  data-reject="${o.id}">Rechazar</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /** Renderiza el form de creación de orden (nueva). */
  function renderOrderForm({ proveedores, productos, nextCodigo }) {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-row">
          <label>Proveedor</label>
          <select class="select" name="proveedorId" required>
            ${proveedores.map(p => `<option value="${p.id}">${Fmt.esc(p.razonSocial)} (${Fmt.esc(p.rif)})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Código</label>
          <input class="input mono" value="${nextCodigo}" disabled />
        </div>
      </div>

      <div class="form-row">
        <label>Productos solicitados</label>
        <div class="line-picker head"><div>Producto</div><div>Cantidad</div><div>Precio</div><div></div></div>
        <div id="itemsList"></div>
        <div style="display:flex; gap:.5rem; align-items:center; margin-top:.5rem">
          <select class="select" id="prodSelect" style="flex:1">
            ${productos.map(p => `<option value="${p.id}">${Fmt.esc(p.sku)} · ${Fmt.esc(p.nombre)} (${Fmt.money(p.precio)})</option>`).join('')}
          </select>
          <button type="button" class="btn btn-ghost" id="addItemBtn">+ Añadir</button>
        </div>
      </div>

      <div class="form-row">
        <label>Notas / justificación</label>
        <textarea class="textarea" name="notas" placeholder="Motivo de la solicitud, frente de trabajo, urgencia…"></textarea>
      </div>

      <div style="display:flex; justify-content:space-between; padding-top:.5rem; border-top:1px solid var(--border)">
        <span class="muted">Total estimado</span>
        <strong class="mono" id="totalLbl">$ 0,00</strong>
      </div>`;
    return form;
  }

  /** Detalle de la orden + historial. */
  function renderDetail(o) {
    const prov = ProveedoresRepo.findById(o.proveedorId);
    return `
      <div class="detail-row"><div class="k">Código</div><div class="v mono">${Fmt.esc(o.codigo)}</div></div>
      <div class="detail-row"><div class="k">Estado</div><div class="v">${Fmt.statusBadge(o.estado)}</div></div>
      <div class="detail-row"><div class="k">Proveedor actual</div><div class="v">${Fmt.esc(prov ? prov.razonSocial : '—')} <span class="muted mono">${Fmt.esc(prov ? prov.rif : '')}</span></div></div>
      <div class="detail-row"><div class="k">Solicitante</div><div class="v">${Fmt.esc(o.solicitante)} <span class="muted">(${Fmt.esc(o.solicitanteEmail)})</span></div></div>
      <div class="detail-row"><div class="k">Creada</div><div class="v">${Fmt.dateTime(o.createdAt)}</div></div>
      ${o.aprobadaEn ? `<div class="detail-row"><div class="k">Aprobada</div><div class="v">${Fmt.dateTime(o.aprobadaEn)} <span class="muted">por ${Fmt.esc(o.aprobadaPor || '—')}</span></div></div>` : ''}
      ${o.rechazadaEn ? `<div class="detail-row"><div class="k">Rechazada</div><div class="v">${Fmt.dateTime(o.rechazadaEn)} · ${Fmt.esc(o.motivoRechazo || '')}</div></div>` : ''}
      ${o.canceladaEn ? `<div class="detail-row"><div class="k">Cancelada</div><div class="v">${Fmt.dateTime(o.canceladaEn)} · ${Fmt.esc(o.motivoCancelacion || '')}</div></div>` : ''}
      ${o.desistidaEn ? `<div class="detail-row"><div class="k">Desistimiento</div><div class="v">${Fmt.dateTime(o.desistidaEn)} · ${Fmt.esc(o.motivoDesistimiento || '')}</div></div>` : ''}
      ${o.notas ? `<div class="detail-row"><div class="k">Notas</div><div class="v">${Fmt.esc(o.notas)}</div></div>` : ''}

      <h4 style="margin-top:1rem">Ítems</h4>
      <table class="items-table">
        <thead><tr><th>SKU</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
        <tbody>
          ${o.items.map(i => `<tr>
            <td class="mono">${Fmt.esc(i.sku)}</td>
            <td>${Fmt.esc(i.nombre)}</td>
            <td class="num">${Fmt.num(i.cantidad)}</td>
            <td class="num">${Fmt.money(i.precio)}</td>
            <td class="num">${Fmt.money(i.cantidad * i.precio)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="4" class="num">TOTAL</td><td class="num">${Fmt.money(o.total)}</td></tr></tfoot>
      </table>

      <h4 style="margin-top:1.25rem">Historial</h4>
      <div class="timeline">
        ${(o.historial || []).slice().reverse().map(h => {
          const proveedorAnt = h.proveedorAnteriorId ? ProveedoresRepo.findById(h.proveedorAnteriorId) : null;
          const proveedorNvo = h.proveedorNuevoId    ? ProveedoresRepo.findById(h.proveedorNuevoId)    : null;
          let extra = '';
          if (h.motivo) extra = ` · ${Fmt.esc(h.motivo)}`;
          if (proveedorAnt && proveedorNvo) extra = ` · de ${Fmt.esc(proveedorAnt.razonSocial)} → ${Fmt.esc(proveedorNvo.razonSocial)}${h.motivo ? ' · ' + Fmt.esc(h.motivo) : ''}`;
          return `<div class="tl-item">
            <div class="tl-dot ${eventClass(h.evento)}"></div>
            <div class="tl-body">
              <div class="tl-title">${eventLabel(h.evento)}${extra}</div>
              <div class="tl-meta">${Fmt.dateTime(h.at)} · ${Fmt.esc(h.actor)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function eventLabel(ev) {
    return ({
      creada: 'Orden creada',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada por la empresa',
      desistida_proveedor: 'Proveedor desistió',
      proveedor_cambiado: 'Cambio de proveedor',
      recibida: 'Recepción confirmada',
    })[ev] || ev;
  }
  function eventClass(ev) {
    return ({
      aprobada: 'ok', rechazada: 'err', cancelada: 'err',
      desistida_proveedor: 'warn', proveedor_cambiado: 'info', recibida: 'ok',
    })[ev] || '';
  }

  /** Form para cambiar el proveedor de una orden. */
  function renderChangeSupplierForm(o, proveedores) {
    const form = document.createElement('form');
    const opciones = proveedores.filter(p => p.id !== o.proveedorId);
    form.innerHTML = `
      <p class="muted">Reasigna esta orden a otro proveedor. La orden volverá a estado <strong>pendiente</strong> y necesitará nueva aprobación. Si tenía factura asociada, será anulada.</p>
      <div class="form-row">
        <label>Nuevo proveedor</label>
        <select class="select" name="proveedorId" required>
          ${opciones.map(p => `<option value="${p.id}">${Fmt.esc(p.razonSocial)} (${Fmt.esc(p.rif)})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <label>Motivo del cambio</label>
        <textarea class="textarea" name="motivo" required placeholder="Ej: proveedor original no respondió, mejor propuesta, etc."></textarea>
      </div>`;
    return form;
  }

  // ── Kanban ─────────────────────────────────────────────────
  const KANBAN_COLS = [
    { key: 'pendiente',           label: 'Pendiente' },
    { key: 'aprobada',            label: 'Aprobada' },
    { key: 'desistida_proveedor', label: 'Proveedor desistió' },
    { key: 'recibida',            label: 'Recibida' },
    { key: 'rechazada',           label: 'Rechazada' },
    { key: 'cancelada',           label: 'Cancelada' },
  ];

  function renderKanban(rows) {
    const byState = Object.fromEntries(KANBAN_COLS.map(c => [c.key, []]));
    rows.forEach(o => { if (byState[o.estado]) byState[o.estado].push(o); });

    return `
      <div class="kanban">
        ${KANBAN_COLS.map(col => {
          const items = byState[col.key];
          return `
            <div class="kanban-col" data-state="${col.key}">
              <div class="kanban-col-head">
                <span class="title">${col.label}</span>
                <span class="count">${items.length}</span>
              </div>
              <div class="kanban-col-body">
                ${items.length === 0
                  ? `<div class="kanban-empty">Sin órdenes</div>`
                  : items.map(o => renderKanbanCard(o)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderKanbanCard(o) {
    const prov = ProveedoresRepo.findById(o.proveedorId);
    const changes = (o.historial || []).filter(h => h.evento === 'proveedor_cambiado').length;
    return `
      <div class="kanban-card" data-view="${o.id}" tabindex="0">
        <div class="code">${Fmt.esc(o.codigo)}</div>
        <div class="prov">${Fmt.esc(prov ? prov.razonSocial : '—')}</div>
        <div class="meta">
          <span>${o.items.length} ítem${o.items.length !== 1 ? 's' : ''}</span>
          ${changes ? `<span class="badge warning" style="font-size:.65rem; padding:.05rem .35rem">↻ ${changes}</span>` : ''}
        </div>
        <div class="foot">
          <span class="total">${Fmt.money(o.total)}</span>
          <span class="when">${Fmt.relTime(o.createdAt)}</span>
        </div>
      </div>`;
  }

  window.OrdenesView = {
    renderShell, renderTable, renderKanban,
    renderOrderForm, renderDetail, renderChangeSupplierForm,
    eventLabel, eventClass,
  };
})();
