import * as THREE from 'three';
import { heightAt, pathX, seededRandom } from './world';

// Frosted, translucent ice: deep blue looking straight in, pale at grazing
// angles. Works for the blocks and for their instanced shards.
const ICE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  #include <fog_pars_vertex>
  void main() {
    mat4 model = modelMatrix;
    #ifdef USE_INSTANCING
      model = modelMatrix * instanceMatrix;
    #endif
    vec4 world = model * vec4(position, 1.0);
    vNormal = normalize(mat3(model) * normal);
    vView = cameraPosition - world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const ICE_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  #include <fog_pars_fragment>
  void main() {
    vec3 n = normalize(vNormal);
    float fresnel = pow(1.0 - abs(dot(n, normalize(vView))), 2.2);
    float facet = 0.5 + 0.5 * dot(n, normalize(vec3(0.4, 0.8, 0.3)));
    vec3 col = mix(vec3(0.10, 0.30, 0.55), vec3(0.86, 0.95, 1.0), clamp(fresnel * 1.3 + facet * 0.25, 0.0, 1.0));
    gl_FragColor = vec4(col, clamp(0.16 + fresnel * 0.72, 0.0, 0.92));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const SHARDS = 22;
const ICON_SCALE = 1.15;
const BURST = 1.8; // seconds the shards fly before settling
const REFORM_START = 2.4;
const REFORM_END = 3.4;

// Faceted ice: a box whose shared corners are nudged so it reads as a hewn block.
function crystalGeometry(rand) {
  const geo = new THREE.BoxGeometry(5, 8, 5, 2, 3, 2);
  const pos = geo.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, [(rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9]);
    const [ox, oy, oz] = offsets.get(key);
    const taper = 1 - ((pos.getY(i) + 4) / 8) * 0.18;
    pos.setXYZ(i, (pos.getX(i) + ox) * taper, pos.getY(i) + oy, (pos.getZ(i) + oz) * taper);
  }
  geo.translate(0, 4, 0);
  geo.computeVertexNormals();
  return geo;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// What's frozen inside each project's block, centred on the group's origin.
const ICONS = {
  // MyCabinet: a cocktail glass with an olive on a pick.
  cocktail(glow) {
    const glass = new THREE.LatheGeometry(
      [[0.001, 0], [0.75, 0], [0.75, 0.08], [0.1, 0.16], [0.07, 1.25], [1.15, 2.4], [1.06, 2.44], [0.001, 1.38]]
        .map(([x, y]) => new THREE.Vector2(x, y)),
      28,
    );
    const olive = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), glow);
    olive.position.set(0.15, 1.95, 0);
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), glow);
    pick.position.set(0.35, 2.3, 0);
    pick.rotation.z = -0.5;
    const icon = new THREE.Group();
    icon.add(new THREE.Mesh(glass, glow), olive, pick);
    icon.position.y = -1.25;
    return icon;
  },
  // Jim App: a dumbbell, tipped at an angle.
  dumbbell(glow) {
    const icon = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.7, 12), glow);
    bar.rotation.z = Math.PI / 2;
    icon.add(bar);
    [-1, 1].forEach((side) => {
      [[0.66, 0.24, 0.72], [0.5, 0.18, 0.95], [0.17, 0.12, 1.12]].forEach(([radius, width, x]) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), glow);
        plate.rotation.z = Math.PI / 2;
        plate.position.x = side * x;
        icon.add(plate);
      });
    });
    icon.rotation.z = 0.55;
    return icon;
  },
  // Tichu: a hand of cards fanned out, with a diamond on the front card.
  cards(glow, pip) {
    const icon = new THREE.Group();
    const card = new THREE.BoxGeometry(1.1, 1.6, 0.05);
    card.translate(0, 0.8, 0);
    [-0.45, -0.15, 0.15, 0.45].forEach((angle, i) => {
      const mesh = new THREE.Mesh(card, glow);
      mesh.rotation.z = -angle;
      mesh.position.z = i * 0.07 - 0.1;
      icon.add(mesh);
    });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), pip);
    diamond.scale.set(0.75, 1.1, 0.25);
    diamond.position.set(0.28, 0.85, 0.16);
    diamond.rotation.z = -0.45;
    icon.add(diamond);
    icon.position.y = -0.9;
    return icon;
  },
};

// One block of ice per project, standing beside the run where its card appears,
// with a glowing emblem of the project frozen inside. Clicking a block shatters
// it; the shards fall, then fly back together.
export default class IceBlocks {
  constructor({ scene, icons, emit }) {
    this.emit = emit;
    const rand = seededRandom(42);
    const material = new THREE.ShaderMaterial({
      vertexShader: ICE_VERTEX,
      fragmentShader: ICE_FRAGMENT,
      uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    // Skips tone mapping so the glow stays saturated orange instead of washing out.
    const glow = new THREE.MeshStandardMaterial({
      color: '#ff6a2b', emissive: '#ff4a00', emissiveIntensity: 1.1, roughness: 0.35, toneMapped: false,
    });
    const pip = new THREE.MeshStandardMaterial({
      color: '#ffffff', emissive: '#fff4ea', emissiveIntensity: 1, roughness: 0.4, toneMapped: false,
    });
    const shardGeometry = new THREE.TetrahedronGeometry(1.1, 0);
    this.dummy = new THREE.Object3D();

    this.blocks = icons.map((icon, i) => {
      const group = new THREE.Group();
      const block = new THREE.Mesh(crystalGeometry(rand), material);
      block.renderOrder = 2;
      const core = new THREE.Group();
      core.add((ICONS[icon] || ICONS.cards)(glow, pip));
      core.position.y = 4;
      core.scale.setScalar(ICON_SCALE);
      const shards = new THREE.InstancedMesh(shardGeometry, material, SHARDS);
      shards.visible = false;
      shards.renderOrder = 2;
      shards.frustumCulled = false;
      block.userData.onClick = () => this.shatter(i);
      core.userData.onClick = () => this.shatter(i);
      group.add(core, block, shards);
      group.rotation.y = i * 0.7;
      group.visible = false;
      scene.add(group);
      return { group, block, core, shards, burst: null };
    });
  }

  get clickables() {
    return this.blocks.flatMap(({ block, core }) => [block, core]);
  }

  setCheckpoints(checkpoints) {
    this.blocks.forEach((entry, i) => {
      const checkpoint = checkpoints[i];
      entry.group.visible = Boolean(checkpoint);
      if (!checkpoint) return;
      const x = pathX(checkpoint.z) + checkpoint.side * 19;
      entry.group.position.set(x, heightAt(x, checkpoint.z) - 0.8, checkpoint.z);
    });
  }

  shatter(index) {
    const entry = this.blocks[index];
    if (!entry || entry.burst) return;
    const rand = Math.random;
    entry.burst = {
      age: 0,
      shards: Array.from({ length: SHARDS }, () => {
        const home = new THREE.Vector3((rand() - 0.5) * 4.4, 0.6 + rand() * 7, (rand() - 0.5) * 4.4);
        const out = home.clone().sub(new THREE.Vector3(0, 4, 0)).normalize();
        return {
          home,
          pos: home.clone(),
          vel: out.multiplyScalar(7 + rand() * 7).add(new THREE.Vector3(0, 4 + rand() * 4, 0)),
          rot: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
          spin: new THREE.Vector3((rand() - 0.5) * 10, (rand() - 0.5) * 10, (rand() - 0.5) * 10),
          scale: 0.45 + rand() * 0.7,
          settled: null,
        };
      }),
    };
    entry.block.visible = false;
    entry.shards.visible = true;
    this.emit('shatter');
  }

  update({ dt, time, camera }) {
    const dummy = this.dummy;
    this.blocks.forEach((entry, i) => {
      const { group, core, block, shards, burst } = entry;
      // The emblem turns to face the skier (with a gentle sway) so it's never seen edge-on.
      const toCamera = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z) - group.rotation.y;
      core.rotation.y = toCamera + Math.sin(time * 0.6 + i) * 0.45;
      core.rotation.x = Math.sin(time * 0.4 + i) * 0.15;
      if (!burst) return;

      burst.age += dt;
      const t = burst.age;
      core.rotation.y += t * 6;
      core.scale.setScalar(ICON_SCALE * (1 + 0.5 * Math.exp(-t * 1.5) * Math.abs(Math.sin(t * 9)) + (t < REFORM_END ? 0.25 : 0)));

      burst.shards.forEach((shard, s) => {
        if (t < BURST) {
          shard.vel.y -= 18 * dt;
          shard.pos.addScaledVector(shard.vel, dt);
          if (shard.pos.y < 0.9) {
            shard.pos.y = 0.9;
            shard.vel.y *= -0.25;
            shard.vel.x *= 0.6;
            shard.vel.z *= 0.6;
          }
          shard.rot.x += shard.spin.x * dt;
          shard.rot.y += shard.spin.y * dt;
          shard.rot.z += shard.spin.z * dt;
        } else if (t >= REFORM_START) {
          if (!shard.settled) shard.settled = { pos: shard.pos.clone(), rot: shard.rot.clone() };
          const k = easeInOut(Math.min(1, (t - REFORM_START) / (REFORM_END - REFORM_START)));
          shard.pos.lerpVectors(shard.settled.pos, shard.home, k);
          shard.rot.set(shard.settled.rot.x * (1 - k), shard.settled.rot.y * (1 - k), shard.settled.rot.z * (1 - k));
        }
        dummy.position.copy(shard.pos);
        dummy.rotation.copy(shard.rot);
        dummy.scale.setScalar(shard.scale);
        dummy.updateMatrix();
        shards.setMatrixAt(s, dummy.matrix);
      });
      shards.instanceMatrix.needsUpdate = true;

      if (t >= REFORM_END) {
        entry.burst = null;
        shards.visible = false;
        block.visible = true;
        core.scale.setScalar(ICON_SCALE);
      }
    });
  }
}
