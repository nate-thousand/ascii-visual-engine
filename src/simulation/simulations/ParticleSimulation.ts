import type { AsciiEngine } from '../../core/AsciiEngine';
import type { Simulation, SimulationContext } from '../Simulation';
import {
  countActiveParticles,
  createParticleBuffer,
  type ParticleSlot,
} from '../simulationPool';
import { estimateBytes, stampCell, stampDisc } from '../simulationUtils';

const CAPACITY = 512;

export class ParticleSimulation implements Simulation {
  readonly id = 'particle';
  readonly name = 'Particle System';
  enabled = false;

  private particles: ParticleSlot[] = createParticleBuffer(CAPACITY);
  private spawnAccumulator = 0;

  initialize(_engine: AsciiEngine): void {}

  update(dt: number, ctx: SimulationContext): void {
    const { grid, glyphSet, getControl } = ctx;
    const speed = getControl('simSpeed', 1);
    const strength = getControl('simStrength', 0.8);
    const spawnRate = getControl('simSpawnRate', 0.6) * 120 * (ctx.particleCapScale ?? 1);
    const decay = getControl('simDecay', 0.2);

    this.spawnAccumulator += spawnRate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnParticle();
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.vx += p.ax * dt * speed;
      p.vy += p.ay * dt * speed;
      p.vx *= 1 - decay * dt;
      p.vy *= 1 - decay * dt;
      p.x += p.vx * dt * speed;
      p.y += p.vy * dt * speed;

      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        p.active = false;
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const brightness = lifeRatio * strength;
      const gx = p.x * (grid.cols - 1);
      const gy = p.y * (grid.rows - 1);
      stampCell(grid.cells, grid.cols, grid.rows, gx, gy, brightness, glyphSet, p.glyph, 0.85);
      stampDisc(grid, p.x, p.y, p.size * 0.02, brightness * 0.5, glyphSet, p.glyph);
    }
  }

  reset(): void {
    for (const p of this.particles) p.active = false;
    this.spawnAccumulator = 0;
  }

  destroy(): void {
    this.reset();
  }

  getParticleCount(): number {
    return countActiveParticles(this.particles);
  }

  getMemoryBytes(): number {
    return estimateBytes();
  }

  private spawnParticle(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = 0.3 + Math.random() * 0.4;
      p.y = 0.8 + Math.random() * 0.15;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = -(0.3 + Math.random() * 0.6);
      p.ax = (Math.random() - 0.5) * 0.2;
      p.ay = -0.15 - Math.random() * 0.2;
      p.maxLife = 1.5 + Math.random() * 2;
      p.life = p.maxLife;
      p.size = 0.5 + Math.random() * 1.5;
      p.glyph = Math.floor(Math.random() * 4);
      return;
    }
  }
}
