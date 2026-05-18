/* ============================================================
   MGG · Usuarios y Roles · Module entry
   Solo accesible para la Administradora (protegido en el router).
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};

  const state = { tab: 'usuarios' };

  function render({ view }) {
    view.innerHTML = UsuariosView.renderShell(state);
    bindTabs(view);
    renderHeadActions();
    renderBody();

    const unsub = UsuariosRepo.subscribe(renderBody);
    Router.onLeave(unsub);
  }

  function bindTabs(view) {
    view.querySelectorAll('.view-toggle [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === state.tab) return;
        state.tab = btn.dataset.tab;
        view.innerHTML = UsuariosView.renderShell(state);
        bindTabs(view);
        renderHeadActions();
        renderBody();
      });
    });
  }

  function renderHeadActions() {
    const host = document.getElementById('headActions');
    if (!host) return;
    if (state.tab === 'usuarios') {
      host.innerHTML = `<button class="btn btn-primary" id="newUserBtn">+ Nuevo usuario</button>`;
      document.getElementById('newUserBtn').addEventListener('click', () => openUserForm());
    } else {
      host.innerHTML = `<button class="btn btn-primary" id="newRoleBtn">+ Nuevo rol</button>`;
      document.getElementById('newRoleBtn').addEventListener('click', () => openRoleForm(null));
    }
  }

  function renderBody() {
    const host = document.getElementById('tabBody');
    if (!host) return;
    if (state.tab === 'usuarios') renderUsers(host);
    else renderRoles(host);
  }

  // ─── Tab Usuarios ────────────────────────────────────────
  function renderUsers(host) {
    const users = UsuariosRepo.allUsers().sort((a, b) => a.nombre.localeCompare(b.nombre));
    const rolesById = Object.fromEntries(UsuariosRepo.allRoles().map(r => [r.id, r]));
    const session = Auth.get();
    host.innerHTML = UsuariosView.renderUsersTable(users, rolesById, session && session.email);
    host.querySelectorAll('[data-edit]').forEach(b    => b.addEventListener('click', () => openUserForm(b.dataset.edit)));
    host.querySelectorAll('[data-reset]').forEach(b   => b.addEventListener('click', () => resetUserPassword(b.dataset.reset)));
    host.querySelectorAll('[data-disable]').forEach(b => b.addEventListener('click', () => disableUser(b.dataset.disable)));
    host.querySelectorAll('[data-enable]').forEach(b  => b.addEventListener('click', () => enableUser(b.dataset.enable)));
  }

  function openUserForm(id) {
    const isEdit = !!id;
    const u = isEdit ? UsuariosRepo.findUser(id) : {
      email: '', nombre: '', rolId: 'analista', departamento: '', telefono: '', estado: 'activo'
    };
    const roles = UsuariosRepo.allRoles();
    const form = UsuariosView.renderUserForm(u, roles);

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Guardar cambios' : 'Crear usuario'}</button>`;
    UI.openModal({ title: isEdit ? 'Editar usuario' : 'Nuevo usuario', body: form, footer });

    document.getElementById('saveBtn').addEventListener('click', () => {
      const data = Object.fromEntries(new FormData(form));
      const payload = {
        nombre: data.nombre.trim(),
        email: data.email.trim().toLowerCase(),
        rolId: data.rolId,
        departamento: data.departamento.trim(),
        telefono: data.telefono.trim(),
      };
      if (!payload.nombre || !payload.email) { UI.toast('Nombre y correo son obligatorios', 'error'); return; }
      const dup = UsuariosRepo.findByEmail(payload.email);
      if (dup && dup.id !== id) { UI.toast('Ya existe un usuario con ese correo', 'error'); return; }

      if (isEdit) {
        UsuariosRepo.updateUser(id, payload);
        UI.toast('Usuario actualizado', 'success');
      } else {
        // Nuevo usuario: contraseña inicial generada y temporal
        const tempPwd = UsuariosRepo.generateTempPassword();
        const created = UsuariosRepo.createUser({
          ...payload,
          password: tempPwd,
          passwordTemporal: true,
          passwordResetAt: new Date().toISOString(),
        });
        UI.closeModal();
        showPasswordResetDialog(created, tempPwd, 'Usuario creado · contraseña inicial generada');
        return;
      }
      UI.closeModal();
    });
  }

  function resetUserPassword(id) {
    const u = UsuariosRepo.findUser(id);
    if (!u) return;
    UI.confirmDialog({
      title: 'Restablecer contraseña',
      message: `Se generará una contraseña temporal para ${u.nombre} (${u.email}). El usuario deberá cambiarla en su próximo inicio de sesión.`,
      confirmText: 'Restablecer',
      onConfirm: () => {
        try {
          const tempPwd = UsuariosRepo.resetPassword(id);
          showPasswordResetDialog(u, tempPwd, 'Contraseña restablecida');
        } catch (e) { UI.toast(e.message, 'error'); }
      }
    });
  }

  function showPasswordResetDialog(user, tempPwd, title) {
    const body = UsuariosView.renderPasswordReset(user, tempPwd);
    const footer = `<button class="btn btn-primary" data-close>Listo</button>`;
    UI.openModal({ title: title || 'Contraseña temporal', body, footer });
    document.getElementById('copyPwd').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(tempPwd);
        UI.toast('Contraseña copiada al portapapeles', 'success');
      } catch {
        UI.toast('No se pudo copiar — selecciónala manualmente', 'warning');
      }
    });
  }

  function disableUser(id) {
    const u = UsuariosRepo.findUser(id); if (!u) return;
    const session = Auth.get();
    if (session && session.email.toLowerCase() === u.email.toLowerCase()) {
      UI.toast('No puedes deshabilitar tu propia cuenta', 'error'); return;
    }
    UI.confirmDialog({
      title: 'Deshabilitar usuario',
      message: `${u.nombre} no podrá iniciar sesión. Sus registros históricos (órdenes, aprobaciones) se conservan. Puedes habilitarlo de nuevo cuando lo necesites.`,
      confirmText: 'Deshabilitar', danger: true,
      onConfirm: () => { UsuariosRepo.disableUser(id); UI.toast(`${u.nombre} deshabilitado`, 'warning'); }
    });
  }

  function enableUser(id) {
    const u = UsuariosRepo.findUser(id); if (!u) return;
    UsuariosRepo.enableUser(id);
    UI.toast(`${u.nombre} habilitado`, 'success');
  }

  // ─── Tab Roles ──────────────────────────────────────────
  function renderRoles(host) {
    host.innerHTML = UsuariosView.renderRolesGrid(UsuariosRepo.allRoles());
    host.querySelectorAll('[data-edit-role]').forEach(b => b.addEventListener('click', () => openRoleForm(b.dataset.editRole)));
    host.querySelectorAll('[data-del-role]').forEach(b  => b.addEventListener('click', () => removeRole(b.dataset.delRole)));
  }

  function openRoleForm(id) {
    const isNew = !id;
    const rol = isNew
      ? { id: '', nombre: '', descripcion: '', sistema: false, permisos: [] }
      : UsuariosRepo.findRole(id);
    if (!isNew && !rol) { UI.toast('Rol no encontrado', 'error'); return; }
    if (rol && rol.id === 'admin') { UI.toast('El rol admin está bloqueado por seguridad', 'error'); return; }

    const form = UsuariosView.renderRoleForm(rol, isNew);
    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="saveRoleBtn">${isNew ? 'Crear rol' : 'Guardar cambios'}</button>`;
    UI.openModal({ title: isNew ? 'Nuevo rol' : `Editar rol · ${rol.nombre}`, body: form, footer, size: 'lg' });

    document.getElementById('saveRoleBtn').addEventListener('click', () => {
      const data = Object.fromEntries(new FormData(form));
      const permisos = [...form.querySelectorAll('input[name=perm]:checked')].map(c => c.value);
      // Colapsar a `modulo:*` cuando se marcan TODAS las acciones de un módulo (más compacto)
      const collapsed = collapsePermissions(permisos);

      try {
        if (isNew) {
          UsuariosRepo.createRole({
            id: (data.id || '').trim(),
            nombre: data.nombre,
            descripcion: data.descripcion,
            permisos: collapsed,
          });
          UI.toast(`Rol "${data.nombre}" creado`, 'success');
        } else {
          UsuariosRepo.updateRolePermissions(rol.id, collapsed, {
            nombre: rol.sistema ? rol.nombre : data.nombre,
            descripcion: data.descripcion,
          });
          UI.toast(`Permisos actualizados`, 'success');
        }
        UI.closeModal();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  /** Si todas las acciones de un módulo están seleccionadas, colapsa a `modulo:*`. */
  function collapsePermissions(permisos) {
    const result = new Set(permisos);
    UsuariosView.PERMISSION_CATALOG.forEach(group => {
      const allKeys = group.acciones.map(a => `${group.prefix}:${a.key}`);
      const allSelected = allKeys.every(k => result.has(k));
      if (allSelected) {
        allKeys.forEach(k => result.delete(k));
        result.add(`${group.prefix}:*`);
      }
    });
    return [...result];
  }

  function removeRole(id) {
    const r = UsuariosRepo.findRole(id); if (!r) return;
    UI.confirmDialog({
      title: 'Eliminar rol',
      message: `¿Eliminar el rol "${r.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar', danger: true,
      onConfirm: () => {
        try { UsuariosRepo.removeRole(id); UI.toast('Rol eliminado', 'success'); }
        catch (e) { UI.toast(e.message, 'error'); }
      }
    });
  }

  Modules.Usuarios = render;
})();
