/* ============================================================
   MGG · Facturación · View
   ============================================================ */
(function () {

  function renderShell({ filterText, filterEstado, viewMode }) {
    return `
      <div class="page-head">
        <div>
          <h1>Facturación</h1>
          <p>Facturas generadas a partir de órdenes aprobadas. IVA 16% aplicado por defecto.</p>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" id="goOrdersBtn">Ir a órdenes →</button>
        </div>
      </div>

      <div class="filterbar">
        <input class="search" id="fText" placeholder="Buscar por número, proveedor…" value="${Fmt.esc(filterText)}" />
        <select class="select" id="fEstado" style="max-width:200px" ${viewMode === 'kanban' ? 'disabled title="Filtro deshabilitado en vista Kanban"' : ''}>
          <option value="">Todos los estados</option>
          <option value="pendiente" ${filterEstado === 'pendiente' ? 'selected' : ''}>Pendientes</option>
          <option value="pagada"    ${filterEstado === 'pagada'    ? 'selected' : ''}>Pagadas</option>
          <option value="anulada"   ${filterEstado === 'anulada'   ? 'selected' : ''}>Anuladas</option>
        </select>
        <div class="view-toggle" role="tablist" aria-label="Modo de vista">
          <button data-view="kanban" class="${viewMode === 'kanban' ? 'active' : ''}" title="Vista Kanban">▦ Kanban</button>
          <button data-view="lista"  class="${viewMode === 'lista'  ? 'active' : ''}" title="Vista Lista">☰ Lista</button>
        </div>
      </div>

      <div id="kpiHost"></div>
      <div id="boardHost"></div>`;
  }

  function renderKpis(all) {
    const pend = all.filter(f => f.estado === 'pendiente');
    const pag  = all.filter(f => f.estado === 'pagada');
    const totalPend = pend.reduce((a, f) => a + f.total, 0);
    const totalPag  = pag.reduce((a, f) => a + f.total, 0);
    return `
      <div class="kpi-grid">
        <div class="kpi"><div class="icon">$</div><div class="label">Facturas totales</div><div class="value">${Fmt.num(all.length)}</div><div class="delta">en el sistema</div></div>
        <div class="kpi"><div class="icon">◔</div><div class="label">Por pagar</div><div class="value">${Fmt.money(totalPend)}</div><div class="delta ${totalPend > 0 ? 'down' : ''}">${pend.length} pendientes</div></div>
        <div class="kpi"><div class="icon">✓</div><div class="label">Pagadas</div><div class="value">${Fmt.money(totalPag)}</div><div class="delta">${pag.length} facturas</div></div>
      </div>`;
  }

  function renderTable(rows) {
    if (!rows.length) return `<div class="card">${UI.emptyState('Sin facturas aún. Aprueba una orden para generar la primera.', '$')}</div>`;
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Número</th><th>Proveedor</th><th>Orden</th>
            <th>Emisión</th><th>Vencimiento</th>
            <th style="text-align:right">Total</th>
            <th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(f => {
              const prov = ProveedoresRepo.findById(f.proveedorId);
              const ord = OrdenesRepo.findById(f.ordenId);
              const vencida = f.estado === 'pendiente' && new Date(f.vencimiento) < new Date();
              return `<tr>
                <td class="mono">${Fmt.esc(f.numero)}</td>
                <td>${Fmt.esc(prov ? prov.razonSocial : '—')}</td>
                <td class="mono"><a href="#/ordenes" class="muted">${Fmt.esc(ord ? ord.codigo : '—')}</a></td>
                <td class="muted" style="font-size:.82rem">${Fmt.date(f.emision)}</td>
                <td class="muted" style="font-size:.82rem">${Fmt.date(f.vencimiento)} ${vencida ? '<span class="badge danger" style="margin-left:.25rem">Vencida</span>' : ''}</td>
                <td style="text-align:right" class="mono">${Fmt.money(f.total)}</td>
                <td>${Fmt.statusBadge(f.estado)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-ghost"  data-view="${f.id}">Ver</button>
                  ${f.estado === 'pendiente' ? `<button class="btn btn-sm btn-success" data-pay="${f.id}">Pagar</button>` : ''}
                  ${f.estado === 'pendiente' ? `<button class="btn btn-sm btn-danger"  data-void="${f.id}">Anular</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderInvoice(f) {
    const prov = ProveedoresRepo.findById(f.proveedorId);
    const ord  = OrdenesRepo.findById(f.ordenId);
    const body = document.createElement('div');
    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem">
        <div>
          <div class="muted" style="font-size:.78rem">FACTURA</div>
          <h2 style="margin:0" class="mono">${Fmt.esc(f.numero)}</h2>
        </div>
        <div class="text-right">
          ${Fmt.statusBadge(f.estado)}
          <div class="muted" style="font-size:.78rem; margin-top:.5rem">Orden: <span class="mono">${Fmt.esc(ord ? ord.codigo : '—')}</span></div>
        </div>
      </div>

      <div class="detail-row"><div class="k">Proveedor</div><div class="v">${Fmt.esc(prov ? prov.razonSocial : '—')}</div></div>
      <div class="detail-row"><div class="k">RIF</div><div class="v mono">${Fmt.esc(prov ? prov.rif : '—')}</div></div>
      <div class="detail-row"><div class="k">Emisión</div><div class="v">${Fmt.date(f.emision)}</div></div>
      <div class="detail-row"><div class="k">Vencimiento</div><div class="v">${Fmt.date(f.vencimiento)}</div></div>

      <h4 style="margin-top:1rem">Detalle</h4>
      <table class="items-table">
        <thead><tr><th>SKU</th><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
        <tbody>
          ${f.items.map(i => `<tr>
            <td class="mono">${Fmt.esc(i.sku)}</td>
            <td>${Fmt.esc(i.nombre)}</td>
            <td class="num">${Fmt.num(i.cantidad)}</td>
            <td class="num">${Fmt.money(i.precio)}</td>
            <td class="num">${Fmt.money(i.cantidad * i.precio)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="4" class="num muted" style="border:none">Subtotal</td><td class="num" style="border:none">${Fmt.money(f.subtotal)}</td></tr>
          <tr><td colspan="4" class="num muted" style="border:none">IVA 16%</td><td class="num" style="border:none">${Fmt.money(f.iva)}</td></tr>
          <tr><td colspan="4" class="num">TOTAL</td><td class="num">${Fmt.money(f.total)}</td></tr>
        </tfoot>
      </table>`;
    return body;
  }

  // ── Kanban ─────────────────────────────────────────────────
  const KANBAN_COLS = [
    { key: 'pendiente', label: 'Pendiente' },
    { key: 'pagada',    label: 'Pagada' },
    { key: 'anulada',   label: 'Anulada' },
  ];

  function renderKanban(rows) {
    const byState = Object.fromEntries(KANBAN_COLS.map(c => [c.key, []]));
    rows.forEach(f => { if (byState[f.estado]) byState[f.estado].push(f); });

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
                  ? `<div class="kanban-empty">Sin facturas</div>`
                  : items.map(f => renderKanbanCard(f)).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderKanbanCard(f) {
    const prov = ProveedoresRepo.findById(f.proveedorId);
    const vencida = f.estado === 'pendiente' && new Date(f.vencimiento) < new Date();
    return `
      <div class="kanban-card" data-view="${f.id}" tabindex="0">
        <div class="code">${Fmt.esc(f.numero)}</div>
        <div class="prov">${Fmt.esc(prov ? prov.razonSocial : '—')}</div>
        <div class="meta">
          <span>Emisión ${Fmt.date(f.emision)}</span>
          ${vencida ? `<span class="badge danger" style="font-size:.65rem; padding:.05rem .35rem">Vencida</span>` : ''}
        </div>
        <div class="foot">
          <span class="total">${Fmt.money(f.total)}</span>
          <span class="when">${Fmt.relTime(f.emision)}</span>
        </div>
      </div>`;
  }

  window.FacturasView = { renderShell, renderKpis, renderTable, renderInvoice, renderKanban };
})();
