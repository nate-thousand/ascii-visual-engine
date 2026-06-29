import type { LayerConfig } from './Layer';
import type { PostProcessingConfig } from './PostProcessor';

export function resolvePresetLayers(preset: { layers?: LayerConfig[] }): LayerConfig[] {
  if (!preset.layers?.length) return [];
  return preset.layers.filter((l) => l.enabled !== false);
}

export function resolvePresetPostProcessing(preset: {
  postProcessing?: PostProcessingConfig[];
}): PostProcessingConfig[] {
  if (!preset.postProcessing?.length) return [];
  return preset.postProcessing.filter((p) => p.enabled !== false);
}

export const POST_CONTROLS = [
  'postFeedback',
  'postSmear',
  'postDisplacement',
  'postThreshold',
  'postInvert',
  'postEdge',
  'postPosterize',
  'postScanline',
  'postDither',
] as const;

export const DEFAULT_POST_CONTROLS: Record<(typeof POST_CONTROLS)[number], number> = {
  postFeedback: 0.7,
  postSmear: 0.5,
  postDisplacement: 0.3,
  postThreshold: 0.5,
  postInvert: 1,
  postEdge: 0.6,
  postPosterize: 4,
  postScanline: 0.5,
  postDither: 0.5,
};
