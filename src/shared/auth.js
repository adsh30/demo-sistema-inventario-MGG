/* ============================================================
   MGG · Shared · Auth (Kernel)
   Mock de sesión. En producto: Supabase Auth + RLS por rol.
   ============================================================ */
(function () {
  const KEY = 'mgg.session';

  function get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  function logout() { localStorage.removeItem(KEY); window.location.href = 'login.html'; }
  function ensure() {
    const s = get();
    if (!s) { window.location.href = 'login.html'; return null; }
    return s;
  }
  function isAdmin()    { const s = get(); return s && s.role === 'admin'; }
  function isAnalista() { const s = get(); return s && s.role === 'analista'; }

  window.Auth = { get, logout, ensure, isAdmin, isAnalista };
})();
