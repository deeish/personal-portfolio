import * as THREE from 'three';
import { seededRandom } from './world';

// Each flake is a small quad stretched in screen space along the path it
// travelled over the last instant, so at speed the snow becomes streaks.
const VERTEX = /* glsl */ `
  attribute vec3 aOffset;
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform vec3 uCamVel;
  uniform float uStreak;
  uniform float uAmount;
  uniform float uSize;
  uniform vec2 uResolution;
  varying float vAlong;
  varying float vAcross;
  varying float vLength;
  varying float vRadius;
  varying float vAlpha;

  void main() {
    float fall = 3.5 + aSeed * 4.0;
    vec3 p = aOffset;
    p.y -= uTime * fall;
    p.x += uTime * 1.8 + sin(uTime * 0.8 + aSeed * 40.0) * 1.6;
    p.z -= uTime * 1.2 - cos(uTime * 0.6 + aSeed * 23.0) * 1.6;

    // Flakes stay fixed in the world; the box of them wraps around the camera.
    vec3 rel = mod(p - uCam, uBox) - uBox * 0.5;
    vec3 world = uCam + rel;
    vec4 head = projectionMatrix * viewMatrix * vec4(world, 1.0);
    // Where this flake appeared a moment ago, relative to the moving camera.
    vec4 tail = projectionMatrix * viewMatrix * vec4(world + (uCamVel + vec3(0.0, fall, 0.0)) * uStreak, 1.0);

    vec3 edge = abs(rel) / uBox;
    float visible = (1.0 - smoothstep(0.3, 0.5, max(edge.x, max(edge.y, edge.z)))) * step(fract(aSeed * 13.7), uAmount);
    if (head.w < 0.2 || visible <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vAlpha = 0.0;
      return;
    }
    tail.w = max(tail.w, 0.2);

    vec2 halfRes = uResolution * 0.5;
    vec2 a = head.xy / head.w * halfRes;
    vec2 b = tail.xy / tail.w * halfRes;
    vec2 dir = b - a;
    float len = min(length(dir), 220.0);
    vec2 axis = len > 0.01 ? normalize(dir) : vec2(0.0, 1.0);
    vec2 perp = vec2(-axis.y, axis.x);
    float radius = clamp(uSize * (0.45 + aSeed) * (30.0 / head.w), 0.6, 20.0);

    float along = position.y * (len + 2.0 * radius) - radius;
    float across = position.x * radius;
    vec2 px = a + axis * along + perp * across;
    gl_Position = vec4(px / halfRes * head.w, head.z, head.w);

    vAlong = along;
    vAcross = across;
    vLength = len;
    vRadius = radius;
    // Long streaks spread the same light over more pixels, so they fade a little.
    vAlpha = visible * clamp(radius * 2.0 / (radius * 2.0 + len * 0.15), 0.45, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uNight;
  varying float vAlong;
  varying float vAcross;
  varying float vLength;
  varying float vRadius;
  varying float vAlpha;
  void main() {
    float t = clamp(vAlong, 0.0, vLength);
    float d = length(vec2(vAlong - t, vAcross));
    float a = (1.0 - smoothstep(vRadius * 0.35, vRadius, d)) * vAlpha * 0.9;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.96, 0.98, 1.0) * mix(1.0, 0.6, uNight), a);
  }
`;

export default class Snowfall {
  constructor({ scene, mobile, pixelRatio }) {
    this.count = mobile ? 2600 : 7000;
    const box = new THREE.Vector3(150, 80, 150);
    const rand = seededRandom(99);
    const offsets = new Float32Array(this.count * 3);
    const seeds = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      offsets[i * 3] = rand() * box.x;
      offsets[i * 3 + 1] = rand() * box.y;
      offsets[i * 3 + 2] = rand() * box.z;
      seeds[i] = rand();
    }

    // position.x runs across the flake (-1..1), position.y along its streak (0..1).
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    geo.setIndex([0, 1, 2, 2, 1, 3]);
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    geo.instanceCount = this.count;

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: box },
        uCamVel: { value: new THREE.Vector3() },
        uStreak: { value: 0.045 },
        uAmount: { value: 0.2 },
        uSize: { value: 2.2 * pixelRatio },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uNight: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }

  setDensity(scale) {
    this.mesh.geometry.instanceCount = Math.floor(this.count * scale);
  }

  setPixelRatio(pixelRatio, resolution) {
    this.material.uniforms.uSize.value = 2.2 * pixelRatio;
    this.material.uniforms.uResolution.value.copy(resolution);
  }

  update({ time, camera, camVel, amount, night, reducedMotion }) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uCam.value.copy(camera.position);
    u.uCamVel.value.copy(camVel);
    u.uStreak.value = reducedMotion ? 0 : 0.045;
    u.uAmount.value = amount;
    u.uNight.value = night;
  }
}
