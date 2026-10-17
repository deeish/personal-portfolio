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
// After the powder settles, the cornice takes this long to rebuild before it can go again.
const COOLDOWN = 10;

const PUFF_VERTEX = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute float aRot;
  attribute float aGlow;
  uniform float uScale;
  varying float vLife;
  varying float vRot;
  varying float vGlow;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vLife = aLife;
    vRot = aRot;
    vGlow = aGlow;
    // Each puff keeps billowing outward as it ages.
    float grow = 1.0 + (1.0 - aLife) * 1.8;
    gl_PointSize = clamp(aSize * grow * uScale / max(-mvPosition.z, 0.5), 0.0, 900.0);
    #include <fog_vertex>
  }
`;

const PUFF_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uNight;
  varying float vLife;
  varying float vRot;
  varying float vGlow;
  #include <fog_pars_fragment>
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vRot);
    float k = cos(vRot);
    float shape = texture2D(uMap, vec2(k * c.x - s * c.y, s * c.x + k * c.y) + 0.5).a;
    float fadeIn = 1.0 - smoothstep(0.93, 1.0, vLife);
    float a = shape * fadeIn * pow(vLife, 0.7) * 0.8;
    if (a < 0.01) discard;
    // Lit from above: bright tops, cool grey undersides.
    vec3 col = mix(vec3(0.98, 0.99, 1.0), vec3(0.6, 0.66, 0.77), smoothstep(0.2, 0.95, gl_PointCoord.y));
    col *= 0.86 + 0.14 * vGlow;
    col = mix(col, col * vec3(0.2, 0.24, 0.34), uNight);
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

// A cauliflower-shaped puff of powder: overlapping soft blobs.
function puffTexture() {
  return canvasTexture(128, 128, (g) => {
    [[64, 72, 40], [42, 62, 26], [86, 60, 28], [62, 42, 25], [80, 84, 26], [44, 86, 22], [64, 96, 22]].forEach(([x, y, r]) => {
      const fill = g.createRadialGradient(x, y, 0, x, y, r);
      fill.addColorStop(0, 'rgba(255, 255, 255, 1)');
      fill.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
      fill.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = fill;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    });
  });
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
    this.textures = [];
    this.shake = 0;
    this.whiteout = 0;
    this.slide = null;
    this.cooldowns = new Map();
    this.budget = 1;
    this.corniceGrowth = 1;

    const snow = new THREE.MeshStandardMaterial({ color: '#f1f5fa', roughness: 0.9, flatShading: true });

    // Cornice: a curled lip of wind-packed snow on the ridge.
    const cx = pathX(CORNICE.z) + CORNICE.u;
    const cy = heightAt(cx, CORNICE.z);
    this.cornice = new THREE.Group();
    this.cornice.position.set(cx, cy - 1, CORNICE.z);
    this.cornice.rotation.y = 0.5;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), snow);
    dome.scale.set(16, 6, 7);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI), snow);
    lip.scale.set(2.2, 30, 2.2);
    lip.rotation.set(0, 0, Math.PI / 2);
    lip.position.set(0, 5.2, 5.5);
    this.cornice.add(dome, lip);
    this.cornice.userData.onClick = () => this.release(CORNICE, true);
    this.cornice.userData.enabled = () => this.summitReady;
    scene.add(this.cornice);

    // A pulsing warning beacon that stays the same size on screen, so it reads from the summit.
    // It only shows while the cornice is ready to go, so it always does something when clicked.
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
    this.beacon.userData.enabled = () => this.summitReady;
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
    this.sign.userData.enabled = () => this.signReady;
    scene.add(this.sign);

    this.buildPowder(scene, mobile ? 700 : 1700);
    this.buildDebris(scene, mobile ? 70 : 160);
    this.tmp = new THREE.Vector3();
    this.tmpAhead = new THREE.Vector3();
    this.tmpTrail = new THREE.Vector3();
  }

  // The powder cloud: soft, rotating puffs spawned along the moving front.
  buildPowder(scene, count) {
    this.puffMap = puffTexture();
    this.textures.push(this.puffMap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    ['aLife', 'aSize', 'aRot', 'aGlow'].forEach((name) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count), 1)));
    this.puffMaterial = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERTEX,
      fragmentShader: PUFF_FRAGMENT,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uMap: { value: this.puffMap },
        uScale: { value: 400 },
        uNight: { value: 0 },
      },
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
      spin: new Float32Array(count),
      age: new Float32Array(count).fill(1),
      maxLife: new Float32Array(count),
    };
  }

  // Chunks of the broken slab, tumbling down ahead of the cloud.
  buildDebris(scene, count) {
    const material = new THREE.MeshStandardMaterial({ color: '#eef3f9', roughness: 0.85, flatShading: true });
    this.debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, count);
    this.debris.frustumCulled = false;
    this.debris.visible = false;
    this.debris.count = count;
    scene.add(this.debris);
    this.chunks = Array.from({ length: count }, () => ({
      alive: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
      spin: new THREE.Vector3(),
      size: 1,
      age: 0,
      life: 1,
    }));
    this.chunkCursor = 0;
    this.dummy = new THREE.Object3D();
  }

  get clickables() {
    return [this.cornice, this.beacon, this.sign];
  }

  // Only one slide runs at a time, so the cornice is only ready while nothing is sliding.
  get summitReady() {
    return !this.slide && !(this.cooldowns.get(CORNICE) > 0);
  }

  get signReady() {
    return !this.slide && !(this.cooldowns.get(RUN_RELEASE) > 0);
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
    this.slide = { origin, path, lengths, total: lengths[lengths.length - 1], front: 0, speed: 40, age: 0, spawn: 0, chunks: 0 };
    this.puffs.visible = true;
    this.debris.visible = true;
    // The cornice breaks away with the slide.
    if (fromSummit) this.corniceGrowth = 0;
    this.emit('avalanche', { fromSummit });
  }

  pointAt(distance, out) {
    const { path, lengths } = this.slide;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < distance) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    return out.lerpVectors(path[i - 1], path[i], Math.min(1, (distance - lengths[i - 1]) / span));
  }

  spawnPuffs(n, at, direction, spread, head) {
    const pool = this.pool;
    const attrs = this.puffs.geometry.attributes;
    for (let k = 0; k < n; k++) {
      const i = pool.cursor;
      pool.cursor = (pool.cursor + 1) % pool.count;
      const side = (Math.random() - 0.5) * spread;
      const x = at.x - direction.z * side;
      const z = at.z + direction.x * side;
      attrs.position.array[i * 3] = x;
      attrs.position.array[i * 3 + 1] = heightAt(x, z) + Math.random() * (head ? 10 : 5);
      attrs.position.array[i * 3 + 2] = z;
      // The head of the slide boils up high; the trail behind it rolls lower.
      const forward = head ? 26 : 10;
      pool.velocity[i * 3] = direction.x * forward + (Math.random() - 0.5) * 10;
      pool.velocity[i * 3 + 1] = head ? 7 + Math.random() * 9 : 2 + Math.random() * 5;
      pool.velocity[i * 3 + 2] = direction.z * forward + (Math.random() - 0.5) * 10;
      pool.spin[i] = (Math.random() - 0.5) * 0.6;
      pool.age[i] = 0;
      pool.maxLife[i] = (head ? 6 : 7) + Math.random() * 3;
      attrs.aSize.array[i] = head ? 20 + Math.random() * 16 : 12 + Math.random() * 10;
      attrs.aRot.array[i] = Math.random() * Math.PI * 2;
      attrs.aGlow.array[i] = Math.random();
    }
  }

  spawnChunks(n, at, direction, spread, speed) {
    for (let k = 0; k < n; k++) {
      const chunk = this.chunks[this.chunkCursor];
      this.chunkCursor = (this.chunkCursor + 1) % this.chunks.length;
      const side = (Math.random() - 0.5) * spread;
      const x = at.x - direction.z * side;
      const z = at.z + direction.x * side;
      chunk.alive = true;
      chunk.size = 0.8 + Math.random() * 2.6;
      chunk.pos.set(x, heightAt(x, z) + chunk.size, z);
      chunk.vel.set(direction.x * speed * (0.75 + Math.random() * 0.4), 2 + Math.random() * 5, direction.z * speed * (0.75 + Math.random() * 0.4));
      chunk.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      chunk.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      chunk.age = 0;
      chunk.life = 2.5 + Math.random() * 1.5;
    }
  }

  update({ dt, time, z, prevZ, instantSpeed, camera, night, autopilot }) {
    this.cooldowns.forEach((left, origin) => this.cooldowns.set(origin, Math.max(0, left - dt)));

    // The cornice regrows once it's ready again; the beacon returns only when it can fire.
    const ready = this.summitReady;
    this.corniceGrowth += ((ready ? 1 : 0) - this.corniceGrowth) * (1 - Math.exp(-dt * (ready ? 1.5 : 30)));
    this.cornice.visible = this.corniceGrowth > 0.02;
    this.cornice.scale.setScalar(Math.max(0.02, this.corniceGrowth));
    const pulse = 0.036 + Math.sin(time * 3.8) * 0.006;
    this.beacon.scale.set(pulse, pulse, 1);
    this.beacon.visible = ready && this.corniceGrowth > 0.95;

    // Blowing past the sign at full speed sets off the slope ahead.
    if (!autopilot && prevZ < SIGN.z && z >= SIGN.z && instantSpeed > SIGN_TRIGGER_SPEED) this.release(RUN_RELEASE, false);

    this.updatePowder(dt, night);
    this.updateDebris(dt);

    this.whiteout = 0;
    this.shake = 0;
    const slide = this.slide;
    if (!slide) return;

    slide.age += dt;
    const moving = slide.front < slide.total;
    if (moving) {
      slide.speed = Math.min(200, slide.speed + dt * 75);
      slide.front = Math.min(slide.total, slide.front + slide.speed * dt);
      const front = this.pointAt(slide.front, this.tmp);
      const ahead = this.pointAt(Math.min(slide.total, slide.front + 8), this.tmpAhead).sub(front);
      ahead.y = 0;
      ahead.normalize();
      const spread = 30 + slide.front * 0.08;
      slide.spawn += dt * 260 * this.budget;
      const n = Math.floor(slide.spawn);
      slide.spawn -= n;
      const headCount = Math.ceil(n * 0.6);
      this.spawnPuffs(headCount, front, ahead, spread, true);
      if (slide.front > 30) {
        const trail = this.pointAt(Math.max(0, slide.front - 10 - Math.random() * 50), this.tmpTrail);
        this.spawnPuffs(n - headCount, trail, ahead, spread * 0.8, false);
      }
      slide.chunks += dt * 55 * this.budget;
      const c = Math.floor(slide.chunks);
      slide.chunks -= c;
      this.spawnChunks(c, front, ahead, spread * 0.7, slide.speed);
    }

    // Shake with the rumble; white out if the powder cloud rolls over you.
    const front = this.pointAt(slide.front, this.tmp);
    const toFront = front.distanceTo(camera.position);
    if (!moving && slide.endedAt === undefined) slide.endedAt = slide.age;
    const envelope = moving ? 1 : Math.max(0, 1 - (slide.age - slide.endedAt) / 7);
    this.shake = 0.4 * (1 - Math.min(1, Math.max(0, (toFront - 40) / 650))) * envelope;
    let nearest = Infinity;
    for (let d = 0; d <= slide.front; d += 10) {
      nearest = Math.min(nearest, this.pointAt(d, this.tmp).distanceTo(camera.position));
    }
    this.whiteout = (1 - Math.min(1, Math.max(0, (nearest - 18) / 50))) * envelope;

    if (!moving && envelope <= 0) {
      this.cooldowns.set(slide.origin, COOLDOWN);
      this.slide = null;
    }
  }

  updatePowder(dt, night) {
    const pool = this.pool;
    const attrs = this.puffs.geometry.attributes;
    const pos = attrs.position.array;
    let alive = 0;
    for (let i = 0; i < pool.count; i++) {
      if (pool.age[i] >= 1) {
        attrs.aLife.array[i] = 0;
        continue;
      }
      alive++;
      pool.age[i] += dt / pool.maxLife[i];
      pool.velocity[i * 3] = pool.velocity[i * 3] * (1 - dt * 0.55) + dt * 1.5;
      pool.velocity[i * 3 + 1] = pool.velocity[i * 3 + 1] * (1 - dt * 0.35) + dt * 0.6;
      pool.velocity[i * 3 + 2] *= 1 - dt * 0.55;
      pos[i * 3] += pool.velocity[i * 3] * dt;
      pos[i * 3 + 1] += pool.velocity[i * 3 + 1] * dt;
      pos[i * 3 + 2] += pool.velocity[i * 3 + 2] * dt;
      attrs.aRot.array[i] += pool.spin[i] * dt;
      attrs.aLife.array[i] = 1 - pool.age[i];
    }
    ['position', 'aLife', 'aSize', 'aRot', 'aGlow'].forEach((name) => { attrs[name].needsUpdate = true; });
    this.puffMaterial.uniforms.uNight.value = night;
    if (!alive && !this.slide) this.puffs.visible = false;
  }

  updateDebris(dt) {
    if (!this.debris.visible) return;
    const dummy = this.dummy;
    let alive = 0;
    this.chunks.forEach((chunk, i) => {
      if (chunk.alive) {
        chunk.age += dt;
        chunk.vel.y -= 25 * dt;
        chunk.pos.addScaledVector(chunk.vel, dt);
        const floor = heightAt(chunk.pos.x, chunk.pos.z) + chunk.size * 0.6;
        if (chunk.pos.y < floor) {
          chunk.pos.y = floor;
          chunk.vel.y = Math.abs(chunk.vel.y) * 0.25;
          chunk.vel.x *= 0.95;
          chunk.vel.z *= 0.95;
        }
        chunk.rot.x += chunk.spin.x * dt;
        chunk.rot.y += chunk.spin.y * dt;
        chunk.rot.z += chunk.spin.z * dt;
        if (chunk.age >= chunk.life) chunk.alive = false;
      }
      const shrink = chunk.alive ? 1 - Math.pow(chunk.age / chunk.life, 4) : 0;
      if (chunk.alive) alive++;
      dummy.position.copy(chunk.pos);
      dummy.rotation.copy(chunk.rot);
      dummy.scale.setScalar(chunk.size * shrink);
      dummy.updateMatrix();
      this.debris.setMatrixAt(i, dummy.matrix);
    });
    this.debris.instanceMatrix.needsUpdate = true;
    if (!alive && !this.slide) this.debris.visible = false;
  }

  dispose() {
    this.textures.forEach((texture) => texture.dispose());
  }
}
