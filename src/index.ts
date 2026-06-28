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
  PatternId,
  PluginType,
  PluginConfig,
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

// Plugins
export {
  PluginManager,
  EffectPlugin,
  PatternPlugin,
  InputPlugin,
  RendererPlugin,
  createBuiltInPlugins,
  pluginCatalog,
  listPluginIds,
  resolvePresetPlugins,
  isEffectPlugin,
  isPatternPlugin,
  isInputPlugin,
  isRendererPlugin,
} from './plugins';
export type {
  Plugin,
  PluginContext,
  EffectPhase,
  EffectPluginMeta,
  PatternPluginMeta,
} from './plugins';

// Patterns (legacy — prefer plugin API)
export {
  PatternRegistry,
  createBuiltInPatterns,
  patternCatalog,
  listPatternIds,
  RadialSymmetryPattern,
  SpiralPattern,
  WavePattern,
  GridPattern,
  CellularPattern,
  ScanlinePattern,
} from './patterns';
export type { Pattern, PatternSampleContext } from './patterns';

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
export type { EngineDebugState } from './core/debug';
export { KNOWN_CONTROLS, warnUnknownControl, warnUnknownPluginIds, warnUnknownPreset } from './core/validate';
