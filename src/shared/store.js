/* ============================================================
   MGG · Shared · Store (Kernel)
   Capa de persistencia sobre localStorage.
   En producto se reemplaza por Supabase manteniendo la misma
   interfaz: list, get, insert, update, remove, subscribe.
   ============================================================ */
(function () {
  const NS = 'mgg.db.';
  const listeners = new Map(); // table -> Set<fn>

  function key(table) { return NS + table; }

  function read(table) {
    try { return JSON.parse(localStorage.getItem(key(table))) || []; }
    catch { return []; }
  }
  function write(table, rows) {
    localStorage.setItem(key(table), JSON.stringify(rows));
    notify(table);
  }
  function notify(table) {
    (listeners.get(table) || []).forEach(fn => {
      try { fn(); } catch (e) { console.error('[store]', e); }
    });
  }
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  window.Store = {
    list(table, predicate) {
      const rows = read(table);
      return predicate ? rows.filter(predicate) : rows;
    },
    get(table, id) { return read(table).find(r => r.id === id); },
    insert(table, row) {
      const rows = read(table);
      const newRow = { ...row, id: row.id || uid(table.slice(0, 3)), createdAt: row.createdAt || new Date().toISOString() };
      rows.push(newRow);
      write(table, rows);
      return newRow;
    },
    update(table, id, patch) {
      const rows = read(table);
      const idx = rows.findIndex(r => r.id === id);
      if (idx < 0) return null;
      rows[idx] = { ...rows[idx], ...patch, updatedAt: new Date().toISOString() };
      write(table, rows);
      return rows[idx];
    },
    remove(table, id) {
      write(table, read(table).filter(r => r.id !== id));
    },
    replace(table, rows) { write(table, rows); },
    subscribe(table, fn) {
      if (!listeners.has(table)) listeners.set(table, new Set());
      listeners.get(table).add(fn);
      return () => listeners.get(table).delete(fn);
    },
    uid,
  };
})();
