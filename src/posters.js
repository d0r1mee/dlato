// Обучающие плакаты и таблицы для больницы.
import { canvasTexture, css, srgb2lin } from './textures.js';

const FONT = 'Segoe UI, sans-serif';

// Приближённый цвет монохроматического света (Bruton), возвращает линейный RGB.
function wl2rgb(wl) {
  let r = 0, g = 0, b = 0;
  if (wl < 440) { r = -(wl - 440) / 60; b = 1; }
  else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
  else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
  else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
  else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
  else { r = 1; }
  const f = wl < 420 ? 0.3 + 0.7 * (wl - 380) / 40 : wl > 700 ? 0.3 + 0.7 * (780 - wl) / 80 : 1;
  return [r, g, b].map((v) => srgb2lin(Math.max(0, v) * f));
}

function title(g, w, text, y, size = 44) {
  g.fillStyle = '#1b1b1b'; g.font = `700 ${size}px ${FONT}`; g.textAlign = 'center';
  g.fillText(text, w / 2, y);
}
function para(g, lines, x, y, size = 24, lh = 32) {
  g.fillStyle = '#2a2a2a'; g.font = `400 ${size}px ${FONT}`; g.textAlign = 'left';
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
}

// Чувствительность трёх типов колбочек к длине волны.
export function conesPoster() {
  return canvasTexture(768, 1024, (g, w, h) => {
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h);
    title(g, w, 'Как мы видим цвет', 70);
    para(g, ['В сетчатке есть три типа колбочек.', 'Каждый ловит свою часть спектра:'], 60, 130);
    const x0 = 70, x1 = w - 50, y0 = 620, y1 = 230;
    const X = (wl) => x0 + (wl - 400) / 300 * (x1 - x0);
    for (let wl = 400; wl < 700; wl++) { g.fillStyle = css(wl2rgb(wl)); g.fillRect(X(wl), y0 + 14, 2, 36); }
    g.strokeStyle = '#333'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, y1 - 10); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
    const cones = [
      { n: 'S', peak: 420, s: 26, col: [0.02, 0.05, 0.7] },
      { n: 'M', peak: 534, s: 42, col: [0.02, 0.4, 0.05] },
      { n: 'L', peak: 564, s: 48, col: [0.7, 0.03, 0.02] },
    ];
    cones.forEach((c) => {
      g.strokeStyle = css(c.col); g.lineWidth = 6; g.beginPath();
      for (let wl = 400; wl <= 700; wl += 2) {
        const v = Math.exp(-0.5 * ((wl - c.peak) / c.s) ** 2);
        const px = X(wl), py = y0 - v * (y0 - y1);
        wl === 400 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
      g.fillStyle = css(c.col); g.font = `700 40px ${FONT}`; g.textAlign = 'center';
      g.fillText(c.n, X(c.peak), y1 - 18);
    });
    g.fillStyle = '#444'; g.font = `400 20px ${FONT}`; g.textAlign = 'center';
    [400, 500, 600, 700].forEach((wl) => g.fillText(`${wl} нм`, X(wl), y0 + 76));
    para(g, [
      'S — короткие волны (синий)',
      'M — средние волны (зелёный)',
      'L — длинные волны (красный)',
      '',
      'Мозг сравнивает сигналы колбочек.',
      'Если одного типа нет — часть цветов',
      'становится неразличимой.',
    ], 60, 740, 26, 36);
  });
}

// Палочки и колбочки сетчатки.
export function retinaPoster() {
  return canvasTexture(768, 1024, (g, w, h) => {
    g.fillStyle = '#eef3f6'; g.fillRect(0, 0, w, h);
    title(g, w, 'Сетчатка глаза', 70);
    g.fillStyle = '#d7c2b0'; g.beginPath(); g.ellipse(w / 2, 300, 230, 170, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, 300, 200, 145, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3b2a1a'; g.beginPath(); g.arc(w / 2, 300, 80, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(w / 2, 300, 36, 0, Math.PI * 2); g.fill();
    const cell = [
      { type: 'rod', col: [0.35, 0.35, 0.35] }, { type: 'cone', col: [0.7, 0.03, 0.02] },
      { type: 'rod', col: [0.35, 0.35, 0.35] }, { type: 'cone', col: [0.02, 0.4, 0.05] },
      { type: 'rod', col: [0.35, 0.35, 0.35] }, { type: 'cone', col: [0.7, 0.03, 0.02] },
      { type: 'rod', col: [0.35, 0.35, 0.35] }, { type: 'cone', col: [0.02, 0.05, 0.7] },
      { type: 'rod', col: [0.35, 0.35, 0.35] }, { type: 'cone', col: [0.02, 0.4, 0.05] },
      { type: 'rod', col: [0.35, 0.35, 0.35] },
    ];
    cell.forEach((c, i) => {
      const x = 90 + i * 55, y = 520;
      g.fillStyle = css(c.col);
      if (c.type === 'rod') g.fillRect(x, y, 22, 170);
      else { g.beginPath(); g.moveTo(x - 4, y + 170); g.lineTo(x + 11, y + 40); g.lineTo(x + 26, y + 170); g.fill(); }
    });
    para(g, [
      'Палочки (серые) — видят в темноте,',
      'но не различают цвета.',
      'Колбочки — работают при ярком свете',
      'и отвечают за цвет. Их три типа:',
      'L, M и S.',
      '',
      'Около 6 млн колбочек и 120 млн палочек.',
    ], 60, 760, 26, 36);
  });
}

export function hallPoster() {
  return canvasTexture(512, 720, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
    const cols = [[0.75, 0.02, 0.02], [0.9, 0.35, 0.0], [0.85, 0.75, 0.0], [0.03, 0.45, 0.05],
      [0.0, 0.25, 0.7], [0.25, 0.03, 0.5]];
    cols.forEach((c, i) => {
      g.strokeStyle = css(c); g.lineWidth = 34;
      g.beginPath(); g.arc(w / 2, 420, 200 - i * 34, Math.PI, 0); g.stroke();
    });
    title(g, w, 'Береги зрение!', 90, 48);
    para(g, ['Проверяй глаза', 'раз в год.'], 150, 160, 30, 40);
    g.fillStyle = '#555'; g.font = `400 22px ${FONT}`; g.textAlign = 'center';
    g.fillText('Детская поликлиника №3', w / 2, h - 40);
  });
}

export function snellenChart() {
  const rows = ['Ш Б', 'М Н К', 'Ы М Б Ш', 'Б Ы Н К М', 'И Н Ш М К', 'Н К И Б М Ш'];
  return canvasTexture(512, 900, (g, w, h) => {
    g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#111'; g.textAlign = 'center';
    rows.forEach((r, i) => {
      const s = 120 - i * 17;
      g.font = `700 ${s}px ${FONT}`;
      g.fillText(r, w / 2, 140 + i * 125 - i * i * 4);
    });
  });
}
