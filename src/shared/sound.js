/* ============================================================
   MGG · Shared · Sound
   Generador de tonos vía Web Audio API (sin archivos externos).
   Reproduce un patrón de doble-beep cada 1.5 s durante ~10 s
   cuando llega una notificación dirigida al usuario actual.
   Respeta las preferencias del usuario (user.notif.sound).
   ============================================================ */
(function () {
  let audioCtx = null;
  let activeTimer = null;
  let activeStop = null;

  function getCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      // Algunos navegadores requieren un gesto de usuario; intentamos resumir.
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function tone(freq, durationMs, gain) {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.02);
  }

  /** Doble-beep (ding-dong) característico de notificación. */
  function doubleBeep() {
    tone(880, 140, 0.18);
    setTimeout(() => tone(660, 180, 0.18), 180);
  }

  /** Reproduce el patrón de notificación durante `durationSec` segundos. */
  function play(durationSec) {
    stop();
    const start = Date.now();
    function tick() {
      doubleBeep();
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed >= durationSec) { activeTimer = null; activeStop = null; return; }
      activeTimer = setTimeout(tick, 1500);
    }
    activeStop = () => { if (activeTimer) clearTimeout(activeTimer); activeTimer = null; activeStop = null; };
    tick();
  }

  function stop() {
    if (activeStop) activeStop();
  }

  /**
   * Reproduce la alerta sonora si el usuario tiene activadas las preferencias.
   * Lee `user.notif.sound` (bool) y `user.notif.soundDuration` (segundos).
   */
  function alert() {
    if (!window.Config) return;
    const enabled = Config.get('user.notif.sound', true);
    if (!enabled) return;
    const duration = Math.max(1, Number(Config.get('user.notif.soundDuration', 10)) || 10);
    play(duration);
  }

  /** Beep corto de prueba (usado en el botón "Probar sonido" de Ajustes). */
  function test() {
    doubleBeep();
  }

  /** Inicializa el AudioContext. Debe llamarse tras un gesto del usuario
      (click / tecla) para evitar el bloqueo de autoplay del navegador. */
  function init() { getCtx(); }

  window.Sound = { play, alert, test, stop, init };
})();
