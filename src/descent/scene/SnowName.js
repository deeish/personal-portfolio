import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aSeed;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.75 + aSeed * 0.6);
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.18, 0.5, d)) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(0.96, 0.98, 1.0, a);
  }
`;

// The same grains drawn big, dark and faint underneath: a text shadow made of snow,
// so the name holds up against bright cloud.
const SHADOW_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha * 0.09;
    if (a < 0.004) discard;
    gl_FragColor = vec4(0.016, 0.024, 0.05, a);
  }
`;

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// The hero name rebuilt from grains of snow. The pointer ploughs through it like
// powder, displaced grains pour downhill and drift back into the letters, and
// scrolling away blows the whole thing off into the snowfall.
// The real <h1> stays in the page (just made transparent) for screen readers and search.
export default class SnowName {
  constructor({ element, mobile }) {
    this.element = element;
    this.mobile = mobile;
    this.step = mobile ? 3.5 : 2.6;
    this.radius = mobile ? 55 : 75;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uSize: { value: 3 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.shadowMaterial = this.material.clone();
    this.shadowMaterial.fragmentShader = SHADOW_FRAGMENT;
    this.shadowMaterial.uniforms = { uSize: { value: 12 } };
    this.points = null;
    this.shadow = null;
    this.ready = false;
    this.pointer = { x: 0, y: 0, lastX: null, lastY: null, active: false };
    this.handleMove = (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
    };
    this.handleLeave = () => {
      this.pointer.active = false;
      this.pointer.lastX = null;
    };
    window.addEventListener('pointermove', this.handleMove, { passive: true });
    window.addEventListener('pointerdown', this.handleMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.handleLeave);
    window.addEventListener('pointerup', this.handleLeave);
    // On touch screens the browser takes over once a swipe turns into a scroll.
    window.addEventListener('pointercancel', this.handleLeave);
  }

  // Rasterise the heading exactly where the browser laid it out, then turn its pixels into grains.
  async sample() {
    const el = this.element;
    if (!el) return false;
    const lines = [...el.querySelectorAll('span')];
    if (!lines.length) return false;
    const style = window.getComputedStyle(lines[0]);
    const family = style.fontFamily;
    const weight = style.fontWeight;
    const size = parseFloat(style.fontSize);
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(`${weight} ${size}px ${family}`);
      } catch (error) {
        // Fall back to whatever font is available.
      }
    }

    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(box.width);
    canvas.height = Math.ceil(box.height + size * 0.3);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.font = `${weight} ${size}px ${family}`;
    if ('fontStretch' in g) g.fontStretch = 'expanded';
    if ('letterSpacing' in g) g.letterSpacing = style.letterSpacing;

    lines.forEach((line) => {
      const text = line.textContent.toUpperCase();
      const range = document.createRange();
      range.selectNodeContents(line);
      const glyphs = range.getBoundingClientRect();
      const lineBox = line.getBoundingClientRect();
      const metrics = g.measureText(text);
      // Stretch to the browser's measured width in case canvas ignores font-stretch.
      const scaleX = metrics.width ? glyphs.width / metrics.width : 1;
      const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent;
      const baseline = lineBox.top - box.top + (lineBox.height - (ascent + descent)) / 2 + ascent;
      g.save();
      g.translate(glyphs.left - box.left, baseline);
      g.scale(scaleX, 1);
      g.fillText(text, 0, 0);
      g.restore();
    });

    const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height);
    const homes = [];
    for (let y = 0; y < height; y += this.step) {
      for (let x = 0; x < width; x += this.step) {
        const px = Math.round(x);
        const py = Math.round(y);
        if (data[(py * width + px) * 4 + 3] > 128) homes.push(x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5);
      }
    }
    this.build(homes, box);
    return true;
  }

  build(homes, box) {
    if (this.points) {
      this.scene.remove(this.points, this.shadow);
      this.points.geometry.dispose();
    }
    const count = homes.length / 2;
    this.count = count;
    this.home = new Float32Array(homes);
    this.offset = new Float32Array(count * 2);
    this.velocity = new Float32Array(count * 2);
    this.wind = new Float32Array(count * 2);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random();
      this.wind[i * 2] = 250 + Math.random() * 1100;
      this.wind[i * 2 + 1] = 60 + Math.random() * 420;
    }
    this.seeds = seeds;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.shadow = new THREE.Points(geo, this.shadowMaterial);
    this.shadow.frustumCulled = false;
    this.scene.add(this.shadow, this.points);
    this.origin = { x: box.left + window.scrollX, y: box.top + window.scrollY };
    this.ready = true;
  }

  resize(width, height, pixelRatio) {
    this.camera.right = width;
    this.camera.bottom = -height;
    this.camera.updateProjectionMatrix();
    this.material.uniforms.uSize.value = (this.mobile ? 2.8 : 2.9) * pixelRatio;
    this.shadowMaterial.uniforms.uSize.value = 14 * pixelRatio;
  }

  update(dt, time) {
    if (!this.ready) return;
    const scrollY = window.scrollY;
    const blow = smooth(0, window.innerHeight * 0.6, scrollY);
    this.points.visible = blow < 0.999;
    this.shadow.visible = this.points.visible;
    if (!this.points.visible) return;

    const f = Math.min(dt * 60, 2);
    const p = this.pointer;
    let pvx = 0;
    let pvy = 0;
    if (p.active && p.lastX !== null) {
      pvx = Math.max(-60, Math.min(60, p.x - p.lastX));
      pvy = Math.max(-60, Math.min(60, p.y - p.lastY));
    }
    p.lastX = p.active ? p.x : null;
    p.lastY = p.y;

    const left = this.origin.x - window.scrollX;
    const top = this.origin.y - scrollY;
    const r = this.radius;
    const r2 = r * r;
    const blow2 = blow * blow;
    const alpha = 1 - smooth(0.55, 1, blow);
    const pos = this.points.geometry.attributes.position.array;
    const alphas = this.points.geometry.attributes.aAlpha.array;
    const { home, offset, velocity, wind, seeds } = this;

    for (let i = 0; i < this.count; i++) {
      const i2 = i * 2;
      const seed = seeds[i];
      const baseX = left + home[i2] + blow2 * wind[i2];
      const baseY = top + home[i2 + 1] - blow2 * wind[i2 + 1] + Math.sin(time * 1.7 + seed * 12) * blow * 14;
      let vx = velocity[i2];
      let vy = velocity[i2 + 1];
      const ox = offset[i2];
      const oy = offset[i2 + 1];

      if (p.active) {
        const dx = baseX + ox - p.x;
        const dy = baseY + oy - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) + 0.001;
          const push = (1 - d / r) * f;
          vx += (pvx * 0.22 + (dx / d) * 1.6) * push;
          vy += (pvy * 0.22 + (dy / d) * 1.6) * push;
        }
      }
      // Loose grains pour downhill a little before the letters pull them home.
      const displaced = Math.abs(ox) + Math.abs(oy);
      if (displaced > 1.5) vy += 0.09 * Math.min(1, displaced / 40) * f;
      vx += -ox * 0.006 * f;
      vy += -oy * 0.006 * f;
      const damping = Math.pow(0.9, f);
      vx *= damping;
      vy *= damping;
      velocity[i2] = vx;
      velocity[i2 + 1] = vy;
      offset[i2] = ox + vx * f;
      offset[i2 + 1] = oy + vy * f;

      pos[i * 3] = baseX + offset[i2];
      pos[i * 3 + 1] = -(baseY + offset[i2 + 1]);
      alphas[i] = alpha * (0.82 + 0.18 * Math.sin(time * 2 + seed * 20));
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }

  render(renderer) {
    if (!this.ready || !this.points.visible) return;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }

  dispose() {
    window.removeEventListener('pointermove', this.handleMove);
    window.removeEventListener('pointerdown', this.handleMove);
    document.documentElement.removeEventListener('pointerleave', this.handleLeave);
    window.removeEventListener('pointerup', this.handleLeave);
    window.removeEventListener('pointercancel', this.handleLeave);
    if (this.points) this.points.geometry.dispose();
    this.material.dispose();
    this.shadowMaterial.dispose();
  }
}
