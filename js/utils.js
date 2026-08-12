export const pad2 = n => String(n).padStart(2, '0');
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const fmt = n => Math.round(n).toLocaleString('pt-BR');
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function monthDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`);
}
export function initials(name) {
  const p = name.split(' ');
  return (p[0][0] + (p[p.length - 1][0] || '')).toUpperCase();
}

export const $ = id => document.getElementById(id);

let toastTimer;
export function toast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

export function countUp(el, to, opts = {}) {
  const { suffix = '', dur = 650 } = opts;
  const from = parseFloat(el.dataset.v || 0);
  const t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.dataset.v = to;
  }
  requestAnimationFrame(step);
}
