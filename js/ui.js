// Utilidades de interfaz compartidas por las dos pantallas.

/** Crea un elemento. El texto siempre va por textContent: los nombres que escribe
 *  la gente nunca se interpretan como HTML. */
export function el(tag, { className, text, attrs = {}, style } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (style) Object.assign(node.style, style);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) if (child) node.append(child);
  return node;
}

export function show(node, visible) {
  node.hidden = !visible;
}

/** Nova, el robot del juego "¿Qué elegirías?". Solo markup fijo, sin datos de usuarios. */
export function novaSvg(mood = "happy", className = "") {
  let face;
  if (mood === "worried") {
    face = `<circle cx="78" cy="100" r="11" fill="#7dfcff"/><circle cx="122" cy="100" r="11" fill="#7dfcff"/>
      <path d="M64 84l24 -8M136 84l-24 -8" stroke="#7dfcff" stroke-width="5" stroke-linecap="round"/>
      <path d="M82 132 Q100 118 118 132" stroke="#7dfcff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  } else {
    face = `<circle cx="78" cy="98" r="12" fill="#7dfcff"/><circle cx="122" cy="98" r="12" fill="#7dfcff"/>
      <circle cx="82" cy="93" r="4" fill="#fff"/><circle cx="126" cy="93" r="4" fill="#fff"/>
      <path d="M78 122 Q100 142 122 122" stroke="#7dfcff" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  }
  return `<svg class="nova ${className}" viewBox="0 0 200 230" role="img" aria-label="Nova, el robot">
    <line x1="100" y1="22" x2="100" y2="52" stroke="#0b3b4a" stroke-width="6" stroke-linecap="round"/>
    <circle cx="100" cy="17" r="10" fill="#ffd23f" stroke="#0b3b4a" stroke-width="5"/>
    <rect x="12" y="84" width="20" height="46" rx="10" fill="#ff5d8f" stroke="#0b3b4a" stroke-width="5"/>
    <rect x="168" y="84" width="20" height="46" rx="10" fill="#ff5d8f" stroke="#0b3b4a" stroke-width="5"/>
    <rect x="30" y="52" width="140" height="116" rx="36" fill="#36e2d0" stroke="#0b3b4a" stroke-width="6"/>
    <rect x="48" y="70" width="104" height="76" rx="24" fill="#0b2a3a"/>
    ${face}
    <rect x="56" y="172" width="88" height="48" rx="18" fill="#ff9f1c" stroke="#0b3b4a" stroke-width="6"/>
    <circle cx="100" cy="196" r="10" fill="#fff" stroke="#0b3b4a" stroke-width="4"/>
    <path d="M96 196l3 3 6-7" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

const CONFETTI_COLORS = ["#ff5d8f", "#36e2d0", "#ffd23f", "#ff9f1c", "#a78bfa", "#4ade80"];

export function confetti(count = 80) {
  for (let i = 0; i < count; i += 1) {
    const piece = el("div", { className: "confetti", attrs: { "aria-hidden": "true" } });
    piece.style.cssText = `left:${Math.random() * 100}vw;width:${8 + Math.random() * 10}px;height:${12 + Math.random() * 14}px;`
      + `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};animation-duration:${2.2 + Math.random() * 2.4}s;`
      + `animation-delay:${Math.random() * 0.7}s;--rot:${Math.random() * 900}deg`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 6000);
  }
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* algunos navegadores lo bloquean; no es crítico */ }
}

/** Sonidos cortos con Web Audio (sin archivos). Requiere un clic previo del usuario. */
export function createSounds() {
  let ctx = null;
  let muted = false;
  function tone(freq, start, dur, type = "triangle", vol = 0.2) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(vol, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  }
  const play = (notes) => {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach(([f, t, d, type]) => tone(f, t, d, type));
    } catch { /* sin audio disponible */ }
  };
  return {
    unlock: () => play([]),
    pop: () => play([[880, 0, 0.12], [1320, 0.07, 0.14]]),
    bad: () => play([[220, 0, 0.3, "sawtooth"]]),
    win: () => play([[523, 0, 0.3], [659, 0.12, 0.3], [784, 0.24, 0.3], [1047, 0.36, 0.45]]),
    toggle() { muted = !muted; return muted; },
  };
}
