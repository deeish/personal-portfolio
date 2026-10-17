import * as THREE from 'three';
import { CAMERA_END, heightAt, pathX } from './world';

// Where things happen, as distances down the run. Sides (+1 = screen left) are
// chosen opposite whichever project card is on screen at that point.
const HARE_RUNS = [1380, 2460];
const BIRD_FLUSHES = [{ at: 1720, side: 1 }, { at: 2280, side: -1 }, { at: 2860, side: -1 }];
const GOAT = { u: -46, z: 930 };
const REARM = 160;

// The yeti shows up once a visit: ski flat out for a while, or race back uphill.
const YETI_FAST_SPEED = 600;
const YETI_FAST_SECONDS = 1.4;
const YETI_BACK_SPEED = 220;
const YETI_BACK_SECONDS = 0.6;
const YETI_CHASE_SECONDS = 3.2;

const fur = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });

function part(geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  return mesh;
}

const crossed = (from, to, at) => from < at && to >= at;
const easeIn = (t) => t * t;

// Models are built from a handful of low-poly shapes to match the trees. All face +z.
function buildHare(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const ear = new THREE.ConeGeometry(0.07, 0.5, 5);
  const foot = new THREE.BoxGeometry(0.12, 0.1, 0.42);
  g.add(
    part(ball, m.white, [0, 0.45, 0], [0.38, 0.34, 0.6]),
    part(ball, m.white, [0, 0.72, 0.5], [0.2, 0.19, 0.24]),
    part(ear, m.white, [0.08, 1.05, 0.42], [1, 1, 1], [-0.35, 0, -0.15]),
    part(ear, m.white, [-0.08, 1.05, 0.42], [1, 1, 1], [-0.35, 0, 0.15]),
    part(ball, m.dark, [0.11, 0.77, 0.66], [0.03, 0.03, 0.03]),
    part(ball, m.dark, [-0.11, 0.77, 0.66], [0.03, 0.03, 0.03]),
    part(ball, m.white, [0, 0.5, -0.6], [0.12, 0.12, 0.12]),
    part(foot, m.grey, [0.18, 0.06, -0.15]),
    part(foot, m.grey, [-0.18, 0.06, -0.15]),
  );
  g.scale.setScalar(1.5);
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

function buildGoat(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const leg = new THREE.CylinderGeometry(0.07, 0.06, 0.85, 5);
  g.add(part(ball, m.white, [0, 1.05, 0], [0.45, 0.42, 0.85]));
  [[0.24, 0.5], [-0.24, 0.5], [0.24, -0.5], [-0.24, -0.5]].forEach(([x, z]) => g.add(part(leg, m.white, [x, 0.45, z])));
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
  g.add(head);
  g.userData.head = head;
  g.scale.setScalar(1.6);
  return g;
}

function buildYeti(m) {
  const g = new THREE.Group();
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const limb = new THREE.CylinderGeometry(0.3, 0.26, 1.9, 7);
  limb.translate(0, -0.95, 0);
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
    shoulder.add(part(limb, m.yeti), part(ball, m.yeti, [0, -1.95, 0], [0.32, 0.32, 0.32]));
    g.add(shoulder);
    return shoulder;
  });
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.5, 1.3, 0);
    hip.add(part(legGeo, m.yeti));
    g.add(hip);
    return hip;
  });
  g.userData.arms = arms;
  g.userData.legs = legs;
  g.scale.setScalar(1.5);
  return g;
}

// Things that live on the mountain: a hare that bolts across the run, ravens
// flushed out of the trees, a goat keeping watch, and the SkiFree yeti.
export default class Wildlife {
  constructor({ scene, emit, mobile }) {
    this.emit = emit;
    const m = {
      white: fur('#eceef1'),
      grey: fur('#9aa2ab'),
      dark: fur('#141619'),
      raven: fur('#16181d'),
      wing: new THREE.MeshStandardMaterial({ color: '#1b1e24', roughness: 0.9, side: THREE.DoubleSide, flatShading: true }),
      horn: fur('#3b352e'),
      rock: fur('#596273'),
      yeti: fur('#f4f6f8'),
      face: fur('#5b6f86'),
      mouth: fur('#7a1d1d'),
    };

    this.hare = { mesh: buildHare(m), armed: HARE_RUNS.map(() => true), run: null };
    this.hare.mesh.visible = false;

    const flockSize = mobile ? 6 : 10;
    this.birds = {
      flock: Array.from({ length: flockSize }, () => buildBird(m)),
      armed: BIRD_FLUSHES.map(() => true),
      flight: null,
    };
    this.birds.flock.forEach((bird) => { bird.visible = false; });

    // The goat stands on a rock beside the run and turns its head to watch you pass.
    const goatX = pathX(GOAT.z) + GOAT.u;
    const ground = heightAt(goatX, GOAT.z);
    const rock = part(new THREE.DodecahedronGeometry(4, 0), m.rock, [goatX, ground + 0.6, GOAT.z], [1.5, 0.8, 1.2], [0.2, 0.5, 0]);
    this.goat = { mesh: buildGoat(m), rock, hop: null, baseY: ground + 3.7 };
    this.goat.mesh.position.set(goatX, this.goat.baseY, GOAT.z);
    this.goat.mesh.rotation.y = Math.PI;
    this.goat.mesh.userData.onClick = () => this.poke();

    this.yeti = { mesh: buildYeti(m), chase: null, done: false, fast: 0, back: 0 };
    this.yeti.mesh.visible = false;
    this.yeti.mesh.userData.onClick = () => this.emit('yeti');

    this.shake = 0;
    scene.add(this.hare.mesh, rock, this.goat.mesh, this.yeti.mesh, ...this.birds.flock);
  }

  get clickables() {
    return [this.goat.mesh, this.yeti.mesh];
  }

  poke() {
    if (this.goat.hop) return;
    this.goat.hop = { age: 0 };
    this.emit('goat');
  }

  update(frame) {
    const { dt } = frame;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    this.updateHare(frame);
    this.updateBirds(frame);
    this.updateGoat(frame);
    this.updateYeti(frame);
  }

  updateHare({ dt, z, prevZ }) {
    const hare = this.hare;
    HARE_RUNS.forEach((at, i) => {
      if (z < at - REARM) hare.armed[i] = true;
      if (hare.armed[i] && !hare.run && crossed(prevZ, z, at)) {
        hare.armed[i] = false;
        const dir = i % 2 === 0 ? -1 : 1;
        hare.run = { age: 0, z: at + 45, from: -dir * 28, to: dir * 34, duration: 1.5 };
        hare.mesh.visible = true;
      }
    });
    if (!hare.run) return;
    const run = hare.run;
    run.age += dt;
    const k = Math.min(1, run.age / run.duration);
    const x = pathX(run.z) + run.from + (run.to - run.from) * k;
    hare.mesh.position.set(x, heightAt(x, run.z) + Math.abs(Math.sin(k * Math.PI * 6)) * 0.8, run.z);
    hare.mesh.rotation.set(0, run.to > run.from ? Math.PI / 2 : -Math.PI / 2, Math.sin(k * Math.PI * 12) * 0.1);
    if (k >= 1) {
      hare.run = null;
      hare.mesh.visible = false;
    }
  }

  updateBirds({ dt, time, z, prevZ }) {
    const birds = this.birds;
    BIRD_FLUSHES.forEach(({ at, side }, i) => {
      if (z < at - REARM) birds.armed[i] = true;
      if (birds.armed[i] && !birds.flight && crossed(prevZ, z, at)) {
        birds.armed[i] = false;
        birds.flight = {
          age: 0,
          birds: birds.flock.map((bird) => {
            const bz = at + 80 + Math.random() * 40;
            const bx = pathX(bz) + side * (30 + Math.random() * 25);
            bird.position.set(bx, heightAt(bx, bz) + 5 + Math.random() * 4, bz);
            bird.visible = true;
            return {
              bird,
              phase: Math.random() * 6,
              vel: new THREE.Vector3(side * (3 + Math.random() * 4), 6 + Math.random() * 3, 4 + Math.random() * 6),
            };
          }),
        };
        this.emit('birds');
      }
    });
    if (!birds.flight) return;
    const flight = birds.flight;
    flight.age += dt;
    flight.birds.forEach(({ bird, phase, vel }) => {
      vel.y += dt * 1.5;
      bird.position.addScaledVector(vel, dt);
      bird.rotation.set(-0.35, Math.atan2(vel.x, vel.z), 0);
      const flap = Math.sin(time * 15 + phase) * 0.9;
      bird.userData.wings[0].rotation.z = -flap;
      bird.userData.wings[1].rotation.z = flap;
    });
    if (flight.age > 6) {
      flight.birds.forEach(({ bird }) => { bird.visible = false; });
      birds.flight = null;
    }
  }

  updateGoat({ dt, camera }) {
    const goat = this.goat;
    const mesh = goat.mesh;
    // Turn to face the skier as they come past.
    const dx = camera.position.x - mesh.position.x;
    const dz = camera.position.z - mesh.position.z;
    const watching = Math.hypot(dx, dz) < 280;
    const targetYaw = watching ? Math.atan2(dx, dz) : Math.PI;
    let delta = targetYaw - mesh.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    mesh.rotation.y += delta * (1 - Math.exp(-dt * 2));

    if (goat.hop) {
      goat.hop.age += dt;
      const k = goat.hop.age / 0.7;
      mesh.position.y = goat.baseY + Math.sin(Math.min(k, 1) * Math.PI) * 1.6;
      if (k >= 1) goat.hop = null;
    }
  }

  updateYeti({ dt, time, z, speed, signedSpeed, camera, autopilot }) {
    const yeti = this.yeti;
    if (yeti.done) return;
    if (!yeti.chase) {
      if (autopilot) {
        yeti.fast = 0;
        yeti.back = 0;
        return;
      }
      yeti.fast = speed > YETI_FAST_SPEED ? yeti.fast + dt : Math.max(0, yeti.fast - dt * 2);
      yeti.back = signedSpeed < -YETI_BACK_SPEED ? yeti.back + dt : Math.max(0, yeti.back - dt * 2);
      const inRange = z > 400 && z < CAMERA_END - 300;
      if (inRange && (yeti.fast > YETI_FAST_SECONDS || yeti.back > YETI_BACK_SECONDS)) {
        yeti.chase = { age: 0 };
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
      yeti.done = true;
      mesh.visible = false;
      this.shake = 1;
      this.emit('yeti-catch');
    }
  }
}
