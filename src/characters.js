// Стилизованные низкополигональные персонажи из примитивов.
import * as THREE from 'three';

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...color), roughness: 0.8, ...opts });

function capsule(r, len, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);
  m.castShadow = true;
  return m;
}

export function makeCharacter({
  height = 1.75, skin = [0.75, 0.5, 0.38], hair = [0.08, 0.05, 0.03], hairLong = false,
  top = [0.3, 0.3, 0.3], topMap = null, bottom = [0.1, 0.1, 0.15], coat = false,
  sunglasses = false, glasses = false, seated = false, cap = false,
} = {}) {
  const s = height / 1.75;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skinM = std(skin, { roughness: 0.6 });
  const topM = topMap ? new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.9 }) : std(top);
  const botM = std(bottom);
  const hipY = seated ? 0.46 : 0.9 * s;

  // ноги
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(0.1 * s * side, hipY, 0);
    const thigh = capsule(0.07 * s, 0.32 * s, botM);
    thigh.position.y = -0.22 * s;
    leg.add(thigh);
    if (seated) {
      leg.rotation.x = -Math.PI / 2;           // бедро вперёд
      const shin = capsule(0.06 * s, hipY - 0.14, botM);  // голень вертикально от колена до пола
      shin.position.set(0.1 * s * side, hipY / 2, 0.44 * s);
      body.add(shin);
    } else {
      const shin = capsule(0.06 * s, 0.36 * s, botM);
      shin.position.y = -0.66 * s;
      leg.add(shin);
    }
    body.add(leg);
  }

  // торс
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.15 * s, 0.6 * s, 16), topM);
  torso.position.y = hipY + 0.32 * s;
  torso.castShadow = true;
  body.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), topM);
  shoulders.position.y = hipY + 0.62 * s;
  shoulders.scale.y = 0.5;
  body.add(shoulders);
  if (coat) {
    const coatM = std([0.92, 0.93, 0.95], { roughness: 0.7 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * s, 0.23 * s, 1.0 * s, 16, 1, true, 0.35, Math.PI * 2 - 0.7), coatM);
    c.position.y = hipY + 0.14 * s;
    c.rotation.y = Math.PI;
    coatM.side = THREE.DoubleSide;
    body.add(c);
  }

  // руки
  const armM = coat ? std([0.92, 0.93, 0.95]) : topM;
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0.22 * s * side, hipY + 0.58 * s, 0);
    const upper = capsule(0.055 * s, 0.5 * s, armM);
    upper.position.y = -0.3 * s;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 10, 8), skinM);
    hand.position.y = -0.62 * s;
    arm.add(upper, hand);
    arm.rotation.z = 0.08 * side;
    if (seated) { arm.rotation.x = -0.6; }
    body.add(arm);
    arms.push(arm);
  }

  // голова
  const head = new THREE.Group();
  head.position.y = hipY + 0.82 * s;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.12 * s, 10), skinM);
  neck.position.y = -0.1 * s;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 24, 18), skinM);
  skull.scale.set(0.9, 1.05, 0.95);
  skull.position.y = 0.04 * s;
  skull.castShadow = true;
  const hairM = std(hair, { roughness: 0.95 });
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.138 * s, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hairCap.position.y = 0.05 * s;
  hairCap.rotation.x = -0.25;
  head.add(neck, skull, hairCap);
  if (hairLong) {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.12 * s, 0.22 * s, 4, 12), hairM);
    back.position.set(0, -0.08 * s, -0.06 * s);
    back.scale.z = 0.6;
    head.add(back);
  }
  const eyeM = std([0.03, 0.03, 0.03], { roughness: 0.3 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015 * s, 8, 6), eyeM);
    eye.position.set(0.045 * s * side, 0.06 * s, 0.115 * s);
    head.add(eye);
  }
  if (sunglasses || glasses) {
    const gm = sunglasses ? std([0.02, 0.02, 0.02], { roughness: 0.15, metalness: 0.3 }) : std([0.15, 0.15, 0.17], { metalness: 0.6 });
    for (const side of [-1, 1]) {
      const lens = sunglasses
        ? new THREE.Mesh(new THREE.BoxGeometry(0.075 * s, 0.045 * s, 0.01 * s), gm)
        : new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, 0.004 * s, 6, 16), gm);
      lens.position.set(0.048 * s * side, 0.062 * s, 0.13 * s);
      head.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.006 * s, 0.006 * s), gm);
    bridge.position.set(0, 0.07 * s, 0.13 * s);
    head.add(bridge);
  }
  if (cap) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.13 * s, 0.07 * s, 16), std([0.95, 0.95, 0.97]));
    c.position.y = 0.17 * s;
    head.add(c);
  }
  body.add(head);

  let t = Math.random() * 10;
  const look = new THREE.Vector3();
  return {
    root, head, arms,
    // idle-дыхание и поворот головы к игроку
    update(dt, target) {
      t += dt;
      torso.scale.set(1 + Math.sin(t * 1.6) * 0.012, 1, 1 + Math.sin(t * 1.6) * 0.012);
      let want = 0;
      if (target) {
        look.copy(target);
        root.worldToLocal(look);
        if (look.length() < 4.5 && look.z > -0.5) want = THREE.MathUtils.clamp(Math.atan2(look.x, look.z), -1, 1);
      }
      head.rotation.y += (want - head.rotation.y) * Math.min(1, dt * 3);
      head.rotation.z = Math.sin(t * 0.7) * 0.03;
    },
  };
}
