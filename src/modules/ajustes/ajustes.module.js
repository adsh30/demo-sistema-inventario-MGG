/* ============================================================
   MGG · Ajustes · Module entry
   ============================================================ */
(function () {
  window.Modules = window.Modules || {};

  function readPrefs() {
    return {
      notifEnabled:  Config.get('user.notif.enabled', true),
      notifSound:    Config.get('user.notif.sound',   true),
      notifDuration: Config.get('user.notif.soundDuration', 10),
      preferredView: Config.get('user.preferredView', 'kanban'),
      profileTelefono: Config.get('user.profile.telefono', ''),
    };
  }

  function render({ view }) {
    const session = Auth.get();
    const rol = window.UsuariosRepo ? UsuariosRepo.findRole(session.role) : null;
    view.innerHTML = AjustesView.renderShell(session, readPrefs(), rol);

    // Perfil
    document.getElementById('saveProfile').addEventListener('click', () => {
      const form = document.getElementById('profileForm');
      const data = Object.fromEntries(new FormData(form));
      const newName = (data.name || '').trim();
      if (!newName) { UI.toast('El nombre no puede estar vacío', 'error'); return; }
      // Actualiza la sesión activa
      const session = Auth.get();
      const next = { ...session, name: newName };
      localStorage.setItem('mgg.session', JSON.stringify(next));
      Config.set('user.profile.telefono', (data.telefono || '').trim());
      // Refresca el chip del sidebar
      document.getElementById('userName').textContent = newName;
      document.getElementById('userAvatar').textContent = newName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
      UI.toast('Perfil actualizado', 'success');
    });

    // Notificaciones
    document.getElementById('notifEnabled').addEventListener('change', (e) => {
      Config.set('user.notif.enabled', e.target.checked);
      UI.toast(`Notificaciones ${e.target.checked ? 'activadas' : 'desactivadas'}`);
    });
    document.getElementById('notifSound').addEventListener('change', (e) => {
      Config.set('user.notif.sound', e.target.checked);
      UI.toast(`Sonido ${e.target.checked ? 'activado' : 'desactivado'}`);
    });
    const dur = document.getElementById('notifDuration');
    dur.addEventListener('input', (e) => {
      document.getElementById('durLabel').textContent = `${e.target.value} s`;
    });
    dur.addEventListener('change', (e) => {
      Config.set('user.notif.soundDuration', Number(e.target.value));
    });
    document.getElementById('testSound').addEventListener('click', () => {
      // Forzar la duración configurada para que el usuario escuche el patrón completo
      Sound.play(Number(dur.value));
    });
    document.getElementById('stopSound').addEventListener('click', () => Sound.stop());

    // Vista preferida
    document.getElementById('prefKanban').addEventListener('click', () => setPreferredView('kanban'));
    document.getElementById('prefLista').addEventListener('click',  () => setPreferredView('lista'));

    // Sesión
    document.getElementById('logoutBtn2').addEventListener('click', () => {
      Sound.stop();
      Auth.logout();
    });
  }

  function setPreferredView(mode) {
    Config.set('user.preferredView', mode);
    // Aplica a las vistas que persisten preferencia por módulo
    localStorage.setItem('mgg.view.ordenes', mode);
    localStorage.setItem('mgg.view.facturacion', mode);
    document.getElementById('prefKanban').classList.toggle('active', mode === 'kanban');
    document.getElementById('prefLista').classList.toggle('active', mode === 'lista');
    UI.toast(`Vista por defecto: ${mode}`, 'success');
  }

  Modules.Ajustes = render;
})();
