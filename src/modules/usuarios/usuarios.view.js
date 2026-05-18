/* ============================================================
   MGG · Usuarios y Roles · View
   Pestañas: Usuarios | Roles & Permisos
   ============================================================ */
(function () {

  // Catálogo de permisos visibles en la UI (agrupados por módulo).
  // En producción esto se infiere del backend o se mantiene en un solo lugar.
  const PERMISSION_CATALOG = [
    { modulo: 'Inventario',  prefix: 'inventario',  acciones: [
      { key: 'view', label: 'Ver' },
      { key: 'edit', label: 'Editar productos' },
    ]},
    { modulo: 'Proveedores', prefix: 'proveedores', acciones: [
      { key: 'view', label: 'Ver' },
      { key: 'edit', label: 'Editar proveedores' },
    ]},
    { modulo: 'Órdenes',     prefix: 'ordenes',     acciones: [
      { key: 'view',                label: 'Ver' },
      { key: 'create',              label: 'Crear solicitudes' },
      { key: 'approve',             label: 'Aprobar / rechazar' },
      { key: 'cambiar_proveedor',   label: 'Cambiar proveedor' },
      { key: 'desistir',            label: 'Registrar desistimiento' },
    ]},
    { modulo: 'Facturación', prefix: 'facturacion', acciones: [
      { key: 'view', label: 'Ver facturas' },
      { key: 'pay',  label: 'Marcar pagadas / anular' },
    ]},
    { modulo: 'Usuarios',    prefix: 'usuarios',    acciones: [
      { key: 'view', label: 'Ver usuarios y roles' },
      { key: 'edit', label: 'Crear / editar usuarios' },
    ]},
    { modulo: 'Sistema',     prefix: 'config',      acciones: [
      { key: 'edit', label: 'Editar políticas (reabastecimiento, etc.)' },
    ]},
  ];

  function renderShell({ tab }) {
    return `
      <div class="page-head">
        <div>
          <h1>Usuarios y permisos</h1>
          <p>Gestión de cuentas del sistema y definición de roles. Solo accesible para la Administradora.</p>
        </div>
        <div class="actions" id="headActions"></div>
      </div>

      <div class="view-toggle" style="margin-bottom:1rem; display:inline-flex">
        <button data-tab="usuarios" class="${tab === 'usuarios' ? 'active' : ''}">👤 Usuarios</button>
        <button data-tab="roles"    class="${tab === 'roles'    ? 'active' : ''}">🛡 Roles &amp; Permisos</button>
      </div>

      <div id="tabBody"></div>
    `;
  }

  // ── Tab: Usuarios ────────────────────────────────────────
  function renderUsersTable(users, rolesById, currentEmail) {
    if (!users.length) return `<div class="card">${UI.emptyState('Sin usuarios. Crea el primero.', '👤')}</div>`;
    return `
      <div class="muted" style="font-size:.78rem; margin-bottom:.5rem; padding:.5rem .75rem; background:var(--bg-1); border-left:3px solid var(--info); border-radius:6px">
        ℹ Los usuarios no se eliminan: se <strong>deshabilitan</strong> para conservar la integridad
        de los datos históricos (órdenes, aprobaciones, facturación).
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Usuario</th><th>Correo</th><th>Rol</th>
            <th>Departamento</th><th>Contraseña</th>
            <th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            ${users.map(u => {
              const rol = rolesById[u.rolId];
              const initials = (u.nombre || u.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
              const isSelf = currentEmail && u.email.toLowerCase() === currentEmail.toLowerCase();
              const isInactive = u.estado === 'inactivo';
              const pwdInfo = u.passwordResetAt
                ? `<span class="muted" style="font-size:.72rem">restablecida ${Fmt.relTime(u.passwordResetAt)}${u.passwordTemporal ? ' · <span class="badge warning" style="font-size:.6rem">temporal</span>' : ''}</span>`
                : `<span class="muted" style="font-size:.72rem">—</span>`;
              return `<tr style="${isInactive ? 'opacity:.55' : ''}">
                <td>
                  <div style="display:flex; align-items:center; gap:.6rem">
                    <div class="avatar" style="width:30px; height:30px; font-size:.75rem">${initials}</div>
                    <div>
                      <div>${Fmt.esc(u.nombre || '—')}${isSelf ? ' <span class="badge primary" style="font-size:.6rem; margin-left:.2rem">tú</span>' : ''}</div>
                      <div class="muted" style="font-size:.72rem">desde ${Fmt.date(u.createdAt)}</div>
                    </div>
                  </div>
                </td>
                <td class="mono" style="font-size:.82rem">${Fmt.esc(u.email)}</td>
                <td>${rol ? `<span class="badge primary">${Fmt.esc(rol.nombre)}</span>` : `<span class="badge danger">sin rol</span>`}</td>
                <td>${Fmt.esc(u.departamento || '—')}</td>
                <td>${pwdInfo}</td>
                <td>${Fmt.statusBadge(u.estado)}</td>
                <td class="actions">
                  <button class="btn btn-sm btn-ghost"   data-edit="${u.id}"  title="Editar datos">Editar</button>
                  <button class="btn btn-sm btn-ghost"   data-reset="${u.id}" title="Restablecer contraseña">🔑</button>
                  ${isInactive
                    ? `<button class="btn btn-sm btn-success" data-enable="${u.id}"  title="Habilitar usuario">✓ Habilitar</button>`
                    : `<button class="btn btn-sm btn-danger"  data-disable="${u.id}" ${isSelf ? 'disabled title="No puedes deshabilitar tu propia cuenta"' : 'title="Deshabilitar usuario"'}>⊘ Deshabilitar</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderUserForm(u, roles) {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-row">
        <label>Nombre completo</label>
        <input class="input" name="nombre" value="${Fmt.esc(u.nombre)}" required />
      </div>
      <div class="form-row">
        <label>Correo institucional</label>
        <input class="input mono" name="email" type="email" value="${Fmt.esc(u.email)}" required />
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label>Rol</label>
          <select class="select" name="rolId" required>
            ${roles.map(r => `<option value="${r.id}" ${u.rolId === r.id ? 'selected' : ''}>${Fmt.esc(r.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Departamento</label>
          <input class="input" name="departamento" value="${Fmt.esc(u.departamento || '')}" />
        </div>
      </div>
      <div class="form-row">
        <label>Teléfono</label>
        <input class="input" name="telefono" value="${Fmt.esc(u.telefono || '')}" />
      </div>
      <div class="muted" style="font-size:.78rem; padding:.5rem; background:var(--bg-2); border-radius:6px">
        <strong>Estado y contraseña</strong> se gestionan desde los botones de la tabla
        (Deshabilitar / Habilitar · 🔑 Restablecer contraseña). Esto mantiene la trazabilidad
        de cuándo y quién hizo cada cambio.
      </div>
    `;
    return form;
  }

  /** Modal con la contraseña temporal generada tras el reset. */
  function renderPasswordReset(user, tempPwd) {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="margin-top:0">
        Se generó una contraseña temporal para <strong>${Fmt.esc(user.nombre)}</strong>
        (<span class="mono">${Fmt.esc(user.email)}</span>). Cópiala y entrégala por un canal
        seguro. El usuario deberá cambiarla en su próximo inicio de sesión.
      </p>
      <div style="display:flex; gap:.5rem; align-items:center; padding:1rem; background:var(--bg-1); border:1px solid var(--primary); border-radius:var(--r-md); margin:.75rem 0">
        <code class="mono" style="flex:1; font-size:1.1rem; color:var(--primary-3); letter-spacing:.05em">${Fmt.esc(tempPwd)}</code>
        <button type="button" class="btn btn-sm btn-primary" id="copyPwd">📋 Copiar</button>
      </div>
      <div class="muted" style="font-size:.78rem">
        ⚠ Esta contraseña <strong>no se mostrará de nuevo</strong>. Si la pierdes, deberás
        restablecerla otra vez. En producción esto se enviaría además por correo cifrado.
      </div>
    `;
    return body;
  }

  // ── Tab: Roles & Permisos ────────────────────────────────
  function renderRolesGrid(roles) {
    return `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:1rem">
        ${roles.map(r => renderRoleCard(r)).join('')}
      </div>`;
  }

  function renderRoleCard(r) {
    const isWildcard = r.permisos.includes('*');
    const isAdminRole = r.id === 'admin';
    const userCount = UsuariosRepo.countByRole(r.id);
    return `
      <div class="card" style="padding:1.25rem">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.5rem">
          <div>
            <h3 style="margin:0">${Fmt.esc(r.nombre)}</h3>
            <div class="muted" style="font-size:.78rem; margin-top:.2rem">
              <span class="mono">${Fmt.esc(r.id)}</span>
              ${r.sistema ? '<span class="badge" style="margin-left:.4rem; font-size:.62rem">sistema</span>' : '<span class="badge primary" style="margin-left:.4rem; font-size:.62rem">personalizado</span>'}
              <span class="muted" style="margin-left:.4rem">· ${userCount} usuario(s)</span>
            </div>
          </div>
          <span class="badge primary">${r.permisos.length} permiso${r.permisos.length !== 1 ? 's' : ''}</span>
        </div>
        <p class="muted" style="font-size:.85rem; margin:.25rem 0 .9rem">${Fmt.esc(r.descripcion || '—')}</p>

        ${isWildcard
          ? `<div class="badge success" style="padding:.4rem .8rem; margin-bottom:.5rem">★ Acceso total al sistema</div>`
          : `<div style="display:flex; flex-direction:column; gap:.65rem; margin-bottom:.75rem">
              ${PERMISSION_CATALOG.map(group => renderPermissionGroup(r, group)).join('')}
            </div>`}

        <div style="display:flex; gap:.4rem; justify-content:flex-end; border-top:1px solid var(--border); padding-top:.65rem">
          ${isAdminRole
            ? `<span class="muted" style="font-size:.72rem; align-self:center">Bloqueado por seguridad</span>`
            : `<button class="btn btn-sm btn-ghost" data-edit-role="${r.id}">Editar permisos</button>
               ${!r.sistema ? `<button class="btn btn-sm btn-danger" data-del-role="${r.id}" ${userCount ? 'disabled title="Tiene usuarios asignados"' : ''}>Eliminar</button>` : ''}`}
        </div>
      </div>`;
  }

  function renderPermissionGroup(rol, group) {
    const acciones = group.acciones.map(a => {
      const fullKey = `${group.prefix}:${a.key}`;
      const wildcardKey = `${group.prefix}:*`;
      const has = rol.permisos.includes(fullKey) || rol.permisos.includes(wildcardKey);
      return `<span class="badge ${has ? 'success' : ''}" style="font-size:.7rem; opacity:${has ? '1' : '.4'}">${has ? '✓' : '✕'} ${Fmt.esc(a.label)}</span>`;
    }).join('');
    return `
      <div>
        <div class="muted" style="font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; margin-bottom:.25rem">${Fmt.esc(group.modulo)}</div>
        <div style="display:flex; flex-wrap:wrap; gap:.3rem">${acciones}</div>
      </div>`;
  }

  /** Editor de rol (crear o editar). Matriz de checkboxes por módulo. */
  function renderRoleForm(rol, isNew) {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-row">
          <label>Nombre del rol</label>
          <input class="input" name="nombre" value="${Fmt.esc(rol.nombre || '')}" required ${rol.sistema && !isNew ? 'readonly' : ''} />
        </div>
        <div class="form-row">
          <label>ID interno ${isNew ? '<span class="muted" style="font-weight:400; text-transform:none; letter-spacing:0">— se genera si lo dejas vacío</span>' : ''}</label>
          <input class="input mono" name="id" value="${Fmt.esc(rol.id || '')}" ${!isNew ? 'readonly' : ''} placeholder="ej. auditor_externo" />
        </div>
      </div>
      <div class="form-row">
        <label>Descripción</label>
        <textarea class="textarea" name="descripcion" rows="2">${Fmt.esc(rol.descripcion || '')}</textarea>
      </div>

      ${rol.sistema && !isNew ? `
        <div class="muted" style="font-size:.78rem; padding:.5rem .75rem; background:rgba(245,177,51,0.08); border-left:3px solid var(--warning); border-radius:6px; margin-bottom:.75rem">
          ⚠ Estás editando un rol del <strong>sistema</strong>. Sus usuarios verán reflejados
          los cambios de inmediato. El nombre y el ID quedan bloqueados.
        </div>` : ''}

      <div class="form-row">
        <label>Permisos</label>
        <div style="display:flex; flex-direction:column; gap:.85rem; max-height:50vh; overflow-y:auto; padding:.5rem; border:1px solid var(--border); border-radius:var(--r-md); background:var(--bg-1)">
          ${PERMISSION_CATALOG.map(group => renderPermissionPicker(rol, group)).join('')}
        </div>
        <small class="muted" style="font-size:.72rem">
          Las acciones se guardan como <code>modulo:accion</code>. Marca todas las de un módulo
          para que el usuario tenga "acceso completo" a esa sección.
        </small>
      </div>
    `;
    return form;
  }

  function renderPermissionPicker(rol, group) {
    const wildcardKey = `${group.prefix}:*`;
    const hasWildcardGlobal = rol.permisos.includes('*');
    const hasWildcardGroup = rol.permisos.includes(wildcardKey);
    return `
      <div data-perm-group="${group.prefix}">
        <div style="font-size:.78rem; font-weight:700; color:var(--primary-2); text-transform:uppercase; letter-spacing:.06em; margin-bottom:.3rem">${Fmt.esc(group.modulo)}</div>
        <div style="display:flex; flex-wrap:wrap; gap:.4rem">
          ${group.acciones.map(a => {
            const key = `${group.prefix}:${a.key}`;
            const checked = hasWildcardGlobal || hasWildcardGroup || rol.permisos.includes(key);
            return `<label style="display:inline-flex; align-items:center; gap:.35rem; padding:.3rem .65rem; background:var(--bg-2); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:.78rem">
              <input type="checkbox" name="perm" value="${key}" ${checked ? 'checked' : ''} style="accent-color:var(--primary)" />
              ${Fmt.esc(a.label)}
            </label>`;
          }).join('')}
        </div>
      </div>`;
  }

  window.UsuariosView = {
    renderShell,
    renderUsersTable, renderUserForm,
    renderRolesGrid, renderRoleForm,
    renderPasswordReset,
    PERMISSION_CATALOG,
  };
})();
