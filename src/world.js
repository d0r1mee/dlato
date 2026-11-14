// Геометрия уровня: коридор-холл поликлиники и кабинет офтальмолога.
import * as THREE from 'three';
import { floorTiles, wallTex, signTex } from './textures.js';
import { buildHall } from './hall.js';
import { buildOffice } from './office.js';

export const H = 3.0;           // высота потолка
export const HALL = { x0: -6, x1: 6, z0: -4, z1: 5 };
export const OFFICE = { x0: -4, x1: 4, z0: -11, z1: -4 };
export const DOOR = { x0: -0.65, x1: 0.65 };

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...color), roughness: 0.75, ...o });

// Ящик с опциональным коллайдером. Возвращает mesh.
export function makeBoxer(scene, player) {
  return function box(w, h, d, material, x, y, z, { collide = true, parent = scene, shadow = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    parent.add(m);
    if (collide && player) player.addBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  };
}

function room(scene, box, r, wallM, floorM, ceilM, skip = {}) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorM);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true;
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilM);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, H, cz);
  scene.add(floor, ceil);
  const t = 0.2;
  if (!skip.west) box(t, H, d, wallM, r.x0 - t / 2, H / 2, cz);
  if (!skip.east) box(t, H, d, wallM, r.x1 + t / 2, H / 2, cz);
  if (!skip.north) box(w + 2 * t, H, t, wallM, cx, H / 2, r.z0 - t / 2);
  if (!skip.south) box(w + 2 * t, H, t, wallM, cx, H / 2, r.z1 + t / 2);
}

export function buildWorld(player) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0, 0, 0);
  const box = makeBoxer(scene, player);
  const interact = [];

  const hallWall = new THREE.MeshStandardMaterial({ map: wallTex([0.72, 0.68, 0.58], [0.04, 0.3, 0.32], [4, 1]), roughness: 0.9 });
  const officeWall = new THREE.MeshStandardMaterial({ map: wallTex([0.62, 0.7, 0.75], [0.15, 0.22, 0.45], [4, 1]), roughness: 0.9 });
  const hallFloor = new THREE.MeshStandardMaterial({ map: floorTiles([0.5, 0.5, 0.45], [0.3, 0.38, 0.4], [12, 9]), roughness: 0.35 });
  const officeFloor = new THREE.MeshStandardMaterial({ map: floorTiles([0.45, 0.3, 0.18], [0.4, 0.26, 0.15], [8, 7]), roughness: 0.5 });
  const ceilM = mat([0.85, 0.85, 0.83], { roughness: 1 });

  // холл: северная стена с дверным проёмом
  room(scene, box, HALL, hallWall, hallFloor, ceilM, { north: true });
  const t = 0.2, zN = HALL.z0 - t / 2;
  box(DOOR.x0 - HALL.x0 + t, H, t, hallWall, (HALL.x0 - t + DOOR.x0) / 2, H / 2, zN);
  box(HALL.x1 + t - DOOR.x1, H, t, hallWall, (HALL.x1 + t + DOOR.x1) / 2, H / 2, zN);
  box(DOOR.x1 - DOOR.x0, H - 2.2, t, hallWall, 0, 2.2 + (H - 2.2) / 2, zN, { collide: false });
  // кабинет (южная стена совпадает с северной стеной холла)
  room(scene, box, OFFICE, officeWall, officeFloor, ceilM, { south: true });

  // раздвижная дверь кабинета
  const doorM = mat([0.7, 0.62, 0.48], { roughness: 0.6 });
  const door = box(DOOR.x1 - DOOR.x0, 2.2, 0.06, doorM, 0, 1.1, zN + 0.14, { collide: false });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), mat([0.6, 0.6, 0.62], { metalness: 0.8, roughness: 0.3 }));
  handle.position.set(0.48, 0, 0.06);
  door.add(handle);
  const doorCollider = player.addBox(DOOR.x0, DOOR.x1, zN - 0.1, zN + 0.2);
  const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.44),
    new THREE.MeshStandardMaterial({ map: signTex(['Кабинет 7', 'Офтальмолог'], [0.02, 0.2, 0.42]), roughness: 0.5 }));
  doorSign.position.set(0, 2.55, zN + 0.12);
  scene.add(doorSign);
  const doorState = { open: false, x: 0 };
  const doorEntry = { id: 'door', object: door, label: 'Дверь в кабинет 7', enabled: true, at: new THREE.Vector3(0, 1.2, zN + 0.14) };
  interact.push(doorEntry);

  // освещение: мягкая заливка + потолочные светильники
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.9, 0.92, 1.0), new THREE.Color(0.35, 0.3, 0.25), 0.55));
  const panelM = new THREE.MeshStandardMaterial({ emissive: new THREE.Color(1, 0.97, 0.9), emissiveIntensity: 2.2, color: 0x000000 });
  const lamps = [[-3, 0.5], [3, 0.5], [0, 3.2], [-2, -7.5], [2, -8.5]];
  lamps.forEach(([x, z], i) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), panelM);
    p.position.set(x, H - 0.02, z);
    scene.add(p);
    const l = new THREE.PointLight(new THREE.Color(1, 0.95, 0.88), 9, 12, 1.6);
    l.position.set(x, H - 0.3, z);
    if (i === 0 || i === 3) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; }
    scene.add(l);
  });

  const hall = buildHall(scene, box, interact);
  const office = buildOffice(scene, box, interact);

  return {
    scene, interact, hall, office,
    openDoor() { doorState.open = true; doorCollider.enabled = false; doorEntry.enabled = false; },
    update(dt, time, camPos) {
      doorState.x += ((doorState.open ? 1.35 : 0) - doorState.x) * Math.min(1, dt * 2.5);
      door.position.x = doorState.x;
      hall.update(dt, time, camPos);
      office.update(dt, time, camPos);
    },
  };
}
