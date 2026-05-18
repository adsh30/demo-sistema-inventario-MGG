/* ============================================================
   MGG · Ajustes · View
   ============================================================ */
(function () {

  function renderShell(session, prefs, rol) {
    const initials = (session.name || session.email || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return `
      <div class="page-head">
        <div>
          <h1>Ajustes</h1>
          <p>Configura tu perfil y las preferencias del sistema.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; align-items:start">

        <!-- Perfil -->
        <div class="card" style="padding:1.5rem">
          <div class="card-title"><span>Perfil</span></div>
          <div style="display:flex; gap:1rem; align-items:center; margin-bottom:1.25rem">
            <div class="avatar" style="width:60px; height:60px; font-size:1.4rem">${initials}</div>
            <div>
              <div style="font-size:1.1rem; font-weight:600">${Fmt.esc(session.name || '—')}</div>
              <div class="muted mono" style="font-size:.82rem">${Fmt.esc(session.email)}</div>
              <div style="margin-top:.4rem">
                <span class="badge primary">${Fmt.esc(rol ? rol.nombre : session.role)}</span>
              </div>
            </div>
          </div>
          <form id="profileForm">
            <div class="form-row">
              <label>Nombre para mostrar</label>
              <input class="input" name="name" value="${Fmt.esc(session.name)}" />
            </div>
            <div class="form-row">
              <label>Teléfono</label>
              <input class="input" name="telefono" value="${Fmt.esc(prefs.profileTelefono || '')}" placeholder="Opcional" />
            </div>
            <button type="button" class="btn btn-primary" id="saveProfile">Guardar perfil</button>
          </form>
        </div>

        <!-- Notificaciones -->
        <div class="card" style="padding:1.5rem">
          <div class="card-title"><span>Notificaciones</span></div>

          <div class="setting-row">
            <div>
              <strong>Recibir notificaciones</strong>
              <div class="muted" style="font-size:.82rem">Mostrar alertas in-app (campana del topbar).</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="notifEnabled" ${prefs.notifEnabled ? 'checked' : ''} />
              <span class="slider-toggle"></span>
            </label>
          </div>

          <div class="setting-row">
            <div>
              <strong>Sonido al recibir</strong>
              <div class="muted" style="font-size:.82rem">Reproduce un patrón sonoro durante varios segundos.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="notifSound" ${prefs.notifSound ? 'checked' : ''} />
              <span class="slider-toggle"></span>
            </label>
          </div>

          <div class="setting-row" id="durationRow">
            <div style="flex:1">
              <strong>Duración del sonido</strong>
              <div class="muted" style="font-size:.82rem">
                <span id="durLabel" class="mono">${prefs.notifDuration} s</span> de repetición.
              </div>
              <input type="range" id="notifDuration" min="3" max="30" step="1" value="${prefs.notifDuration}" style="width:100%; margin-top:.5rem; accent-color:var(--primary)" />
            </div>
          </div>

          <div style="display:flex; gap:.5rem; margin-top:.75rem">
            <button class="btn btn-ghost" id="testSound">🔊 Probar sonido</button>
            <button class="btn btn-ghost" id="stopSound">■ Detener</button>
          </div>
        </div>

        <!-- Vista preferida -->
        <div class="card" style="padding:1.5rem">
          <div class="card-title"><span>Vista preferida</span></div>
          <p class="muted" style="font-size:.85rem; margin-bottom:.75rem">
            Modo por defecto para los módulos que ofrecen Kanban / Lista (Órdenes y Facturación).
            También puedes cambiarlo en cada módulo; tu última elección se respeta.
          </p>
          <div class="view-toggle" style="display:inline-flex">
            <button data-view="kanban" id="prefKanban" class="${prefs.preferredView === 'kanban' ? 'active' : ''}">▦ Kanban</button>
            <button data-view="lista"  id="prefLista"  class="${prefs.preferredView === 'lista'  ? 'active' : ''}">☰ Lista</button>
          </div>
        </div>

        <!-- Sesión -->
        <div class="card" style="padding:1.5rem">
          <div class="card-title"><span>Sesión</span></div>
          <div class="detail-row"><div class="k">Iniciada</div><div class="v">${Fmt.dateTime(session.loggedAt)}</div></div>
          <div class="detail-row"><div class="k">Rol</div><div class="v">${Fmt.esc(rol ? rol.nombre : session.role)}</div></div>
          <div class="detail-row"><div class="k">Permisos</div><div class="v">${rol ? rol.permisos.length : 0} concedido(s)</div></div>
          <div style="margin-top:1rem; display:flex; gap:.5rem">
            <button class="btn btn-danger" id="logoutBtn2">⎋ Cerrar sesión</button>
          </div>
        </div>

      </div>
    `;
  }

  window.AjustesView = { renderShell };
})();
