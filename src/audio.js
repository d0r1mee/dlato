// Синтезированные звуки (WebAudio), чтобы не тащить ассеты.
let ctx = null, master = null;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  // фоновый гул больницы: отфильтрованный шум
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 280;
  const g = ctx.createGain(); g.gain.value = 0.05;
  src.connect(lp).connect(g).connect(master);
  src.start();
}

function tone(freq, dur, { type = 'sine', vol = 0.2, when = 0, slide = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noiseBurst(dur, freq, vol) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export const sfx = {
  blip: (pitch = 1) => tone(520 * pitch + Math.random() * 40, 0.04, { type: 'square', vol: 0.025 }),
  step: () => noiseBurst(0.08, 400 + Math.random() * 200, 0.25),
  click: () => tone(900, 0.05, { type: 'triangle', vol: 0.12 }),
  good: () => { tone(660, 0.18, { vol: 0.15 }); tone(990, 0.3, { vol: 0.12, when: 0.1 }); },
  bad: () => tone(220, 0.25, { type: 'triangle', vol: 0.12, slide: 0.7 }),
  chime: () => { tone(784, 0.6, { vol: 0.15 }); tone(659, 0.6, { vol: 0.15, when: 0.35 }); tone(523, 0.9, { vol: 0.15, when: 0.7 }); },
  door: () => { noiseBurst(0.5, 180, 0.4); tone(110, 0.4, { type: 'sawtooth', vol: 0.03, slide: 0.8 }); },
  whoosh: () => { noiseBurst(1.2, 900, 0.18); tone(300, 1.2, { vol: 0.05, slide: 2.5 }); },
};
