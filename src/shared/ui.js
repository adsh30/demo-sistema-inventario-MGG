/* ============================================================
   MGG · Shared · UI
   Componentes transversales: toast, modal, empty state.
   ============================================================ */
(function () {
  function toast(message, kind) {
    const host = document.getElementById('toastHost');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function openModal({ title, body, footer, size }) {
    closeModal();
    const host = document.getElementById('modalHost');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${size === 'lg' ? 'modal-lg' : ''}">
        <div class="modal-header">
          <h3 style="margin:0">${title || ''}</h3>
          <button class="btn btn-icon btn-ghost" data-close>✕</button>
        </div>
        <div class="modal-body"></div>
        ${footer ? '<div class="modal-footer"></div>' : ''}
      </div>`;
    host.appendChild(wrap);
    const bodyEl = wrap.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);
    if (footer) {
      const f = wrap.querySelector('.modal-footer');
      if (typeof footer === 'string') f.innerHTML = footer;
      else if (footer instanceof Node) f.appendChild(footer);
    }
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.matches('[data-close]')) closeModal();
    });
    return wrap;
  }

  function closeModal() {
    const host = document.getElementById('modalHost');
    if (host) host.innerHTML = '';
  }

  function confirmDialog({ title, message, confirmText = 'Confirmar', danger = false, onConfirm }) {
    const footer = document.createElement('div');
    footer.style.display = 'flex'; footer.style.gap = '.5rem';
    footer.innerHTML = `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${confirmText}</button>`;
    openModal({ title: title || 'Confirmar', body: `<p style="margin:0">${message || ''}</p>`, footer });
    footer.querySelector('[data-ok]').addEventListener('click', () => { closeModal(); onConfirm && onConfirm(); });
  }

  function emptyState(message, icon = '◇') {
    return `<div class="empty"><div class="empty-icon">${icon}</div><div>${message}</div></div>`;
  }

  window.UI = { toast, openModal, closeModal, confirmDialog, emptyState };
})();
