// The mountain everything else samples: a summit up near the edge of space, one
// carved run down its face, and a lodge in the valley at the bottom. Terrain,
// trees, gates and the camera all read from these functions so they agree on
// where the snow is.

export const PEAK = 1000;
export const RUN_LENGTH = 3200;
export const CLOUD_Y = 560;
export const TREE_LINE = 430;
export const EYE = 3.2;
export const CAMERA_END = RUN_LENGTH - 140;
export const LODGE_Z = RUN_LENGTH - 30;

const SUMMIT_ALT = 8848;
const BASE_ALT = 1250;

export function displayAltitude(groundY) {
  return BASE_ALT + (Math.max(0, groundY) / PEAK) * (SUMMIT_ALT - BASE_ALT);
}

// Standard lapse rate from a -4°C valley floor.
export function displayTemperature(altitude) {
  return -4 - ((altitude - BASE_ALT) / 1000) * 6.5;
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smoothMax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D simplex noise with a fixed permutation so the mountain is the same every visit.
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const PERM = (() => {
  const rand = seededRandom(1337);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
})();

function corner(gi, x, y) {
  let t = 0.5 - x * x - y * y;
  if (t <= 0) return 0;
  const g = GRAD[gi & 7];
  t *= t;
  return t * t * (g[0] * x + g[1] * y);
}

export function noise2(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = 1 - i1;
  const ii = i & 255;
  const jj = j & 255;
  return 70 * (
    corner(PERM[ii + PERM[jj]], x0, y0) +
    corner(PERM[ii + i1 + PERM[jj + j1]], x0 - i1 + G2, y0 - j1 + G2) +
    corner(PERM[ii + 1 + PERM[jj + 1]], x0 - 1 + 2 * G2, y0 - 1 + 2 * G2)
  );
}

function fbm(x, y, octaves) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise2(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// Sharp-crested noise for the distant range, 0..1.
function ridged(x, y, octaves) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  let weight = 1;
  for (let o = 0; o < octaves; o++) {
    // A softened abs() keeps the crests sharp-looking without knife-edge cliffs.
    const raw = noise2(x * freq + o * 13.7, y * freq - o * 7.1);
    let n = 1 - Math.sqrt(raw * raw + 0.012);
    n *= n * weight;
    weight = Math.min(1, n * 1.6);
    sum += amp * n;
    norm += amp;
    amp *= 0.42;
    freq *= 2.1;
  }
  return sum / norm;
}

// Centre line of the run: a straight drop off the summit, then linked S-turns.
export function pathX(z) {
  const t = Math.max(0, z);
  const carve = smoothstep(0, 320, t);
  return carve * (60 * Math.sin(t * 0.0089 + 0.4) + 16 * Math.sin(t * 0.0241 + 1.3));
}

// Sideways drift of the run per unit forward (dx/dz).
export function pathSlope(z) {
  return pathX(z + 0.5) - pathX(z - 0.5);
}

// Height of the run's centre line: steep off the top, flattening out at the lodge.
function profile(z) {
  if (z <= 0) return PEAK - 1.7 * Math.pow(-z, 1.08);
  if (z >= RUN_LENGTH) return 0;
  return PEAK * Math.pow(1 - z / RUN_LENGTH, 1.35);
}

export function heightAt(x, z) {
  const u = x - pathX(z);
  const au = Math.abs(u);

  // The massif carrying the run: near the top the ground falls away on both
  // sides so the summit reads as a peak; lower down, valley walls rise.
  let massif = profile(z);
  const summit = 1 - smoothstep(-200, 560, z);
  if (summit > 0) massif -= summit * Math.pow(au, 1.12) * 0.85;
  const valley = smoothstep(120, 1300, z) * (1 - smoothstep(RUN_LENGTH + 300, RUN_LENGTH + 1400, z));
  const walls = smoothstep(30, 620, au) * (1 - smoothstep(1100, 1700, au));
  if (valley > 0 && walls > 0) {
    massif += valley * walls * (360 + 240 * fbm(z * 0.0011, u * 0.0011 + 7.3, 3));
  }

  // A ring of distant peaks, tall enough to break through the cloud deck.
  // It tapers off gently well before the edge of the terrain so the edge stays hidden.
  const ring = smoothstep(700, 1700, au) * (1 - smoothstep(2000, 3000, au));
  const range = ring > 0 ? ring * (ridged(x * 0.00075, z * 0.00075, 4) * 1280 - 220) : 0;

  let h = smoothMax(Math.max(massif, -120), range, 160);

  // Groomed on the piste, rougher the further you get from it.
  const rough = smoothstep(12, 140, au);
  if (rough > 0) h += rough * 20 * fbm(x * 0.009, z * 0.009, 3);
  h += (0.6 + 2.4 * rough) * fbm(x * 0.06 + 3.1, z * 0.06, 2);

  // Sink everything near the edges of the terrain below the clouds and fog,
  // so the edge never shows against the sky.
  const edge = Math.max(
    smoothstep(2800, 3350, au),
    1 - smoothstep(-1150, -650, z),
    smoothstep(RUN_LENGTH + 1050, RUN_LENGTH + 1550, z),
  );
  if (edge > 0) h += (-150 - h) * edge;
  return h;
}
