import type { QualityPresetId, QualitySettings } from './PerformanceTypes';

export const QUALITY_PRESETS: Record<QualityPresetId, QualitySettings> = {
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    densityScale: 1.5,
    particleScale: 1.5,
    trailScale: 1,
    simQuality: 1,
    sourceSampleScale: 1,
    maxParticleCapacity: 2048,
    dirtyRendering: true,
    spatialGrid: true,
    workerOffload: true,
    adaptive: false,
    fpsTarget: 120,
  },
  high: {
    id: 'high',
    label: 'High',
    densityScale: 1.2,
    particleScale: 1.2,
    trailScale: 1,
    simQuality: 1,
    sourceSampleScale: 1,
    maxParticleCapacity: 1024,
    dirtyRendering: true,
    spatialGrid: true,
    workerOffload: true,
    adaptive: false,
    fpsTarget: 60,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    densityScale: 1,
    particleScale: 1,
    trailScale: 0.85,
    simQuality: 0.85,
    sourceSampleScale: 0.85,
    maxParticleCapacity: 512,
    dirtyRendering: true,
    spatialGrid: false,
    workerOffload: false,
    adaptive: true,
    fpsTarget: 60,
  },
  low: {
    id: 'low',
    label: 'Low',
    densityScale: 0.75,
    particleScale: 0.6,
    trailScale: 0.6,
    simQuality: 0.7,
    sourceSampleScale: 0.7,
    maxParticleCapacity: 256,
    dirtyRendering: false,
    spatialGrid: false,
    workerOffload: false,
    adaptive: true,
    fpsTarget: 45,
  },
  batterySaver: {
    id: 'batterySaver',
    label: 'Battery Saver',
    densityScale: 0.5,
    particleScale: 0.3,
    trailScale: 0.4,
    simQuality: 0.5,
    sourceSampleScale: 0.5,
    maxParticleCapacity: 128,
    dirtyRendering: false,
    spatialGrid: false,
    workerOffload: false,
    adaptive: true,
    fpsTarget: 30,
  },
};

export function resolveQualityPreset(id: string): QualitySettings {
  return QUALITY_PRESETS[id as QualityPresetId] ?? QUALITY_PRESETS.medium;
}

export function qualityPresetIds(): QualityPresetId[] {
  return Object.keys(QUALITY_PRESETS) as QualityPresetId[];
}
