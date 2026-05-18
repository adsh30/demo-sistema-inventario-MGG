/* ============================================================
   MGG · Inventario · Module entry
   Orquesta repository + view + política de reabastecimiento (Restock).
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};

  const state = { filterText: '', filterCat: '', filterStock: '', filterClass: '' };

  function render({ view }) {
    const session = Auth.get();
    const q = sessionStorage.getItem('mgg.search');
    if (q) { state.filterText = q; sessionStorage.removeItem('mgg.search'); }

    view.innerHTML = InventarioView.renderShell(state, session, Restock.getPolicy());

    document.getElementById('fText').addEventListener('input',  (e) => { state.filterText  = e.target.value; refreshTable(); });
    document.getElementById('fCat').addEventListener('change',  (e) => { state.filterCat   = e.target.value; refreshTable(); });
    document.getElementById('fClass').addEventListener('change',(e) => { state.filterClass = e.target.value; refreshTable(); });
    document.getElementById('fStock').addEventListener('change',(e) => { state.filterStock = e.target.value; refreshTable(); });
    document.getElementById('newProductBtn').addEventListener('click', () => openForm());
    document.getElementById('resetBtn').addEventListener('click', () => {
      UI.confirmDialog({
        title: 'Restaurar datos demo',
        message: 'Esto reemplaza todos los datos por los del seed inicial.',
        confirmText: 'Restaurar', danger: true,
        onConfirm: () => { Seed.reset(); UI.toast('Datos restaurados', 'success'); Router.render(); }
      });
    });
    const policyBtn = document.getElementById('policyBtn');
    if (policyBtn) policyBtn.addEventListener('click', openPolicy);

    const unsub = InventarioRepo.subscribe(() => {
      // Refresca la tabla y vuelve a notificar pendientes (deduplicado)
      refreshTable();
      Restock.notifyPending();
    });
    Router.onLeave(unsub);
    refreshTable();
  }

  /** Decora cada producto con clase ABC, umbral efectivo y flags útiles. */
  function decorate(productos) {
    const policy = Restock.getPolicy();
    const classMap = Restock.classifyABC(productos);
    return productos.map(p => ({
      ...p,
      _klass: classMap.get(p.id) || 'C',
      _threshold: Restock.effectiveThreshold(p, policy, classMap),
      _pct: Restock.effectivePct(p, policy, classMap),
      _hasCustom: Restock.hasCustomPct(p),
      _policyMode: policy.mode,
      _needsRestock: Restock.needsRestock(p, policy, classMap),
      // Crítico = por debajo del mínimo absoluto (riesgo operativo).
      _critical: (p.stock || 0) < (p.stockMin || 0),
    }));
  }

  function applyFilters(rows) {
    return rows.filter(p => {
      if (state.filterCat   && p.categoria !== state.filterCat)   return false;
      if (state.filterClass && p._klass    !== state.filterClass) return false;
      if (state.filterStock === 'restock' && !p._needsRestock) return false;
      if (state.filterStock === 'ok'      &&  p._needsRestock) return false;
      if (state.filterText) {
        const q = state.filterText.toLowerCase();
        return p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }

  function refreshTable() {
    const host = document.getElementById('tableHost');
    if (!host) return;
    const rows = applyFilters(decorate(InventarioRepo.all()));
    host.innerHTML = InventarioView.renderTable(rows);
    host.querySelectorAll('[data-edit]').forEach(b  => b.addEventListener('click', () => openForm(b.dataset.edit)));
    host.querySelectorAll('[data-del]').forEach(b   => b.addEventListener('click', () => removeProduct(b.dataset.del)));
    host.querySelectorAll('[data-trace]').forEach(b => b.addEventListener('click', () => openTraceability(b.dataset.trace)));
  }

  function openTraceability(productId) {
    const p = InventarioRepo.findById(productId);
    if (!p) return;
    const movimientos = MovimientosRepo.porProducto(productId);
    const body = document.createElement('div');
    body.innerHTML = InventarioView.renderTrazabilidad(p, movimientos);
    const footer = `<button class="btn btn-ghost" data-close>Cerrar</button>`;
    UI.openModal({ title: `Trazabilidad · ${p.sku}`, body, footer, size: 'lg' });
  }

  // ─── CRUD ────────────────────────────────────────────────
  function openForm(id) {
    const isEdit = !!id;
    const p = isEdit ? InventarioRepo.findById(id) : {
      sku: '', nombre: '', categoria: 'Explosivos', unidad: 'und',
      stock: 0, stockMin: 0, precio: 0, almacen: 'General', estado: 'activo'
    };
    const form = InventarioView.renderForm(p, isEdit);

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>`;
    UI.openModal({ title: isEdit ? 'Editar producto' : 'Nuevo producto', body: form, footer });

    // Preview en vivo del umbral de reabastecimiento
    const policyMode = Restock.getPolicy().mode;
    const previewHost = form.querySelector('#restockPreview');
    function refreshPreview() {
      previewHost.innerHTML = InventarioView.restockPreviewText({
        stockMin:    form.querySelector('[name=stockMin]').value,
        stockActual: form.querySelector('[name=stock]').value,
        pct:         form.querySelector('[name=restockPct]').value,
        unidad:      form.querySelector('[name=unidad]').value,
        policyMode,
        hasOwnPct:   form.querySelector('[name=restockPct]').value !== '',
      });
    }
    ['stockMin', 'stock', 'restockPct', 'unidad'].forEach(name => {
      const el = form.querySelector(`[name=${name}]`);
      if (el) el.addEventListener('input', refreshPreview);
    });
    refreshPreview();

    document.getElementById('saveBtn').addEventListener('click', () => {
      const data = Object.fromEntries(new FormData(form));
      const restockRaw = (data.restockPct || '').toString().trim();
      const payload = {
        sku: data.sku.trim().toUpperCase(),
        nombre: data.nombre.trim(),
        categoria: data.categoria,
        unidad: data.unidad,
        stock: Number(data.stock),
        stockMin: Number(data.stockMin),
        precio: Number(data.precio),
        almacen: 'General',
        estado: data.estado,
        // null = sin override → cae al global cuando el modo es Detallado
        restockPct: restockRaw === '' ? null : Math.max(0, Number(restockRaw)),
      };
      if (!payload.sku || !payload.nombre) { UI.toast('SKU y nombre son obligatorios', 'error'); return; }
      const dup = InventarioRepo.all().find(x => x.sku === payload.sku && x.id !== id);
      if (dup) { UI.toast('Ya existe un producto con ese SKU', 'error'); return; }

      if (isEdit) {
        // Si el stock cambia → se registra como ajuste manual (auditoría)
        const previo = InventarioRepo.findById(id);
        const stockNuevo = payload.stock;
        const stockPrevio = previo.stock || 0;
        const restPayload = { ...payload };
        delete restPayload.stock; // el stock lo maneja MovimientosRepo
        InventarioRepo.update(id, restPayload);
        if (stockNuevo !== stockPrevio) {
          MovimientosRepo.registrar({
            productoId: id,
            tipo: 'ajuste',
            delta: stockNuevo - stockPrevio,
            detalle: `Ajuste manual desde ${stockPrevio} a ${stockNuevo} ${previo.unidad}`,
          });
        }
        UI.toast('Producto actualizado', 'success');
      } else {
        // Alta: crear con stock=0 y registrar el ingreso inicial como movimiento de creación.
        const stockInicial = payload.stock;
        const created = InventarioRepo.create({ ...payload, stock: 0 });
        if (stockInicial > 0) {
          MovimientosRepo.registrar({
            productoId: created.id,
            tipo: 'creacion',
            delta: stockInicial,
            detalle: `Stock inicial al dar de alta el producto`,
          });
        }
        UI.toast('Producto creado', 'success');
      }
      UI.closeModal();
    });
  }

  function removeProduct(id) {
    const p = InventarioRepo.findById(id);
    if (!p) return;
    const inUse = Store.list('ordenes', o => ['pendiente', 'aprobada'].includes(o.estado) && o.items.some(i => i.productoId === id));
    if (inUse.length) { UI.toast('No se puede eliminar: tiene órdenes activas asociadas.', 'error'); return; }
    UI.confirmDialog({
      title: 'Eliminar producto',
      message: `¿Eliminar "${p.nombre}" (${p.sku})? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', danger: true,
      onConfirm: () => { InventarioRepo.remove(id); UI.toast('Producto eliminado', 'success'); }
    });
  }

  // ─── Política de reabastecimiento ────────────────────────
  function openPolicy() {
    if (!Auth.isAdmin()) { UI.toast('Solo la administradora puede modificar la política', 'error'); return; }

    const policy = Restock.getPolicy();
    const preview = Restock.scan();
    const customStats = computeCustomStats();
    const form = InventarioView.renderPolicyForm(policy, preview, customStats);

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="savePolicy">Guardar política</button>`;
    UI.openModal({ title: 'Política de reabastecimiento', body: form, footer });

    // Vista previa inicial
    form.querySelector('#previewList').innerHTML = InventarioView.renderPolicyPreview(preview);

    // Toggle de bloques según modo
    function syncBlocks() {
      const mode = form.querySelector('input[name=mode]:checked').value;
      form.querySelector('#simpleBlock').classList.toggle('hidden', mode !== 'simple');
      form.querySelector('#abcBlock').classList.toggle('hidden', mode !== 'abc');
      form.querySelector('#detalladoBlock').classList.toggle('hidden', mode !== 'detallado');
      recomputePreview();
    }
    form.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', syncBlocks));

    function readPolicyFromForm() {
      const data = Object.fromEntries(new FormData(form));
      // En modo detallado, el fallback se llama thresholdGlobalDet
      const globalRaw = data.mode === 'detallado'
        ? data.thresholdGlobalDet
        : data.thresholdGlobal;
      return {
        mode: data.mode,
        thresholdGlobal: Math.max(0, Number(globalRaw) || 0),
        thresholdsByClass: {
          A: Math.max(0, Number(data.thA) || 0),
          B: Math.max(0, Number(data.thB) || 0),
          C: Math.max(0, Number(data.thC) || 0),
        },
      };
    }

    function recomputePreview() {
      const candidate = readPolicyFromForm();
      const productos = InventarioRepo.activos();
      const classMap = Restock.classifyABC(productos);
      const items = productos
        .filter(p => p.stock <= Restock.effectiveThreshold(p, candidate, classMap))
        .map(p => ({
          ...p,
          _klass: classMap.get(p.id),
          _threshold: Restock.effectiveThreshold(p, candidate, classMap),
          _pct: Restock.effectivePct(p, candidate, classMap),
          _hasCustom: Restock.hasCustomPct(p),
        }));
      form.querySelector('#previewCount').textContent = `${items.length} producto(s) en alerta`;
      form.querySelector('#previewList').innerHTML = InventarioView.renderPolicyPreview(items);
    }

    form.querySelectorAll('input[type=number]').forEach(i => i.addEventListener('input', recomputePreview));

    document.getElementById('savePolicy').addEventListener('click', () => {
      try {
        const next = readPolicyFromForm();
        Restock.setPolicy(next);
        UI.toast('Política actualizada', 'success');
        UI.closeModal();
        Router.render(); // re-render con la nueva política
        Restock.notifyPending();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  /** Estadísticas para el bloque del modo Detallado. */
  function computeCustomStats() {
    const productos = InventarioRepo.activos();
    const customList = productos.filter(p => Restock.hasCustomPct(p));
    return {
      withCustom: customList.length,
      withFallback: productos.length - customList.length,
      customList: customList.sort((a, b) => (b.restockPct || 0) - (a.restockPct || 0)),
    };
  }

  Modules.Inventario = render;
})();
