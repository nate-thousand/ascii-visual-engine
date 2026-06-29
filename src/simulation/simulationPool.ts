export function createPool<T>(factory: () => T, initialSize = 32): {
  acquire: () => T;
  release: (item: T) => void;
  count: () => number;
} {
  const pool: T[] = [];
  for (let i = 0; i < initialSize; i++) pool.push(factory());

  return {
    acquire(): T {
      return pool.length > 0 ? pool.pop()! : factory();
    },
    release(item: T): void {
      pool.push(item);
    },
    count(): number {
      return pool.length;
    },
  };
}

export interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  life: number;
  maxLife: number;
  size: number;
  glyph: number;
}

export function createParticleBuffer(capacity: number): ParticleSlot[] {
  const particles: ParticleSlot[] = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    particles[i] = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      glyph: 0,
    };
  }
  return particles;
}

export function countActiveParticles(particles: ParticleSlot[]): number {
  let count = 0;
  for (let i = 0; i < particles.length; i++) {
    if (particles[i].active) count++;
  }
  return count;
}
