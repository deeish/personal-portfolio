import * as THREE from 'three';
import { CAMERA_END, heightAt, pathX } from './world';

// Where things happen, as distances down the run. `from` is the side an animal
// starts on (+1 = screen left); each is chosen opposite whichever card is on
// screen at that point.
const GROUND_RUNS = [
  { at: 1380, from: -1, animal: 'hare' },
  { at: 2460, from: 1, animal: 'fox' },
];
const BIRD_FLUSHES = [{ at: 1720, side: 1 }, { at: 2280, side: -1 }, { at: 2860, side: -1 }];
const GOAT = { u: -46, z: 930 };
const REARM = 160;

// Click the goat a few times in a row and it sits down for you.
// Once won over, it stays sitting for the rest of the visit.
const GOAT_CLICKS_TO_SIT = 3;
const GOAT_CLICK_WINDOW = 4;

// The yeti comes after you if you ski flat out for a while, or head back up the hill.
const YETI_FAST_SPEED = 600;
const YETI_FAST_SECONDS = 1.4;
const YETI_BACK_SPEED = 160;
const YETI_BACK_SECONDS = 0.5;
// A long way back up the hill summons it at any speed (about one and a half sections).
const YETI_CLIMB = 450;
// After a catch it leaves you alone for a little while.
const YETI_REST_SECONDS = 20;
const YETI_CHASE_SECONDS = 3.2;

const RUNNERS = {
  hare: { speed: 26, stride: 2.4, hop: 0.8 },
  fox: { speed: 22, stride: 1.9, hop: 0.35 },
};

const PUFF_VERTEX = /* glsl */ `
  attribute float aLife;
  uniform float uScale;
  varying float vLife;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vLife = aLife;
    gl_PointSize = (0.8 + (1.0 - aLife) * 1.3) * uScale / max(-mv.z, 0.5);
  }
`;

const PUFF_FRAGMENT = /* glsl */ `
  uniform float uNight;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.1, 0.5, d)) * vLife * 0.8;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * mix(1.0, 0.35, uNight), a);
  }
`;

const fur = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });

function part(geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  return mesh;
}

function limb(geometry, material, position) {
  const pivot = new THREE.Group();
  pivot.position.set(...position);
  pivot.add(new THREE.Mesh(geometry, material));
  return pivot;
}

const crossed = (from, to, at) => from < at && to >= at;
const easeIn = (t) => t * t;
const easeInOut = (t) => t * t * (3 - 2 * t);

// Models are built from a handful of low-poly shapes to match the trees. All face +z.
function buildHare(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const ear = new THREE.ConeGeometry(0.07, 0.5, 5);
  const foot = new THREE.BoxGeometry(0.12, 0.1, 0.42);
  foot.translate(0, 0, -0.12);
  // A brown hare with dark-tipped ears and a white scut, so it shows up against the snow.
  const body = new THREE.Group();
  body.add(
    part(ball, m.hare, [0, 0.45, 0], [0.38, 0.34, 0.6]),
    part(ball, m.hare, [0, 0.72, 0.5], [0.2, 0.19, 0.24]),
    part(ear, m.hare, [0.08, 1.05, 0.42], [1, 1, 1], [-0.35, 0, -0.15]),
    part(ear, m.hare, [-0.08, 1.05, 0.42], [1, 1, 1], [-0.35, 0, 0.15]),
    part(ball, m.dark, [0.1, 1.27, 0.34], [0.05, 0.08, 0.05]),
    part(ball, m.dark, [-0.1, 1.27, 0.34], [0.05, 0.08, 0.05]),
    part(ball, m.dark, [0.11, 0.77, 0.66], [0.03, 0.03, 0.03]),
    part(ball, m.dark, [-0.11, 0.77, 0.66], [0.03, 0.03, 0.03]),
    part(ball, m.white, [0, 0.5, -0.6], [0.12, 0.12, 0.12]),
  );
  const legs = [0.18, -0.18].map((x) => limb(foot, m.hareDark, [x, 0.1, -0.1]));
  body.add(...legs);
  g.add(body);
  g.userData = { body, legs };
  g.scale.setScalar(2);
  return g;
}

function buildFox(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const legGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.5, 5);
  legGeo.translate(0, -0.25, 0);
  const snout = new THREE.ConeGeometry(0.1, 0.32, 5);
  snout.rotateX(Math.PI / 2);
  const ear = new THREE.ConeGeometry(0.08, 0.22, 4);
  const body = new THREE.Group();
  body.add(
    part(ball, m.fox, [0, 0.64, 0], [0.3, 0.28, 0.72]),
    part(ball, m.white, [0, 0.58, 0.42], [0.19, 0.21, 0.2]),
    part(ball, m.fox, [0, 0.92, 0.72], [0.22, 0.2, 0.24]),
    part(snout, m.fox, [0, 0.86, 1.0]),
    part(ball, m.dark, [0, 0.87, 1.16], [0.035, 0.035, 0.035]),
    part(ear, m.fox, [0.1, 1.15, 0.66]),
    part(ear, m.fox, [-0.1, 1.15, 0.66]),
    part(ball, m.fox, [0, 0.72, -0.86], [0.14, 0.14, 0.46], [0.35, 0, 0]),
    part(ball, m.white, [0, 0.58, -1.24], [0.1, 0.1, 0.14], [0.35, 0, 0]),
  );
  const legs = [[0.15, 0.4], [-0.15, 0.4], [0.15, -0.4], [-0.15, -0.4]].map(([x, z]) => limb(legGeo, m.paw, [x, 0.5, z]));
  body.add(...legs);
  g.add(body);
  g.userData = { body, legs };
  g.scale.setScalar(1.9);
  return g;
}

function buildBird(m) {
  const bird = new THREE.Group();
  bird.add(part(new THREE.OctahedronGeometry(0.3, 0), m.raven, [0, 0, 0], [0.5, 0.45, 1.3]));
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 1.1, 0, -0.05], 3));
  wingGeo.computeVertexNormals();
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.scale.x = side;
    pivot.add(new THREE.Mesh(wingGeo, m.wing));
    bird.add(pivot);
    return pivot;
  });
  bird.userData.wings = wings;
  bird.scale.setScalar(1.4);
  return bird;
}

// The goat stands in a "pose" group so it can sit: the rear drops, the front stays planted.
function buildGoat(m) {
  const g = new THREE.Group();
  const pose = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.85, 5);
  legGeo.translate(0, -0.425, 0);
  pose.add(part(ball, m.white, [0, 1.05, 0], [0.45, 0.42, 0.85]));
  const frontLegs = [0.24, -0.24].map((x) => limb(legGeo, m.white, [x, 0.87, 0.5]));
  const hindLegs = [0.24, -0.24].map((x) => limb(legGeo, m.white, [x, 0.87, -0.5]));
  pose.add(...frontLegs, ...hindLegs);
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.7);
  const horn = new THREE.TorusGeometry(0.22, 0.05, 5, 10, Math.PI);
  head.add(
    part(new THREE.BoxGeometry(0.28, 0.3, 0.5), m.white, [0, 0, 0.15]),
    part(horn, m.horn, [0.09, 0.2, -0.02], [1, 1, 1], [0, Math.PI / 2, 0.3]),
    part(horn, m.horn, [-0.09, 0.2, -0.02], [1, 1, 1], [0, Math.PI / 2, -0.3]),
    part(new THREE.ConeGeometry(0.06, 0.25, 4), m.white, [0, -0.25, 0.32], [1, 1, 1], [Math.PI, 0, 0]),
    part(ball, m.dark, [0.13, 0.06, 0.28], [0.03, 0.03, 0.03]),
    part(ball, m.dark, [-0.13, 0.06, 0.28], [0.03, 0.03, 0.03]),
  );
  pose.add(head);
  g.add(pose);
  g.userData = { pose, head, hindLegs };
  g.scale.setScalar(1.6);
  return g;
}

function buildYeti(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const arm = new THREE.CylinderGeometry(0.3, 0.26, 1.9, 7);
  arm.translate(0, -0.95, 0);
  const legGeo = new THREE.CylinderGeometry(0.36, 0.3, 1.3, 7);
  legGeo.translate(0, -0.65, 0);
  // The face sits proud of the head (radius 0.7, centred 0.1 forward) so it reads from the front.
  const brow = new THREE.BoxGeometry(0.26, 0.07, 0.08);
  g.add(
    part(ball, m.yeti, [0, 2.4, 0], [1.25, 1.55, 0.95]),
    part(ball, m.yeti, [0, 4.15, 0.1], [0.7, 0.7, 0.7]),
    part(ball, m.face, [0, 4.08, 0.7], [0.5, 0.44, 0.16]),
    part(ball, m.dark, [0.18, 4.25, 0.84], [0.09, 0.09, 0.06]),
    part(ball, m.dark, [-0.18, 4.25, 0.84], [0.09, 0.09, 0.06]),
    part(brow, m.dark, [0.19, 4.38, 0.84], [1, 1, 1], [0, 0, 0.35]),
    part(brow, m.dark, [-0.19, 4.38, 0.84], [1, 1, 1], [0, 0, -0.35]),
    part(new THREE.BoxGeometry(0.42, 0.24, 0.1), m.mouth, [0, 3.93, 0.84]),
  );
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.15, 3.35, 0);
    shoulder.add(part(arm, m.yeti), part(ball, m.yeti, [0, -1.95, 0], [0.32, 0.32, 0.32]));
    g.add(shoulder);
    return shoulder;
  });
  const legs = [-1, 1].map((side) => limb(legGeo, m.yeti, [side * 0.5, 1.3, 0]));
  g.add(...legs);
  g.userData = { arms, legs };
  g.scale.setScalar(1.5);
  return g;
}

function heartTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ff4d6d';
  g.beginPath();
  g.moveTo(64, 112);
  g.bezierCurveTo(10, 75, 4, 30, 36, 20);
  g.bezierCurveTo(52, 14, 62, 26, 64, 36);
  g.bezierCurveTo(66, 26, 76, 14, 92, 20);
  g.bezierCurveTo(124, 30, 118, 75, 64, 112);
  g.fill();
  g.fillStyle = 'rgba(255, 255, 255, 0.55)';
  g.beginPath();
  g.ellipse(42, 40, 10, 7, -0.6, 0, Math.PI * 2);
  g.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Things that live on the mountain: a hare and a fox that bolt out of the trees and
// across the run, ravens flushed from the treetops, a goat keeping watch (who sits
// and sends you a heart if you give it some attention), and the SkiFree yeti.
export default class Wildlife {
  constructor({ scene, emit, mobile, treeSpots = [] }) {
    this.emit = emit;
    this.treeSpots = treeSpots;
    const m = {
      white: fur('#eceef1'),
      hare: fur('#9c7c5c'),
      hareDark: fur('#6e563f'),
      dark: fur('#141619'),
      fox: fur('#d2642a'),
      paw: fur('#2a1a12'),
      raven: fur('#16181d'),
      wing: new THREE.MeshStandardMaterial({ color: '#1b1e24', roughness: 0.9, side: THREE.DoubleSide, flatShading: true }),
      horn: fur('#3b352e'),
      rock: fur('#596273'),
      yeti: fur('#f4f6f8'),
      face: fur('#5b6f86'),
      mouth: fur('#7a1d1d'),
    };

    this.runners = { hare: buildHare(m), fox: buildFox(m) };
    Object.values(this.runners).forEach((mesh) => { mesh.visible = false; });
    this.runs = GROUND_RUNS.map(() => true);
    this.run = null;

    const flockSize = mobile ? 6 : 10;
    this.flock = Array.from({ length: flockSize }, () => buildBird(m));
    this.flock.forEach((bird) => { bird.visible = false; });
    this.flushes = BIRD_FLUSHES.map(() => true);
    this.flight = null;

    // The goat stands on a rock beside the run and turns its head to watch you pass.
    const goatX = pathX(GOAT.z) + GOAT.u;
    const ground = heightAt(goatX, GOAT.z);
    const rock = part(new THREE.DodecahedronGeometry(4, 0), m.rock, [goatX, ground + 0.6, GOAT.z], [1.5, 0.8, 1.2], [0.2, 0.5, 0]);
    this.goat = {
      mesh: buildGoat(m), rock, hop: null, baseY: ground + 3.7, clicks: 0, sinceClick: 0, sit: 0, loved: false,
    };
    this.goat.mesh.position.set(goatX, this.goat.baseY, GOAT.z);
    this.goat.mesh.rotation.y = Math.PI;
    this.goat.mesh.userData.onClick = () => this.poke();
    // The goat is only a few pixels wide from the run, so it gets a roomier invisible hit area.
    const hitArea = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 3), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    hitArea.position.y = 1.2;
    this.goat.mesh.add(hitArea);

    this.heartMap = heartTexture();
    this.hearts = Array.from({ length: 6 }, () => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heartMap, transparent: true, depthWrite: false, toneMapped: false }));
      sprite.visible = false;
      sprite.renderOrder = 4;
      scene.add(sprite);
      return { sprite, age: Infinity, sway: 0 };
    });

    this.yeti = { mesh: buildYeti(m), chase: null, rest: 0, fast: 0, back: 0, climb: 0 };
    this.yeti.mesh.visible = false;
    this.yeti.mesh.userData.onClick = () => this.emit('yeti');

    this.puffs = this.buildPuffs(scene, 90);
    this.shake = 0;
    this.tmp = new THREE.Vector3();
    scene.add(this.runners.hare, this.runners.fox, rock, this.goat.mesh, this.yeti.mesh, ...this.flock);
  }

  get clickables() {
    return [this.goat.mesh, this.yeti.mesh];
  }

  setScale(drawingBufferHeight, fov) {
    this.puffs.points.material.uniforms.uScale.value = drawingBufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  }

  // Little kicks of snow where paws land.
  buildPuffs(scene, count) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(count), 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: PUFF_VERTEX,
      fragmentShader: PUFF_FRAGMENT,
      uniforms: { uScale: { value: 400 }, uNight: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    points.renderOrder = 5;
    scene.add(points);
    return { points, count, cursor: 0, age: new Float32Array(count).fill(1), rise: new Float32Array(count) };
  }

  kickSnow(x, y, z, n) {
    const p = this.puffs;
    const pos = p.points.geometry.attributes.position.array;
    for (let k = 0; k < n; k++) {
      const i = p.cursor;
      p.cursor = (p.cursor + 1) % p.count;
      pos[i * 3] = x + (Math.random() - 0.5) * 0.9;
      pos[i * 3 + 1] = y + Math.random() * 0.2;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.9;
      p.age[i] = 0;
      p.rise[i] = 0.6 + Math.random() * 0.9;
    }
  }

  // A tree from the front rows on one side of the run, near a stretch of it.
  pickTree(side, zMin, zMax) {
    const candidates = this.treeSpots
      .filter((t) => Math.sign(t.u) === side && t.z >= zMin && t.z <= zMax && Math.abs(t.u) < 60)
      .sort((a, b) => Math.abs(a.u) - Math.abs(b.u))
      .slice(0, 4);
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    const z = (zMin + zMax) / 2;
    const x = pathX(z) + side * 36;
    return { x, z, y: heightAt(x, z), u: side * 36, scale: 1, height: 1 };
  }

  poke() {
    const goat = this.goat;
    goat.clicks = goat.sinceClick < GOAT_CLICK_WINDOW ? goat.clicks + 1 : 1;
    goat.sinceClick = 0;
    if (goat.loved || goat.clicks >= GOAT_CLICKS_TO_SIT) {
      // Won over: it sits for the rest of the visit, and every click sends another heart.
      goat.loved = true;
      goat.hop = null;
      this.sendHeart();
    } else if (!goat.hop) {
      goat.hop = { age: 0 };
    }
    this.emit('goat');
  }

  sendHeart() {
    const heart = this.hearts.find((h) => h.age >= 1.8) || this.hearts[0];
    heart.age = 0;
    heart.sway = Math.random() * Math.PI * 2;
    heart.sprite.visible = true;
  }

  update(frame) {
    const { dt, night } = frame;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    this.updateRunner(frame);
    this.updateBirds(frame);
    this.updateGoat(frame);
    this.updateYeti(frame);
    this.updatePuffs(dt, night);
  }

  updateRunner({ dt, z, prevZ }) {
    GROUND_RUNS.forEach((event, i) => {
      if (z < event.at - REARM) this.runs[i] = true;
      if (this.runs[i] && crossed(prevZ, z, event.at)) {
        this.runs[i] = false;
        // A new run takes over from one still going, rather than being skipped.
        if (this.run) this.run.mesh.visible = false;
        // Out from behind a tree on one side, across the run, into the trees on the other.
        const start = this.pickTree(event.from, event.at + 35, event.at + 65);
        const end = this.pickTree(-event.from, start.z + 10, start.z + 50);
        const from = new THREE.Vector3(start.x + event.from * 2.5, 0, start.z + 1.5);
        const to = new THREE.Vector3(end.x - event.from * 2.5, 0, end.z + 1.5);
        const mesh = this.runners[event.animal];
        this.run = { mesh, from, to, total: from.distanceTo(to), traveled: 0, age: 0, landing: 0, ...RUNNERS[event.animal] };
        mesh.visible = true;
      }
    });
    const run = this.run;
    if (!run) return;
    run.age += dt;
    // Bursts out of cover, quickly up to full speed.
    run.traveled += run.speed * Math.min(1, run.age / 0.25 + 0.2) * dt;
    const k = Math.min(1, run.traveled / run.total);
    const x = run.from.x + (run.to.x - run.from.x) * k;
    const rz = run.from.z + (run.to.z - run.from.z) * k;
    const ground = heightAt(x, rz);
    const phase = run.traveled / run.stride;
    const bound = Math.abs(Math.sin(Math.PI * phase));
    const { body, legs } = run.mesh.userData;
    run.mesh.position.set(x, ground + bound * run.hop, rz);
    run.mesh.rotation.set(0, Math.atan2(run.to.x - run.from.x, run.to.z - run.from.z), 0);
    body.rotation.x = Math.cos(Math.PI * phase) * 0.22;
    legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(Math.PI * phase * 2 + (i % 2) * Math.PI) * 0.9;
    });
    // A puff of snow every time it lands.
    const landing = Math.floor(phase);
    if (landing !== run.landing) {
      run.landing = landing;
      this.kickSnow(x, ground, rz, 5);
    }
    if (k >= 1) {
      run.mesh.visible = false;
      this.run = null;
    }
  }

  updateBirds({ dt, time, z, prevZ }) {
    BIRD_FLUSHES.forEach(({ at, side }, i) => {
      if (z < at - REARM) this.flushes[i] = true;
      if (this.flushes[i] && crossed(prevZ, z, at)) {
        this.flushes[i] = false;
        // The flock is shared: a new flush recalls any birds still in the air.
        // Each raven starts tucked inside a real treetop and bursts out of it.
        const trees = this.treeSpots
          .filter((t) => Math.sign(t.u) === side && t.z > at + 50 && t.z < at + 140)
          .sort((a, b) => Math.abs(a.u) - Math.abs(b.u))
          .slice(0, 8);
        this.flight = {
          age: 0,
          birds: this.flock.map((bird, k) => {
            const tree = trees.length ? trees[k % trees.length] : this.pickTree(side, at + 60, at + 120);
            bird.position.set(
              tree.x + (Math.random() - 0.5) * 1.5,
              tree.y + (5 + Math.random() * 4) * tree.height,
              tree.z + (Math.random() - 0.5) * 1.5,
            );
            bird.visible = false;
            return {
              bird,
              delay: Math.random() * 0.6,
              phase: Math.random() * 6,
              vel: new THREE.Vector3(-side * (3 + Math.random() * 4), 7 + Math.random() * 4, 3 + Math.random() * 6),
            };
          }),
        };
        this.emit('birds');
      }
    });
    const flight = this.flight;
    if (!flight) return;
    flight.age += dt;
    flight.birds.forEach(({ bird, delay, phase, vel }) => {
      if (flight.age < delay) return;
      bird.visible = true;
      vel.y += dt * 1.5;
      bird.position.addScaledVector(vel, dt);
      bird.rotation.set(-0.35, Math.atan2(vel.x, vel.z), 0);
      const flap = Math.sin(time * 15 + phase) * 0.9;
      bird.userData.wings[0].rotation.z = -flap;
      bird.userData.wings[1].rotation.z = flap;
    });
    if (flight.age > 6.5) {
      flight.birds.forEach(({ bird }) => { bird.visible = false; });
      this.flight = null;
    }
  }

  updateGoat({ dt, time, camera }) {
    const goat = this.goat;
    const mesh = goat.mesh;
    goat.sinceClick += dt;
    const dx = camera.position.x - mesh.position.x;
    const dz = camera.position.z - mesh.position.z;
    const distance = Math.hypot(dx, dz);

    // Turn to face the skier as they come past.
    const targetYaw = distance < 280 ? Math.atan2(dx, dz) : Math.PI;
    let delta = targetYaw - mesh.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    mesh.rotation.y += delta * (1 - Math.exp(-dt * 2));

    if (goat.hop) {
      goat.hop.age += dt;
      const k = goat.hop.age / 0.7;
      mesh.position.y = goat.baseY + Math.sin(Math.min(k, 1) * Math.PI) * 1.6;
      if (k >= 1) goat.hop = null;
    }

    // Sitting: the rear settles, the hind legs fold, the head comes up.
    goat.sit += ((goat.loved ? 1 : 0) - goat.sit) * (1 - Math.exp(-dt * 5));
    const s = easeInOut(goat.sit);
    const { pose, head, hindLegs } = mesh.userData;
    pose.rotation.x = -0.42 * s;
    pose.position.set(0, -0.22 * s, 0.12 * s);
    hindLegs.forEach((leg) => {
      leg.scale.y = 1 - 0.55 * s;
      leg.rotation.x = 0.6 * s;
    });
    head.rotation.x = -0.3 * s + Math.sin(time * 2) * 0.05 * s;

    // Hearts float up from its head, sway and fade.
    head.getWorldPosition(this.tmp);
    this.hearts.forEach((heart) => {
      if (heart.age >= 1.8) return;
      heart.age += dt;
      const t = heart.age / 1.8;
      const pop = t < 0.12 ? t / 0.12 * 1.3 : 1.3 - Math.min(0.2, (t - 0.12) * 0.6);
      heart.sprite.position.set(
        this.tmp.x + Math.sin(heart.sway + t * 7) * 0.5,
        this.tmp.y + 1.2 + t * 4,
        this.tmp.z,
      );
      heart.sprite.scale.setScalar(1.5 * pop);
      heart.sprite.material.opacity = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
      if (heart.age >= 1.8) heart.sprite.visible = false;
    });
  }

  updatePuffs(dt, night) {
    const p = this.puffs;
    const pos = p.points.geometry.attributes.position.array;
    const life = p.points.geometry.attributes.aLife.array;
    for (let i = 0; i < p.count; i++) {
      if (p.age[i] >= 1) {
        life[i] = 0;
        continue;
      }
      p.age[i] += dt / 0.7;
      pos[i * 3 + 1] += p.rise[i] * dt;
      life[i] = Math.max(0, 1 - p.age[i]);
    }
    p.points.geometry.attributes.position.needsUpdate = true;
    p.points.geometry.attributes.aLife.needsUpdate = true;
    p.points.material.uniforms.uNight.value = night;
  }

  updateYeti({ dt, time, z, prevZ, speed, signedSpeed, camera, autopilot }) {
    const yeti = this.yeti;
    if (!yeti.chase) {
      yeti.rest = Math.max(0, yeti.rest - dt);
      // Jumps from the menu don't count, and it takes a breather after each catch.
      if (autopilot || yeti.rest > 0) {
        yeti.fast = 0;
        yeti.back = 0;
        yeti.climb = 0;
        return;
      }
      yeti.fast = speed > YETI_FAST_SPEED ? yeti.fast + dt : Math.max(0, yeti.fast - dt * 2);
      yeti.back = signedSpeed < -YETI_BACK_SPEED ? yeti.back + dt : Math.max(0, yeti.back - dt * 2);
      // How far you've come back up the hill; skiing down again wipes it out.
      const moved = z - prevZ;
      yeti.climb = moved < 0 ? yeti.climb - moved : Math.max(0, yeti.climb - moved * 3);
      const inRange = z > 400 && z < CAMERA_END - 150;
      if (inRange && (yeti.fast > YETI_FAST_SECONDS || yeti.back > YETI_BACK_SECONDS || yeti.climb > YETI_CLIMB)) {
        yeti.chase = { age: 0 };
        yeti.fast = 0;
        yeti.back = 0;
        yeti.climb = 0;
        yeti.mesh.visible = true;
        this.emit('yeti');
      }
      return;
    }

    // It closes the gap no matter how fast you go.
    const chase = yeti.chase;
    chase.age += dt;
    const k = Math.min(1, chase.age / YETI_CHASE_SECONDS);
    const yz = camera.position.z + 85 - 79 * easeIn(k);
    const yx = pathX(yz) + Math.sin(chase.age * 2.3) * 3;
    const mesh = yeti.mesh;
    mesh.position.set(yx, heightAt(yx, yz) + Math.abs(Math.sin(chase.age * 6)) * 0.5, yz);
    // Always square up to the skier (the model faces +z), leaning into the charge.
    const facing = Math.atan2(camera.position.x - yx, camera.position.z - yz);
    mesh.rotation.set(0, facing + Math.sin(chase.age * 3) * 0.12, 0);
    mesh.rotateX(0.14);
    mesh.userData.arms.forEach((arm, i) => {
      arm.rotation.set(-2.4 + Math.sin(time * 9 + i * Math.PI) * 0.6, 0, (i === 0 ? -1 : 1) * 0.35);
    });
    mesh.userData.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(time * 12 + i * Math.PI) * 0.7;
    });
    if (k >= 1) {
      yeti.chase = null;
      yeti.rest = YETI_REST_SECONDS;
      mesh.visible = false;
      this.shake = 1;
      this.emit('yeti-catch');
    }
  }

  dispose() {
    this.heartMap.dispose();
  }
}
