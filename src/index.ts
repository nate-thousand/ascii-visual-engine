// Core
export { AsciiEngine } from './core/AsciiEngine';
export { EventBus } from './core/EventBus';
export type {
  AsciiEngineOptions,
  AsciiPreset,
  ControlDef,
  Effect,
  EffectConfig,
  EffectContext,
  EffectType,
  EngineEventMap,
  EngineEventName,
  EngineEventPayload,
  GridCell,
  GridDimensions,
  GridState,
  MotionFieldType,
  NoteEvent,
  RendererOptions,
} from './core/types';

// Renderers
export { CanvasAsciiRenderer } from './renderers/CanvasAsciiRenderer';

// Effects
export { NoiseField } from './effects/NoiseField';
export { WaveField } from './effects/WaveField';
export { GlyphBurst } from './effects/GlyphBurst';
export { Glitch } from './effects/Glitch';
export { Trails } from './effects/Trails';

// Presets
export {
  basicPreset,
  terminalPreset,
  organicPreset,
  presets,
  getPreset,
  listPresets,
} from './presets';
export type { PresetId } from './presets';
