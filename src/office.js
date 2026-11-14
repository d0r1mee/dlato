// Кабинет офтальмолога: врач, стол с рисунками, мольберт с таблицами, плакаты и «колбочкометр».
import * as THREE from 'three';
import { mat } from './world.js';
import { drawingTex, signTex, confuse } from './textures.js';
import { conesPoster, retinaPoster, snellenChart } from './posters.js';
import { makeCharacter } from './characters.js';
import { confusionAxis } from './vision.js';

const plane = (w, h, material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);

export function buildOffice(scene, box, interact) {
  // стол и врач
  const wood = mat([0.35, 0.18, 0.08], { roughness: 0.55 });
  box(1.6, 0.05, 0.8, wood, -2.2, 0.75, -9.2);
  box(0.05, 0.74, 0.75, wood, -2.95, 0.37, -9.2, { collide: false });
  box(0.05, 0.74, 0.75, wood, -1.45, 0.37, -9.2, { collide: false });
  box(1.5, 0.5, 0.04, wood, -2.2, 0.5, -9.55, { collide: false });
  box(0.5, 0.44, 0.5, mat([0.08, 0.08, 0.1]), -2.2, 0.22, -9.95, { collide: false });
  box(0.7, 1, 0.6, mat([0, 0, 0]), -2.2, 0.5, -9.9, { shadow: false }).visible = false; // коллайдер врача
  const doctor = makeCharacter({ height: 1.78, skin: [0.7, 0.48, 0.36], hair: [0.45, 0.45, 0.45], top: [0.2, 0.3, 0.45],
    bottom: [0.12, 0.12, 0.14], coat: true, glasses: true, seated: true });
  doctor.root.position.set(-2.2, 0, -9.95);
  scene.add(doctor.root);
  interact.push({ id: 'doctor', object: doctor.root, label: 'Поговорить с врачом', enabled: true, at: new THREE.Vector3(-2.2, 1.35, -9.85) });
  const laptop = box(0.36, 0.02, 0.26, mat([0.6, 0.6, 0.62], { metalness: 0.6 }), -2.75, 0.79, -9.3, { collide: false });
  laptop.rotation.y = 0.3;

  // рисунки: образец и раскраска Миши (цвета подобраны вдоль оси смешения тританопа)
  const ax = confusionAxis('tritan');
  const ref = { sky: [0.12, 0.3, 0.85], sun: [0.9, 0.72, 0.04], grass: [0.08, 0.42, 0.05] };
  const boy = { sky: confuse(ref.sky, -0.7, ax), sun: confuse(ref.sun, 0.45, ax), grass: confuse(ref.grass, 0.5, ax) };
  const drawings = new THREE.Group();
  drawings.position.set(-2.2, 0.79, -8.98);
  [[ref, 'Образец', -0.24], [boy, 'Миша, 7 лет', 0.24]].forEach(([pal, title, x]) => {
    const d = plane(0.42, 0.33, new THREE.MeshStandardMaterial({ map: drawingTex(pal, title), roughness: 0.9 }));
    d.position.set(x, 0.1, 0); d.rotation.x = -0.9;
    drawings.add(d);
  });
  scene.add(drawings);
  interact.push({ id: 'drawings', object: drawings, label: 'Посмотреть рисунки', enabled: false, at: new THREE.Vector3(-2.2, 0.85, -8.98) });

  // мольберт с таблицей
  const metal = mat([0.3, 0.3, 0.32], { metalness: 0.7, roughness: 0.3 });
  box(0.05, 1.5, 0.05, metal, 0.6, 0.75, -10.3, { collide: false });
  box(0.7, 0.05, 0.05, metal, 0.6, 0.9, -10.25, { collide: false });
  box(0.7, 0.7, 0.03, mat([0.95, 0.95, 0.93]), 0.6, 1.22, -10.25);
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const plate = plane(0.6, 0.6, plateMat);
  plate.position.set(0.6, 1.22, -10.23);
  scene.add(plate);
  const plateCover = plane(0.6, 0.6, new THREE.MeshStandardMaterial({ map: signTex(['Таблицы', 'Рабкина / Исихары'], [0.92, 0.92, 0.9], [0.1, 0.1, 0.1], 512, 512) }));
  plateCover.position.set(0.6, 1.22, -10.22);
  scene.add(plateCover);
  interact.push({ id: 'easel', object: plateCover, label: 'Таблицы для проверки цветового зрения', enabled: true, at: new THREE.Vector3(0.6, 1.22, -10.2) });

  // плакаты и таблица Сивцева
  const cones = plane(0.75, 1.0, new THREE.MeshStandardMaterial({ map: conesPoster(), roughness: 0.7 }));
  cones.position.set(3.89, 1.55, -6.3); cones.rotation.y = -Math.PI / 2;
  const retina = plane(0.75, 1.0, new THREE.MeshStandardMaterial({ map: retinaPoster(), roughness: 0.7 }));
  retina.position.set(3.89, 1.55, -7.6); retina.rotation.y = -Math.PI / 2;
  const snellen = plane(0.6, 1.05, new THREE.MeshStandardMaterial({ map: snellenChart(), roughness: 0.7 }));
  snellen.position.set(-3.89, 1.6, -7.2); snellen.rotation.y = Math.PI / 2;
  scene.add(cones, retina, snellen);
  interact.push({ id: 'poster_cones', object: cones, label: 'Плакат «Как мы видим цвет»', enabled: true, at: cones.position.clone() });
  interact.push({ id: 'poster_retina', object: retina, label: 'Плакат «Сетчатка глаза»', enabled: true, at: retina.position.clone() });
  interact.push({ id: 'snellen', object: snellen, label: 'Таблица для проверки остроты зрения', enabled: true, at: snellen.position.clone() });

  // модель глаза на тумбе
  box(0.6, 0.9, 0.5, mat([0.85, 0.85, 0.82]), -3.6, 0.45, -5.6);
  const eye = new THREE.Group();
  eye.position.set(-3.6, 1.12, -5.6);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), mat([0.95, 0.93, 0.9], { roughness: 0.3 }));
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), mat([0.1, 0.3, 0.55], { roughness: 0.3 }));
  iris.position.z = 0.199;
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), mat([0.01, 0.01, 0.01]));
  pupil.position.z = 0.2;
  const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 10), mat([0.85, 0.6, 0.4]));
  nerve.rotation.x = Math.PI / 2; nerve.position.z = -0.25;
  eye.add(ball, iris, pupil, nerve);
  eye.rotation.y = 0.9;
  scene.add(eye);
  interact.push({ id: 'eye', object: eye, label: 'Модель глаза', enabled: true, at: eye.position.clone() });

  // кушетка, шкаф, окно
  box(0.7, 0.5, 1.9, mat([0.1, 0.35, 0.4], { roughness: 0.6 }), -3.55, 0.25, -4.9 - 0.4);
  box(1.2, 2.0, 0.45, mat([0.88, 0.88, 0.86]), 3.3, 1.0, -4.5);
  const win = plane(1.4, 1.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.55, 1.1) }));
  win.position.set(-2.2, 1.8, -10.89);
  scene.add(win);

  // «колбочкометр»: экран-цель, экран смешения и три лампы L/M/S
  const machine = new THREE.Group();
  machine.position.set(2.6, 0, -10.6);
  box(1.7, 1.5, 0.5, mat([0.75, 0.77, 0.8], { roughness: 0.4 }), 2.6, 0.75, -10.6);
  const targetScreen = plane(0.6, 0.46, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  targetScreen.position.set(-0.38, 1.12, 0.26);
  const mixScreen = plane(0.6, 0.46, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  mixScreen.position.set(0.38, 1.12, 0.26);
  const labelT = plane(0.6, 0.12, new THREE.MeshBasicMaterial({ map: signTex(['ЦЕЛЬ'], [0.1, 0.1, 0.1], [0.9, 0.9, 0.9], 400, 80) }));
  labelT.position.set(-0.38, 1.43, 0.26);
  const labelM = plane(0.6, 0.12, new THREE.MeshBasicMaterial({ map: signTex(['СМЕСЬ'], [0.1, 0.1, 0.1], [0.9, 0.9, 0.9], 400, 80) }));
  labelM.position.set(0.38, 1.43, 0.26);
  machine.add(targetScreen, mixScreen, labelT, labelM);
  const lampCols = { L: [1, 0.05, 0.02], M: [0.05, 1, 0.05], S: [0.05, 0.1, 1] };
  const lamps = {};
  ['L', 'M', 'S'].forEach((k, i) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(...lampCols[k]), emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), m);
    lamp.rotation.x = Math.PI / 2; lamp.position.set(-0.45 + i * 0.45, 0.6, 0.28);
    const lab = plane(0.2, 0.1, new THREE.MeshBasicMaterial({ map: signTex([k], [0.1, 0.1, 0.1], [0.95, 0.95, 0.95], 160, 80) }));
    lab.position.set(-0.45 + i * 0.45, 0.42, 0.26);
    machine.add(lamp, lab);
    lamps[k] = m;
  });
  const sign = plane(1.2, 0.2, new THREE.MeshBasicMaterial({ map: signTex(['КОЛБОЧКОМЕТР'], [0.05, 0.12, 0.3], [1, 1, 1], 600, 100) }));
  sign.position.set(0, 1.62, 0.26);
  machine.add(sign);
  scene.add(machine);
  interact.push({ id: 'machine', object: machine, label: 'Колбочкометр', enabled: true, at: new THREE.Vector3(2.6, 1.1, -10.3) });

  return {
    doctor, plate, plateMat, plateCover, drawings, targetScreen, mixScreen, lamps,
    update(dt, time, camPos) { doctor.update(dt, camPos); },
  };
}
