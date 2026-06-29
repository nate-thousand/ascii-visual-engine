import type { GlyphPickContext, GlyphRole } from './Glyph';
import { clamp01 } from './Glyph';

export function classifyRole(ctx: GlyphPickContext): GlyphRole {
  const { brightness, velocity, burst, noise, audioAmplitude, simulationEnergy } = ctx;

  if (burst > 0.6) return 'explosion';
  if (audioAmplitude > 0.85 && brightness > 0.7) return 'highlight';
  if (velocity > 0.75) return 'particle';
  if (noise > 0.8) return 'glitch';
  if (simulationEnergy > 0.7 && brightness > 0.5) return 'growth';
  if (simulationEnergy > 0.4) return 'branch';
  if (brightness < 0.08) return 'shadow';
  if (brightness < 0.2) return 'decay';
  if (brightness < 0.35) return 'seed';
  if (brightness < 0.5) return 'root';
  if (brightness < 0.65) return 'leaf';
  if (brightness < 0.78) return 'branch';
  if (brightness < 0.88) return 'flower';
  if (ctx.curvature > 0.6) return 'edge';
  if (ctx.density > 0.7) return 'fill';
  if (noise > 0.5) return 'noise';
  if (ctx.motionStrength > 0.6) return 'water';
  return 'highlight';
}

export function rolePickIndex(role: GlyphRole, ctx: GlyphPickContext, count: number): number {
  if (count <= 1) return 0;

  const phase = ((ctx.phase % 1) + 1) % 1;
  const roleOffset: Partial<Record<GlyphRole, number>> = {
    seed: 0,
    root: 0.1,
    branch: 0.25,
    leaf: 0.4,
    flower: 0.65,
    highlight: 0.85,
    shadow: 0,
    decay: 0.05,
    glitch: ctx.noise,
    particle: ctx.velocity,
    explosion: ctx.burst,
    noise: ctx.noise,
    fill: ctx.density,
    edge: ctx.curvature,
    water: ctx.motionStrength,
    smoke: ctx.noise * 0.5,
    growth: ctx.simulationEnergy,
    outline: 0.5,
  };

  const base = roleOffset[role] ?? ctx.brightness;
  const t = clamp01(base * 0.7 + phase * 0.2 + ctx.brightness * 0.1);
  return Math.max(0, Math.min(count - 1, Math.floor(t * (count - 1))));
}

export function estimateCurvature(x: number, y: number, phase: number): number {
  return clamp01(Math.abs(Math.sin(x * 6.28 + phase)) * Math.abs(Math.cos(y * 6.28 - phase)));
}

export function estimateNoise(x: number, y: number, time: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + time * 0.7) * 43758.5453;
  return (n - Math.floor(n));
}
