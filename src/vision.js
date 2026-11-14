// Пресеты цветовосприятия и их математика.
// Дихромазии моделируются методом Brettel, Viénot & Mollon (1997) в линейном sRGB,
// коэффициенты из libDaltonLens (Nicolas Burrus). Аномальные трихромазии (…аномалии)
// приближены линейной интерполяцией между нормой и дихромазией — так же делает libDaltonLens.
import * as THREE from 'three';

const BRETTEL = {
  protan: {
    m1: [0.14980, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.00540, 1.00156],
    m2: [0.14570, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
    n: [0.00048, 0.00393, -0.00441],
  },
  deutan: {
    m1: [0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
    m2: [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.10540, -0.01980, 0.02784, 0.99196],
    n: [-0.00281, -0.00611, 0.00892],
  },
  tritan: {
    m1: [1.01354, 0.14268, -0.15622, -0.01181, 0.87561, 0.13619, 0.07707, 0.81208, 0.11085],
    m2: [0.93337, 0.19999, -0.13336, 0.05809, 0.82565, 0.11626, -0.37923, 1.13825, 0.24098],
    n: [0.03960, -0.02831, -0.01129],
  },
};

const IDENTITY = { m1: [1, 0, 0, 0, 1, 0, 0, 0, 1], m2: [1, 0, 0, 0, 1, 0, 0, 0, 1], n: [0, 0, 0] };
const LUM = [0.2126, 0.7152, 0.0722];
const MONO = { m1: [...LUM, ...LUM, ...LUM], m2: [...LUM, ...LUM, ...LUM], n: [0, 0, 0] };

export const PRESETS = {
  normal:        { name: 'Нормальное зрение', short: 'норма', model: IDENTITY, severity: 1,
                   info: 'Работают все три типа колбочек: L, M и S.' },
  protanomaly:   { name: 'Протаномалия', short: 'ослаблены L-колбочки', model: BRETTEL.protan, severity: 0.6,
                   info: 'L-колбочки («красные») смещены по чувствительности. Красный тусклее и путается с зелёным.' },
  protanopia:    { name: 'Протанопия', short: 'нет L-колбочек', model: BRETTEL.protan, severity: 1,
                   info: 'L-колбочек нет. Красный кажется тёмным, красный и зелёный неразличимы.' },
  deuteranomaly: { name: 'Дейтераномалия', short: 'ослаблены M-колбочки', model: BRETTEL.deutan, severity: 0.6,
                   info: 'Самый частый тип: около 5% мужчин. Зелёный и красный сближаются.' },
  deuteranopia:  { name: 'Дейтеранопия', short: 'нет M-колбочек', model: BRETTEL.deutan, severity: 1,
                   info: 'M-колбочек («зелёных») нет. Красный, оранжевый, жёлтый и зелёный сливаются.' },
  tritanomaly:   { name: 'Тританомалия', short: 'ослаблены S-колбочки', model: BRETTEL.tritan, severity: 0.6,
                   info: 'S-колбочки («синие») работают хуже. Синий путается с зелёным, жёлтый — с розовым.' },
  tritanopia:    { name: 'Тританопия', short: 'нет S-колбочек', model: BRETTEL.tritan, severity: 1,
                   info: 'S-колбочек нет. Синий кажется бирюзовым, жёлтый — розоватым, фиолетовый — красным.' },
  achromatopsia: { name: 'Ахроматопсия', short: 'колбочки не работают', model: MONO, severity: 1, achro: true,
                   info: 'Видят только палочки: мир серый, яркий свет слепит, детали размыты.' },
};

export const PRESET_ORDER = ['normal', 'protanomaly', 'protanopia', 'deuteranomaly', 'deuteranopia',
  'tritanomaly', 'tritanopia', 'achromatopsia'];

// Направление в линейном RGB, вдоль которого цвета неразличимы для дихромата
// (ядро проекционной матрицы). Используется для генерации таблиц Исихары и «ошибочного» рисунка.
export function confusionAxis(type) {
  const m = BRETTEL[type].m1;
  const a = new THREE.Vector3(m[0], m[1], m[2]);
  const b = new THREE.Vector3(m[3], m[4], m[5]);
  return a.cross(b).normalize();
}

// CPU-версия симуляции (для проверок и подбора цветов).
export function simulate(rgb, presetId) {
  const p = PRESETS[presetId];
  const { m1, m2, n } = p.model;
  const side = rgb[0] * n[0] + rgb[1] * n[1] + rgb[2] * n[2];
  const m = side >= 0 ? m1 : m2;
  const s = [0, 1, 2].map((r) => m[r * 3] * rgb[0] + m[r * 3 + 1] * rgb[1] + m[r * 3 + 2] * rgb[2]);
  return s.map((v, i) => rgb[i] + (v - rgb[i]) * p.severity);
}

export function matFromRows(rows) {
  const m = new THREE.Matrix3();
  m.set(...rows);
  return m;
}
