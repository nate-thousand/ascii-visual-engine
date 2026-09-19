// Core
export { AsciiEngine } from './core/AsciiEngine';
export { createEngine } from './core/createEngine';
export { ParamStore, isParameterized } from './plugins/ParamStore';
export type { ParamDef, Parameterized } from './plugins/ParamStore';
export { resolvePixelRatio, MAX_PIXEL_RATIO } from './renderers/pixelRatio';
export { NO_TEMPO, tempoAngle } from './core/tempo';
export type { TempoState, TempoSource } from './core/tempo';
export type { PixelRatioOption } from './renderers/pixelRatio';
export type { CreateEngineOptions, EngineHandle } from './core/createEngine';
export { EventBus } from './core/EventBus';
export type {
  AsciiEngineOptions,
  AsciiPreset,
  FlatPreset,
  PresetInput,
  PresetMotionConfig,
  PresetPatternConfig,
  PresetSimulationConfig,
  PresetPostConfig,
  PresetAudioConfig,
  PresetGlyphsConfig,
  ControlDef,
  Effect,
  EffectConfig,
  EffectContext,
  EffectType,
  EngineEventMap,
  EngineEventName,
  EngineEventPayload,
  EngineState,
  GridCell,
  GridDimensions,
  GridState,
  MotionFieldType,
  NoteEvent,
  PatternId,
  PluginType,
  PluginConfig,
  SimulationConfig,
  RendererOptions,
  LayerPresetConfig,
  PostProcessingPresetConfig,
  BlendMode,
  MaskType,
} from './core/types';

// Renderers
export {
  RendererManager,
  CanvasRenderer,
  CanvasAsciiRenderer,
  DomRenderer,
  OffscreenCanvasRenderer,
  WebGLRendererStub,
  GridBuffer,
  createBuiltInRenderers,
  listRendererIds,
  resolveRendererId,
  isOffscreenCanvasSupported,
} from './renderers';
export type {
  Renderer,
  RendererType,
  RendererId,
  RendererOption,
  RenderFrame,
  RenderContext,
  RendererDebugState,
  RendererSwitchResult,
  CanvasRendererOptions,
  DomRendererOptions,
  OffscreenCanvasRendererOptions,
  RendererManagerOptions,
} from './renderers';

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
export type { SourcePresetConfig } from './core/types';
export { KNOWN_CONTROLS, warnUnknownControl, warnUnknownPluginIds, warnUnknownPreset, warnUnknownMotionIds, warnUnknownSimulationIds, validatePreset, assertValidPreset } from './core/validate';
export type { PresetValidationResult } from './core/validate';
export { normalizePreset, flattenPreset, isFlatPreset, getPresetValue, presetControlValues, CONTROL_GROUP, BASE_DEFAULTS } from './core/presetShape';
export type { PresetControlName, PresetGroupName } from './core/presetShape';
export { listLiveControls, CONTROL_CONSUMERS, GLOBAL_CONTROLS, AUDIO_CONTROLS } from './core/liveControls';
export { CONTROL_CATALOG, liveControlDefs, withLiveControls } from './presets/controlCatalog';
export { exportPreset, loadPresetFromUrl, parsePreset, presetToJson } from './presets/presetIO';
export type { ExportPresetOptions } from './presets/presetIO';

// Motion
export {
  MotionManager,
  createBuiltInMotions,
  motionCatalog,
  listMotionIds,
  resolvePresetMotions,
  MOTION_CONTROLS,
  DEFAULT_MOTION_CONTROLS,
  FlowFieldMotion,
  OrganicGrowthMotion,
  OrbitalMotion,
  WaveMotion,
  GravityMotion,
  BrownianMotion,
  FlockingMotion,
  WindMotion,
  PulseMotion,
  BreathingMotion,
  SpiralMotion,
  CurlNoiseMotion,
} from './motion';
export type {
  Motion,
  MotionContext,
  MotionConfig,
  MotionDebugInfo,
  MotionManagerDebugState,
  MotionControlName,
} from './motion';
export { listMotionPresets, listSimulationPresets, listCompositingPresets, listAudioPresets, listPerformancePresets, listGlyphPresets } from './presets';

// Procedural Glyph Language
export {
  GlyphRegistry,
  GlyphAtlas,
  GlyphGenerator,
  GlyphMorpher,
  GlyphAnimator,
  GlyphComposer,
  resolvePresetGlyphSet,
  resolveGlyphSetFromCategories,
  BUILTIN_GLYPH_LANGUAGES,
  GLYPH_CATEGORY_LIBRARIES,
  getBuiltinLanguage,
  getCategoryGlyphs,
  classifyRole,
} from './glyphs';
export type {
  Glyph,
  GlyphCategoryId,
  GlyphRole,
  GlyphLanguageConfig,
  GlyphCellState,
  GlyphDebugState,
  GlyphMorphConfig,
  GlyphAnimationConfig,
} from './glyphs';

// Recording & Export
export {
  ExportManager,
  FrameRecorder,
  AnimationRecorder,
  SequenceExporter,
  gridToAscii,
  cloneGridState,
  buildSceneDocument,
  serializeScene,
  parseScene,
  exportSceneJson,
  importSceneJson,
  gridToSvg,
  exportSvg,
  exportPngScreenshot,
  encodeGif,
  exportGifFromCanvases,
  captureCanvasBlob,
  downloadBlob,
  downloadJson,
  SCENE_FORMAT_VERSION,
} from './export';
export type {
  ExportResult,
  ExportFormat,
  ScreenshotOptions,
  RecordedFrame,
  RecordingStatus,
  PlaybackStatus,
  ExportDebugState,
  GifExportOptions,
} from './export';
export type { AsciiSceneDocument } from './export/SceneFormat';
export { RecordingSession, PlaybackSession, TimelineRecorder } from './recording';

// Compositing & Post Processing
export {
  LayerManager,
  Layer,
  Mask,
  PostProcessor,
  blendBrightness,
  blendChar,
  compositeCell,
  BLEND_MODES,
  createDefaultMask,
  resolvePresetLayers,
  resolvePresetPostProcessing,
  POST_CONTROLS,
  DEFAULT_POST_CONTROLS,
  listPostPassIds,
  createDefaultPasses,
} from './compositing';
export type {
  CompositingContext,
  LayerConfig,
  LayerDebugInfo,
  LayerManagerDebugState,
  MaskConfig,
  PostProcessingConfig,
  PostProcessorDebugState,
} from './compositing';
export {
  FeedbackPass,
  SmearPass,
  DisplacementPass,
  ThresholdPass,
  InvertPass,
  EdgePass,
  PosterizePass,
  ScanlinePass,
  DitherPass,
} from './postprocessing';
export type { PostPass, PostPassContext } from './postprocessing';

// Audio Reactivity
export {
  AudioInput,
  AudioAnalyzer,
  AudioFeatureExtractor,
  AudioReactiveMapper,
  BeatDetector,
  normalizeBpm,
  BPM_MAP_RANGE,
  resolveAudioMappingPreset,
  createDefaultMappings,
  DEFAULT_AUDIO_SMOOTHING,
  AUDIO_SMOOTHING_CONTROLS,
  DEFAULT_AUDIO_SMOOTHING_CONTROLS,
} from './audio';
export type {
  BeatState,
  BeatDetectorOptions,
  AudioFeatures,
  AudioFeatureName,
  AudioInputType,
  AudioInputOptions,
  AudioMappingConfig,
  AudioMappingPresetConfig,
  AudioFeatureMapping,
  AudioSmoothingConfig,
  AudioDebugState,
  AudioEngineBridge,
  AudioInputState,
} from './audio';

// MIDI & Performance Input
export {
  InputManager,
  MidiInput,
  KeyboardInput,
  PointerInput,
  MidiClock,
  PerformanceMapper,
  resolveInputMappingPreset,
  resolvePresetInputMapping,
  getDevicePresetMapping,
  DEVICE_PRESET_IDS,
  mapMidiToNoteEvent,
} from './input';
export type {
  MidiClockState,
  PointerInputOptions,
  PointerState,
  PointerTarget,
  PointerLike,
  InputEvent,
  InputMappingConfig,
  InputMappingPresetConfig,
  InputDebugState,
  MidiDeviceInfo,
  PerformanceTarget,
  PerformanceEngineBridge,
  LearnedMapping,
  CcMapping,
  NoteMonitorEntry,
  DevicePresetId,
} from './input';

// Simulation
export {
  SimulationManager,
  createBuiltInSimulations,
  simulationCatalog,
  listSimulationIds,
  resolvePresetSimulations,
  SIMULATION_CONTROLS,
  DEFAULT_SIMULATION_CONTROLS,
  ParticleSimulation,
  BoidsSimulation,
  CellularAutomataSimulation,
  ReactionDiffusionSimulation,
  LSystemSimulation,
  GravitySimulation,
  SpringSimulation,
  FluidSimulation,
} from './simulation';
export type {
  Simulation,
  SimulationContext,
  SimulationDebugInfo,
  SimulationManagerDebugState,
  SimulationControlName,
} from './simulation';

// Sources
export {
  SourceManager,
  SourceSampler,
  ImageSource,
  VideoSource,
  WebcamSource,
  CanvasSource,
  createBuiltInSources,
  listSourceIds,
  resolvePresetSource,
  SOURCE_CONTROLS,
  DEFAULT_SOURCE_CONTROLS,
  mapNormalizedToSource,
  mapBrightnessToGlyph,
  pixelBrightness,
  pixelEdge,
  pixelContrast,
  clamp01,
} from './sources';
export type {
  Source,
  SourceContext,
  SourceSample,
  SourceType,
  SourceFitMode,
  SourceMode,
  SourceDebugState,
  SourceControlName,
  ImageSourceOptions,
  VideoSourceOptions,
  WebcamSourceOptions,
  CanvasSourceOptions,
} from './sources';

// Scripting
export {
  ScriptEngine,
  ScriptAPI,
  ScriptRegistry,
  ScriptLoader,
  ScriptRunner,
  globalScriptRegistry,
  createScriptContext,
} from './scripting';
export type {
  ScriptModule,
  ScriptContext,
  ScriptDebugState,
  ScriptLogEntry,
  ScriptState,
  ScriptEventName,
  CreatePresetOptions,
  SpawnParticlesOptions,
} from './scripting';

// Performance
export {
  PerformanceManager,
  FrameProfiler,
  MemoryProfiler,
  ObjectPool,
  gridCellPool,
  GlyphCache,
  SpatialGrid,
  DirtyRegionTracker,
  WorkerManager,
  QUALITY_PRESETS,
  resolveQualityPreset,
  qualityPresetIds,
  PERFORMANCE_CONTROLS,
  DEFAULT_PERFORMANCE_CONTROLS,
} from './performance';
export type {
  QualityPresetId,
  QualitySettings,
  PerformanceDebugState,
  FramePhase,
  RenderMetrics,
  PerformanceManagerOptions,
} from './performance';
