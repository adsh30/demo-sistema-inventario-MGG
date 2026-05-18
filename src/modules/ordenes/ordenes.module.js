/* ============================================================
   MGG · Órdenes · Module entry
   Orquesta repository + controller + view.
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};
  const VIEW_KEY = 'mgg.view.ordenes';
  const state = {
    filterText: '',
    filterEstado: '',
    viewMode: localStorage.getItem(VIEW_KEY) || 'kanban',
  };

  function render({ view }) {
    const session = Auth.get();
    view.innerHTML = OrdenesView.renderShell(state, session);

    document.getElementById('fText').addEventListener('input',   (e) => { state.filterText   = e.target.value; refreshBoard(); });
    const fEstado = document.getElementById('fEstado');
    if (fEstado) fEstado.addEventListener('change', (e) => { state.filterEstado = e.target.value; refreshBoard(); });
    document.getElementById('newBtn').addEventListener('click', openOrderForm);

    document.querySelectorAll('.view-toggle [data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view, view, session));
    });

    const unsub = OrdenesRepo.subscribe(refreshBoard);
    Router.onLeave(unsub);
    refreshBoard();
  }

  function switchView(mode, view, session) {
    if (mode === state.viewMode) return;
    state.viewMode = mode;
    localStorage.setItem(VIEW_KEY, mode);
    // Re-render shell completo para reflejar estado del toggle y filtro
    view.innerHTML = OrdenesView.renderShell(state, session);
    document.getElementById('fText').addEventListener('input',   (e) => { state.filterText   = e.target.value; refreshBoard(); });
    const fEstado = document.getElementById('fEstado');
    if (fEstado) fEstado.addEventListener('change', (e) => { state.filterEstado = e.target.value; refreshBoard(); });
    document.getElementById('newBtn').addEventListener('click', openOrderForm);
    document.querySelectorAll('.view-toggle [data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view, view, session));
    });
    refreshBoard();
  }

  function applyFilters(rows) {
    return rows.filter(o => {
      // En vista Kanban no aplicamos el filtro de estado: el Kanban ya agrupa por columnas.
      if (state.viewMode === 'lista' && state.filterEstado && o.estado !== state.filterEstado) return false;
      if (state.filterText) {
        const q = state.filterText.toLowerCase();
        const prov = ProveedoresRepo.findById(o.proveedorId);
        return [o.codigo, prov && prov.razonSocial, o.solicitante, o.solicitanteEmail, o.notas]
          .some(v => (v || '').toString().toLowerCase().includes(q));
      }
      return true;
    });
  }

  function refreshBoard() {
    const host = document.getElementById('boardHost');
    if (!host) return;
    const session = Auth.get();
    const rows = applyFilters(OrdenesRepo.all());

    if (state.viewMode === 'kanban') {
      host.innerHTML = OrdenesView.renderKanban(rows);
      host.querySelectorAll('.kanban-card[data-view]').forEach(c => {
        c.addEventListener('click', () => openOrderDetail(c.dataset.view));
        c.addEventListener('keydown', (e) => { if (e.key === 'Enter') openOrderDetail(c.dataset.view); });
      });
    } else {
      host.innerHTML = OrdenesView.renderTable(rows, session);
      host.querySelectorAll('[data-view]').forEach(b    => b.addEventListener('click', () => openOrderDetail(b.dataset.view)));
      host.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => approveFlow(b.dataset.approve)));
      host.querySelectorAll('[data-reject]').forEach(b  => b.addEventListener('click', () => rejectFlow(b.dataset.reject)));
    }
  }

  // ---------- Crear ----------
  function openOrderForm() {
    const proveedores = ProveedoresRepo.activos();
    const productos = InventarioRepo.activos();
    if (!proveedores.length || !productos.length) {
      UI.toast('Necesitas al menos un proveedor activo y un producto.', 'error'); return;
    }
    const form = OrdenesView.renderOrderForm({ proveedores, productos, nextCodigo: OrdenesRepo.nextCodigo() });
    let items = [];

    function renderItems() {
      const list = form.querySelector('#itemsList');
      list.innerHTML = items.map((it, idx) => `
        <div class="line-picker" data-idx="${idx}">
          <div><div>${Fmt.esc(it.nombre)}</div><div class="muted mono" style="font-size:.72rem">${Fmt.esc(it.sku)}</div></div>
          <input class="input mono" type="number" min="1" step="1" value="${it.cantidad}" data-field="cantidad" />
          <input class="input mono" type="number" min="0" step="0.01" value="${it.precio}" data-field="precio" />
          <button type="button" class="rm" title="Quitar">✕</button>
        </div>`).join('');
      list.querySelectorAll('.line-picker').forEach(row => {
        const idx = Number(row.dataset.idx);
        row.querySelector('[data-field=cantidad]').addEventListener('input', (e) => { items[idx].cantidad = Math.max(1, Number(e.target.value) || 1); updateTotal(); });
        row.querySelector('[data-field=precio]').addEventListener('input',   (e) => { items[idx].precio   = Math.max(0, Number(e.target.value) || 0); updateTotal(); });
        row.querySelector('.rm').addEventListener('click', () => { items.splice(idx, 1); renderItems(); });
      });
      updateTotal();
    }
    function updateTotal() {
      const total = items.reduce((a, i) => a + i.cantidad * i.precio, 0);
      form.querySelector('#totalLbl').textContent = Fmt.money(total);
    }
    form.querySelector('#addItemBtn').addEventListener('click', () => {
      const pid = form.querySelector('#prodSelect').value;
      const p = InventarioRepo.findById(pid); if (!p) return;
      const ex = items.find(i => i.productoId === pid);
      if (ex) ex.cantidad += 1;
      else items.push({ productoId: p.id, nombre: p.nombre, sku: p.sku, cantidad: 1, precio: p.precio });
      renderItems();
    });

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveBtn">Crear solicitud</button>`;
    UI.openModal({ title: 'Nueva orden de pedido', body: form, footer, size: 'lg' });
    renderItems();

    document.getElementById('saveBtn').addEventListener('click', () => {
      if (!items.length) { UI.toast('Añade al menos un producto', 'error'); return; }
      const data = Object.fromEntries(new FormData(form));
      const saved = OrdenesCtrl.crear({ proveedorId: data.proveedorId, items, notas: data.notas });
      UI.toast(`Orden ${saved.codigo} enviada para aprobación`, 'success');
      UI.closeModal();
    });
  }

  // ---------- Detalle + acciones ----------
  function openOrderDetail(id) {
    const o = OrdenesRepo.findById(id);
    if (!o) return;
    const session = Auth.get();
    const body = document.createElement('div');
    body.innerHTML = OrdenesView.renderDetail(o);

    const footer = document.createElement('div');
    const btns = [];
    btns.push(`<button class="btn btn-ghost" data-close>Cerrar</button>`);

    if (session.role === 'admin' && o.estado === 'pendiente') {
      btns.push(`<button class="btn btn-danger" id="rejBtn">Rechazar</button>`);
      btns.push(`<button class="btn btn-success" id="apprBtn">Aprobar y facturar</button>`);
    }
    if (['pendiente', 'aprobada', 'desistida_proveedor'].includes(o.estado)) {
      btns.push(`<button class="btn btn-ghost" id="changeBtn" title="Reasignar a otro proveedor">↻ Cambiar proveedor</button>`);
    }
    if (o.estado === 'aprobada') {
      btns.push(`<button class="btn btn-ghost" id="desistBtn" title="Proveedor no cumplió">⚠ Proveedor desistió</button>`);
      btns.push(`<button class="btn btn-primary" id="recvBtn">Marcar recibida</button>`);
    }
    if (['pendiente', 'aprobada'].includes(o.estado)) {
      btns.push(`<button class="btn btn-danger" id="cancBtn">Cancelar orden</button>`);
    }

    footer.innerHTML = btns.reverse().join('');
    UI.openModal({ title: `Orden ${o.codigo}`, body, footer, size: 'lg' });

    bind('apprBtn',   () => { UI.closeModal(); approveFlow(o.id); });
    bind('rejBtn',    () => { UI.closeModal(); rejectFlow(o.id); });
    bind('cancBtn',   () => { UI.closeModal(); cancelFlow(o.id); });
    bind('desistBtn', () => { UI.closeModal(); desistirFlow(o.id); });
    bind('changeBtn', () => { UI.closeModal(); changeSupplierFlow(o.id); });
    bind('recvBtn',   () => { UI.closeModal(); receiveFlow(o.id); });
  }
  function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

  // ---------- Flows ----------
  function approveFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    UI.confirmDialog({
      title: 'Aprobar orden',
      message: `Aprobar ${o.codigo} por ${Fmt.money(o.total)}. Se generará una factura asociada.`,
      confirmText: 'Aprobar y facturar',
      onConfirm: () => {
        try { const r = OrdenesCtrl.aprobar(id); UI.toast(`Orden aprobada · ${r.factura.numero} generada`, 'success'); }
        catch (e) { UI.toast(e.message, 'error'); }
      }
    });
  }

  function rejectFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    const form = document.createElement('form');
    form.innerHTML = `<div class="form-row"><label>Motivo del rechazo</label><textarea class="textarea" name="motivo" required></textarea></div>`;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="confirm">Rechazar orden</button>`;
    UI.openModal({ title: `Rechazar ${o.codigo}`, body: form, footer });
    document.getElementById('confirm').addEventListener('click', () => {
      const motivo = form.querySelector('[name=motivo]').value.trim();
      try { OrdenesCtrl.rechazar(id, motivo); UI.toast('Orden rechazada', 'warning'); UI.closeModal(); }
      catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  function cancelFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    const form = document.createElement('form');
    form.innerHTML = `
      <p class="muted">Cancelar la orden. Si hay factura asociada se anulará. Útil cuando el cliente solicita cancelar o la empresa desiste del proyecto.</p>
      <div class="form-row"><label>Motivo</label><textarea class="textarea" name="motivo" required></textarea></div>`;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-danger" id="confirm">Cancelar orden</button>`;
    UI.openModal({ title: `Cancelar ${o.codigo}`, body: form, footer });
    document.getElementById('confirm').addEventListener('click', () => {
      const motivo = form.querySelector('[name=motivo]').value.trim();
      try { OrdenesCtrl.cancelar(id, motivo); UI.toast('Orden cancelada', 'warning'); UI.closeModal(); }
      catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  function desistirFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    const form = document.createElement('form');
    form.innerHTML = `
      <p class="muted">Registra que el proveedor no cumplió. La orden quedará abierta para reasignar a otro proveedor.</p>
      <div class="form-row"><label>¿Por qué no cumplió?</label><textarea class="textarea" name="motivo" required placeholder="No respondió, no entregó a tiempo, retiró la propuesta…"></textarea></div>`;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" data-close>Cerrar</button><button class="btn btn-danger" id="confirm">Registrar desistimiento</button>`;
    UI.openModal({ title: `Desistimiento · ${o.codigo}`, body: form, footer });
    document.getElementById('confirm').addEventListener('click', () => {
      const motivo = form.querySelector('[name=motivo]').value.trim();
      try {
        OrdenesCtrl.desistirProveedor(id, motivo);
        UI.toast('Desistimiento registrado · orden abierta para reasignar', 'warning');
        UI.closeModal();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  function changeSupplierFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    const proveedores = ProveedoresRepo.activos();
    if (proveedores.length < 2) { UI.toast('Necesitas al menos otro proveedor activo para reasignar.', 'error'); return; }

    const form = OrdenesView.renderChangeSupplierForm(o, proveedores);
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="confirm">Reasignar</button>`;
    UI.openModal({ title: `Cambiar proveedor · ${o.codigo}`, body: form, footer });

    document.getElementById('confirm').addEventListener('click', () => {
      const data = Object.fromEntries(new FormData(form));
      try {
        OrdenesCtrl.cambiarProveedor(id, data.proveedorId, data.motivo);
        UI.toast('Orden reasignada · requiere nueva aprobación', 'success');
        UI.closeModal();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  function receiveFlow(id) {
    const o = OrdenesRepo.findById(id); if (!o) return;
    UI.confirmDialog({
      title: 'Marcar como recibida',
      message: `Confirmar la recepción de ${o.codigo}. El stock se incrementará en el almacén general.`,
      confirmText: 'Confirmar recepción',
      onConfirm: () => { OrdenesCtrl.recibir(id); UI.toast('Stock actualizado', 'success'); }
    });
  }

  Modules.Ordenes = render;
})();
