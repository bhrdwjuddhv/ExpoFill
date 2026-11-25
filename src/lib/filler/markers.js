// On-page outlines. Never touches the page's own elements or styles: one fixed overlay host with a
// closed shadow root, boxes positioned over fields with getBoundingClientRect.
import { MARKER_TIMEOUT_MS } from '../constants.js';

const STYLE = {
  filled: { color: '#00C65E', label: 'Filled' },
  check: { color: '#FF5C00', label: 'Check' },
  failed: { color: '#FF5C00', label: 'Not filled' },
  unknown: { color: '#5C5FEF', label: '?' },
};

let host = null;
let root = null;
let marks = []; // { el, kind, box }
let timer = null;
let frame = 0;

function ensureHost(doc) {
  if (host?.isConnected) return;
  host = doc.createElement('expofill-marks');
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>
    .box{position:fixed;border:2px solid;border-radius:8px;box-sizing:border-box;transition:opacity .2s}
    .tag{position:absolute;top:-10px;right:-2px;font:600 10px/1 system-ui,sans-serif;color:#000;padding:2px 6px;border-radius:999px}
    .flash{animation:pulse .9s ease-out 2}
    @keyframes pulse{0%{box-shadow:0 0 0 0 currentColor}100%{box-shadow:0 0 0 10px transparent}}
    @media (prefers-reduced-motion:reduce){.flash{animation:none;outline:3px solid currentColor}}
  </style>`;
  doc.documentElement.appendChild(host); // outside <body>, so ExpoFill's own observer ignores it
  doc.defaultView.addEventListener('scroll', schedule, { capture: true, passive: true });
  doc.defaultView.addEventListener('resize', schedule, { passive: true });
}

function position() {
  frame = 0;
  for (const { el, box } of marks) {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px`, opacity: r.width ? 1 : 0 });
  }
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(position);
}

/** @param {{ el: Element, kind: 'filled'|'check'|'failed'|'unknown' }[]} items */
export function showMarks(items) {
  clearMarks();
  if (!items.length) return;
  ensureHost(items[0].el.ownerDocument);
  for (const { el, kind } of items) {
    const s = STYLE[kind] ?? STYLE.check;
    const box = el.ownerDocument.createElement('div');
    box.className = 'box';
    box.style.borderColor = s.color;
    box.style.color = s.color;
    box.innerHTML = `<span class="tag" style="background:${s.color};${kind === 'unknown' ? 'color:#fff' : ''}">${s.label}</span>`;
    root.appendChild(box);
    marks.push({ el, kind, box });
  }
  position();
  timer = setTimeout(clearMarks, MARKER_TIMEOUT_MS);
}

/** Scrolls to a field and pulses its marker (adding a temporary one if needed). */
export function flashField(el) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  let mark = marks.find((m) => m.el === el);
  if (!mark) {
    showMarks([...marks.map(({ el: e, kind }) => ({ el: e, kind })), { el, kind: 'check' }]);
    mark = marks.at(-1);
  }
  mark.box.classList.remove('flash');
  void mark.box.offsetWidth; // restart the animation
  mark.box.classList.add('flash');
  setTimeout(schedule, 400); // follow the smooth scroll
}

export function clearMarks() {
  clearTimeout(timer);
  marks = [];
  if (host) {
    host.ownerDocument.defaultView.removeEventListener('scroll', schedule, { capture: true });
    host.ownerDocument.defaultView.removeEventListener('resize', schedule);
    host.remove();
  }
  host = null;
  root = null;
}
