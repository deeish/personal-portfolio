import * as THREE from 'three';

// `step` is the grain spacing at a 170px heading; it scales with the actual font size.
const DESKTOP = { step: 2.4, layers: 4, reach: 48 };
const MOBILE = { step: 3.4, layers: 3, reach: 40 };

const VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aShade;
  attribute float aScale;
  uniform float uSize;
  uniform float uTime;
  uniform float uFade;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    // Front faces are bright snow; the extruded sides fall into cool shadow; a few grains glint.
    vec3 face = vec3(0.96, 0.98, 1.0);
    vec3 side = vec3(0.47, 0.57, 0.74);
    float glint = step(0.986, aSeed) * max(0.0, sin(uTime * 2.6 + aSeed * 900.0));
    vColor = mix(face, side, aShade) + glint * 0.5;
    vAlpha = uFade * (0.84 + 0.16 * sin(uTime * 2.0 + aSeed * 20.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * aScale * (0.75 + aSeed * 0.6);
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.18, 0.5, d)) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// The same grains drawn big, dark and faint underneath: a text shadow made of snow,
// so the name holds up against bright cloud.
const SHADOW_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha * 0.07;
    if (a < 0.004) discard;
    gl_FragColor = vec4(0.016, 0.024, 0.05, a);
  }
`;

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// The hero name built from grains of snow, extruded like letters cut from a
// snowbank (the shaded sides lean gently toward the pointer), with snow piled on
// top. A moving pointer ploughs a wake through it; displaced grains pour
// downhill and drift back. Scrolling away blows the whole thing into the snowfall.
// The real <h1> stays in the page (just made transparent) for screen readers and search.
export default class SnowName {
  constructor({ element, mobile }) {
    this.element = element;
    this.settings = mobile ? MOBILE : DESKTOP;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
    const shared = { uTime: { value: 0 }, uFade: { value: 1 } };
    const options = { vertexShader: VERTEX, transparent: true, depthTest: false, depthWrite: false, toneMapped: false };
    this.material = new THREE.ShaderMaterial({ ...options, fragmentShader: FRAGMENT, uniforms: { ...shared, uSize: { value: 3 } } });
    this.shadowMaterial = new THREE.ShaderMaterial({ ...options, fragmentShader: SHADOW_FRAGMENT, uniforms: { ...shared, uSize: { value: 12 } } });
    this.points = null;
    this.shadow = null;
    this.ready = false;
    this.asleep = false;
    // Grain spacing, grain size and extrusion depth scale with the heading's font size,
    // so a phone-sized name keeps the same proportions as the desktop one.
    this.unit = 1;
    this.pixelRatio = 1;
    this.tilt = { x: 0, y: 0 };
    this.last = { scroll: -1, dirX: 0, dirY: 0 };
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
      // Don't let a slow font download hold up the page: give it a moment, then carry on with
      // whatever font is showing. MountainScene resamples once the real font arrives.
      await Promise.race([
        document.fonts.load(`${weight} ${size}px ${family}`).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
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
    const inside = (x, y) => {
      const px = Math.round(x);
      const py = Math.round(y);
      return px >= 0 && py >= 0 && px < width && py < height && data[(py * width + px) * 4 + 3] > 128;
    };
    this.unit = clamp(size / 170, 0.4, 1.2);
    const step = Math.max(1.5, this.settings.step * this.unit);
    const near = step * 1.3;
    const grains = { front: [], sides: [], caps: [] };
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (!inside(x, y)) continue;
        const gx = x + (Math.random() - 0.5) * step * 0.6;
        const gy = y + (Math.random() - 0.5) * step * 0.6;
        grains.front.push(gx, gy);
        // Grains on the outline also form the extruded sides; the top outline gets a snow cap.
        if (!inside(x + near, y) || !inside(x - near, y) || !inside(x, y + near) || !inside(x, y - near)) grains.sides.push(gx, gy);
        if (!inside(x, y - near)) grains.caps.push(gx, gy);
      }
    }
    this.build(grains, box, step);
    return true;
  }

  build({ front, sides, caps }, box, step) {
    if (this.points) {
      this.scene.remove(this.points, this.shadow);
      this.points.geometry.dispose();
    }
    const { layers } = this.settings;
    const count = (sides.length / 2) * layers + front.length / 2 + caps.length;
    const home = new Float32Array(count * 2);
    const depth = new Float32Array(count);
    const seeds = new Float32Array(count);
    const shade = new Float32Array(count);
    const scale = new Float32Array(count);
    let n = 0;
    const add = (x, y, d, s, size) => {
      home[n * 2] = x;
      home[n * 2 + 1] = y;
      depth[n] = d;
      shade[n] = s;
      scale[n] = size;
      seeds[n] = Math.random();
      n += 1;
    };
    // Back to front, so nearer grains draw over the ones behind them.
    for (let layer = layers; layer >= 1; layer--) {
      for (let i = 0; i < sides.length; i += 2) add(sides[i], sides[i + 1], layer, 0.45 + 0.55 * (layer / layers), 0.95);
    }
    for (let i = 0; i < front.length; i += 2) add(front[i], front[i + 1], 0, 0, 1);
    // Two grains of loose snow heaped on each top-edge grain.
    for (let i = 0; i < caps.length; i += 2) {
      for (let k = 0; k < 2; k++) add(caps[i] + (Math.random() - 0.5) * step, caps[i + 1] - (1 + Math.random() * 3.5) * this.unit, 0, 0, 1.25 + Math.random() * 0.3);
    }

    this.count = count;
    this.home = home;
    this.depth = depth;
    this.seeds = seeds;
    this.offset = new Float32Array(count * 2);
    this.velocity = new Float32Array(count * 2);
    this.wind = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      this.wind[i * 2] = 250 + Math.random() * 1100;
      this.wind[i * 2 + 1] = 60 + Math.random() * 420;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.shadow = new THREE.Points(geo, this.shadowMaterial);
    this.shadow.frustumCulled = false;
    this.scene.add(this.shadow, this.points);
    this.origin = { x: box.left + window.scrollX, y: box.top + window.scrollY, w: box.width, h: box.height };
    this.applySize();
    this.last.scroll = -1;
    this.asleep = false;
    this.ready = true;
  }

  applySize() {
    this.material.uniforms.uSize.value = 2.9 * this.pixelRatio * Math.max(0.6, this.unit);
    this.shadowMaterial.uniforms.uSize.value = 14 * this.pixelRatio * this.unit;
  }

  resize(width, height, pixelRatio) {
    this.camera.right = width;
    this.camera.bottom = -height;
    this.camera.updateProjectionMatrix();
    this.pixelRatio = pixelRatio;
    this.applySize();
    this.last.scroll = -1;
  }

  update(dt, time) {
    if (!this.ready) return;
    const scrollY = window.scrollY;
    const blow = smooth(0, window.innerHeight * 0.6, scrollY);
    const visible = blow < 0.999;
    this.points.visible = visible;
    this.shadow.visible = visible;
    if (!visible) return;
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uFade.value = 1 - smooth(0.55, 1, blow);

    const left = this.origin.x - window.scrollX;
    const top = this.origin.y - scrollY;
    const p = this.pointer;

    // The block of letters leans gently toward the pointer.
    let tx = 0;
    let ty = 0;
    if (p.active) {
      tx = clamp((p.x - (left + this.origin.w / 2)) / (window.innerWidth * 0.5), -1, 1);
      ty = clamp((p.y - (top + this.origin.h / 2)) / (window.innerHeight * 0.5), -1, 1);
    }
    const ease = 1 - Math.exp(-dt * 3);
    this.tilt.x += (tx - this.tilt.x) * ease;
    this.tilt.y += (ty - this.tilt.y) * ease;
    const dirX = (1.7 - this.tilt.x * 1.4) * this.unit;
    const dirY = (2.3 - this.tilt.y * 1.2) * this.unit;

    // How far the pointer moved since last frame: only a moving pointer disturbs the snow.
    let ax = 0;
    let ay = 0;
    let mx = 0;
    let my = 0;
    let moved = 0;
    if (p.active && p.lastX !== null) {
      ax = p.lastX;
      ay = p.lastY;
      mx = p.x - ax;
      my = p.y - ay;
      moved = Math.hypot(mx, my);
    }
    p.lastX = p.active ? p.x : null;
    p.lastY = p.y;
    const ploughing = moved > 0.4;

    // Nothing moving, nothing scrolled, nothing tilted: leave last frame's grains as they are.
    const unchanged = scrollY === this.last.scroll && Math.abs(dirX - this.last.dirX) < 0.005 && Math.abs(dirY - this.last.dirY) < 0.005;
    if (!ploughing && this.asleep && unchanged && blow === 0) return;
    this.last.scroll = scrollY;
    this.last.dirX = dirX;
    this.last.dirY = dirY;

    const f = Math.min(dt * 60, 2);
    const damping = Math.pow(0.9, f);
    const reach = this.settings.reach;
    const blow2 = blow * blow;
    let ux = 0;
    let uy = 0;
    let len2 = 1;
    let strength = 0;
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    if (ploughing) {
      ux = mx / moved;
      uy = my / moved;
      len2 = moved * moved;
      strength = Math.min(moved / 10, 1.6) * f;
      minX = Math.min(ax, p.x) - reach * 1.4;
      maxX = Math.max(ax, p.x) + reach * 1.4;
      minY = Math.min(ay, p.y) - reach * 1.4;
      maxY = Math.max(ay, p.y) + reach * 1.4;
    }

    const pos = this.points.geometry.attributes.position.array;
    const { home, depth, offset, velocity, wind, seeds } = this;
    let awake = 0;
    for (let i = 0; i < this.count; i++) {
      const i2 = i * 2;
      const seed = seeds[i];
      const d = depth[i];
      const baseX = left + home[i2] + d * dirX + blow2 * wind[i2];
      const baseY = top + home[i2 + 1] + d * dirY - blow2 * wind[i2 + 1] + (blow > 0 ? Math.sin(time * 1.7 + seed * 12) * blow * 14 : 0);
      let ox = offset[i2];
      let oy = offset[i2 + 1];
      let vx = velocity[i2];
      let vy = velocity[i2 + 1];

      if (ploughing) {
        const x = baseX + ox;
        const y = baseY + oy;
        if (x > minX && x < maxX && y > minY && y < maxY) {
          // Distance to the path the pointer swept this frame, with a ragged, grain-by-grain edge.
          const t = clamp(((x - ax) * mx + (y - ay) * my) / len2, 0, 1);
          const dx = x - (ax + mx * t);
          const dy = y - (ay + my * t);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const r = reach * (0.6 + seed * 0.8);
          if (dist < r) {
            let push = 1 - dist / r;
            push *= push * strength;
            const sx = dist > 0.001 ? dx / dist : -uy;
            const sy = dist > 0.001 ? dy / dist : ux;
            const jitter = Math.sin(seed * 997 + time * 9) * 0.8;
            // Carried along with the stroke, thrown to either side, kicked up a little.
            vx += (ux * moved * 0.1 + sx * 1.8 + jitter) * push;
            vy += (uy * moved * 0.1 + sy * 1.8 - 0.9) * push;
          }
        }
      }

      if (vx !== 0 || vy !== 0 || ox !== 0 || oy !== 0) {
        // Loose grains pour downhill a little before the letters pull them home.
        const displaced = Math.abs(ox) + Math.abs(oy);
        if (displaced > 1.5) vy += 0.09 * Math.min(1, displaced / 40) * f;
        vx = (vx - ox * 0.005 * f) * damping;
        vy = (vy - oy * 0.005 * f) * damping;
        ox += vx * f;
        oy += vy * f;
        if (Math.abs(vx) + Math.abs(vy) < 0.004 && Math.abs(ox) + Math.abs(oy) < 0.05) {
          vx = 0;
          vy = 0;
          ox = 0;
          oy = 0;
        } else {
          awake += 1;
        }
        velocity[i2] = vx;
        velocity[i2 + 1] = vy;
        offset[i2] = ox;
        offset[i2 + 1] = oy;
      }

      pos[i * 3] = baseX + ox;
      pos[i * 3 + 1] = -(baseY + oy);
    }
    this.asleep = !ploughing && awake === 0;
    this.points.geometry.attributes.position.needsUpdate = true;
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
