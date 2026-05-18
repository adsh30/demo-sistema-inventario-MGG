/* ============================================================
   MGG · Proveedores · View
   ============================================================ */
(function () {
  const CATEGORIAS_PROV = ['Explosivos', 'EPP', 'Herramientas', 'Maquinaria', 'Lubricantes', 'Reactivos', 'Repuestos', 'Logística', 'Químicos'];

  function renderShell({ filterText, filterEstado }) {
    return `
      <div class="page-head">
        <div>
          <h1>Proveedores</h1>
          <p>Base de proveedores que participan en órdenes y licitaciones (Fase 2).</p>
        </div>
        <div class="actions">
          <button class="btn btn-primary" id="newProvBtn">+ Nuevo proveedor</button>
        </div>
      </div>

      <div class="filterbar">
        <input class="search" id="fText" placeholder="Buscar por razón social, RIF, contacto…" value="${Fmt.esc(filterText)}" />
        <select class="select" id="fEstado" style="max-width:180px">
          <option value="">Todos los estados</option>
          <option value="activo"   ${filterEstado === 'activo'   ? 'selected' : ''}>Activos</option>
          <option value="inactivo" ${filterEstado === 'inactivo' ? 'selected' : ''}>Inactivos</option>
        </select>
      </div>

      <div id="tableHost"></div>`;
  }

  function renderTable(rows) {
    if (!rows.length) return `<div class="card">${UI.emptyState('Sin proveedores que coincidan.', '⚒')}</div>`;
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>RIF</th><th>Razón social</th><th>Contacto</th>
            <th>Categorías</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(p => `
              <tr>
                <td class="mono">${Fmt.esc(p.rif)}</td>
                <td>
                  <div><strong>${Fmt.esc(p.razonSocial)}</strong></div>
                  <div class="muted" style="font-size:.78rem">${Fmt.esc(p.email || '')}</div>
                </td>
                <td>
                  <div>${Fmt.esc(p.contacto || '—')}</div>
                  <div class="muted" style="font-size:.78rem">${Fmt.esc(p.telefono || '')}</div>
                </td>
                <td>${(p.categorias || []).map(c => `<span class="badge" style="margin-right:.2rem">${Fmt.esc(c)}</span>`).join('')}</td>
                <td>${Fmt.statusBadge(p.estado)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-ghost"  data-view="${p.id}">Ver</button>
                  <button class="btn btn-sm btn-ghost"  data-edit="${p.id}">Editar</button>
                  <button class="btn btn-sm btn-danger" data-del="${p.id}">✕</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderForm(p) {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-row">
          <label>RIF</label>
          <input class="input mono" name="rif" value="${Fmt.esc(p.rif)}" placeholder="J-XXXXXXXX-X" required />
        </div>
        <div class="form-row">
          <label>Estado</label>
          <select class="select" name="estado">
            <option value="activo"   ${p.estado === 'activo'   ? 'selected' : ''}>Activo</option>
            <option value="inactivo" ${p.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
          </select>
        </div>
      </div>
      <div class="form-row"><label>Razón social</label><input class="input" name="razonSocial" value="${Fmt.esc(p.razonSocial)}" required /></div>
      <div class="form-grid">
        <div class="form-row"><label>Contacto</label><input class="input" name="contacto" value="${Fmt.esc(p.contacto)}" /></div>
        <div class="form-row"><label>Teléfono</label><input class="input" name="telefono" value="${Fmt.esc(p.telefono)}" /></div>
      </div>
      <div class="form-row"><label>Correo</label><input class="input" name="email" type="email" value="${Fmt.esc(p.email)}" /></div>
      <div class="form-row"><label>Dirección</label><input class="input" name="direccion" value="${Fmt.esc(p.direccion)}" /></div>
      <div class="form-row">
        <label>Categorías que ofrece</label>
        <div style="display:flex; flex-wrap:wrap; gap:.4rem">
          ${CATEGORIAS_PROV.map(c => `
            <label style="display:flex; align-items:center; gap:.3rem; padding:.35rem .65rem; background:var(--bg-1); border:1px solid var(--border); border-radius:6px; cursor:pointer">
              <input type="checkbox" name="cat" value="${c}" ${(p.categorias || []).includes(c) ? 'checked' : ''} />
              <span style="font-size:.82rem">${c}</span>
            </label>`).join('')}
        </div>
      </div>
    `;
    return form;
  }

  function renderDetail(p, ordenes) {
    const totalNeg = ordenes.reduce((a, o) => a + (o.total || 0), 0);
    return `
      <div class="detail-row"><div class="k">RIF</div><div class="v mono">${Fmt.esc(p.rif)}</div></div>
      <div class="detail-row"><div class="k">Razón social</div><div class="v">${Fmt.esc(p.razonSocial)}</div></div>
      <div class="detail-row"><div class="k">Contacto</div><div class="v">${Fmt.esc(p.contacto || '—')}</div></div>
      <div class="detail-row"><div class="k">Teléfono</div><div class="v">${Fmt.esc(p.telefono || '—')}</div></div>
      <div class="detail-row"><div class="k">Correo</div><div class="v">${Fmt.esc(p.email || '—')}</div></div>
      <div class="detail-row"><div class="k">Dirección</div><div class="v">${Fmt.esc(p.direccion || '—')}</div></div>
      <div class="detail-row"><div class="k">Categorías</div><div class="v">${(p.categorias || []).map(c => `<span class="badge">${Fmt.esc(c)}</span>`).join(' ') || '—'}</div></div>
      <div class="detail-row"><div class="k">Estado</div><div class="v">${Fmt.statusBadge(p.estado)}</div></div>
      <div class="detail-row"><div class="k">Órdenes vinculadas</div><div class="v">${ordenes.length} · ${Fmt.money(totalNeg)} en negocios</div></div>
      <div class="detail-row"><div class="k">Registrado</div><div class="v">${Fmt.date(p.createdAt)}</div></div>
    `;
  }

  window.ProveedoresView = { renderShell, renderTable, renderForm, renderDetail, CATEGORIAS_PROV };
})();
