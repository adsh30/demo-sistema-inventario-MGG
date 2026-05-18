/* ============================================================
   MGG · Dashboard · Module entry
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};

  function render({ view }) {
    const session = Auth.get();
    const productos = InventarioRepo.all();
    const ordenes = OrdenesRepo.all();
    const proveedoresAct = ProveedoresRepo.activos();
    const facturas = FacturasRepo.all();

    // Usa la política activa (Simple o ABC) para detectar productos que requieren reabastecer
    const stockBajo = Restock.scan(productos);
    const pendientes = OrdenesRepo.pendientes();

    const monthIso = new Date().toISOString().slice(0, 7);
    const facturadoMes = facturas
      .filter(f => (f.emision || '').slice(0, 7) === monthIso)
      .reduce((acc, f) => acc + (f.total || 0), 0);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ymd = d.toISOString().slice(0, 10);
      days.push({
        ymd,
        lbl: d.toLocaleDateString('es-VE', { weekday: 'short' }).slice(0, 3),
        count: ordenes.filter(o => (o.createdAt || '').slice(0, 10) === ymd).length,
      });
    }
    const max = Math.max(1, ...days.map(d => d.count));

    view.innerHTML = DashboardView.renderShell(session, pendientes.length);
    document.getElementById('kpiHost').innerHTML = DashboardView.renderKpis({ productos, stockBajo, pendientes, ordenes, facturas, facturadoMes });
    document.getElementById('gridHost').innerHTML = DashboardView.renderChartAndFeed(days, max, buildFeed(ordenes, facturas));
    document.getElementById('stockHost').innerHTML = DashboardView.renderStockTable(stockBajo);
    document.getElementById('provHost').innerHTML = DashboardView.renderProveedoresChips(proveedoresAct);

    const newBtn = document.getElementById('newOrderBtn');
    if (newBtn) newBtn.addEventListener('click', () => Router.go('ordenes'));
    const revBtn = document.getElementById('reviewBtn');
    if (revBtn) revBtn.addEventListener('click', () => Router.go('ordenes'));
  }

  function buildFeed(ordenes, facturas) {
    const items = [];
    ordenes.forEach(o => {
      (o.historial || []).forEach(h => {
        const icon = ({ creada: '◔', aprobada: '✓', rechazada: '✕', cancelada: '⊘', desistida_proveedor: '⚠', proveedor_cambiado: '↻', recibida: '⬇' })[h.evento] || '◔';
        items.push({
          when: h.at,
          icon,
          title: `Orden ${o.codigo} — ${OrdenesView.eventLabel(h.evento)}`,
          meta: `${Fmt.money(o.total)} · ${Fmt.relTime(h.at)}`,
        });
      });
    });
    facturas.forEach(f => {
      items.push({
        when: f.emision,
        icon: '$',
        title: `Factura ${f.numero} — ${f.estado}`,
        meta: `${Fmt.money(f.total)} · ${Fmt.relTime(f.emision)}`,
      });
    });
    items.sort((a, b) => (b.when || '').localeCompare(a.when || ''));
    return items.slice(0, 8);
  }

  Modules.Dashboard = render;
})();
