/* ============================================================
   MGG · Inventario · View
   Renderiza tabla, filtros y modal de formulario.
   ============================================================ */
(function () {
  const CATEGORIAS = ['Explosivos', 'EPP', 'Herramientas', 'Maquinaria', 'Lubricantes', 'Reactivos', 'Repuestos', 'Logística'];
  const UNIDADES = ['und', 'kg', 'l', 'm', 'par', 'saco', 'tambor', 'caja'];

  function renderShell({ filterText, filterCat, filterStock, filterClass }, session, policy) {
    const policyHint = policy.mode === 'abc'
      ? `Política ABC · A ${policy.thresholdsByClass.A}% · B ${policy.thresholdsByClass.B}% · C ${policy.thresholdsByClass.C}%`
      : `Política simple · ${policy.thresholdGlobal}% del stock mínimo`;

    return `
      <div class="page-head">
        <div>
          <h1>Inventario</h1>
          <p>Catálogo de productos · almacén general. <span class="muted">${Fmt.esc(policyHint)}</span></p>
        </div>
        <div class="actions">
          ${session.role === 'admin'
            ? `<button class="btn btn-ghost" id="policyBtn" title="Configurar política de reabastecimiento">⚙ Política reabastecimiento</button>`
            : ''}
          <button class="btn btn-ghost" id="resetBtn" title="Restaurar datos demo">↻ Datos demo</button>
          <button class="btn btn-primary" id="newProductBtn">+ Nuevo producto</button>
        </div>
      </div>

      <div class="filterbar">
        <input class="search" id="fText" placeholder="Buscar por SKU o nombre…" value="${Fmt.esc(filterText)}" />
        <select class="select" id="fCat" style="max-width:180px">
          <option value="">Todas las categorías</option>
          ${CATEGORIAS.map(c => `<option ${filterCat === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <select class="select" id="fClass" style="max-width:140px" title="Clasificación ABC (Pareto)">
          <option value="">Todas las clases</option>
          <option value="A" ${filterClass === 'A' ? 'selected' : ''}>Clase A</option>
          <option value="B" ${filterClass === 'B' ? 'selected' : ''}>Clase B</option>
          <option value="C" ${filterClass === 'C' ? 'selected' : ''}>Clase C</option>
        </select>
        <select class="select" id="fStock" style="max-width:200px">
          <option value="">Todo el stock</option>
          <option value="restock" ${filterStock === 'restock' ? 'selected' : ''}>Requiere reabastecer</option>
          <option value="ok"      ${filterStock === 'ok'      ? 'selected' : ''}>Stock óptimo</option>
        </select>
      </div>

      <div id="tableHost"></div>
    `;
  }

  function renderTable(rows) {
    if (!rows.length) {
      return `<div class="card">${UI.emptyState('Sin productos que coincidan con los filtros.', '⬢')}</div>`;
    }
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>SKU</th><th>Producto</th><th>Categoría</th>
            <th title="Clasificación ABC (Pareto)">ABC</th>
            <th style="text-align:right">Stock</th>
            <th style="text-align:right" title="Umbral efectivo según la política">Umbral</th>
            <th style="text-align:right">Precio</th>
            <th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${rows.map(p => {
              const threshold = p._threshold != null ? p._threshold : p.stockMin;
              const restock = p._needsRestock;
              const critical = p._critical;
              const ratio = Math.min(1, p.stock / Math.max(1, threshold));
              const cls = critical ? 'crit' : (ratio < 0.75 ? 'low' : '');
              const klass = p._klass || '—';
              const stockBadge = critical
                ? '<span class="badge danger" style="margin-left:.25rem" title="Stock por debajo del mínimo · riesgo operativo">⚠ crítico</span>'
                : restock
                  ? '<span class="badge warning" style="margin-left:.25rem">reabastecer</span>'
                  : '';
              return `<tr>
                <td class="mono">${Fmt.esc(p.sku)}</td>
                <td>
                  <div>${Fmt.esc(p.nombre)}</div>
                  <div class="stock-meter ${cls}" style="width:140px"><div class="fill" style="width:${Math.round(ratio * 100)}%"></div></div>
                </td>
                <td><span class="badge">${Fmt.esc(p.categoria)}</span></td>
                <td><span class="badge abc-${klass}">${klass}</span></td>
                <td style="text-align:right" class="mono">${Fmt.num(p.stock)} ${stockBadge}</td>
                <td style="text-align:right" class="mono muted" title="${p.stockMin} mín × ${p._pct ?? '—'}%">
                  ≤ ${Fmt.num(threshold)}
                  ${p._hasCustom ? `<span class="badge primary" style="margin-left:.3rem; font-size:.62rem; padding:.05rem .35rem" title="Umbral personalizado (${p.restockPct}%) ${p._policyMode === 'detallado' ? '· activo' : '· inactivo (cambia a modo Detallado)'}">★ ${p.restockPct}%</span>` : ''}
                </td>
                <td style="text-align:right" class="mono">${Fmt.money(p.precio)}</td>
                <td>${Fmt.statusBadge(p.estado)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-ghost"  data-trace="${p.id}" title="Ver trazabilidad / kardex">📋</button>
                  <button class="btn btn-sm btn-ghost"  data-edit="${p.id}">Editar</button>
                  <button class="btn btn-sm btn-danger" data-del="${p.id}">✕</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderForm(p, isEdit) {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-row">
          <label>SKU</label>
          <input class="input mono" name="sku" value="${Fmt.esc(p.sku)}" required />
        </div>
        <div class="form-row">
          <label>Estado</label>
          <select class="select" name="estado">
            <option value="activo"   ${p.estado === 'activo'   ? 'selected' : ''}>Activo</option>
            <option value="inactivo" ${p.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>Nombre del producto</label>
        <input class="input" name="nombre" value="${Fmt.esc(p.nombre)}" required />
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Categoría</label>
          <select class="select" name="categoria">
            ${CATEGORIAS.map(c => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Unidad</label>
          <select class="select" name="unidad">
            ${UNIDADES.map(u => `<option ${p.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Stock actual</label>
          <input class="input mono" name="stock" type="number" min="0" value="${p.stock}" required />
          <small class="muted" style="font-size:.72rem">Existencia real disponible en el almacén ahora mismo.</small>
        </div>
        <div class="form-row">
          <label>Stock mínimo</label>
          <input class="input mono" name="stockMin" type="number" min="0" value="${p.stockMin}" required />
          <small class="muted" style="font-size:.72rem">
            ⚠ Línea roja. Por debajo de este nivel la operación queda en <strong>riesgo crítico</strong>.
          </small>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Precio unitario (USD)</label>
          <input class="input mono" name="precio" type="number" min="0" step="0.01" value="${p.precio}" required />
        </div>
        <div class="form-row">
          <label>Almacén</label>
          <input class="input" name="almacen" value="${Fmt.esc(p.almacen || 'General')}" disabled />
        </div>
      </div>

      <div class="form-row">
        <label>
          Umbral de reabastecimiento
          <span class="muted" style="font-weight:400; text-transform:none; letter-spacing:0">— opcional (%)</span>
        </label>
        <input class="input mono" name="restockPct" type="number" min="0" max="500" step="5"
               value="${p.restockPct != null ? p.restockPct : ''}"
               placeholder="vacío = usar política global" />
        <div id="restockPreview"
             style="margin-top:.5rem; padding:.55rem .75rem; background:var(--bg-1); border-left:3px solid var(--primary); border-radius:6px; font-size:.82rem">
          <!-- Se llena reactivamente desde el module -->
        </div>
        <small class="muted" style="font-size:.72rem; line-height:1.4; margin-top:.4rem">
          El % se calcula <strong>sobre el stock mínimo</strong>: 100% alerta justo al mínimo,
          150% alerta cuando aún tienes 1.5× el mínimo (margen para que el proveedor reponga).
          Sube el valor para insumos de alto consumo · bájalo para piezas que rotan lento.
          Solo se aplica si la política está en modo <strong>Detallado</strong>.
        </small>
      </div>
    `;
    return form;
  }

  /** Texto que se inyecta en #restockPreview del form del producto. */
  function restockPreviewText({ stockMin, stockActual, pct, unidad, policyMode, hasOwnPct }) {
    const min = Math.max(0, Number(stockMin) || 0);
    const cur = Math.max(0, Number(stockActual) || 0);
    if (!min) {
      return `<span class="muted">Define un stock mínimo para calcular el umbral.</span>`;
    }
    const efectivoPct = (pct === '' || pct == null) ? null : Math.max(0, Number(pct));
    const usingFallback = efectivoPct == null;
    const finalPct = efectivoPct != null ? efectivoPct : 100;
    const umbral = Math.ceil(min * (finalPct / 100));
    const u = unidad || 'und';

    let estado = '';
    if (cur < min) estado = `<span class="badge danger" style="margin-left:.4rem">⚠ CRÍTICO</span>`;
    else if (cur <= umbral) estado = `<span class="badge warning" style="margin-left:.4rem">a reabastecer</span>`;
    else estado = `<span class="badge success" style="margin-left:.4rem">ok</span>`;

    const policyHint = policyMode !== 'detallado'
      ? `<div class="muted" style="font-size:.72rem; margin-top:.3rem">
           La política activa es <strong>${Fmt.esc(policyMode || '—')}</strong>; el % por producto
           no se aplica hasta que cambies a modo <strong>Detallado</strong>.
         </div>`
      : (usingFallback && hasOwnPct === false
          ? `<div class="muted" style="font-size:.72rem; margin-top:.3rem">Sin valor propio → se usa el fallback global (${finalPct}%).</div>`
          : '');

    return `
      🔔 Se activará la notificación cuando el stock baje a <strong class="mono">${umbral} ${Fmt.esc(u)}</strong>
      (${finalPct}% de ${min}). Stock actual: <strong class="mono">${cur} ${Fmt.esc(u)}</strong> ${estado}
      ${policyHint}
    `;
  }

  function renderPolicyForm(policy, preview, customStats) {
    const form = document.createElement('form');
    form.innerHTML = `
      <p class="muted" style="margin-top:0">
        Define cuándo se considera que un producto necesita reabastecerse. El umbral
        se expresa como <strong>% del stock mínimo</strong> (100% = al llegar al mínimo,
        200% = alertar al doble del mínimo).
      </p>

      <div class="form-row">
        <label>Modo de política</label>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:.5rem">
          <label class="mode-card">
            <input type="radio" name="mode" value="simple" ${policy.mode === 'simple' ? 'checked' : ''} />
            <span>
              <strong>Simple</strong>
              <small>Un único umbral para todos los productos.</small>
            </span>
          </label>
          <label class="mode-card">
            <input type="radio" name="mode" value="abc" ${policy.mode === 'abc' ? 'checked' : ''} />
            <span>
              <strong>ABC (Pareto)</strong>
              <small>Umbral por clase A / B / C según valor.</small>
            </span>
          </label>
          <label class="mode-card">
            <input type="radio" name="mode" value="detallado" ${policy.mode === 'detallado' ? 'checked' : ''} />
            <span>
              <strong>Detallado</strong>
              <small>Cada producto con su propio %.</small>
            </span>
          </label>
        </div>
      </div>

      <div id="simpleBlock" class="${policy.mode !== 'simple' ? 'hidden' : ''}">
        <div class="form-row">
          <label>Umbral global (% del stock mínimo)</label>
          <input class="input mono" type="number" name="thresholdGlobal" min="0" max="500" step="5" value="${policy.thresholdGlobal}" />
        </div>
      </div>

      <div id="abcBlock" class="${policy.mode !== 'abc' ? 'hidden' : ''}">
        <p class="muted" style="font-size:.82rem">
          Clasificación automática por valor (stock × precio): <strong>A</strong> = hasta 80% del valor acumulado,
          <strong>B</strong> = 80–95%, <strong>C</strong> = 95–100%.
        </p>
        <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr; gap:.6rem">
          <div class="form-row">
            <label><span class="badge abc-A" style="margin-right:.3rem">A</span> Críticos</label>
            <input class="input mono" type="number" name="thA" min="0" max="500" step="5" value="${policy.thresholdsByClass.A}" />
          </div>
          <div class="form-row">
            <label><span class="badge abc-B" style="margin-right:.3rem">B</span> Medios</label>
            <input class="input mono" type="number" name="thB" min="0" max="500" step="5" value="${policy.thresholdsByClass.B}" />
          </div>
          <div class="form-row">
            <label><span class="badge abc-C" style="margin-right:.3rem">C</span> Marginales</label>
            <input class="input mono" type="number" name="thC" min="0" max="500" step="5" value="${policy.thresholdsByClass.C}" />
          </div>
        </div>
      </div>

      <div id="detalladoBlock" class="${policy.mode !== 'detallado' ? 'hidden' : ''}">
        <p class="muted" style="font-size:.82rem">
          Cada producto usa el <strong>% personalizado</strong> definido en su ficha (campo
          "Umbral personalizado de reabastecimiento"). Los que no tengan valor propio caen al
          umbral global de fallback definido abajo.
        </p>
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap:.6rem; align-items:end">
          <div class="form-row">
            <label>Umbral global (fallback)</label>
            <input class="input mono" type="number" name="thresholdGlobalDet" min="0" max="500" step="5" value="${policy.thresholdGlobal}" />
            <small class="muted" style="font-size:.72rem">Se aplica a productos sin % propio.</small>
          </div>
          <div class="card" style="padding:.75rem; margin:0">
            <div style="display:flex; gap:1rem; align-items:center; font-size:.85rem">
              <div>
                <div class="muted" style="font-size:.7rem; text-transform:uppercase; letter-spacing:.05em">Con %  propio</div>
                <div class="mono" style="font-size:1.2rem; font-weight:700; color:var(--primary-2)">${customStats.withCustom}</div>
              </div>
              <div>
                <div class="muted" style="font-size:.7rem; text-transform:uppercase; letter-spacing:.05em">Con fallback</div>
                <div class="mono" style="font-size:1.2rem; font-weight:700">${customStats.withFallback}</div>
              </div>
            </div>
          </div>
        </div>
        ${customStats.withCustom > 0 ? `
          <details style="margin-top:.5rem">
            <summary class="muted" style="cursor:pointer; font-size:.82rem">Ver productos con % propio (${customStats.withCustom})</summary>
            <div style="display:flex; flex-direction:column; gap:.25rem; margin-top:.5rem; max-height:140px; overflow-y:auto">
              ${customStats.customList.map(p => `
                <div style="display:flex; justify-content:space-between; padding:.3rem .5rem; background:var(--bg-2); border-radius:6px; font-size:.78rem">
                  <span><span class="mono">${Fmt.esc(p.sku)}</span> · ${Fmt.esc(p.nombre)}</span>
                  <span class="mono"><span class="badge primary" style="font-size:.65rem; padding:.05rem .35rem">★ ${p.restockPct}%</span></span>
                </div>`).join('')}
            </div>
          </details>` : `
          <div class="muted" style="font-size:.78rem; margin-top:.5rem; padding:.5rem; border:1px dashed var(--border); border-radius:var(--r-md)">
            Aún no hay productos con % propio. Edita un producto en Inventario y completa el campo
            <strong>"Umbral personalizado de reabastecimiento"</strong>.
          </div>`}
      </div>

      <div class="card" style="margin-top:.5rem; padding:1rem">
        <div class="card-title" style="margin-bottom:.5rem">
          <span>Vista previa</span>
          <span class="muted mono" id="previewCount">${preview.length} producto(s) en alerta</span>
        </div>
        <div id="previewList" style="display:flex; flex-direction:column; gap:.3rem; max-height:160px; overflow-y:auto"></div>
      </div>

      ${policy.updatedAt ? `<div class="muted" style="font-size:.75rem; margin-top:.5rem">Última edición: ${Fmt.dateTime(policy.updatedAt)} · ${Fmt.esc(policy.updatedBy || '—')}</div>` : ''}
    `;
    return form;
  }

  function renderPolicyPreview(items) {
    if (!items.length) return `<div class="muted" style="font-size:.85rem">Ningún producto en alerta con esta política.</div>`;
    return items.slice(0, 20).map(p => `
      <div style="display:flex; justify-content:space-between; padding:.3rem .5rem; background:var(--bg-2); border-radius:6px; font-size:.82rem">
        <span>
          <span class="badge abc-${p._klass || 'C'}" style="margin-right:.4rem">${p._klass || '—'}</span>
          <span class="mono">${Fmt.esc(p.sku)}</span> · ${Fmt.esc(p.nombre)}
          ${p._hasCustom ? `<span class="badge primary" style="margin-left:.3rem; font-size:.62rem; padding:.05rem .35rem">★ ${p.restockPct}%</span>` : ''}
        </span>
        <span class="mono muted">${p.stock} ≤ ${p._threshold}</span>
      </div>`).join('') + (items.length > 20 ? `<div class="muted" style="font-size:.75rem; text-align:center; margin-top:.25rem">+ ${items.length - 20} más</div>` : '');
  }

  // ── Trazabilidad / Kardex ────────────────────────────────
  function renderTrazabilidad(producto, movimientos) {
    const totalIn  = movimientos.filter(m => m.delta > 0).reduce((a, m) => a + m.delta, 0);
    const totalOut = movimientos.filter(m => m.delta < 0).reduce((a, m) => a + Math.abs(m.delta), 0);

    const head = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.75rem">
        <div>
          <div class="muted" style="font-size:.72rem; text-transform:uppercase; letter-spacing:.06em">Trazabilidad</div>
          <h3 style="margin:.15rem 0 0">${Fmt.esc(producto.nombre)}</h3>
          <div class="muted mono" style="font-size:.78rem">${Fmt.esc(producto.sku)} · ${Fmt.esc(producto.categoria)} · ${Fmt.esc(producto.unidad)}</div>
        </div>
        <div class="text-right" style="display:flex; gap:.5rem">
          <div class="card" style="padding:.55rem .75rem; margin:0">
            <div class="muted" style="font-size:.65rem; text-transform:uppercase">Stock actual</div>
            <div class="mono" style="font-size:1.15rem; font-weight:700; color:var(--primary-3)">${Fmt.num(producto.stock)}</div>
          </div>
          <div class="card" style="padding:.55rem .75rem; margin:0">
            <div class="muted" style="font-size:.65rem; text-transform:uppercase">Entradas</div>
            <div class="mono" style="color:var(--success); font-weight:700">+${Fmt.num(totalIn)}</div>
          </div>
          <div class="card" style="padding:.55rem .75rem; margin:0">
            <div class="muted" style="font-size:.65rem; text-transform:uppercase">Salidas</div>
            <div class="mono" style="color:var(--danger); font-weight:700">−${Fmt.num(totalOut)}</div>
          </div>
        </div>
      </div>`;

    if (!movimientos.length) {
      return head + `<div class="card" style="padding:1.5rem">${UI.emptyState('Sin movimientos registrados todavía.', '✨')}</div>`;
    }

    const TIPOS = MovimientosRepo.TIPOS;
    const items = movimientos.map(m => {
      const t = TIPOS[m.tipo] || { label: m.tipo, icon: '◔', color: 'info' };
      const isIn  = m.delta > 0;
      const isOut = m.delta < 0;
      const deltaTxt = isIn  ? `+${Fmt.num(m.delta)}` : (isOut ? `−${Fmt.num(Math.abs(m.delta))}` : '0');
      const deltaCol = isIn  ? 'var(--success)' : (isOut ? 'var(--danger)' : 'var(--text-muted)');

      // Línea de referencia (orden + proveedor, o proceso, o manual)
      let refLine = '';
      if (m.refTipo === 'orden' && m.refCodigo) {
        const prov = m.proveedorId ? ProveedoresRepo.findById(m.proveedorId) : null;
        refLine = `Orden <span class="mono">${Fmt.esc(m.refCodigo)}</span>${prov ? ` · Proveedor: ${Fmt.esc(prov.razonSocial)}` : ''}`;
      } else if (m.refTipo === 'proceso' && m.refCodigo) {
        refLine = `Proceso <span class="mono">${Fmt.esc(m.refCodigo)}</span>${m.detalle ? ` · ${Fmt.esc(m.detalle)}` : ''}`;
      } else if (m.detalle) {
        refLine = Fmt.esc(m.detalle);
      }

      return `
        <div class="tl-item">
          <div class="tl-dot ${t.color === 'success' ? 'ok' : t.color === 'warning' ? 'warn' : t.color === 'danger' ? 'err' : 'info'}"></div>
          <div class="tl-body">
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:.5rem">
              <div class="tl-title">${t.icon} ${Fmt.esc(t.label)}</div>
              <div class="mono" style="font-weight:700; font-size:.95rem; color:${deltaCol}">${deltaTxt}</div>
            </div>
            ${refLine ? `<div style="font-size:.82rem; color:var(--text); margin-top:.15rem">${refLine}</div>` : ''}
            <div class="tl-meta">
              ${Fmt.dateTime(m.at)} · por ${Fmt.esc(m.actorName || m.actor || '—')}
              · saldo resultante <span class="mono">${Fmt.num(m.stockDespues)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    return head + `<div class="timeline">${items}</div>`;
  }

  window.InventarioView = {
    renderShell, renderTable, renderForm,
    renderPolicyForm, renderPolicyPreview, restockPreviewText,
    renderTrazabilidad,
    CATEGORIAS, UNIDADES,
  };
})();
