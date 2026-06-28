/** Shared math helpers — no allocations in hot paths. */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic hash in [0, 1). */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise in [0, 1). */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** Pseudo curl noise — returns displacement vector. */
export function curlNoise(
  x: number,
  y: number,
  t: number,
  scale: number,
): { x: number; y: number } {
  const eps = 0.01;
  const sx = x * scale + t * 0.3;
  const sy = y * scale + t * 0.2;
  const n1 = noise2(sx, sy + eps) - noise2(sx, sy - eps);
  const n2 = noise2(sx + eps, sy) - noise2(sx - eps, sy);
  return { x: n1 * 2, y: -n2 * 2 };
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
