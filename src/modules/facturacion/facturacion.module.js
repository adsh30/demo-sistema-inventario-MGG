/* ============================================================
   MGG · Facturación · Module entry
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};
  const VIEW_KEY = 'mgg.view.facturacion';
  const state = {
    filterText: '',
    filterEstado: '',
    viewMode: localStorage.getItem(VIEW_KEY) || 'kanban',
  };

  function render({ view }) {
    view.innerHTML = FacturasView.renderShell(state);
    bindShell(view);

    const unsub = FacturasRepo.subscribe(refresh);
    Router.onLeave(unsub);
    refresh();
  }

  function bindShell(view) {
    document.getElementById('fText').addEventListener('input', (e) => { state.filterText = e.target.value; refresh(); });
    const fEstado = document.getElementById('fEstado');
    if (fEstado) fEstado.addEventListener('change', (e) => { state.filterEstado = e.target.value; refresh(); });
    document.getElementById('goOrdersBtn').addEventListener('click', () => Router.go('ordenes'));
    document.querySelectorAll('.view-toggle [data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view, view));
    });
  }

  function switchView(mode, view) {
    if (mode === state.viewMode) return;
    state.viewMode = mode;
    localStorage.setItem(VIEW_KEY, mode);
    view.innerHTML = FacturasView.renderShell(state);
    bindShell(view);
    refresh();
  }

  function applyFilters(rows) {
    return rows.filter(f => {
      if (state.viewMode === 'lista' && state.filterEstado && f.estado !== state.filterEstado) return false;
      if (state.filterText) {
        const q = state.filterText.toLowerCase();
        const prov = ProveedoresRepo.findById(f.proveedorId);
        return [f.numero, prov && prov.razonSocial].some(v => (v || '').toString().toLowerCase().includes(q));
      }
      return true;
    });
  }

  function refresh() {
    const boardHost = document.getElementById('boardHost');
    const kpiHost = document.getElementById('kpiHost');
    if (!boardHost || !kpiHost) return;
    const all = FacturasRepo.all();
    kpiHost.innerHTML = FacturasView.renderKpis(all);

    const rows = applyFilters(all);
    if (state.viewMode === 'kanban') {
      boardHost.innerHTML = FacturasView.renderKanban(rows);
      boardHost.querySelectorAll('.kanban-card[data-view]').forEach(c => {
        c.addEventListener('click', () => openInvoice(c.dataset.view));
        c.addEventListener('keydown', (e) => { if (e.key === 'Enter') openInvoice(c.dataset.view); });
      });
    } else {
      boardHost.innerHTML = FacturasView.renderTable(rows);
      boardHost.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openInvoice(b.dataset.view)));
      boardHost.querySelectorAll('[data-pay]').forEach(b  => b.addEventListener('click', () => markPaid(b.dataset.pay)));
      boardHost.querySelectorAll('[data-void]').forEach(b => b.addEventListener('click', () => voidInvoice(b.dataset.void)));
    }
  }

  function openInvoice(id) {
    const f = FacturasRepo.findById(id); if (!f) return;
    const body = FacturasView.renderInvoice(f);
    const footer = document.createElement('div');
    const btns = [`<button class="btn btn-ghost" data-close>Cerrar</button>`];
    if (f.estado === 'pendiente') {
      btns.push(`<button class="btn btn-danger" id="voidBtn">Anular</button>`);
      btns.push(`<button class="btn btn-success" id="payBtn">Marcar como pagada</button>`);
    }
    footer.innerHTML = btns.join('');
    UI.openModal({ title: `Factura ${f.numero}`, body, footer, size: 'lg' });

    const pb = document.getElementById('payBtn');  if (pb) pb.addEventListener('click', () => { UI.closeModal(); markPaid(id); });
    const vb = document.getElementById('voidBtn'); if (vb) vb.addEventListener('click', () => { UI.closeModal(); voidInvoice(id); });
  }

  function markPaid(id) {
    const f = FacturasRepo.findById(id);
    if (!f || f.estado !== 'pendiente') return;
    UI.confirmDialog({
      title: 'Marcar factura como pagada',
      message: `Confirmar pago de ${f.numero} por ${Fmt.money(f.total)}.`,
      confirmText: 'Marcar pagada',
      onConfirm: () => {
        FacturasRepo.update(id, { estado: 'pagada', pagadaEn: new Date().toISOString() });
        UI.toast('Factura registrada como pagada', 'success');
      }
    });
  }

  function voidInvoice(id) {
    const f = FacturasRepo.findById(id);
    if (!f || f.estado !== 'pendiente') return;
    UI.confirmDialog({
      title: 'Anular factura',
      message: `Anular ${f.numero}. Esta acción no se puede deshacer.`,
      confirmText: 'Anular', danger: true,
      onConfirm: () => {
        FacturasRepo.update(id, { estado: 'anulada' });
        UI.toast('Factura anulada', 'warning');
      }
    });
  }

  Modules.Facturacion = render;
})();
