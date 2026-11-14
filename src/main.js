// Точка входа: рендерер, цикл, режимы игры, взаимодействие, экраны.
import * as THREE from 'three';
import { PostFX, Vision } from './postfx.js';
import { PRESETS, PRESET_ORDER } from './vision.js';
import { Player } from './player.js';
import { buildWorld } from './world.js';
import { UI } from './ui.js';
import { Story } from './story.js';
import { initAudio, sfx } from './audio.js';
import { setMaxAnisotropy } from './textures.js';
import { makePlate, PLATES } from './ishihara.js';

const params = new URLSearchParams(location.search);
const DEV = params.has('dev');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 60);
const post = new PostFX(renderer);
const vision = new Vision(post);
const player = new Player(camera, canvas);
const world = buildWorld(player);
world.office.plateTex = PLATES.map((p, i) => makePlate({ text: p.text, kind: p.kind, seed: 7 + i * 13 }));
const ui = new UI();

const $ = (id) => document.getElementById(id);
const screens = { title: $('screen-title'), pause: $('screen-pause'), end: $('screen-end') };

const game = {
  ui, player, vision, world, mode: 'title',
  setMode(m) {
    this.mode = m;
    const free = m === 'explore' || m === 'sim';
    player.canMove = free;
    player.canLook = free;
    if (!free) ui.prompt('');
  },
  waitKey(code) {
    return new Promise((r) => {
      const h = (e) => { if (e.code === code) { removeEventListener('keydown', h); r(); } };
      addEventListener('keydown', h);
    });
  },
  async endEpisode(stats) {
    this.setMode('end');
    await ui.fade(1, 2000);
    ui.objective('');
    const s = stats || { missedT: 3, missedOther: 0, total: 6 };
    $('end-text').innerHTML = `
      <p>Миша узнал, что у него <b>тританопия</b>: S-колбочки, отвечающие за короткие («синие») волны, не работают.</p>
      <ul>
        <li>Таблиц пройдено: ${s.total}. Сине-жёлтых, на которых цифра «исчезла»: ${s.missedT} из 3.</li>
        <li>Цвет видят колбочки трёх типов: L, M и S. Палочки работают в полутьме и цвета не различают.</li>
        <li>Красно-зелёный дальтонизм — примерно у 8% мужчин и 0,5% женщин. Тританопия — около 1 на 10 000. Ахроматопсия — около 1 на 30 000.</li>
        <li>Таблицы Исихары выявляют красно-зелёный дальтонизм. Для сине-жёлтого нужны другие таблицы.</li>
      </ul>
      <p>В свободном режиме можно гулять по поликлинике и переключать восприятие клавишами 1–8.</p>`;
    document.exitPointerLock?.();
    screens.end.classList.remove('hidden');
  },
};
const story = new Story(game);

ui.onCursorRelease = () => { if (game.mode !== 'end' && game.mode !== 'title') player.lock(); };
player.onStep = () => sfx.step();

// --- экраны ---
async function startGame() {
  initAudio();
  screens.title.classList.add('hidden');
  player.lock();
  if (params.has('sim')) { ui.fade(0, 600); return startSim(); }
  if (params.get('skip') === 'office') return skipToOffice();
  await story.start();
}
$('btn-start').addEventListener('click', startGame);
$('btn-resume').addEventListener('click', () => { screens.pause.classList.add('hidden'); player.lock(); });
$('opt-sens').addEventListener('input', (e) => { player.sens = Number(e.target.value); });
$('btn-sim').addEventListener('click', () => { screens.end.classList.add('hidden'); player.lock(); startSim(); });

function startSim() {
  player.setPose(0, 1.5, 0, 0);
  game.setMode('sim');
  ui.fade(0, 1200);
  ui.objective('Свободный режим: гуляй и сравнивай восприятие (клавиши 1–8)');
  showPreset();
}

function skipToOffice() {
  Object.assign(story.f, { nurse: true, girl: true, called: true });
  world.openDoor();
  player.setPose(0, -3.2, 0, 0);
  vision.set('tritanopia', { mode: 'instant' });
  ui.fade(0, 300);
  ui.vision('Зрение: Миша');
  game.setMode('explore');
}

function showPreset() {
  const id = vision.anim ? vision.anim.id : vision.current;
  const p = PRESETS[id];
  ui.vision(`${PRESET_ORDER.map((k, i) => `${i + 1} ${k === id ? '▶ ' : ''}${PRESETS[k].name}`).join('\n')}\n\n${p.info}`);
}

document.addEventListener('pointerlockchange', () => {
  const playing = ['explore', 'cutscene', 'sim'].includes(game.mode);
  if (!player.locked && playing && !ui.cursorMode) screens.pause.classList.remove('hidden');
  if (player.locked) screens.pause.classList.add('hidden');
});
canvas.addEventListener('click', () => {
  if (['explore', 'cutscene', 'sim'].includes(game.mode) && !ui.cursorMode) player.lock();
});

// --- взаимодействие ---
let focused = null;
const tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
function pickInteractable() {
  camera.getWorldDirection(fwd);
  let best = null, bestScore = Infinity;
  for (const it of world.interact) {
    if (!it.enabled) continue;
    tmp.subVectors(it.at, camera.position);
    const dist = tmp.length();
    if (dist > 2.6) continue;
    const ang = Math.acos(THREE.MathUtils.clamp(tmp.normalize().dot(fwd), -1, 1));
    const limit = Math.atan(0.45 / dist) + 0.05;
    if (ang < limit && ang * dist < bestScore) { best = it; bestScore = ang * dist; }
  }
  return best;
}

addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && game.mode === 'explore' && focused && !ui.inDialogue) {
    story.onInteract(focused.id);
  }
  const n = parseInt(e.key, 10);
  if ((game.mode === 'sim' || (DEV && game.mode === 'explore')) && n >= 1 && n <= PRESET_ORDER.length) {
    vision.set(PRESET_ORDER[n - 1], { mode: 'morph', duration: 1.2 }).then(showPreset);
    sfx.whoosh();
    showPreset();
  }
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  post.setSize();
});

// --- цикл ---
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  player.update(dt);
  vision.update(dt);
  world.update(dt, time, camera.position);
  if (game.mode === 'explore' || game.mode === 'sim') {
    if (game.mode === 'explore') story.update();
    focused = game.mode === 'explore' ? pickInteractable() : null;
    ui.prompt(focused ? `[E] ${focused.label}` : '');
  }
  post.render(world.scene, camera, time);
  requestAnimationFrame(frame);
}
player.setPose(0, 3.6, 0, -0.05);
frame();

if (params.has('autostart')) startGame().then(() => {
  // отладка: ?dev&pose=x,z,yaw,pitch&vis=preset&plate=i
  if (!DEV) return;
  if (params.has('pose')) { const [x, z, yaw, pitch] = params.get('pose').split(',').map(Number); player.setPose(x, z, yaw, pitch || 0); }
  if (params.has('vis')) vision.set(params.get('vis'), { mode: 'instant' });
  if (params.has('plate')) { world.office.plateCover.visible = false; world.office.plateMat.map = world.office.plateTex[+params.get('plate')]; world.office.plateMat.needsUpdate = true; }
});
if (DEV) window.game = Object.assign(game, { story, camera, renderer, post });
