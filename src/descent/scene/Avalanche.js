import * as THREE from 'three';
import { CLOUD_Y, heightAt, pathSlope, pathX } from './world';

// A cornice on the ridge you can see from the summit: click it (or its warning
// beacon) and the slope lets go. Further down, blowing past the warning sign at
// full speed releases the valley wall just ahead of you.
const CORNICE = { u: -170, z: 525 };
const SIGN = { u: 9, z: 1120 };
// Off the right-hand wall, so it crosses the run on the side the project cards leave clear.
const RUN_RELEASE = { u: -205, z: 1390 };
const SIGN_TRIGGER_SPEED = 520;
const COOLDOWN = 20;

const PUFF_VERTEX = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  uniform float uScale;
  varying float vLife;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vLife = aLife;
    gl_PointSize = clamp(aSize * (2.2 - aLife * 1.2) * uScale / max(-mvPosition.z, 0.5), 0.0, 480.0);
    #include <fog_vertex>
  }
`;

const PUFF_FRAGMENT = /* glsl */ `
  uniform float uNight;
  varying float vLife;
  #include <fog_pars_fragment>
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(1.0 - smoothstep(0.05, 0.5, d), 1.6) * min(vLife * 2.5, 1.0) * vLife * 0.7;
    if (a < 0.01) discard;
    vec3 col = mix(vec3(0.86, 0.89, 0.93), vec3(0.16, 0.19, 0.26), uNight);
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }
`;

// Follow the fall line from a release point, carrying some momentum.
function fallLine(x, z, steps, momentum, floor) {
  const points = [];
  let dx = 0;
  let dz = 0;
  for (let i = 0; i < steps; i++) {
    const h = heightAt(x, z);
    points.push(new THREE.Vector3(x, h, z));
    if (h < floor) break;
    const gx = (heightAt(x + 3, z) - heightAt(x - 3, z)) / 6;
    const gz = (heightAt(x, z + 3) - heightAt(x, z - 3)) / 6;
    const g = Math.hypot(gx, gz) || 1;
    dx = dx * momentum - (gx / g) * (1 - momentum);
    dz = dz * momentum - (gz / g) * (1 - momentum);
    const d = Math.hypot(dx, dz) || 1;
    x += (dx / d) * 8;
    z += (dz / d) * 8;
  }
  return points;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function stripes(g, y, width, height) {
  g.save();
  g.beginPath();
  g.rect(0, y, width, height);
  g.clip();
  for (let k = 0, x = -height; x < width + height; k++, x += 36) {
    g.fillStyle = k % 2 === 0 ? '#111317' : '#ff6a2b';
    g.beginPath();
    g.moveTo(x, y + height);
    g.lineTo(x + 18, y);
    g.lineTo(x + 36, y);
    g.lineTo(x + 18, y + height);
    g.fill();
  }
  g.restore();
}

export default class Avalanche {
  constructor({ scene, emit, mobile }) {
    this.emit = emit;
    this.mobile = mobile;
    this.textures = [];
    this.shake = 0;
    this.whiteout = 0;
    this.slide = null;
    this.cooldowns = new Map();
    this.budget = 1;

    const snow = new THREE.MeshStandardMaterial({ color: '#f1f5fa', roughness: 0.9, flatShading: true });

    // Cornice: a curled lip of wind-packed snow on the ridge.
    const cx = pathX(CORNICE.z) + CORNICE.u;
    const cy = heightAt(cx, CORNICE.z);
    this.cornice = new THREE.Group();
    this.cornice.position.set(cx, cy - 1, CORNICE.z);
    this.cornice.rotation.y = 0.5;
    this.cornice.add(
      new THREE.Mesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), snow),
      new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI), snow),
    );
    this.cornice.children[0].scale.set(16, 6, 7);
    this.cornice.children[1].scale.set(2.2, 30, 2.2);
    this.cornice.children[1].rotation.set(0, 0, Math.PI / 2);
    this.cornice.children[1].position.set(0, 5.2, 5.5);
    this.cornice.userData.onClick = () => this.release(CORNICE, true);
    scene.add(this.cornice);

    // A pulsing warning beacon that stays the same size on screen, so it reads from the summit.
    const beaconTexture = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#ff6a2b';
      g.beginPath();
      g.moveTo(64, 10);
      g.lineTo(122, 116);
      g.lineTo(6, 116);
      g.closePath();
      g.fill();
      g.fillStyle = '#120804';
      g.font = '900 72px Archivo, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('!', 64, 104);
    });
    this.textures.push(beaconTexture);
    this.beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTexture, sizeAttenuation: false, toneMapped: false }));
    this.beacon.position.set(cx, cy + 16, CORNICE.z);
    this.beacon.userData.onClick = () => this.release(CORNICE, true);
    scene.add(this.beacon);

    // Warning sign beside the run.
    const sx = pathX(SIGN.z) + SIGN.u;
    const signTexture = canvasTexture(512, 360, (g, w, h) => {
      g.fillStyle = '#f2b705';
      g.fillRect(0, 0, w, h);
      stripes(g, 0, w, 44);
      stripes(g, h - 44, w, 44);
      g.fillStyle = '#111317';
      g.textAlign = 'center';
      g.font = '800 46px Archivo, system-ui, sans-serif';
      g.fillText('AVALANCHE RISK', w / 2, 118);
      g.font = '900 120px Archivo, system-ui, sans-serif';
      g.fillText('HIGH', w / 2, 236);
      g.font = '700 30px "JetBrains Mono", ui-monospace, monospace';
      g.fillText('SLOW DOWN', w / 2, 290);
    });
    this.textures.push(signTexture);
    const plain = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.8 });
    const face = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.6 });
    this.sign = new THREE.Group();
    this.sign.position.set(sx, heightAt(sx, SIGN.z) - 0.2, SIGN.z);
    this.sign.rotation.y = Math.atan(pathSlope(SIGN.z));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.4, 6), plain);
    post.position.y = 2.2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.25, 0.08), [plain, plain, plain, plain, plain, face]);
    panel.position.y = 3.6;
    this.sign.add(post, panel);
    this.sign.userData.onClick = () => this.release(RUN_RELEASE, false);
    scene.add(this.sign);

    // The powder cloud: soft puffs spawned along the moving front.
    const count = mobile ? 500 : 1400;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(count), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    this.puffMaterial = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERTEX,
      fragmentShader: PUFF_FRAGMENT,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uScale: { value: 400 }, uNight: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.puffs = new THREE.Points(geo, this.puffMaterial);
    this.puffs.frustumCulled = false;
    this.puffs.renderOrder = 3;
    this.puffs.visible = false;
    scene.add(this.puffs);
    this.pool = {
      count,
      cursor: 0,
      velocity: new Float32Array(count * 3),
      age: new Float32Array(count).fill(1),
      maxLife: new Float32Array(count),
    };
    this.tmp = new THREE.Vector3();
    this.tmpAhead = new THREE.Vector3();
  }

  get clickables() {
    return [this.cornice, this.beacon, this.sign];
  }

  setScale(drawingBufferHeight, fov) {
    this.puffMaterial.uniforms.uScale.value = drawingBufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  }

  setBudget(scale) {
    this.budget = scale;
  }

  release(origin, fromSummit) {
    if (this.slide || this.cooldowns.get(origin) > 0) return;
    const x = pathX(origin.z) + origin.u;
    const path = fromSummit
      ? fallLine(x, origin.z, 90, 0.85, CLOUD_Y - 40)
      : fallLine(x, origin.z, 60, 0.8, -Infinity);
    const lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + path[i].distanceTo(path[i - 1]));
    this.slide = { origin, path, lengths, total: lengths[lengths.length - 1], front: 0, speed: 40, age: 0, spawn: 0 };
    this.puffs.visible = true;
    if (fromSummit) this.cornice.visible = false;
    this.emit('avalanche', { fromSummit });
  }

  pointAt(distance, out) {
    const { path, lengths } = this.slide;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    return out.lerpVectors(path[i - 1], path[i], Math.min(1, (distance - lengths[i - 1]) / span));
  }

  spawn(n, at, direction, spread) {
    const pool = this.pool;
    const geo = this.puffs.geometry;
    const pos = geo.attributes.position.array;
    const size = geo.attributes.aSize.array;
    for (let k = 0; k < n; k++) {
      const i = pool.cursor;
      pool.cursor = (pool.cursor + 1) % pool.count;
      const side = (Math.random() - 0.5) * spread;
      const x = at.x - direction.z * side;
      const z = at.z + direction.x * side;
      pos[i * 3] = x;
      pos[i * 3 + 1] = heightAt(x, z) + Math.random() * 10;
      pos[i * 3 + 2] = z;
      // The powder cloud billows up and out ahead of the sliding snow.
      pool.velocity[i * 3] = direction.x * 22 + (Math.random() - 0.5) * 10;
      pool.velocity[i * 3 + 1] = 4 + Math.random() * 9;
      pool.velocity[i * 3 + 2] = direction.z * 22 + (Math.random() - 0.5) * 10;
      pool.age[i] = 0;
      pool.maxLife[i] = 5 + Math.random() * 4;
      size[i] = 14 + Math.random() * 18;
    }
  }

  update({ dt, time, z, prevZ, speed, camera, night, autopilot }) {
    this.cooldowns.forEach((left, origin) => this.cooldowns.set(origin, Math.max(0, left - dt)));
    const pulse = 0.036 + Math.sin(time * 3.8) * 0.006;
    this.beacon.scale.set(pulse, pulse, 1);
    this.beacon.visible = this.cornice.visible && !this.slide;

    // Blowing past the sign at full speed sets off the slope ahead.
    if (!autopilot && prevZ < SIGN.z && z >= SIGN.z && speed > SIGN_TRIGGER_SPEED) this.release(RUN_RELEASE, false);

    const pool = this.pool;
    const geo = this.puffs.geometry;
    const pos = geo.attributes.position.array;
    const life = geo.attributes.aLife.array;
    let alive = 0;
    for (let i = 0; i < pool.count; i++) {
      if (pool.age[i] >= 1) {
        life[i] = 0;
        continue;
      }
      alive++;
      pool.age[i] += dt / pool.maxLife[i];
      pool.velocity[i * 3] *= 1 - dt * 0.6;
      pool.velocity[i * 3 + 1] *= 1 - dt * 0.4;
      pool.velocity[i * 3 + 2] *= 1 - dt * 0.6;
      pos[i * 3] += pool.velocity[i * 3] * dt;
      pos[i * 3 + 1] += pool.velocity[i * 3 + 1] * dt;
      pos[i * 3 + 2] += pool.velocity[i * 3 + 2] * dt;
      life[i] = 1 - pool.age[i];
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aLife.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    this.puffMaterial.uniforms.uNight.value = night;

    this.whiteout = 0;
    this.shake = 0;
    const slide = this.slide;
    if (!slide) {
      if (!alive) this.puffs.visible = false;
      return;
    }

    slide.age += dt;
    const moving = slide.front < slide.total;
    if (moving) {
      slide.speed = Math.min(190, slide.speed + dt * 70);
      slide.front = Math.min(slide.total, slide.front + slide.speed * dt);
      const front = this.pointAt(slide.front, this.tmp);
      const ahead = this.pointAt(Math.min(slide.total, slide.front + 8), this.tmpAhead).sub(front);
      ahead.y = 0;
      ahead.normalize();
      slide.spawn += dt * 220 * this.budget;
      const n = Math.floor(slide.spawn);
      slide.spawn -= n;
      this.spawn(n, front, ahead, 26 + slide.front * 0.1);
    }

    // Shake with the rumble; white out if the powder cloud rolls over you.
    const front = this.pointAt(slide.front, this.tmp);
    const toFront = front.distanceTo(camera.position);
    if (!moving && slide.endedAt === undefined) slide.endedAt = slide.age;
    const envelope = moving ? 1 : Math.max(0, 1 - (slide.age - slide.endedAt) / 6);
    this.shake = 0.4 * (1 - Math.min(1, Math.max(0, (toFront - 40) / 650))) * envelope;
    let nearest = Infinity;
    for (let d = 0; d <= slide.front; d += 10) {
      nearest = Math.min(nearest, this.pointAt(d, this.tmp).distanceTo(camera.position));
    }
    this.whiteout = (1 - Math.min(1, Math.max(0, (nearest - 14) / 45))) * envelope;

    if (!moving && envelope <= 0) {
      this.cooldowns.set(slide.origin, COOLDOWN);
      this.slide = null;
      this.cornice.visible = true;
    }
  }

  dispose() {
    this.textures.forEach((texture) => texture.dispose());
  }
}
