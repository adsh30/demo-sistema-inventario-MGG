/* ============================================================
   MGG · Dashboard · View
   El dashboard agrega información transversal: usa los repos de
   otros módulos pero no tiene tabla propia.
   ============================================================ */
(function () {

  function renderShell(session, ordenesPend) {
    const greeting = session.role === 'admin'
      ? `Bienvenida, ${session.name.split(' ')[0]}.`
      : `Bienvenido, ${session.name.split(' ')[0]}.`;
    const cta = session.role === 'analista'
      ? `<button class="btn btn-primary" id="newOrderBtn">+ Nueva orden de pedido</button>`
      : `<button class="btn btn-primary" id="reviewBtn">Revisar pendientes (${ordenesPend})</button>`;
    return `
      <div class="page-head">
        <div>
          <h1>${Fmt.esc(greeting)}</h1>
          <p>Resumen operativo del sistema MGG al ${Fmt.date(new Date().toISOString())}.</p>
        </div>
        <div class="actions">${cta}</div>
      </div>
      <div id="kpiHost"></div>
      <div class="dash-grid" id="gridHost"></div>
      <div class="card" style="margin-top:1rem" id="stockHost"></div>
      <div class="card" style="margin-top:1rem" id="provHost"></div>`;
  }

  function renderKpis({ productos, stockBajo, pendientes, ordenes, facturas, facturadoMes }) {
    return `
      <div class="kpi-grid">
        <div class="kpi"><div class="icon">⬢</div><div class="label">Productos activos</div><div class="value">${Fmt.num(productos.length)}</div><div class="delta">${productos.length} SKUs registrados</div></div>
        <div class="kpi"><div class="icon">⚠</div><div class="label">A reabastecer</div><div class="value">${Fmt.num(stockBajo.length)}</div><div class="delta ${stockBajo.length > 0 ? 'down' : ''}">${stockBajo.length > 0 ? 'según política activa' : 'todo en orden'}</div></div>
        <div class="kpi"><div class="icon">✉</div><div class="label">Órdenes pendientes</div><div class="value">${Fmt.num(pendientes.length)}</div><div class="delta">de ${ordenes.length} totales</div></div>
        <div class="kpi"><div class="icon">$</div><div class="label">Facturado este mes</div><div class="value">${Fmt.money(facturadoMes)}</div><div class="delta">${facturas.length} facturas</div></div>
      </div>`;
  }

  function renderChartAndFeed(days, max, feedItems) {
    return `
      <div class="card">
        <div class="card-title">
          <span>Órdenes generadas · últimos 7 días</span>
          <span class="muted mono">${days.reduce((a, d) => a + d.count, 0)} órdenes</span>
        </div>
        <div class="bar-chart">
          ${days.map(d => `
            <div class="bar">
              <div class="col" style="height:${(d.count / max) * 180 + 4}px" data-val="${d.count}"></div>
              <div class="lbl">${Fmt.esc(d.lbl)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>Actividad reciente</span><a href="#/ordenes" class="muted" style="font-size:.78rem">Ver todo →</a></div>
        <div class="feed">
          ${feedItems.length ? feedItems.map(it => `
            <div class="feed-item">
              <div class="pin">${it.icon}</div>
              <div class="body">
                <div class="title">${Fmt.esc(it.title)}</div>
                <div class="meta">${Fmt.esc(it.meta)}</div>
              </div>
            </div>`).join('') : UI.emptyState('Sin actividad reciente.', '◇')}
        </div>
      </div>`;
  }

  function renderStockTable(rows) {
    if (!rows.length) return `<div class="card-title"><span>Productos a reabastecer</span><a href="#/inventario" class="muted" style="font-size:.78rem">Ir a inventario →</a></div>${UI.emptyState('Ningún producto cruzó su umbral de reabastecimiento. 👍', '✓')}`;
    return `
      <div class="card-title"><span>Productos a reabastecer</span><a href="#/inventario" class="muted" style="font-size:.78rem">Gestionar inventario →</a></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>ABC</th><th style="text-align:right">Stock</th><th style="text-align:right">Umbral</th><th>Indicador</th></tr></thead>
          <tbody>
            ${rows.map(p => {
              const threshold = p._threshold != null ? p._threshold : p.stockMin;
              const critical = (p.stock || 0) < (p.stockMin || 0);
              const ratio = Math.min(1, p.stock / Math.max(1, threshold));
              const cls = critical ? 'crit' : (ratio < 0.75 ? 'low' : '');
              const badge = critical
                ? '<span class="badge danger" style="margin-left:.25rem">⚠ crítico</span>'
                : '<span class="badge warning" style="margin-left:.25rem">reabastecer</span>';
              return `<tr>
                <td class="mono">${Fmt.esc(p.sku)}</td>
                <td>${Fmt.esc(p.nombre)}</td>
                <td>${Fmt.esc(p.categoria)}</td>
                <td><span class="badge abc-${p._klass || 'C'}">${p._klass || '—'}</span></td>
                <td style="text-align:right" class="mono">${Fmt.num(p.stock)} ${Fmt.esc(p.unidad)} ${badge}</td>
                <td style="text-align:right" class="mono muted">≤ ${Fmt.num(threshold)}</td>
                <td><div class="stock-meter ${cls}"><div class="fill" style="width:${Math.round(ratio * 100)}%"></div></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderProveedoresChips(proveedores) {
    return `
      <div class="card-title"><span>Proveedores activos</span><span class="muted mono">${proveedores.length}</span></div>
      <div style="display:flex; flex-wrap:wrap; gap:.5rem">
        ${proveedores.map(p => `<span class="badge primary">${Fmt.esc(p.razonSocial)}</span>`).join('')}
      </div>`;
  }

  window.DashboardView = { renderShell, renderKpis, renderChartAndFeed, renderStockTable, renderProveedoresChips };
})();
