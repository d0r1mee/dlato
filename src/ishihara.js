// Генератор псевдоизохроматических таблиц (в стиле Исихары).
// Цифра и фон строятся из одной и той же палитры, но точки цифры сдвинуты вдоль
// оси смешения выбранного типа дальтонизма. Для такого дихромата цифра исчезает полностью.
import { canvasTexture, css, confuse } from './textures.js';
import { confusionAxis } from './vision.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PALETTES = {
  // видна всем: разница по яркости
  control: { bg: [[0.22, 0.27, 0.36], [0.28, 0.32, 0.4], [0.18, 0.22, 0.3]], fig: [[0.85, 0.35, 0.05], [0.75, 0.3, 0.04]] },
  // красно-зелёная: исчезает при дейтеранопии (и почти — при протанопии)
  deutan: { bg: [[0.3, 0.32, 0.1], [0.35, 0.38, 0.12], [0.25, 0.28, 0.08], [0.32, 0.3, 0.14]], axis: 'deutan', t: 0.35 },
  // сине-жёлтая: исчезает при тританопии
  tritan: { bg: [[0.6, 0.45, 0.06], [0.7, 0.55, 0.1], [0.5, 0.38, 0.05], [0.65, 0.42, 0.08]], axis: 'tritan', t: 0.42 },
};

const PAPER = [0.82, 0.78, 0.68];

function digitMask(text, size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${size * (text.length > 1 ? 0.5 : 0.62)}px Arial Black, Segoe UI, sans-serif`;
  g.fillText(text, size / 2, size * 0.53);
  const data = g.getImageData(0, 0, size, size).data;
  return (x, y) => {
    const xi = Math.min(size - 1, Math.max(0, Math.round(x))), yi = Math.min(size - 1, Math.max(0, Math.round(y)));
    return data[(yi * size + xi) * 4] > 127;
  };
}

export function makePlate({ text, kind, seed = 1 }) {
  const S = 1024, R = 470, C = S / 2;
  const rand = rng(seed);
  const pal = PALETTES[kind];
  const axis = pal.axis ? confusionAxis(pal.axis) : null;
  const inMask = digitMask(text, S);
  const cell = 34;
  const grid = new Map();
  const dots = [];
  const radii = [6, 8, 10, 12, 14, 17, 20];

  for (let i = 0; i < 60000 && dots.length < 4000; i++) {
    const r = radii[Math.floor(Math.pow(rand(), 0.7) * radii.length)];
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * (R - r);
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    let ok = true;
    for (let oy = -1; oy <= 1 && ok; oy++) for (let ox = -1; ox <= 1 && ok; ox++) {
      const list = grid.get((gx + ox) * 1000 + gy + oy);
      if (list) for (const o of list) {
        if ((o.x - x) ** 2 + (o.y - y) ** 2 < (o.r + r + 2.5) ** 2) { ok = false; break; }
      }
    }
    if (!ok) continue;
    const dot = { x, y, r };
    dots.push(dot);
    const key = gx * 1000 + gy;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(dot);
  }

  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  return canvasTexture(S, S, (g) => {
    g.fillStyle = css([0.9, 0.88, 0.82]); g.fillRect(0, 0, S, S);
    g.fillStyle = css(PAPER); g.beginPath(); g.arc(C, C, R + 8, 0, Math.PI * 2); g.fill();
    for (const d of dots) {
      let hits = 0;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566;
        if (inMask(d.x + (k ? Math.cos(a) * d.r * 0.6 : 0), d.y + (k ? Math.sin(a) * d.r * 0.6 : 0))) hits++;
      }
      const isFig = hits >= 3;
      const kLight = 0.75 + rand() * 0.35;
      let col;
      if (kind === 'control') col = pick(isFig ? pal.fig : pal.bg).map((v) => v * kLight);
      else {
        const base = pick(pal.bg).map((v) => v * kLight);
        col = isFig ? confuse(base, pal.t, axis) : base;
      }
      g.fillStyle = css(col);
      g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
    }
  });
}

// Набор таблиц эпизода. visibleTritan — видит ли цифру человек с тританопией.
export const PLATES = [
  { text: '12', kind: 'control', options: ['12', '17', '42', 'Не вижу цифры'], visibleTritan: true },
  { text: '8',  kind: 'deutan',  options: ['3', '8', '6', 'Не вижу цифры'], visibleTritan: true },
  { text: '5',  kind: 'tritan',  options: ['5', '2', '9', 'Не вижу цифры'], visibleTritan: false },
  { text: '29', kind: 'deutan',  options: ['70', '29', '28', 'Не вижу цифры'], visibleTritan: true },
  { text: '3',  kind: 'tritan',  options: ['8', '6', '3', 'Не вижу цифры'], visibleTritan: false },
  { text: '4',  kind: 'tritan',  options: ['1', '4', '7', 'Не вижу цифры'], visibleTritan: false },
];
