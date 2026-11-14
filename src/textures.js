// Процедурные текстуры на canvas. Все цвета задаются в линейном RGB (как их «видит» шейдер),
// а в canvas пишутся в sRGB — так подбор цветов-«ловушек» для дальтоника остаётся точным.
import * as THREE from 'three';

export const lin2srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
export const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export function css(rgb) {
  const [r, g, b] = rgb.map((v) => Math.round(255 * lin2srgb(Math.min(1, Math.max(0, v)))));
  return `rgb(${r},${g},${b})`;
}

// Цвет, который дихромат не отличит от base: смещение вдоль оси смешения.
export function confuse(base, t, axis) {
  const out = [base[0] + axis.x * t, base[1] + axis.y * t, base[2] + axis.z * t];
  if (out.some((v) => v < 0 || v > 1)) console.warn('confuse(): цвет вне гаммы', base, t, out);
  return out.map((v) => Math.min(1, Math.max(0, v)));
}

let maxAniso = 8;
export function setMaxAnisotropy(a) { maxAniso = a; }

export function canvasTexture(w, h, draw, { repeat = null } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  return tex;
}

function noise(g, w, h, amount = 10, alpha = 0.06) {
  for (let i = 0; i < w * h * 0.02; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * Math.random()})`;
    g.fillRect(Math.random() * w, Math.random() * h, amount * Math.random(), amount * Math.random());
  }
}

export function floorTiles(colA, colB, repeat) {
  return canvasTexture(256, 256, (g, w, h) => {
    const s = w / 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      g.fillStyle = css((x + y) % 2 ? colA : colB);
      g.fillRect(x * s, y * s, s, s);
    }
    noise(g, w, h, 6, 0.08);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  }, { repeat });
}

export function wallTex(col, stripe, repeat) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = css(col); g.fillRect(0, 0, w, h);
    noise(g, w, h, 4, 0.04);
    g.fillStyle = css(stripe); g.fillRect(0, h * 0.62, w, h * 0.05); // декоративная полоса
  }, { repeat });
}

export function signTex(lines, bg = [0.02, 0.15, 0.35], fg = [1, 1, 1], w = 512, h = 160) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = css(bg); g.fillRect(0, 0, w, h);
    g.strokeStyle = css(fg); g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = css(fg); g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => {
      const size = i === 0 ? h * 0.32 : h * 0.18;
      g.font = `${i === 0 ? 700 : 400} ${size}px Segoe UI, sans-serif`;
      g.fillText(t, w / 2, h * (lines.length === 1 ? 0.5 : 0.38 + i * 0.32));
    });
  });
}

// Яркая полосатая кофта девушки.
export function sweaterTex() {
  const cols = [[0.8, 0.05, 0.05], [0.95, 0.55, 0.02], [0.9, 0.8, 0.05], [0.05, 0.5, 0.1],
    [0.02, 0.2, 0.75], [0.35, 0.05, 0.6]];
  return canvasTexture(256, 256, (g, w, h) => {
    const sh = h / cols.length;
    cols.forEach((c, i) => { g.fillStyle = css(c); g.fillRect(0, i * sh, w, sh); });
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < cols.length; i++) for (let x = 0; x < w; x += 16) {
      g.beginPath(); g.moveTo(x, (i + 1) * sh - 4); g.lineTo(x + 8, (i + 1) * sh + 4); g.lineTo(x + 16, (i + 1) * sh - 4);
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.stroke();
    }
    noise(g, w, h, 3, 0.1);
  }, { repeat: [2, 1] });
}

// Детский рисунок: «образец» и раскраска Миши. palette = { sky, sun, grass }
export function drawingTex(palette, title) {
  return canvasTexture(512, 400, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = css(palette.sky); g.fillRect(20, 20, w - 40, h * 0.6);
    g.fillStyle = css(palette.grass); g.fillRect(20, 20 + h * 0.6, w - 40, h * 0.4 - 70);
    g.fillStyle = css(palette.sun);
    g.beginPath(); g.arc(w * 0.78, h * 0.2, 42, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(w * 0.78 + Math.cos(a) * 58 - 5, h * 0.2 + Math.sin(a) * 58 - 5, 10, 10);
    }
    g.fillStyle = css([0.6, 0.08, 0.05]); g.fillRect(80, h * 0.42, 130, 100);     // домик
    g.fillStyle = css([0.25, 0.12, 0.05]);
    g.beginPath(); g.moveTo(65, h * 0.42); g.lineTo(145, h * 0.27); g.lineTo(225, h * 0.42); g.fill();
    g.fillStyle = css([0.9, 0.85, 0.6]); g.fillRect(125, h * 0.48, 36, 36);
    g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(20, 20, w - 40, h - 90);
    g.fillStyle = '#333'; g.font = 'italic 30px Segoe Print, Comic Sans MS, cursive'; g.textAlign = 'center';
    g.fillText(title, w / 2, h - 28);
  });
}
