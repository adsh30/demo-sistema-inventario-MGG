/* ============================================================
   MGG · Proveedores · Module entry
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};
  const state = { filterText: '', filterEstado: '' };

  function render({ view }) {
    view.innerHTML = ProveedoresView.renderShell(state);

    document.getElementById('fText').addEventListener('input',   (e) => { state.filterText   = e.target.value; refreshTable(); });
    document.getElementById('fEstado').addEventListener('change',(e) => { state.filterEstado = e.target.value; refreshTable(); });
    document.getElementById('newProvBtn').addEventListener('click', () => openForm());

    const unsub = ProveedoresRepo.subscribe(refreshTable);
    Router.onLeave(unsub);
    refreshTable();
  }

  function applyFilters(rows) {
    return rows.filter(p => {
      if (state.filterEstado && p.estado !== state.filterEstado) return false;
      if (state.filterText) {
        const q = state.filterText.toLowerCase();
        return [p.razonSocial, p.rif, p.contacto, p.email].some(v => (v || '').toLowerCase().includes(q));
      }
      return true;
    });
  }

  function refreshTable() {
    const host = document.getElementById('tableHost');
    if (!host) return;
    host.innerHTML = ProveedoresView.renderTable(applyFilters(ProveedoresRepo.all()));
    host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openDetail(b.dataset.view)));
    host.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(b.dataset.edit)));
    host.querySelectorAll('[data-del]').forEach(b  => b.addEventListener('click', () => removeProv(b.dataset.del)));
  }

  function openForm(id) {
    const isEdit = !!id;
    const p = isEdit ? ProveedoresRepo.findById(id) : {
      rif: '', razonSocial: '', contacto: '', telefono: '', email: '',
      direccion: '', categorias: [], estado: 'activo'
    };
    const form = ProveedoresView.renderForm(p);
    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Guardar cambios' : 'Crear proveedor'}</button>`;
    UI.openModal({ title: isEdit ? 'Editar proveedor' : 'Nuevo proveedor', body: form, footer });

    document.getElementById('saveBtn').addEventListener('click', () => {
      const cats = [...form.querySelectorAll('input[name=cat]:checked')].map(c => c.value);
      const data = Object.fromEntries(new FormData(form));
      delete data.cat;
      const payload = {
        rif: (data.rif || '').trim().toUpperCase(),
        razonSocial: (data.razonSocial || '').trim(),
        contacto: data.contacto.trim(), telefono: data.telefono.trim(),
        email: data.email.trim(), direccion: data.direccion.trim(),
        categorias: cats, estado: data.estado,
      };
      if (!payload.rif || !payload.razonSocial) { UI.toast('RIF y razón social son obligatorios', 'error'); return; }
      const dup = ProveedoresRepo.all().find(x => x.rif === payload.rif && x.id !== id);
      if (dup) { UI.toast('Ya existe un proveedor con ese RIF', 'error'); return; }

      if (isEdit) { ProveedoresRepo.update(id, payload); UI.toast('Proveedor actualizado', 'success'); }
      else        { ProveedoresRepo.create(payload);    UI.toast('Proveedor creado', 'success'); }
      UI.closeModal();
    });
  }

  function openDetail(id) {
    const p = ProveedoresRepo.findById(id);
    if (!p) return;
    const ordenes = Store.list('ordenes', o => o.proveedorId === id);
    UI.openModal({
      title: p.razonSocial,
      body: ProveedoresView.renderDetail(p, ordenes),
      footer: `<button class="btn btn-ghost" data-close>Cerrar</button>`
    });
  }

  function removeProv(id) {
    const p = ProveedoresRepo.findById(id);
    if (!p) return;
    const inUse = Store.list('ordenes', o => o.proveedorId === id);
    if (inUse.length) { UI.toast('No se puede eliminar: tiene órdenes asociadas. Inactívalo en su lugar.', 'error'); return; }
    UI.confirmDialog({
      title: 'Eliminar proveedor',
      message: `¿Eliminar "${p.razonSocial}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', danger: true,
      onConfirm: () => { ProveedoresRepo.remove(id); UI.toast('Proveedor eliminado', 'success'); }
    });
  }

  Modules.Proveedores = render;
})();
