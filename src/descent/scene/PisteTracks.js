import * as THREE from 'three';
import { CAMERA_END, heightAt, pathX } from './world';

const HALF_WIDTH = 13;
const LIFT = 0.15; // sits just above the snow so it never z-fights with the terrain

const VERTEX = /* glsl */ `
  attribute vec2 aRun;
  varying vec2 vRun;
  #include <fog_pars_vertex>
  void main() {
    vRun = aRun;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// vRun.x is the distance across the run, vRun.y the distance down it.
const FRAGMENT = /* glsl */ `
  uniform float uNight;
  varying vec2 vRun;
  #include <fog_pars_fragment>

  float groove(float x, float width) {
    float w = max(width, fwidth(x) * 1.5);
    return 1.0 - smoothstep(0.0, w, abs(x));
  }

  void main() {
    float u = vRun.x;
    float z = vRun.y;

    // Corduroy from the groomer, faded out where it would shimmer in the distance.
    float cordFreq = 9.0;
    float cord = (0.5 + 0.5 * sin(u * cordFreq)) * (1.0 - smoothstep(0.25, 0.7, fwidth(u * cordFreq)));

    // A few earlier skiers' carving tracks: pairs of edges snaking down the run.
    float tracks = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float centre = sin(z * (0.034 + fi * 0.011) + fi * 1.7) * (3.0 + fi * 1.6) + (fi - 1.5) * 2.4;
      tracks += groove(u - centre - 0.13, 0.05) + groove(u - centre + 0.13, 0.05);
    }

    float edge = 1.0 - smoothstep(9.0, 13.0, abs(u));
    float alpha = (cord * 0.07 + min(tracks, 1.0) * 0.24) * edge;
    gl_FragColor = vec4(mix(vec3(0.36, 0.45, 0.62), vec3(0.05, 0.08, 0.16), uNight), alpha);
    #include <fog_fragment>
  }
`;

// A ribbon draped over the groomed piste, carrying corduroy and old ski tracks.
export default class PisteTracks {
  constructor({ scene }) {
    const step = 2;
    const zStart = 150;
    const zEnd = CAMERA_END + 160;
    const rows = Math.ceil((zEnd - zStart) / step) + 1;
    const cols = HALF_WIDTH * 2 + 1;
    const positions = new Float32Array(rows * cols * 3);
    const run = new Float32Array(rows * cols * 2);
    for (let j = 0; j < rows; j++) {
      const z = zStart + j * step;
      const px = pathX(z);
      for (let i = 0; i < cols; i++) {
        const u = i - HALF_WIDTH;
        const v = j * cols + i;
        positions[v * 3] = px + u;
        positions[v * 3 + 1] = heightAt(px + u, z) + LIFT;
        positions[v * 3 + 2] = z;
        run[v * 2] = u;
        run[v * 2 + 1] = z;
      }
    }
    const indices = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = j * cols + i;
        const c = a + cols;
        indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRun', new THREE.BufferAttribute(run, 2));
    geo.setIndex(indices);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uNight: { value: 0 } },
      transparent: true,
      depthWrite: false,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  update({ night }) {
    this.material.uniforms.uNight.value = night;
  }
}
