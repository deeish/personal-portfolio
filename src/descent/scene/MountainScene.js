import * as THREE from 'three';
import {
  CAMERA_END,
  CLOUD_Y,
  EYE,
  LODGE_Z,
  PEAK,
  RUN_LENGTH,
  TREE_LINE,
  displayAltitude,
  displayTemperature,
  heightAt,
  noise2,
  pathSlope,
  pathX,
  seededRandom,
  smoothstep,
} from './world';
import Avalanche from './Avalanche';
import IceBlocks from './IceBlocks';
import PisteTracks from './PisteTracks';
import SkiRig from './SkiRig';
import Snowfall from './Snowfall';
import SnowName from './SnowName';
import Wildlife from './Wildlife';

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uSpace;
  uniform float uWhiteout;
  uniform float uNight;
  uniform float uTime;
  uniform vec3 uSunDir;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 d = normalize(vDir);
    float e = d.y;

    // Near the summit: black zenith, a cobalt band, and a thin bright limb on the horizon.
    vec3 zenith = vec3(0.002, 0.003, 0.010);
    vec3 cobalt = vec3(0.020, 0.045, 0.150);
    vec3 limb = vec3(0.42, 0.55, 0.85);
    vec3 high = mix(cobalt, zenith, smoothstep(0.0, 0.5, e));
    high = mix(high, limb, exp(-abs(e) * 22.0));
    // Looking down past the edge of the world: distant haze over the cloud sea, never open sky.
    high = mix(high, vec3(0.58, 0.66, 0.84), smoothstep(0.0, 0.06, -e));

    // Below the cloud deck: flat, cold overcast.
    vec3 overTop = vec3(0.30, 0.34, 0.42);
    vec3 overHorizon = vec3(0.52, 0.56, 0.63);
    vec3 low = mix(overHorizon, overTop, smoothstep(-0.05, 0.6, e));
    vec3 col = mix(low, high, uSpace);

    // Night: deep navy with a faint glow along the horizon.
    vec3 night = mix(vec3(0.010, 0.016, 0.036), vec3(0.002, 0.003, 0.010), smoothstep(0.0, 0.45, e));
    night = mix(night, vec3(0.03, 0.045, 0.08), smoothstep(0.0, 0.06, -e));
    col = mix(col, night, uNight);

    // Stars where the air is thin, and everywhere at night.
    vec3 p = d * 260.0;
    vec3 cell = floor(p);
    float pick = hash(cell);
    vec3 jitter = vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1)) - 0.5;
    float star = (1.0 - smoothstep(0.0, 0.22, length(fract(p) - 0.5 - jitter * 0.5))) * step(0.982, pick);
    float twinkle = 0.65 + 0.35 * sin(uTime * 1.7 + pick * 90.0);
    col += star * twinkle * smoothstep(0.02, 0.2, e) * max(uSpace, uNight) * 1.6;

    // Aurora curtains swaying over the range at night.
    if (uNight > 0.01) {
      float az = atan(d.x, d.z);
      float band = smoothstep(0.06, 0.22, e) * (1.0 - smoothstep(0.3, 0.62, e));
      float sway = sin(az * 3.0 + uTime * 0.12) * 1.6;
      float curtain = 0.5 + 0.5 * sin(az * 11.0 + sway + uTime * 0.18);
      curtain *= 0.55 + 0.45 * sin(az * 27.0 - uTime * 0.35 + sway);
      vec3 tint = mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.25, 1.0), smoothstep(0.18, 0.55, e));
      col += tint * pow(max(curtain, 0.0), 3.0) * band * uNight * 0.55;
    }

    // The sun, or the moon after dark.
    float sun = max(dot(d, uSunDir), 0.0);
    vec3 disc = mix(vec3(1.0, 0.94, 0.84), vec3(0.78, 0.84, 1.0), uNight);
    col += disc * pow(sun, 60000.0) * mix(20.0, 3.0, uNight) * (0.3 + 0.7 * max(uSpace, uNight));
    col += vec3(1.0, 0.82, 0.62) * pow(sun, 800.0) * 0.8 * uSpace * (1.0 - uNight);
    col += vec3(0.55, 0.62, 0.80) * pow(sun, 18.0) * (0.12 + 0.3 * uSpace) * (1.0 - uNight * 0.85);

    col = mix(col, mix(vec3(0.80, 0.83, 0.87), vec3(0.16, 0.18, 0.24), uNight), uWhiteout);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CLOUD_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const CLOUD_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uAbove;
  uniform float uNight;
  uniform vec3 uCam;
  uniform vec3 uHorizon;
  uniform sampler2D uGround;
  uniform vec4 uGroundRect;
  uniform vec2 uGroundRange;
  varying vec3 vWorld;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += amp * vnoise(p);
      p = p * 2.02 + vec2(17.1, 9.2);
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec2 drift = vec2(uTime * 0.006, uTime * 0.002);
    vec2 uv = vWorld.xz * 0.0011 + drift;
    float n = fbm(uv);
    float detail = fbm(uv * 4.0 - drift * 3.0);
    float cover = smoothstep(0.30, 0.50, n + (detail - 0.5) * 0.18);
    float dist = length(vWorld.xz - uCam.xz);

    vec3 lit = vec3(1.0, 0.98, 0.96);
    vec3 shade = vec3(0.50, 0.58, 0.74);
    vec3 top = mix(shade, lit, smoothstep(0.35, 0.75, n + detail * 0.25));
    vec3 under = mix(vec3(0.30, 0.33, 0.39), vec3(0.45, 0.48, 0.54), detail);
    vec3 col = mix(under, top, uAbove);
    col *= mix(vec3(1.0), vec3(0.10, 0.13, 0.20), uNight);
    col = mix(col, uHorizon, smoothstep(1500.0, 9000.0, dist));

    float alpha = cover;
    alpha *= 1.0 - smoothstep(9000.0, 14000.0, dist);
    alpha *= smoothstep(3.0, 45.0, abs(uCam.y - vWorld.y));

    // Thin out where the mountain rises up to meet the deck, so there is no hard waterline.
    float ground = texture2D(uGround, (vWorld.xz - uGroundRect.xy) / uGroundRect.zw).r * uGroundRange.y + uGroundRange.x;
    alpha *= smoothstep(-6.0, 30.0, vWorld.y - ground);
    // Where the deck is see-through it writes no depth, so things below still show.
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const tmpColor = new THREE.Color();
const linear = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const lerp = (a, b, t) => a + (b - a) * t;
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

// Elements in the page that should keep their own clicks rather than reach the 3D world.
const PAGE_CONTROLS = 'a, button, input, textarea, select, summary, label, .card, .hud-top, .hud-rail';
// How close to the sun a click has to land (about 3.5 degrees).
const SUN_CLICK_COS = Math.cos(THREE.MathUtils.degToRad(3.5));

export class SceneCancelled extends Error {}

// Usage: construct (throws without WebGL), await build() (throws SceneCancelled if
// disposed part-way), then start(). The build runs in small steps so the page stays
// responsive and the loader can show real progress.
export default class MountainScene {
  constructor(canvas, options = {}) {
    const { mobile = false, reducedMotion = false, iceIcons = [], nameElement = null } = options;
    this.mobile = mobile;
    this.reducedMotion = reducedMotion;
    this.iceIcons = iceIcons;
    this.nameElement = nameElement;
    this.onTelemetry = options.onTelemetry;
    this.onEvent = options.onEvent || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.emit = (name, detail) => this.onEvent(name, detail);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(this.pixelRatio);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xb4bac4, 0.001);
    this.baseFov = mobile ? 68 : 56;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.3, 16000);
    this.scene.add(this.camera);

    this.target = 0;
    this.progress = 0;
    this.speed = 0;
    this.signedSpeed = 0;
    this.roll = 0;
    this.night = 0;
    this.nightTarget = 0;
    this.pointer = new THREE.Vector2();
    this.smoothPointer = new THREE.Vector2();
    this.lookTarget = new THREE.Vector3();
    this.vista = new THREE.Vector3();
    this.basePosition = new THREE.Vector3();
    this.lastBase = null;
    this.camVel = new THREE.Vector3();
    this.timer = new THREE.Timer();
    this.lastTelemetry = 0;
    this.quality = 0;
    this.perf = { time: 0, frames: 0 };
    this.raycaster = new THREE.Raycaster();
    this.clickables = [];
    this.sunTarget = { userData: { onClick: () => this.emit('toggle-night') } };
    this.hovering = false;
    this.lastHover = 0;
    this.disposed = false;

    this.fogValley = linear(0.52, 0.56, 0.63);
    this.fogHigh = linear(0.55, 0.63, 0.8);
    this.fogWhite = linear(0.78, 0.81, 0.86);
    this.fogNight = linear(0.012, 0.02, 0.045);
    this.fogNightWhite = linear(0.16, 0.18, 0.24);
    this.horizonValley = linear(0.52, 0.56, 0.63);
    this.horizonHigh = linear(0.42, 0.55, 0.85);
    this.horizonNight = linear(0.03, 0.045, 0.08);
    this.sunColor = new THREE.Color(0xfff1e0);
    this.moonColor = new THREE.Color(0x9fb6ff);
  }

  async yieldToPage() {
    await breathe();
    if (this.disposed) throw new SceneCancelled();
  }

  async build() {
    const steps = [
      [1, () => this.buildLights()],
      [1, () => this.buildSky()],
      [8, (report) => this.buildClouds(report)],
      [40, (report) => this.buildTerrain(report)],
      [14, (report) => this.buildTrees(report)],
      [2, () => this.buildGates()],
      [2, () => this.buildLodge()],
      [8, () => { this.tracks = new PisteTracks({ scene: this.scene }); }],
      [3, () => this.buildFeatures()],
      [4, () => this.buildSnowName()],
    ];
    const total = steps.reduce((sum, [weight]) => sum + weight, 0);
    let done = 0;
    for (const [weight, step] of steps) {
      const before = done;
      await step((fraction) => this.onProgress((before + weight * fraction) / total));
      done += weight;
      this.onProgress(done / total);
      await this.yieldToPage();
    }
  }

  start() {
    this.handleResize = () => this.resize();
    this.handlePointer = (event) => this.pointerMoved(event);
    this.handleClick = (event) => this.clicked(event);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointer, { passive: true });
    window.addEventListener('click', this.handleClick);
    this.resize();
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  setTarget(progress, { immediate = false } = {}) {
    this.target = Math.min(1, Math.max(0, progress));
    if (immediate) this.progress = this.target;
  }

  setCheckpoints(checkpoints) {
    if (this.ice) this.ice.setCheckpoints(checkpoints);
  }

  setNight(on) {
    this.nightTarget = on ? 1 : 0;
  }

  // Jumps from the section rail fly down the mountain fast; that shouldn't count
  // as skiing recklessly, so speed-triggered surprises sit this one out.
  autopilot(milliseconds = 3200) {
    this.autopilotUntil = performance.now() + milliseconds;
  }

  // ---------- Building ----------

  buildLights() {
    this.sunDir = new THREE.Vector3(0.5, 0.2, 0.866).normalize();
    this.sun = new THREE.DirectionalLight(0xfff1e0, 2.4);
    this.sun.position.copy(this.sunDir).multiplyScalar(1000);
    this.hemi = new THREE.HemisphereLight(0xbfd0ee, 0x3b4352, 0.8);
    // Cool bounce light from the far side so faces turned away from the sun keep their relief.
    this.fill = new THREE.DirectionalLight(0x8fa8d8, 0.5);
    this.fill.position.set(-0.7, 0.35, -0.25).multiplyScalar(1000);
    // Headlamp for night runs. Always present (at zero by day) so toggling never recompiles shaders.
    this.headlamp = new THREE.SpotLight(0xfff1d6, 0, 170, 0.5, 0.55, 2);
    this.headlamp.position.set(0, 0.2, 0);
    this.headlamp.target.position.set(0, -1.4, -12);
    this.camera.add(this.headlamp, this.headlamp.target);
    this.scene.add(this.sun, this.hemi, this.fill);
  }

  buildSky() {
    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        uSpace: { value: 1 },
        uWhiteout: { value: 0 },
        uNight: { value: 0 },
        uTime: { value: 0 },
        uSunDir: { value: this.sunDir },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), this.skyMaterial);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  async buildClouds(report) {
    const ground = await this.groundNearClouds(report);
    this.cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERTEX,
      fragmentShader: CLOUD_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAbove: { value: 1 },
        uNight: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uHorizon: { value: this.horizonHigh.clone() },
        ...ground,
      },
      transparent: true,
      // Writes depth (except where see-through) so effects below the deck stay hidden from above.
      depthWrite: true,
      side: THREE.DoubleSide,
      fog: false,
    });
    const geo = new THREE.PlaneGeometry(30000, 30000);
    geo.rotateX(-Math.PI / 2);
    this.clouds = new THREE.Mesh(geo, this.cloudMaterial);
    this.clouds.position.y = CLOUD_Y;
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = 0;
    this.scene.add(this.clouds);
  }

  // A coarse height map of the ground around cloud level, so the cloud shader
  // knows where the mountain is about to poke through.
  async groundNearClouds(report) {
    const width = 192;
    const depth = 256;
    const rect = new THREE.Vector4(-3500, -1200, 7000, RUN_LENGTH + 2800);
    const range = new THREE.Vector2(CLOUD_Y - 160, 240);
    const data = new Uint8Array(width * depth);
    for (let j = 0; j < depth; j++) {
      const z = rect.y + rect.w * (j / (depth - 1));
      for (let i = 0; i < width; i++) {
        const h = heightAt(rect.x + rect.z * (i / (width - 1)), z);
        data[j * width + i] = Math.round(Math.min(1, Math.max(0, (h - range.x) / range.y)) * 255);
      }
      if (j % 64 === 63) {
        report(j / depth);
        await this.yieldToPage();
      }
    }
    const texture = new THREE.DataTexture(data, width, depth, THREE.RedFormat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.groundTexture = texture;
    return { uGround: { value: texture }, uGroundRect: { value: rect }, uGroundRange: { value: range } };
  }

  // The terrain grid lives in "run space": columns follow the run's centre
  // line and bunch up near it, so detail lands where the camera is.
  async buildTerrain(report) {
    const nU = this.mobile ? 110 : 160;
    const nV = this.mobile ? 820 : 1300;
    const U = 3400;
    const Z0 = -1200;
    const Z1 = RUN_LENGTH + 1600;
    const cols = nU + 1;
    const positions = new Float32Array(cols * (nV + 1) * 3);
    let k = 0;
    for (let j = 0; j <= nV; j++) {
      const z = Z0 + (Z1 - Z0) * (j / nV);
      const px = pathX(z);
      for (let i = 0; i <= nU; i++) {
        const s = (i / nU) * 2 - 1;
        const x = px + Math.sign(s) * U * Math.pow(Math.abs(s), 1.8);
        positions[k++] = x;
        positions[k++] = heightAt(x, z);
        positions[k++] = z;
      }
      if (j % 80 === 79) {
        report((j / nV) * 0.85);
        await this.yieldToPage();
      }
    }

    const indices = new Uint32Array(nU * nV * 6);
    k = 0;
    for (let j = 0; j < nV; j++) {
      for (let i = 0; i < nU; i++) {
        const a = j * cols + i;
        const c = a + cols;
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = a + 1;
        indices[k++] = a + 1;
        indices[k++] = c;
        indices[k++] = c + 1;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    await this.yieldToPage();

    // Snow everywhere it can settle; dark rock where it is too steep to hold.
    const normals = geo.attributes.normal;
    const colors = new Float32Array(positions.length);
    const snow = new THREE.Color('#f3f7fc');
    const drift = new THREE.Color('#c6d3e4');
    const rock = new THREE.Color('#353c49');
    for (let v = 0; v < normals.count; v++) {
      const ny = normals.getY(v);
      const windblown = noise2(positions[v * 3] * 0.004, positions[v * 3 + 2] * 0.004) * 0.5 + 0.5;
      tmpColor.copy(snow).lerp(drift, Math.min(1, (1 - ny) * 2.4 + windblown * 0.22));
      tmpColor.lerp(rock, 1 - smoothstep(0.52, 0.74, ny));
      colors[v * 3] = tmpColor.r;
      colors[v * 3 + 1] = tmpColor.g;
      colors[v * 3 + 2] = tmpColor.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    report(1);

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    this.terrain = new THREE.Mesh(geo, material);
    this.terrain.frustumCulled = false;
    this.scene.add(this.terrain);
  }

  async buildTrees(report) {
    const profile = [
      [0.35, 0], [0.35, 1.4], [3.4, 1.4], [1.1, 5.2], [2.7, 5.2], [0.8, 8.8], [1.9, 8.8], [0.001, 13],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(profile, 7);

    // Dark needles at the rim of each tier, snow settled on the top of it.
    const needles = new THREE.Color('#2b3f45');
    const snowCap = new THREE.Color('#e6edf5');
    const trunk = new THREE.Color('#2a221e');
    const tierColors = [trunk, trunk, needles, snowCap, needles, snowCap, needles, snowCap];
    const vertexColors = new Float32Array(geo.attributes.position.count * 3);
    for (let v = 0; v < geo.attributes.position.count; v++) {
      tierColors[v % profile.length].toArray(vertexColors, v * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
    const count = this.mobile ? 1600 : 4200;
    const mesh = new THREE.InstancedMesh(geo, material, count);
    const rand = seededRandom(7);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color('#ffffff');
    const shadowTint = new THREE.Color('#b9c6d4');
    const lodgeX = pathX(LODGE_Z) - 26;
    const attempts = count * 8;
    let placed = 0;

    for (let attempt = 0; attempt < attempts && placed < count; attempt++) {
      if (attempt % 4000 === 3999) {
        report(attempt / attempts);
        await this.yieldToPage();
      }
      const z = 300 + rand() * (RUN_LENGTH + 500);
      const side = rand() < 0.5 ? -1 : 1;
      const u = side * (28 + 900 * Math.pow(rand(), 2.2));
      const x = pathX(z) + u;
      const y = heightAt(x, z);
      if (y > TREE_LINE + rand() * 60) continue;
      const steep = Math.abs(heightAt(x + 2, z) - y) + Math.abs(heightAt(x, z + 2) - y);
      if (steep > 2.6) continue;
      // Keep a clearing around the lodge and the sightline to it from the end of the run.
      if (Math.hypot(x - lodgeX, z - LODGE_Z) < 34) continue;
      if (z > CAMERA_END - 70 && u > -80 && u < 24) continue;

      const scale = 0.6 + rand();
      dummy.position.set(x, y - 0.6, z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.set(scale, scale * (0.85 + rand() * 0.4), scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      mesh.setColorAt(placed, tmpColor.copy(tint).lerp(shadowTint, rand()));
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  // Giant-slalom gates down the piste: the quickest read on how fast you are going.
  buildGates() {
    const gateZs = [];
    for (let z = 200; z < CAMERA_END - 60; z += 52) gateZs.push(z);

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
    poleGeo.translate(0, 1.2, 0);
    const flagGeo = new THREE.PlaneGeometry(1.2, 0.9);
    flagGeo.translate(0, 1.75, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x220800 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, gateZs.length * 2);
    const flags = new THREE.InstancedMesh(flagGeo, flagMat, gateZs.length);
    const orange = new THREE.Color('#ff5a1f');
    const blue = new THREE.Color('#2f6bff');
    const dummy = new THREE.Object3D();

    gateZs.forEach((z, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const heading = Math.atan(pathSlope(z));
      const cx = pathX(z) + side * 6.5;
      const color = i % 2 === 0 ? orange : blue;
      [-0.6, 0.6].forEach((offset, p) => {
        const x = cx + offset * Math.cos(heading);
        const pz = z - offset * Math.sin(heading);
        dummy.position.set(x, heightAt(x, pz) - 0.1, pz);
        dummy.rotation.set(0, heading, 0);
        dummy.updateMatrix();
        poles.setMatrixAt(i * 2 + p, dummy.matrix);
        poles.setColorAt(i * 2 + p, color);
      });
      dummy.position.set(cx, heightAt(cx, z) - 0.1, z);
      dummy.rotation.set(0, heading, 0);
      dummy.updateMatrix();
      flags.setMatrixAt(i, dummy.matrix);
      flags.setColorAt(i, color);
    });
    [poles, flags].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    });
  }

  buildLodge() {
    const lodge = new THREE.Group();
    const x = pathX(LODGE_Z) - 26;
    lodge.position.set(x, heightAt(x, LODGE_Z) - 0.5, LODGE_Z);

    const wood = new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.85 });
    const snowMat = new THREE.MeshStandardMaterial({ color: '#eef3f9', roughness: 0.9 });
    const glow = new THREE.MeshBasicMaterial({ color: '#ffb066' });

    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 18), wood);
    body.position.y = 3.5;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-8.5, 0);
    roofShape.lineTo(8.5, 0);
    roofShape.lineTo(0, 7.5);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 20, bevelEnabled: false });
    roofGeo.translate(0, 7, -10);
    const roof = new THREE.Mesh(roofGeo, snowMat);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 1.6), wood);
    chimney.position.set(3.5, 11.5, 4);
    lodge.add(body, roof, chimney);

    const windowGeo = new THREE.PlaneGeometry(2.2, 2.6);
    [[-3.6, 3.4], [3.6, 3.4], [0, 9.2]].forEach(([wx, wy]) => {
      const pane = new THREE.Mesh(windowGeo, glow);
      pane.position.set(wx, wy, -9.05);
      pane.rotation.y = Math.PI;
      lodge.add(pane);
    });
    [-5, 0, 5].forEach((wz) => {
      const pane = new THREE.Mesh(windowGeo, glow);
      pane.position.set(7.05, 3.4, wz);
      pane.rotation.y = Math.PI / 2;
      lodge.add(pane);
    });

    this.lodgeLight = new THREE.PointLight('#ffa65c', 420, 140, 2);
    this.lodgeLight.position.set(0, 5, -16);
    lodge.add(this.lodgeLight);

    const igloo = new THREE.Mesh(new THREE.SphereGeometry(4.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), snowMat);
    igloo.position.set(18, -0.2, -6);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 16, 1, false, 0, Math.PI), snowMat);
    door.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    door.position.set(18, 0, -10);
    lodge.add(igloo, door);

    this.scene.add(lodge);
  }

  buildFeatures() {
    const context = { scene: this.scene, emit: this.emit, mobile: this.mobile };
    this.snow = new Snowfall({ ...context, pixelRatio: this.pixelRatio });
    this.skis = new SkiRig({ ...context, camera: this.camera, renderer: this.renderer });
    this.ice = new IceBlocks({ ...context, icons: this.iceIcons });
    this.wildlife = new Wildlife(context);
    this.avalanche = new Avalanche(context);
    this.clickables = [...this.ice.clickables, ...this.wildlife.clickables, ...this.avalanche.clickables];
  }

  async buildSnowName() {
    if (!this.nameElement) return;
    this.snowName = new SnowName({ element: this.nameElement, mobile: this.mobile });
    const ok = await this.snowName.sample().catch(() => false);
    if (this.disposed) return;
    if (ok) this.emit('name-ready');
    this.handleNameResize = () => {
      clearTimeout(this.nameResizeTimer);
      this.nameResizeTimer = setTimeout(() => this.snowName && this.snowName.sample(), 200);
    };
    window.addEventListener('resize', this.handleNameResize);
  }

  // ---------- Interaction ----------

  pick(clientX, clientY) {
    if (!this.clickables.length) return null;
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickables, true);
    for (const hit of hits) {
      let shown = true;
      for (let o = hit.object; o; o = o.parent) if (!o.visible) shown = false;
      if (!shown) continue;
      let target = hit.object;
      while (target && !target.userData.onClick) target = target.parent;
      if (target) return target;
    }
    // The sun (or the moon, after dark) is clickable from above the clouds: it switches night on and off.
    const aboveClouds = this.camera.position.y > CLOUD_Y + 20;
    if (aboveClouds && this.raycaster.ray.direction.dot(this.sunDir) > SUN_CLICK_COS) return this.sunTarget;
    return null;
  }

  pointerMoved(event) {
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
    const now = performance.now();
    if (now - this.lastHover < 80) return;
    this.lastHover = now;
    const overPage = event.target && event.target.closest && event.target.closest(PAGE_CONTROLS);
    const hovering = !overPage && Boolean(this.pick(event.clientX, event.clientY));
    if (hovering !== this.hovering) {
      this.hovering = hovering;
      document.body.style.cursor = hovering ? 'pointer' : '';
    }
  }

  clicked(event) {
    if (event.target && event.target.closest && event.target.closest(PAGE_CONTROLS)) return;
    const target = this.pick(event.clientX, event.clientY);
    if (target) target.userData.onClick();
  }

  // ---------- Per frame ----------

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.baseFov = width < height ? 72 : this.mobile ? 68 : 56;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.snow) this.snow.setPixelRatio(this.pixelRatio, buffer);
    if (this.skis) this.skis.setScale(buffer.y, this.baseFov);
    if (this.avalanche) this.avalanche.setScale(buffer.y, this.baseFov);
    if (this.snowName) this.snowName.resize(width, height, this.pixelRatio);
  }

  // Watch the frame rate and step quality down on devices that are struggling.
  trackPerformance(rawDt, time) {
    if (rawDt > 0.25 || time < 4 || this.quality >= 3) return;
    this.perf.time += rawDt;
    this.perf.frames += 1;
    if (this.perf.time < 2) return;
    const average = this.perf.time / this.perf.frames;
    this.perf.time = 0;
    this.perf.frames = 0;
    if (average <= 1 / 40) return;
    this.quality += 1;
    this.pixelRatio = Math.min(this.pixelRatio, [1.75, 1.25, 1.0, 0.8][this.quality]);
    if (this.quality >= 2) {
      this.snow.setDensity(0.55);
      this.skis.sprayEnabled = false;
      this.avalanche.setBudget(0.5);
    }
    this.resize();
  }

  frame(timestamp) {
    this.raf = requestAnimationFrame(this.frame);
    this.timer.update(timestamp);
    const rawDt = this.timer.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const time = this.timer.getElapsed();
    this.trackPerformance(rawDt, time);

    const previous = this.progress;
    this.progress += (this.target - this.progress) * (1 - Math.exp(-dt * 3.2));
    if (Math.abs(this.target - this.progress) < 1e-5) this.progress = this.target;
    const p = this.progress;
    const z = p * CAMERA_END;
    const prevZ = previous * CAMERA_END;
    const rawSpeed = (z - prevZ) / Math.max(dt, 1e-4);
    this.signedSpeed += (rawSpeed - this.signedSpeed) * (1 - Math.exp(-dt * 4));
    this.speed = Math.abs(this.signedSpeed);
    this.night += (this.nightTarget - this.night) * (1 - Math.exp(-dt * 1.4));
    const night = this.night;

    // Stand on the summit looking out, then drop in and follow the run.
    const x = pathX(z);
    const ground = heightAt(x, z);
    const intro = 1 - smoothstep(0, 0.05, p);
    const cam = this.camera;
    this.basePosition.set(x, ground + EYE + intro * 16, z);
    if (this.lastBase && dt > 0) {
      const velocity = this.basePosition.clone().sub(this.lastBase).divideScalar(dt);
      this.camVel.lerp(velocity, 1 - Math.exp(-dt * 8));
    }
    this.lastBase = (this.lastBase || new THREE.Vector3()).copy(this.basePosition);
    cam.position.copy(this.basePosition);

    const motion = this.reducedMotion ? 0 : Math.min(this.speed / 260, 1);
    const shake = this.reducedMotion ? 0 : motion * 0.07 + this.avalanche.shake + this.wildlife.shake * 0.5;
    if (shake > 0) {
      cam.position.y += Math.sin(time * 31) * shake + Math.sin(time * 17.3) * shake * 0.6;
      cam.position.x += Math.sin(time * 23.7) * shake * 0.5;
    }

    const aheadZ = z + 42;
    const aheadX = pathX(aheadZ);
    this.lookTarget.set(aheadX, heightAt(aheadX, aheadZ) + EYE * 0.5, aheadZ);
    this.vista.set(x, cam.position.y - 70, z + 900);
    this.lookTarget.lerp(this.vista, intro);
    this.smoothPointer.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    this.lookTarget.x -= this.smoothPointer.x * 6;
    this.lookTarget.y += this.smoothPointer.y * 3;
    cam.lookAt(this.lookTarget);

    // Lean into each turn the way a skier banks on edge.
    const turn = Math.atan(pathSlope(z + 30)) - Math.atan(pathSlope(z));
    const targetRoll = this.reducedMotion ? 0 : Math.max(-0.3, Math.min(0.3, turn * 1.8)) * Math.min(1, 0.25 + this.speed / 60);
    this.roll += (targetRoll - this.roll) * (1 - Math.exp(-dt * 3));
    cam.rotateZ(this.roll);

    // Speed you can feel: the view widens as you go faster.
    cam.fov = this.baseFov + (this.reducedMotion ? 0 : Math.min(this.speed / 520, 1) * 9);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    const frame = {
      dt, time, z, prevZ, progress: p, speed: this.speed, signedSpeed: this.signedSpeed,
      turn, camVel: this.camVel, camera: cam, night, reducedMotion: this.reducedMotion,
      autopilot: performance.now() < (this.autopilotUntil || 0),
    };
    this.avalanche.update(frame);
    this.wildlife.update(frame);

    // Thin, clear air at the top; a whiteout through the cloud deck (or an avalanche); cold haze below.
    const camY = cam.position.y;
    const space = smoothstep(CLOUD_Y + 30, PEAK - 60, camY);
    const whiteout = Math.min(1, Math.max(1 - smoothstep(0, 55, Math.abs(camY - CLOUD_Y)), this.avalanche.whiteout));
    const fog = this.scene.fog;
    tmpColor.copy(this.fogNight).lerp(this.fogNightWhite, whiteout);
    fog.color.copy(this.fogValley).lerp(this.fogHigh, space).lerp(this.fogWhite, whiteout).lerp(tmpColor, night);
    fog.density = lerp(0.0019, 0.00016, space) + whiteout * 0.012;
    this.sun.intensity = lerp(lerp(0.95, 2.6, space), 0.32, night);
    this.sun.color.copy(this.sunColor).lerp(this.moonColor, night);
    this.hemi.intensity = lerp(lerp(1.2, 0.7, space), 0.16, night);
    this.fill.intensity = lerp(0.5, 0.08, night);
    this.headlamp.intensity = night * 600;
    this.lodgeLight.intensity = 420 + night * 700;
    this.renderer.toneMappingExposure = lerp(lerp(1.15, 1.05, space), 1.0, night);

    this.sky.position.copy(cam.position);
    const skyU = this.skyMaterial.uniforms;
    skyU.uSpace.value = space;
    skyU.uWhiteout.value = whiteout;
    skyU.uNight.value = night;
    skyU.uTime.value = time;

    this.clouds.position.x = cam.position.x;
    this.clouds.position.z = cam.position.z;
    const cloudU = this.cloudMaterial.uniforms;
    cloudU.uTime.value = time;
    cloudU.uAbove.value = smoothstep(CLOUD_Y - 4, CLOUD_Y + 4, camY);
    cloudU.uNight.value = night;
    cloudU.uCam.value.copy(cam.position);
    cloudU.uHorizon.value.copy(this.horizonValley).lerp(this.horizonHigh, space).lerp(this.horizonNight, night);

    this.snow.update({
      time, camera: cam, camVel: this.camVel, night, reducedMotion: this.reducedMotion,
      amount: Math.min(1, 0.18 + 0.82 * (1 - space) + whiteout),
    });
    this.skis.update(frame);
    this.ice.update(frame);
    this.tracks.update(frame);
    if (this.snowName) this.snowName.update(dt, time);

    this.renderer.render(this.scene, cam);
    if (this.snowName) this.snowName.render(this.renderer);

    if (this.onTelemetry && time - this.lastTelemetry > 1 / 30) {
      this.lastTelemetry = time;
      const altitude = displayAltitude(ground);
      this.onTelemetry({
        altitude,
        temperature: displayTemperature(altitude),
        speed: Math.min(199, this.speed * 0.32),
        progress: p,
      });
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.nameResizeTimer);
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('pointermove', this.handlePointer);
      window.removeEventListener('click', this.handleClick);
    }
    if (this.handleNameResize) window.removeEventListener('resize', this.handleNameResize);
    document.body.style.cursor = '';
    [this.skis, this.avalanche, this.snowName].forEach((feature) => feature && feature.dispose());
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) [].concat(object.material).forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
    if (this.groundTexture) this.groundTexture.dispose();
    this.renderer.dispose();
  }
}
