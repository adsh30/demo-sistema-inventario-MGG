/* ============================================================
   MGG · Shared · Format
   Helpers de formateo (dinero, fechas, etc.) y escapado.
   ============================================================ */
(function () {
  function money(n) {
    if (n == null || isNaN(n)) return '—';
    return '$ ' + Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('es-VE');
  }
  function date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function dateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function relTime(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'hace segundos';
    const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24); if (d < 30) return `hace ${d} d`;
    return date(iso);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function statusBadge(estado) {
    const map = {
      pendiente:           { c: 'warning', t: 'Pendiente' },
      aprobada:            { c: 'success', t: 'Aprobada' },
      rechazada:           { c: 'danger',  t: 'Rechazada' },
      cancelada:           { c: 'danger',  t: 'Cancelada' },
      recibida:            { c: 'info',    t: 'Recibida' },
      desistida_proveedor: { c: 'warning', t: 'Proveedor desistió' },
      reasignada:          { c: 'info',    t: 'Reasignada' },
      pagada:              { c: 'success', t: 'Pagada' },
      anulada:             { c: 'danger',  t: 'Anulada' },
      activo:              { c: 'success', t: 'Activo' },
      inactivo:            { c: 'danger',  t: 'Inactivo' },
    };
    const o = map[estado] || { c: '', t: estado || '—' };
    return `<span class="badge ${o.c}">${o.t}</span>`;
  }

  window.Fmt = { money, num, date, dateTime, relTime, esc, statusBadge };
})();
