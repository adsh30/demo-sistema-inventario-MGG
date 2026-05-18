/* ============================================================
   MGG · Shared · Config
   Configuraciones persistentes (preferencias, políticas, etc.)
   Vive en localStorage bajo el prefijo `mgg.config.*`.
   ============================================================ */
(function () {
  const PREFIX = 'mgg.config.';
  const listeners = new Map();

  function get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch { return defaultValue; }
  }

  function set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    (listeners.get(key) || []).forEach(fn => {
      try { fn(value); } catch (e) { console.error('[config]', e); }
    });
  }

  function subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  }

  function remove(key) { localStorage.removeItem(PREFIX + key); }

  window.Config = { get, set, subscribe, remove };
})();
