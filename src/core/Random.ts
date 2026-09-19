/**
 * Seeded random numbers so a look can be reproduced exactly. Every subsystem
 * that randomizes draws from its own named stream derived from the engine
 * seed, so enabling one plugin never shifts another's sequence.
 */
export type Seed = number | string;

/** FNV-1a over UTF-16 code units; any string to a 32 bit integer. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function normalizeSeed(seed: Seed): number {
  if (typeof seed === 'string') return hashString(seed);
  if (!Number.isFinite(seed)) return 0;
  return ((Math.floor(seed) >>> 0) ^ Math.floor((Math.abs(seed) % 1) * 0xffffffff)) >>> 0;
}

/** mulberry32: small, fast, and good enough for visual noise. */
export class Random {
  private state = 0;
  private seedValue = 0;

  constructor(seed: Seed = 0) {
    this.reseed(seed);
  }

  reseed(seed: Seed): void {
    this.seedValue = normalizeSeed(seed);
    // splitmix step so seeds 1, 2, 3 start far apart.
    let s = (this.seedValue + 0x9e3779b9) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0;
    this.state = (s ^ (s >>> 16)) >>> 0;
  }

  getSeed(): number {
    return this.seedValue;
  }

  /** Uniform in [0, 1), like Math.random. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** A stream for a named subsystem, derived from this seed. Deterministic per name. */
  fork(name: string): Random {
    return new Random(deriveSeed(this.seedValue, name));
  }
}

export function deriveSeed(root: number, name: string): number {
  return (hashString(name) ^ Math.imul(root >>> 0, 0x9e3779b1)) >>> 0;
}
