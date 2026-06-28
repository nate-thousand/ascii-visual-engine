import type { Motion, MotionConfig } from './Motion';
import { FlowFieldMotion } from './motions/FlowFieldMotion';
import { OrganicGrowthMotion } from './motions/OrganicGrowthMotion';
import { OrbitalMotion } from './motions/OrbitalMotion';
import { WaveMotion } from './motions/WaveMotion';
import { GravityMotion } from './motions/GravityMotion';
import { BrownianMotion } from './motions/BrownianMotion';
import { FlockingMotion } from './motions/FlockingMotion';
import { WindMotion } from './motions/WindMotion';
import { PulseMotion } from './motions/PulseMotion';
import { BreathingMotion } from './motions/BreathingMotion';
import { SpiralMotion } from './motions/SpiralMotion';
import { CurlNoiseMotion } from './motions/CurlNoiseMotion';

export function createBuiltInMotions(): Motion[] {
  return [
    new FlowFieldMotion(),
    new OrganicGrowthMotion(),
    new OrbitalMotion(),
    new WaveMotion(),
    new GravityMotion(),
    new BrownianMotion(),
    new FlockingMotion(),
    new WindMotion(),
    new PulseMotion(),
    new BreathingMotion(),
    new SpiralMotion(),
    new CurlNoiseMotion(),
  ];
}

export const motionCatalog = {
  flowField: { id: 'flowField', name: 'Flow Field' },
  organicGrowth: { id: 'organicGrowth', name: 'Organic Growth' },
  orbital: { id: 'orbital', name: 'Orbital' },
  wave: { id: 'wave', name: 'Wave' },
  gravity: { id: 'gravity', name: 'Gravity' },
  brownian: { id: 'brownian', name: 'Brownian Motion' },
  flocking: { id: 'flocking', name: 'Flocking' },
  wind: { id: 'wind', name: 'Wind' },
  pulse: { id: 'pulse', name: 'Pulse' },
  breathing: { id: 'breathing', name: 'Breathing' },
  spiral: { id: 'spiral', name: 'Spiral' },
  curlNoise: { id: 'curlNoise', name: 'Curl Noise' },
} as const;

export function listMotionIds(): string[] {
  return Object.values(motionCatalog).map((m) => m.id);
}

export function resolvePresetMotions(preset: {
  motions?: MotionConfig[];
  motionField?: string;
}): MotionConfig[] {
  if (preset.motions?.length) {
    return preset.motions.filter((m) => m.enabled !== false);
  }

  const configs: MotionConfig[] = [];
  if (preset.motionField === 'wave') {
    configs.push({ id: 'wave', weight: 1, priority: 5 });
  }
  if (preset.motionField === 'noise') {
    configs.push({ id: 'curlNoise', weight: 0.8, priority: 35 });
    configs.push({ id: 'brownian', weight: 0.4, priority: 40 });
  }
  return configs;
}
