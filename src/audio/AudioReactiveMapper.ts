import type { NoteEvent } from '../core/types';
import type { LayerManager } from '../compositing/LayerManager';
import type { PostProcessor } from '../compositing/PostProcessor';
import type {
  AudioFeatureMapping,
  AudioFeatureName,
  AudioFeatures,
  AudioMappingConfig,
  AudioMappingPresetConfig,
  AudioMappingTarget,
  AudioSmoothingConfig,
} from './AudioTypes';
import { DEFAULT_AUDIO_SMOOTHING } from './AudioTypes';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

export interface AudioEngineBridge {
  setControl(name: string, value: number): void;
  getControl(name: string, fallback?: number): number;
  getLayerManager(): LayerManager;
  getPostProcessor(): PostProcessor;
  noteOn(event?: NoteEvent): void;
}

export class AudioReactiveMapper {
  private config: AudioMappingConfig = {
    mappings: [],
    smoothing: { ...DEFAULT_AUDIO_SMOOTHING },
    enabled: true,
  };
  private smoothed = new Map<AudioFeatureName, number>();
  private baseControls = new Map<string, number>();
  private baseLayerOpacity = new Map<string, number>();
  private basePostAmounts = new Map<string, number>();
  private lastNoteOnMs = 0;

  setMapping(config: AudioMappingConfig): void {
    this.config = {
      enabled: config.enabled !== false,
      mappings: [...config.mappings],
      smoothing: { ...DEFAULT_AUDIO_SMOOTHING, ...config.smoothing },
    };
  }

  getMapping(): AudioMappingConfig {
    return {
      enabled: this.config.enabled,
      mappings: [...this.config.mappings],
      smoothing: { ...this.config.smoothing },
    };
  }

  setSmoothing(partial: Partial<AudioSmoothingConfig>): void {
    this.config.smoothing = { ...this.config.smoothing, ...partial };
  }

  snapshotBaseValues(engine: AudioEngineBridge): void {
    this.baseControls.clear();
    this.baseLayerOpacity.clear();
    this.basePostAmounts.clear();

    for (const mapping of this.config.mappings) {
      const target = mapping.target;
      if (target.type === 'control') {
        if (!this.baseControls.has(target.control)) {
          this.baseControls.set(
            target.control,
            target.base ?? engine.getControl(target.control, 0),
          );
        }
      } else if (target.type === 'layerOpacity') {
        const layer = engine.getLayerManager().getLayer(target.layerId);
        if (layer && !this.baseLayerOpacity.has(target.layerId)) {
          this.baseLayerOpacity.set(target.layerId, target.base ?? layer.opacity);
        }
      } else if (target.type === 'postPass') {
        const pass = engine.getPostProcessor().getPass(target.passId);
        if (pass && !this.basePostAmounts.has(target.passId)) {
          this.basePostAmounts.set(target.passId, target.base ?? pass.amount);
        }
      }
    }
  }

  restoreBaseValues(engine: AudioEngineBridge): void {
    for (const [control, value] of this.baseControls) {
      engine.setControl(control, value);
    }
    for (const [layerId, opacity] of this.baseLayerOpacity) {
      const layer = engine.getLayerManager().getLayer(layerId);
      if (layer) layer.opacity = opacity;
    }
    for (const [passId, amount] of this.basePostAmounts) {
      engine.getPostProcessor().setPassAmount(passId, amount);
    }
    this.smoothed.clear();
    this.baseControls.clear();
    this.baseLayerOpacity.clear();
    this.basePostAmounts.clear();
  }

  apply(engine: AudioEngineBridge, features: AudioFeatures, dt: number, nowMs: number): void {
    if (!this.config.enabled || this.config.mappings.length === 0) return;

    const smoothing = this.config.smoothing;

    for (const mapping of this.config.mappings) {
      const raw = features[mapping.feature];
      const gated = this.applyGate(raw, features.amplitude, smoothing);
      const smoothed = this.smoothValue(mapping.feature, gated, dt, smoothing);
      this.applyMapping(engine, mapping.target, smoothed, features, nowMs);
    }
  }

  private applyGate(value: number, amplitude: number, smoothing: AudioSmoothingConfig): number {
    if (amplitude < smoothing.noiseGate) return 0;
    const scaled = value * smoothing.sensitivity;
    return clamp(scaled, smoothing.minThreshold, smoothing.maxClamp);
  }

  private smoothValue(
    feature: AudioFeatureName,
    target: number,
    dt: number,
    smoothing: AudioSmoothingConfig,
  ): number {
    const prev = this.smoothed.get(feature) ?? target;
    const rate = target > prev ? smoothing.attack : smoothing.release;
    const factor = rate <= 0 ? 1 : 1 - Math.exp(-dt / Math.max(rate, 0.001));
    const next = prev + (target - prev) * factor;
    this.smoothed.set(feature, next);
    return next;
  }

  private applyMapping(
    engine: AudioEngineBridge,
    target: AudioMappingTarget,
    value: number,
    features: AudioFeatures,
    nowMs: number,
  ): void {
    switch (target.type) {
      case 'control': {
        const base = this.baseControls.get(target.control) ?? engine.getControl(target.control, 0);
        const min = target.min ?? 0;
        const max = target.max ?? 1;
        const amount = target.amount ?? 1;
        engine.setControl(target.control, clamp(base + value * amount * (max - min), min, max));
        break;
      }
      case 'layerOpacity': {
        const layer = engine.getLayerManager().getLayer(target.layerId);
        if (!layer) return;
        const base = this.baseLayerOpacity.get(target.layerId) ?? layer.opacity;
        const min = target.min ?? 0;
        const max = target.max ?? 1;
        const amount = target.amount ?? 1;
        layer.opacity = clamp(base + value * amount * (max - min), min, max);
        break;
      }
      case 'postPass': {
        const min = target.min ?? 0;
        const max = target.max ?? 1;
        const amount = target.amount ?? 1;
        const base = this.basePostAmounts.get(target.passId) ?? min;
        engine.getPostProcessor().setPassAmount(
          target.passId,
          clamp(base + value * amount * (max - min), min, max),
        );
        break;
      }
      case 'noteOn': {
        const cooldown = target.cooldownMs ?? 120;
        if (value < 0.25 || nowMs - this.lastNoteOnMs < cooldown) return;
        this.lastNoteOnMs = nowMs;
        const minI = target.minIntensity ?? 0.6;
        const maxI = target.maxIntensity ?? 2;
        engine.noteOn({
          x: clamp01(features.spectralCentroid),
          y: clamp01(features.amplitude),
          intensity: minI + value * (maxI - minI),
          data: { source: 'audio', feature: 'transient' },
        });
        break;
      }
    }
  }
}

export function resolveAudioMappingPreset(
  config: AudioMappingPresetConfig | undefined,
): AudioMappingConfig | null {
  if (!config) return null;
  return {
    enabled: config.enabled !== false,
    mappings: [...config.mappings],
    smoothing: { ...DEFAULT_AUDIO_SMOOTHING, ...config.smoothing },
  };
}

export function createDefaultMappings(): AudioFeatureMapping[] {
  return [
    {
      feature: 'amplitude',
      target: { type: 'control', control: 'strength', amount: 0.6, min: 0.2, max: 1 },
    },
    {
      feature: 'bass',
      target: { type: 'control', control: 'simSpawnRate', amount: 0.8, min: 0, max: 1 },
    },
  ];
}
