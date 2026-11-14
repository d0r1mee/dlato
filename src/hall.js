// Холл поликлиники: регистратура, ряд стульев, детский уголок, окно, автомат с напитками.
import * as THREE from 'three';
import { mat } from './world.js';
import { signTex, sweaterTex } from './textures.js';
import { hallPoster } from './posters.js';
import { makeCharacter } from './characters.js';

function chair(scene, box, x, z, rotY, seatCol) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const seat = mat(seatCol, { roughness: 0.5 });
  const metal = mat([0.5, 0.5, 0.52], { metalness: 0.7, roughness: 0.35 });
  box(0.48, 0.06, 0.46, seat, 0, 0.45, 0, { collide: false, parent: g });
  box(0.48, 0.45, 0.05, seat, 0, 0.7, -0.22, { collide: false, parent: g });
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]])
    box(0.03, 0.45, 0.03, metal, lx, 0.22, lz, { collide: false, parent: g });
  scene.add(g);
  return g;
}

function plant(scene, box, x, z) {
  box(0.4, 0.45, 0.4, mat([0.35, 0.12, 0.06]), x, 0.225, z);
  const leaf = mat([0.05, 0.3, 0.06], { roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), leaf);
    l.position.set(x + (Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.3);
    l.scale.set(1, 1.4, 1); l.castShadow = true;
    scene.add(l);
  }
}

export function buildHall(scene, box, interact) {
  // регистратура
  const deskM = mat([0.85, 0.82, 0.75], { roughness: 0.4 });
  const deskTop = mat([0.12, 0.35, 0.38], { roughness: 0.3 });
  box(0.8, 1.1, 3.2, deskM, -4.4, 0.55, 0.4);
  box(0.95, 0.05, 3.3, deskTop, -4.35, 1.12, 0.4, { collide: false });
  box(0.2, 1.1, 0.8, deskM, -5.1, 0.55, -1.4);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.55), new THREE.MeshStandardMaterial({ map: signTex(['Регистратура'], [0.04, 0.3, 0.32]) }));
  sign.position.set(-5.88, 2.3, 0.4); sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  const monitor = box(0.05, 0.35, 0.5, mat([0.05, 0.05, 0.06]), -4.6, 1.35, 1.2, { collide: false });
  monitor.rotation.y = -0.3;

  const nurse = makeCharacter({ height: 1.68, skin: [0.8, 0.58, 0.45], hair: [0.35, 0.2, 0.08], hairLong: true,
    top: [0.1, 0.45, 0.5], bottom: [0.1, 0.45, 0.5], cap: true });
  nurse.root.position.set(-5.35, 0, 0.6); nurse.root.rotation.y = Math.PI / 2;
  scene.add(nurse.root);
  interact.push({ id: 'nurse', object: nurse.root, label: 'Поговорить с медсестрой', enabled: true, at: new THREE.Vector3(-5.2, 1.5, 0.6) });

  // ряд стульев у окна, девушка с ахроматопсией
  const seatCols = [[0.7, 0.08, 0.05], [0.9, 0.6, 0.02], [0.05, 0.45, 0.1], [0.03, 0.2, 0.7], [0.7, 0.08, 0.05]];
  seatCols.forEach((c, i) => chair(scene, box, 5.4, -2.6 + i * 0.62, -Math.PI / 2, c));
  // невидимый коллайдер на весь ряд стульев (с запасом под ноги девушки)
  box(1.0, 1, 3.3, mat([0, 0, 0]), 5.3, 0.5, -1.36, { shadow: false }).visible = false;
  const girl = makeCharacter({ height: 1.66, skin: [0.85, 0.65, 0.55], hair: [0.02, 0.02, 0.02], hairLong: true,
    topMap: sweaterTex(), bottom: [0.06, 0.08, 0.2], sunglasses: true, seated: true });
  girl.root.position.set(5.48, 0, -0.74); girl.root.rotation.y = -Math.PI / 2;
  scene.add(girl.root);
  interact.push({ id: 'girl', object: girl.root, label: 'Заговорить с девушкой', enabled: true, at: new THREE.Vector3(5.2, 1.2, -0.74) });

  // окно с небом и деревьями (яркие цвета — хорошо видно, как меняется восприятие)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.5, 1.2) }));
  sky.position.set(5.98, 1.75, 2.6); sky.rotation.y = -Math.PI / 2;
  scene.add(sky);
  const trees = mat([0.03, 0.25, 0.03], { emissive: new THREE.Color(0.02, 0.18, 0.02) });
  for (let i = 0; i < 5; i++) {
    const tr = new THREE.Mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.2, 12), trees);
    tr.position.set(5.97, 1.1 + Math.random() * 0.15, 1.2 + i * 0.7); tr.rotation.y = -Math.PI / 2;
    scene.add(tr);
  }
  const frameM = mat([0.95, 0.95, 0.95]);
  box(0.1, 0.08, 3.7, frameM, 5.95, 1.0, 2.6, { collide: false });
  box(0.1, 0.08, 3.7, frameM, 5.95, 2.5, 2.6, { collide: false });
  box(0.1, 1.5, 0.08, frameM, 5.95, 1.75, 2.6, { collide: false });
  const sun = new THREE.PointLight(new THREE.Color(1, 0.95, 0.85), 6, 8, 1.5);
  sun.position.set(5.2, 1.8, 2.6);
  scene.add(sun);

  // автомат с напитками
  box(1.0, 1.9, 0.7, mat([0.6, 0.03, 0.03], { roughness: 0.4 }), 3.6, 0.95, -3.6);
  const canCols = [[0.7, 0.02, 0.02], [0.02, 0.45, 0.05], [0.9, 0.7, 0.0], [0.02, 0.15, 0.7], [0.9, 0.3, 0.6], [0.95, 0.4, 0.0]];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10),
      mat(canCols[(r * 4 + c) % canCols.length], { emissive: new THREE.Color(...canCols[(r * 4 + c) % canCols.length]).multiplyScalar(0.25) }));
    can.position.set(3.25 + c * 0.2, 1.1 + r * 0.32, -3.22);
    scene.add(can);
  }
  box(0.84, 1.1, 0.02, new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.25, roughness: 0.05 }),
    3.55, 1.4, -3.24, { collide: false, shadow: false });

  // детский уголок: коврик и кубики
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), mat([0.8, 0.5, 0.05]));
  rug.rotation.x = -Math.PI / 2; rug.position.set(3.3, 0.005, 3.6);
  scene.add(rug);
  const blockCols = [[0.8, 0.02, 0.02], [0.02, 0.5, 0.05], [0.02, 0.15, 0.8], [0.95, 0.8, 0.02], [0.5, 0.05, 0.6], [0.95, 0.4, 0.02]];
  blockCols.forEach((c, i) => {
    const b = box(0.22, 0.22, 0.22, mat(c, { roughness: 0.5 }), 2.8 + (i % 3) * 0.32, 0.11 + Math.floor(i / 3) * 0.22, 3.4 + (i % 2) * 0.1, { collide: false });
    b.rotation.y = i * 0.4;
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), mat([0.85, 0.05, 0.4], { roughness: 0.3 }));
  ball.position.set(3.9, 0.2, 4.0); ball.castShadow = true;
  scene.add(ball);

  // плакат, растения, кулер, входная дверь
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.26), new THREE.MeshStandardMaterial({ map: hallPoster(), roughness: 0.6 }));
  poster.position.set(-2.8, 1.6, -4.09);
  scene.add(poster);
  plant(scene, box, -5.5, 4.5); plant(scene, box, 1.6, -3.6); plant(scene, box, 5.5, -3.5);
  box(0.35, 1.1, 0.35, mat([0.9, 0.9, 0.92]), -5.6, 0.55, -3.5);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 14),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0.3, 0.55, 0.9), transparent: true, opacity: 0.7, roughness: 0.1 }));
  bottle.position.set(-5.6, 1.3, -3.5);
  scene.add(bottle);
  box(1.8, 2.3, 0.05, new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.35, roughness: 0.05 }),
    0, 1.15, 5.03, { collide: false });
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: signTex(['ВЫХОД'], [0.02, 0.5, 0.1]) }));
  exit.position.set(0, 2.55, 4.97); exit.rotation.y = Math.PI;
  scene.add(exit);

  return {
    nurse, girl,
    update(dt, time, camPos) { nurse.update(dt, camPos); girl.update(dt, camPos); },
  };
}
