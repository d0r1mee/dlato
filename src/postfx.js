// Пост-обработка: сцена рендерится в HDR-цель, затем «глаз» героя:
// симуляция колбочек -> (для ахроматопсии: размытие, ослепление) -> тонмаппинг -> виньетка, зерно, моргание.
import * as THREE from 'three';
import { PRESETS, matFromRows } from './vision.js';

const vert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */`
precision highp float;
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime, uSev, uAchro, uBlink, uExposure, uVignette, uGrain, uPulse;
uniform mat3 uM1, uM2;
uniform vec3 uN;
varying vec2 vUv;

vec3 cvd(vec3 c) {
  vec3 s = dot(c, uN) >= 0.0 ? uM1 * c : uM2 * c;
  return mix(c, s, uSev);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  // лёгкое «плывущее» искажение при смене восприятия
  uv += vec2(sin(uv.y * 30.0 + uTime * 6.0), cos(uv.x * 26.0 + uTime * 5.0)) * 0.004 * uPulse;
  vec3 col = texture2D(tScene, uv).rgb;

  if (uAchro > 0.001) {
    vec2 px = 1.0 / uRes;
    vec3 acc = vec3(0.0), glow = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float a = fi * 2.39996;
      vec2 o = vec2(cos(a), sin(a)) * sqrt((fi + 0.5) / 16.0);
      acc += texture2D(tScene, uv + o * px * 5.0 * uAchro).rgb;
      glow += max(texture2D(tScene, uv + o * px * 60.0 * uAchro).rgb - 0.55, 0.0);
    }
    acc /= 16.0; glow /= 16.0;
    col = mix(col, acc, 0.9 * uAchro) + glow * 2.2 * uAchro;   // низкая острота + ослепление
    col *= 1.0 + 0.6 * uAchro;                                 // светобоязнь: всё слишком ярко
  }

  col = max(cvd(max(col, 0.0)), 0.0);
  col = aces(col * uExposure);

  vec2 q = vUv - 0.5;
  q.x *= uRes.x / uRes.y;
  col *= 1.0 - uVignette * smoothstep(0.35, 1.0, length(q));

  col = toSRGB(col);
  col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;

  float open = (1.0 - uBlink) * 1.25;
  float edge = abs(vUv.y - 0.5) * 2.0;
  col *= 1.0 - smoothstep(open - 0.18, open, edge);
  gl_FragColor = vec4(col, 1.0);
}`;

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType, samples: 4, colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.uniforms = {
      tScene: { value: this.target.texture },
      uRes: { value: size.clone() },
      uTime: { value: 0 }, uSev: { value: 1 }, uAchro: { value: 0 }, uBlink: { value: 0 },
      uExposure: { value: 1.0 }, uVignette: { value: 0.45 }, uGrain: { value: 0.025 }, uPulse: { value: 0 },
      uM1: { value: new THREE.Matrix3() }, uM2: { value: new THREE.Matrix3() }, uN: { value: new THREE.Vector3() },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setSize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target.setSize(size.x, size.y);
    this.uniforms.uRes.value.copy(size);
  }

  render(scene, camera, time) {
    this.uniforms.uTime.value = time;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}

// Управление текущим восприятием с плавными переходами.
// Переход A -> B: сила A убывает до 0 (норма), затем растёт сила B. Опционально — моргание.
export class Vision {
  constructor(post) {
    this.post = post;
    this.current = 'normal';
    this.amount = 1;          // 0..1 — доля от силы пресета
    this.anim = null;
    this.apply('normal');
  }

  apply(id) {
    const p = PRESETS[id];
    const u = this.post.uniforms;
    u.uM1.value.copy(matFromRows(p.model.m1));
    u.uM2.value.copy(matFromRows(p.model.m2));
    u.uN.value.set(...p.model.n);
    this.current = id;
  }

  // mode: 'instant' | 'morph' | 'blink'
  set(id, { mode = 'morph', duration = 2.0 } = {}) {
    if (mode === 'instant') { this.apply(id); this.amount = 1; this.anim = null; return Promise.resolve(); }
    return new Promise((resolve) => { this.anim = { id, mode, t: 0, duration, swapped: false, resolve }; });
  }

  update(dt) {
    const u = this.post.uniforms;
    const a = this.anim;
    if (a) {
      a.t += dt / a.duration;
      const half = Math.min(a.t, 1) < 0.5;
      if (!half && !a.swapped) { this.apply(a.id); a.swapped = true; }
      const k = Math.min(a.t, 1);
      this.amount = half ? 1 - k * 2 : (k - 0.5) * 2;
      const bell = Math.sin(Math.PI * k);
      u.uPulse.value = bell;
      u.uBlink.value = a.mode === 'blink' ? Math.pow(bell, 0.6) : 0;
      if (a.t >= 1) { this.amount = 1; u.uPulse.value = 0; u.uBlink.value = 0; this.anim = null; a.resolve(); }
    }
    const p = PRESETS[this.current];
    u.uSev.value = p.severity * this.amount;
    u.uAchro.value = p.achro ? this.amount : 0;
  }
}
