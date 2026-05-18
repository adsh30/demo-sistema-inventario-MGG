/* ============================================================
   MGG · Usuarios y Roles · Repository
   Acceso a las tablas `usuarios` y `roles`.
   Expone helpers de permisos (`hasPermission`) usables por
   cualquier módulo y por el router para guard de rutas.
   ============================================================ */
(function () {
  const T_USERS = 'usuarios';
  const T_ROLES = 'roles';

  // ── Roles ────────────────────────────────────────────────
  function allRoles() { return Store.list(T_ROLES); }
  function findRole(id) { return Store.get(T_ROLES, id); }

  /** Genera un id slug-safe partiendo del nombre. */
  function slugifyId(nombre) {
    return (nombre || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function createRole(data) {
    const nombre = (data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del rol es obligatorio');
    let id = (data.id || '').trim() || slugifyId(nombre);
    if (!id) throw new Error('No se pudo generar un id válido');
    if (findRole(id)) throw new Error(`Ya existe un rol con id "${id}"`);
    return Store.insert(T_ROLES, {
      id, nombre,
      descripcion: (data.descripcion || '').trim(),
      sistema: false,
      permisos: Array.isArray(data.permisos) ? data.permisos : [],
    });
  }

  function updateRolePermissions(id, permisos, meta) {
    const r = findRole(id);
    if (!r) throw new Error('Rol no encontrado');
    if (r.id === 'admin') throw new Error('El rol "admin" tiene acceso total y no se puede modificar');
    const patch = { permisos: Array.isArray(permisos) ? permisos : [] };
    if (meta && meta.nombre)      patch.nombre = meta.nombre.trim();
    if (meta && meta.descripcion != null) patch.descripcion = meta.descripcion.trim();
    return Store.update(T_ROLES, id, patch);
  }

  function removeRole(id) {
    const r = findRole(id);
    if (!r) return;
    if (r.sistema) throw new Error('Los roles del sistema no se pueden eliminar (sólo editar sus permisos).');
    const inUse = Store.list(T_USERS, u => u.rolId === id).length;
    if (inUse) throw new Error(`No se puede eliminar: ${inUse} usuario(s) tienen este rol asignado. Reasígnalos primero.`);
    Store.remove(T_ROLES, id);
  }

  // ── Usuarios ─────────────────────────────────────────────
  function allUsers() { return Store.list(T_USERS); }
  function findUser(id) { return Store.get(T_USERS, id); }
  function findByEmail(email) {
    if (!email) return null;
    return Store.list(T_USERS).find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  }
  function createUser(data) {
    return Store.insert(T_USERS, {
      estado: 'activo',
      password: data.password || 'demo1234',
      passwordTemporal: !!data.passwordTemporal,
      passwordResetAt: data.passwordResetAt || null,
      ...data,
    });
  }
  function updateUser(id, patch) { return Store.update(T_USERS, id, patch); }
  function countByRole(rolId) { return Store.list(T_USERS, u => u.rolId === rolId).length; }

  /**
   * `removeUser` se mantiene en el repository por completitud, pero la UI **no**
   * lo expone: por integridad referencial (órdenes, historiales) los usuarios
   * que ya no pertenecen a la organización se deshabilitan, no se borran.
   */
  function removeUser(id) { Store.remove(T_USERS, id); }

  function disableUser(id) {
    const u = findUser(id); if (!u) return null;
    if (u.estado === 'inactivo') return u;
    return Store.update(T_USERS, id, { estado: 'inactivo', disabledAt: new Date().toISOString() });
  }

  function enableUser(id) {
    const u = findUser(id); if (!u) return null;
    if (u.estado === 'activo') return u;
    return Store.update(T_USERS, id, { estado: 'activo', disabledAt: null });
  }

  /** Genera una contraseña legible (sin caracteres ambiguos como 0/O, 1/l/I). */
  function generateTempPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `MGG-${out.slice(0, 4)}-${out.slice(4, 8)}`;
  }

  /**
   * Restablece la contraseña de un usuario. Devuelve la contraseña temporal
   * generada para que el admin pueda comunicársela. En producción esta acción
   * debería disparar un correo + forzar cambio en el próximo login.
   */
  function resetPassword(id) {
    const u = findUser(id);
    if (!u) throw new Error('Usuario no encontrado');
    const session = Auth.get();
    if (!session || session.role !== 'admin') throw new Error('Solo la administradora puede restablecer contraseñas');
    const tempPwd = generateTempPassword();
    Store.update(T_USERS, id, {
      password: tempPwd,
      passwordTemporal: true,
      passwordResetAt: new Date().toISOString(),
      passwordResetBy: session.email,
    });
    return tempPwd;
  }

  // ── Permisos ─────────────────────────────────────────────
  /** Comprueba si un rol concede un permiso. Soporta wildcards `*` y `modulo:*`. */
  function roleHasPermission(rol, permission) {
    if (!rol || !Array.isArray(rol.permisos)) return false;
    if (rol.permisos.includes('*')) return true;
    if (rol.permisos.includes(permission)) return true;
    const modulo = permission.split(':')[0];
    return rol.permisos.includes(`${modulo}:*`);
  }

  function currentHasPermission(permission) {
    const session = Auth.get();
    if (!session) return false;
    const rol = findRole(session.role);
    if (!rol) return session.role === 'admin';
    return roleHasPermission(rol, permission);
  }

  function subscribe(fn) {
    const u1 = Store.subscribe(T_USERS, fn);
    const u2 = Store.subscribe(T_ROLES, fn);
    return () => { u1(); u2(); };
  }

  window.UsuariosRepo = {
    // Roles
    allRoles, findRole, createRole, updateRolePermissions, removeRole, slugifyId,
    // Usuarios
    allUsers, findUser, findByEmail, createUser, updateUser, removeUser, countByRole,
    disableUser, enableUser, resetPassword, generateTempPassword,
    // Permisos
    roleHasPermission, currentHasPermission,
    subscribe,
  };
})();
