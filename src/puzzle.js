// Мини-головоломка «Колбочкометр»: смешай сигналы L, M и S-колбочек, чтобы получить цвет-цель.
// Экраны находятся в 3D-сцене и проходят через фильтр тританопии: S-составляющую Миша не видит,
// поэтому подсказки даны словами — как в жизни, когда дальтоник опирается на знания, а не на глаза.
import * as THREE from 'three';
import { sfx } from './audio.js';
import { confuse } from './textures.js';
import { confusionAxis } from './vision.js';

const LEVEL = [0, 0.22, 1];        // линейная яркость для уровней 0, 1, 2
const BAR = ['○○', '●○', '●●'];

const TARGETS = [
  { name: 'Жёлтый, как солнце', lms: [2, 2, 0], hint: 'Жёлтый — это красный и зелёный вместе, синего в нём нет.' },
  { name: 'Оранжевый, как апельсин', lms: [2, 1, 0], hint: 'Оранжевый — много красного и немного зелёного.' },
  { name: 'Фиолетовый, как баклажан', lms: [1, 0, 2], hint: 'Фиолетовый: много синего (S) и чуть-чуть красного (L). Зелёного нет.' },
  { name: 'Белый, как снег', lms: [2, 2, 2], hint: 'Белый — когда все три типа колбочек работают на полную.' },
];

const toRGB = ([l, m, s]) => new THREE.Color(LEVEL[l], LEVEL[m], LEVEL[s]);

export async function runConePuzzle({ ui, office }) {
  const { targetScreen, mixScreen, lamps } = office;
  const cur = [0, 0, 0];
  const panel = ui.el.panel;
  ui.cursorMode = true;
  document.exitPointerLock?.();

  const refresh = () => {
    mixScreen.material.color.copy(toRGB(cur));
    ['L', 'M', 'S'].forEach((k, i) => { lamps[k].emissiveIntensity = LEVEL[cur[i]] * 3; });
    ['L', 'M', 'S'].forEach((k, i) => { panel.querySelector(`#bar-${k}`).textContent = BAR[cur[i]]; });
  };

  for (let ti = 0; ti < TARGETS.length; ti++) {
    const T = TARGETS[ti];
    targetScreen.material.color.copy(toRGB(T.lms));
    let fails = 0;
    panel.innerHTML = `
      <h3>Колбочкометр · ${ti + 1}/${TARGETS.length}</h3>
      <p>Цель: <b>${T.name}</b></p>
      <p>L — длинные волны (красный)<br>M — средние (зелёный)<br>S — короткие (синий)</p>
      ${['L', 'M', 'S'].map((k) => `<div class="row"><button data-k="${k}" data-d="-1">−</button>
        <span>${k}: <span class="bars" id="bar-${k}"></span></span>
        <button data-k="${k}" data-d="1">+</button></div>`).join('')}
      <p id="pz-hint"></p>
      <button id="pz-check" style="width:100%;text-align:center">Проверить</button>`;
    panel.classList.remove('hidden');
    refresh();

    await new Promise((resolve) => {
      panel.querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => {
        const i = 'LMS'.indexOf(b.dataset.k);
        cur[i] = Math.max(0, Math.min(2, cur[i] + Number(b.dataset.d)));
        sfx.click();
        refresh();
      }));
      panel.querySelector('#pz-check').addEventListener('click', () => {
        if (cur.every((v, i) => v === T.lms[i])) { sfx.good(); ui.toast('Совпало!'); resolve(); return; }
        sfx.bad();
        fails += 1;
        const looksSame = cur[0] === T.lms[0] && cur[1] === T.lms[1];
        panel.querySelector('#pz-hint').textContent = looksSame
          ? 'Почти похоже, но прибор говорит «нет». Синюю (S) составляющую тебе различить труднее всего. Подсказка врача: ' + T.hint
          : (fails >= 2 ? 'Подсказка врача: ' + T.hint : 'Не совпадает. Попробуй ещё.');
      });
    });
  }
  panel.classList.add('hidden');
  panel.innerHTML = '';
  ui.cursorMode = false;
  ui.onCursorRelease?.();

  // Демонстрация: S-сигнал меняется, но для тританопа экран не меняется вовсе.
  const ax = confusionAxis('tritan');
  const base = [0.6, 0.45, 0.06];
  const withS = confuse(base, 0.42, ax);
  return {
    showBase() { mixScreen.material.color.setRGB(...base); targetScreen.material.color.setRGB(...base); lamps.S.emissiveIntensity = 0; },
    toggleS(on) { mixScreen.material.color.setRGB(...(on ? withS : base)); lamps.S.emissiveIntensity = on ? 3 : 0; },
  };
}
