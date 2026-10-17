import * as THREE from 'three';
import { noise2, smoothstep } from './world';

const LENGTH = 1.8;
const WIDTH = 0.13;
// Half-width along a wide twin-tip powder ski, tail (0) to tip: rounded tail,
// a gentle waist, a broad shovel and a rounded tip.
const SIDECUT = [[0, 0], [0.03, 0.036], [0.1, 0.058], [0.3, 0.062], [0.9, 0.055], [1.5, 0.064], [1.68, 0.06], [1.76, 0.036], [1.8, 0]];

const SPRAY_VERTEX = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  uniform float uScale;
  varying float vLife;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vLife = aLife;
    // Puffs grow a little as they age.
    gl_PointSize = aSize * (1.6 - aLife * 0.6) * uScale / max(-mv.z, 0.05);
  }
`;

const SPRAY_FRAGMENT = /* glsl */ `
  uniform float uNight;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.15, 0.5, d)) * vLife * 0.85;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.97, 0.99, 1.0) * mix(1.0, 0.7, uNight), a);
  }
`;

function skiGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  SIDECUT.slice(1).forEach(([s, hw]) => shape.lineTo(hw, s));
  SIDECUT.slice(1, -1).reverse().forEach(([s, hw]) => shape.lineTo(-hw, s));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: false, curveSegments: 1 });
  // Lay it flat: length runs forward (-z), thickness up (+y).
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const s = -pos.getZ(i);
    let lift = 0;
    // Twin tip: the shovel and the tail both turn up.
    if (s > 1.5) lift += Math.pow((s - 1.5) / 0.3, 2) * 0.09;
    if (s < 0.3) lift += Math.pow((0.3 - s) / 0.3, 2) * 0.07;
    pos.setY(i, pos.getY(i) + lift);
  }
  geo.computeVertexNormals();
  return geo;
}

const BLUE = [[10, 24, 74], [24, 78, 230], [86, 170, 255], [225, 242, 255]];
const GREY = [[34, 38, 45], [104, 112, 122], [186, 192, 200], [238, 241, 245]];

function ramp(stops, k) {
  const f = Math.min(0.999, Math.max(0, k)) * (stops.length - 1);
  const i = Math.floor(f);
  const t = f - i;
  return stops[i].map((c, j) => c + (stops[i + 1][j] - c) * t);
}

// Two soft octaves: big, smooth swirls rather than grain.
const fbm = (x, y) => noise2(x, y) * 0.78 + noise2(x * 2.1 + 7.3, y * 2.1 - 3.1) * 0.22;

// Topsheet: marbled paint, electric blue up front and storm grey behind, meeting
// in a flowing line with a thin orange seam. The DS mark sits on the shovel and
// the name runs down the tail. Painted once, procedurally, onto a canvas.
function marbledTopsheet() {
  const width = 96;
  const height = 768;
  const image = new ImageData(width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    const s = 1 - y / (height - 1); // 1 at the tip (canvas top), 0 at the tail
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      // Domain-warped noise, stretched along the ski, swirls like marbled paint.
      const px = u * 0.7;
      const py = s * 3;
      const qx = fbm(px, py);
      const qy = fbm(px + 5.2, py + 1.3);
      const rx = fbm(px + 2 * qx + 1.7, py + 2 * qy + 9.2);
      const ry = fbm(px + 2 * qx + 8.3, py + 2 * qy + 2.8);
      const v = fbm(px + 2.4 * rx, py + 2.4 * ry);
      const vein = Math.pow(Math.abs(Math.sin(v * 6 + rx * 1.5)), 20) * 0.7;
      const k = 0.5 + 0.7 * v + vein * 0.5;

      // Blue takes the front of the ski, grey the rest, so both show from the skier's view.
      // They meet along a gentle wave with a thin orange seam.
      const meet = s + noise2(u * 1.5 + 3.3, 0.7) * 0.035 + (u - 0.5) * 0.05;
      const front = smoothstep(0.6, 0.63, meet);
      const blue = ramp(BLUE, k);
      const grey = ramp(GREY, k);
      const seam = 1 - smoothstep(0.003, 0.008, Math.abs(meet - 0.615));
      const rail = 0.55 + 0.45 * smoothstep(0, 0.06, Math.min(u, 1 - u));
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const paint = grey[c] + (blue[c] - grey[c]) * front;
        data[i + c] = (paint + ([255, 106, 43][c] - paint) * seam) * rail;
      }
      data[i + 3] = 255;
    }
  }
  return image;
}

function skiTexture(renderer) {
  const base = marbledTopsheet();
  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // Top-face UVs are the shape's own coordinates; map them onto the canvas.
  texture.repeat.set(1 / WIDTH, 1 / LENGTH);
  texture.offset.set(0.5, 0);

  const logo = new Image();
  const paint = () => {
    g.putImageData(base, 0, 0);
    if (logo.complete && logo.naturalWidth) {
      g.save();
      g.shadowColor = 'rgba(0, 0, 0, 0.45)';
      g.shadowBlur = 6;
      g.drawImage(logo, 20, 64, 56, 56);
      g.restore();
    }
    g.save();
    g.translate(58, 700);
    g.rotate(-Math.PI / 2);
    g.font = '700 17px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = 'rgba(16, 19, 24, 0.85)';
    g.fillText('DYLAN SALMO', 0, 0);
    g.restore();
    texture.needsUpdate = true;
  };
  logo.onload = paint;
  logo.src = `${process.env.PUBLIC_URL}/images/DS_logo_kit/DS_icon_white_transparent_128.png`;
  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  return texture;
}

// The skier's own skis, hung under the camera, plus the powder they kick up.
export default class SkiRig {
  constructor({ scene, camera, renderer, mobile }) {
    this.camera = camera;
    this.mobile = mobile;
    this.texture = skiTexture(renderer);
    const geo = skiGeometry();
    const material = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.3, metalness: 0.1, fog: false });

    this.rig = new THREE.Group();
    this.skis = [-1, 1].map((side) => {
      const ski = new THREE.Mesh(geo, material);
      ski.position.x = side * 0.165;
      ski.renderOrder = 8;
      this.rig.add(ski);
      return ski;
    });
    this.base = new THREE.Vector3(0, mobile ? -0.86 : -0.8, mobile ? -0.55 : -0.6);
    this.rig.position.copy(this.base);
    this.rig.scale.setScalar(mobile ? 0.85 : 1);
    camera.add(this.rig);

    this.edge = 0;
    this.lastEnd = 0;
    this.spray = this.buildSpray(scene, mobile ? 260 : 520);
    this.emitter = new THREE.Vector3();
    this.lateral = new THREE.Vector3();
    this.sprayEnabled = true;
  }

  buildSpray(scene, count) {
    const positions = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const size = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: SPRAY_VERTEX,
      fragmentShader: SPRAY_FRAGMENT,
      uniforms: { uScale: { value: 400 }, uNight: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    points.renderOrder = 7;
    scene.add(points);
    return {
      points,
      count,
      velocity: new Float32Array(count * 3),
      maxLife: new Float32Array(count),
      age: new Float32Array(count).fill(1),
      cursor: 0,
      pending: 0,
    };
  }

  emit(n, side, dirSign, camVel) {
    const s = this.spray;
    const pos = s.points.geometry.attributes.position.array;
    for (let k = 0; k < n; k++) {
      const i = s.cursor;
      s.cursor = (s.cursor + 1) % s.count;
      const ski = this.skis[side < 0 ? 0 : 1];
      this.emitter.set(side * 0.05, 0.02, -0.55 - Math.random() * 0.6).applyMatrix4(ski.matrixWorld);
      pos[i * 3] = this.emitter.x;
      pos[i * 3 + 1] = this.emitter.y;
      pos[i * 3 + 2] = this.emitter.z;
      // Mostly carried along with the skier, thrown out of the turn and up.
      const out = (2 + Math.random() * 3.5) * dirSign;
      s.velocity[i * 3] = camVel.x * 0.88 + this.lateral.x * out + (Math.random() - 0.5);
      s.velocity[i * 3 + 1] = camVel.y * 0.88 + 1.2 + Math.random() * 2.4;
      s.velocity[i * 3 + 2] = camVel.z * 0.88 + this.lateral.z * out + (Math.random() - 0.5);
      s.maxLife[i] = 0.45 + Math.random() * 0.5;
      s.age[i] = 0;
      s.points.geometry.attributes.aSize.array[i] = 0.025 + Math.random() * 0.05;
    }
  }

  setScale(drawingBufferHeight, fov) {
    this.spray.points.material.uniforms.uScale.value = drawingBufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  }

  update({ dt, time, progress, speed, turn, camVel, night, reducedMotion }) {
    const speedF = Math.min(speed / 420, 1);
    const end = smoothstep(0.962, 1.0, progress);

    // Roll onto the edges and steer into the turn; at the bottom, a hockey stop.
    const targetEdge = reducedMotion ? 0 : Math.max(-0.45, Math.min(0.45, turn * 5)) * Math.min(1, 0.3 + speedF);
    this.edge += (targetEdge - this.edge) * (1 - Math.exp(-dt * 6));
    const chatter = reducedMotion ? 0 : speedF * 0.006;
    // Turn about the middle of the skis (not the tails) so they stay in view, even sideways.
    const yaw = -this.edge * 0.45 + end * 1.05;
    const pivot = (LENGTH / 2) * this.rig.scale.x;
    this.rig.rotation.set(0.02 + Math.sin(time * 47) * chatter, yaw, 0);
    this.rig.position.set(
      this.base.x + pivot * Math.sin(yaw),
      this.base.y,
      this.base.z - pivot + pivot * Math.cos(yaw),
    );
    this.skis.forEach((ski, i) => {
      const side = i === 0 ? -1 : 1;
      ski.rotation.z = this.edge * 1.1 + Math.sin(time * 61 + i) * chatter;
      // The inside ski runs a touch behind the outside one.
      ski.position.z = side * this.edge * 0.12 + end * side * 0.05;
      ski.position.y = this.edge * 0.03 * side;
    });

    // Spray: thrown off the edges in proportion to speed and how hard you carve.
    this.camera.updateMatrixWorld(true);
    this.lateral.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.lateral.y = 0;
    this.lateral.normalize();
    const s = this.spray;
    const stopping = Math.max(0, end - this.lastEnd) / Math.max(dt, 1e-3);
    this.lastEnd = end;
    if (this.sprayEnabled && !reducedMotion) {
      s.pending += dt * (speedF * (30 + Math.abs(turn) * 2400) + stopping * 2200);
      const n = Math.min(Math.floor(s.pending), 60);
      s.pending -= n;
      if (n > 0) {
        const dirSign = this.edge >= 0 ? -1 : 1;
        this.emit(Math.ceil(n / 2), -1, dirSign, camVel);
        this.emit(Math.floor(n / 2), 1, dirSign, camVel);
      }
    }

    const pos = s.points.geometry.attributes.position.array;
    const life = s.points.geometry.attributes.aLife.array;
    for (let i = 0; i < s.count; i++) {
      if (s.age[i] >= 1) {
        life[i] = 0;
        continue;
      }
      s.age[i] += dt / s.maxLife[i];
      s.velocity[i * 3 + 1] -= 9 * dt;
      pos[i * 3] += s.velocity[i * 3] * dt;
      pos[i * 3 + 1] += s.velocity[i * 3 + 1] * dt;
      pos[i * 3 + 2] += s.velocity[i * 3 + 2] * dt;
      life[i] = Math.max(0, 1 - s.age[i]);
    }
    s.points.geometry.attributes.position.needsUpdate = true;
    s.points.geometry.attributes.aLife.needsUpdate = true;
    s.points.geometry.attributes.aSize.needsUpdate = true;
    s.points.material.uniforms.uNight.value = night;
  }

  dispose() {
    this.texture.dispose();
  }
}
