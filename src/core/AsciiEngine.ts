import { EventBus } from './EventBus';
import {
  RendererManager,
  createBuiltInRenderers,
  resolveRendererId,
  type RendererId,
} from '../renderers';
import {
  PluginManager,
  PatternPlugin,
  createBuiltInPlugins,
  resolvePresetPlugins,
} from '../plugins';
import { isEffectPlugin, type Plugin, type PluginContext } from '../plugins';
import {
  MotionManager,
  createBuiltInMotions,
  resolvePresetMotions,
  DEFAULT_MOTION_CONTROLS,
} from '../motion';
import type { Motion } from '../motion';
import type { Pattern, PatternId } from '../patterns';
import type {
  AsciiEngineOptions,
  AsciiPreset,
  EngineEventPayload,
  GridState,
  NoteEvent,
} from './types';
import {
  assertValidPreset,
  warnUnknownControl,
  warnUnknownPluginIds,
  warnUnknownMotionIds,
  warnUnknownSimulationIds,
} from './validate';
import type { EngineDebugState } from './debug';
import {
  SourceManager,
  createBuiltInSources,
  resolvePresetSource,
  DEFAULT_SOURCE_CONTROLS,
  type SourceMode,
  type SourceFitMode,
} from '../sources';
import {
  SimulationManager,
  createBuiltInSimulations,
  resolvePresetSimulations,
  DEFAULT_SIMULATION_CONTROLS,
} from '../simulation';
import type { Simulation } from '../simulation';
import {
  LayerManager,
  PostProcessor,
  resolvePresetLayers,
  resolvePresetPostProcessing,
  DEFAULT_POST_CONTROLS,
} from '../compositing';
import {
  AudioInput,
  AudioAnalyzer,
  AudioFeatureExtractor,
  AudioReactiveMapper,
  resolveAudioMappingPreset,
  DEFAULT_AUDIO_SMOOTHING_CONTROLS,
  type AudioFeatures,
  type AudioInputOptions,
  type AudioMappingConfig,
} from '../audio';
import {
  InputManager,
  type InputMappingConfig,
  type MidiDeviceInfo,
  type PerformanceTarget,
  type LearnedMapping,
} from '../input';
import { getPreset, type PresetId } from '../presets';
import { GlyphRegistry } from '../glyphs';
import type { GlyphLanguageConfig } from '../glyphs';
import { ExportManager } from '../export';
import { ScriptEngine } from '../scripting';
import { PerformanceManager, type QualityPresetId, DEFAULT_PERFORMANCE_CONTROLS } from '../performance';
import type { AsciiSceneDocument } from '../export/SceneFormat';
import type {
  AsciiExportOptions,
  GifExportOptions,
  ScreenshotOptions,
  SequenceExportOptions,
  SvgExportOptions,
} from '../export/ExportTypes';
import { KNOWN_CONTROLS } from './validate';

const LEGACY_PATTERN_IDS: Record<string, string> = {
  wave: 'wavePattern',
};

const DEFAULT_PRESET: AsciiPreset = {
  id: 'basic',
  name: 'Basic',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#'],
  motionField: 'wave',
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'burst', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'trails', type: 'effect' },
  ],
  controls: [],
  density: 1,
  speed: 1,
  trailAmount: 0.3,
  glitchAmount: 0.1,
};

export class AsciiEngine {
  private canvas: HTMLCanvasElement;
  private element: HTMLElement | undefined;
  private rendererManager = new RendererManager();
  private eventBus = new EventBus();
  private pluginManager = new PluginManager();
  private motionManager = new MotionManager();
  private sourceManager = new SourceManager();
  private simulationManager = new SimulationManager();
  private layerManager = new LayerManager();
  private postProcessor = new PostProcessor();
  private audioInput = new AudioInput();
  private audioAnalyzer = new AudioAnalyzer();
  private audioFeatureExtractor = new AudioFeatureExtractor();
  private audioMapper = new AudioReactiveMapper();
  private lastAudioFeatures: AudioFeatures | null = null;
  private lastAudioUpdateMs = 0;
  private inputManager = new InputManager();
  private glyphRegistry = new GlyphRegistry();
  private exportManager = new ExportManager();
  private scriptEngine = new ScriptEngine();
  private performanceManager = new PerformanceManager();
  private preset: AsciiPreset;
  private controlValues = new Map<string, number>();
  private rafId: number | null = null;
  private running = false;
  private destroyed = false;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTime = 0;
  private time = 0;
  private lastFps = 0;
  private lastNoteOn: NoteEvent | null = null;

  constructor(options: AsciiEngineOptions) {
    this.canvas = options.canvas;
    this.element = options.element;
    this.preset = options.preset ?? DEFAULT_PRESET;
    assertValidPreset(this.preset);

    const width = options.width ?? window.innerWidth;
    const height = options.height ?? window.innerHeight;

    this.glyphRegistry.applyPresetConfig(this.preset);

    this.rendererManager.setEngine(this);
    this.initRenderers({
      canvas: this.canvas,
      element: this.element,
      width,
      height,
      density: this.preset.density,
      glyphSet: this.glyphRegistry.getResolvedGlyphSet(),
      activeId: resolveRendererId(options.renderer),
    });

    this.pluginManager.setEngine(this);
    this.motionManager.setEngine(this);
    this.sourceManager.setEngine(this);
    this.simulationManager.setEngine(this);
    this.layerManager.setEngine(this);
    this.inputManager.setEngine(this);
    this.exportManager.setEngine(this, (grid) => {
      this.rendererManager.importGridState(grid);
    });
    this.scriptEngine.setEngine(this);
    this.performanceManager.setEngine(this);
    this.initPlugins();
    this.initMotions();
    this.initSources();
    this.initSimulations();
    this.initControls(this.preset);
    this.applyPresetPlugins(this.preset);
    this.applyPresetMotions(this.preset);
    this.applyPresetSource(this.preset);
    this.applyPresetSimulations(this.preset);
    this.applyPresetLayers(this.preset);
    this.applyPresetPostProcessing(this.preset);
    this.applyPresetAudioMapping(this.preset);
    this.applyPresetInputMapping(this.preset);
    this.rendererManager.setGlyphSet(this.glyphRegistry.getResolvedGlyphSet());

    if (options.autoStart !== false) {
      this.start();
    }
  }

  start(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.eventBus.emit('start', undefined);
    this.tick(this.lastTime);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.eventBus.emit('stop', undefined);
  }

  destroy(): void {
    this.stop();
    this.destroyed = true;
    this.pluginManager.destroy();
    this.motionManager.destroy();
    this.sourceManager.destroy();
    this.simulationManager.destroy();
    this.layerManager.destroy();
    this.postProcessor.destroy();
    this.disconnectAudio();
    this.inputManager.destroy();
    this.glyphRegistry.destroy();
    this.exportManager.destroy();
    this.scriptEngine.destroy();
    this.performanceManager.destroy();
    this.rendererManager.destroy();
    this.eventBus.clear();
  }

  setPreset(preset: AsciiPreset): void {
    assertValidPreset(preset);
    this.preset = preset;
    this.initControls(preset);
    this.rendererManager.setDensity(this.getControl('density', preset.density));
    this.pluginManager.resetEffects();
    this.applyPresetPlugins(preset);
    this.applyPresetMotions(preset);
    this.applyPresetSource(preset);
    this.applyPresetSimulations(preset);
    this.applyPresetLayers(preset);
    this.applyPresetPostProcessing(preset);
    this.applyPresetAudioMapping(preset);
    this.applyPresetInputMapping(preset);
    this.applyPresetGlyphs(preset);
    this.eventBus.emit('preset', preset);
  }

  setControl(name: string, value: number): void {
    warnUnknownControl(name);
    this.controlValues.set(name, value);

    if (name === 'density') {
      this.rendererManager.setDensity(value);
      this.performanceManager.setBaseDensity(value);
    }

    if (name === 'perfQuality') {
      const ids: QualityPresetId[] = ['ultra', 'high', 'medium', 'low', 'batterySaver'];
      const preset = ids[Math.round(value * (ids.length - 1))] ?? 'medium';
      this.performanceManager.applyQualityPreset(preset);
    }
    if (name === 'fpsTarget') {
      this.performanceManager.setFpsTarget(value);
    }
    if (name === 'adaptiveQuality') {
      this.performanceManager.setAdaptiveQuality(value > 0.5);
    }
    if (name === 'dirtyRendering') {
      this.performanceManager.getDirtyTracker().setEnabled(value > 0.5);
    }
    if (name === 'spatialGrid') {
      if (value <= 0.5) this.performanceManager.getSpatialGrid().clear();
    }
    if (name === 'workerOffload') {
      this.performanceManager.getWorkerManager().setEnabled(value > 0.5);
      if (value > 0.5) this.performanceManager.getWorkerManager().init(2);
    }

    this.eventBus.emit('control', { name, value });
  }

  getControl(name: string, fallback?: number): number {
    if (this.controlValues.has(name)) {
      return this.controlValues.get(name)!;
    }
    return fallback ?? 0;
  }

  registerPlugin(plugin: Plugin): void {
    this.pluginManager.register(plugin);
  }

  unregisterPlugin(id: string): void {
    this.pluginManager.unregister(id);
  }

  enablePlugin(id: string): void {
    this.pluginManager.enable(id);
    const plugin = this.pluginManager.get(id);
    if (plugin) {
      this.eventBus.emit('plugin', { id, type: plugin.type, enabled: true });
    }
  }

  disablePlugin(id: string): void {
    const plugin = this.pluginManager.get(id);
    this.pluginManager.disable(id);
    if (plugin) {
      this.eventBus.emit('plugin', { id, type: plugin.type, enabled: false });
    }
  }

  getPlugin(id: string): Plugin | undefined {
    return this.pluginManager.get(id);
  }

  getEnabledPlugins(): Plugin[] {
    return this.pluginManager.getEnabled();
  }

  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  registerMotion(motion: Motion): void {
    this.motionManager.registerMotion(motion);
  }

  unregisterMotion(id: string): void {
    this.motionManager.unregisterMotion(id);
  }

  enableMotion(id: string): void {
    this.motionManager.enableMotion(id);
    this.eventBus.emit('motion', { id, enabled: true });
  }

  disableMotion(id: string): void {
    this.motionManager.disableMotion(id);
    this.eventBus.emit('motion', { id, enabled: false });
  }

  getMotion(id: string): Motion | undefined {
    return this.motionManager.getMotion(id);
  }

  getEnabledMotions(): Motion[] {
    return this.motionManager.getEnabled();
  }

  getMotionManager(): MotionManager {
    return this.motionManager;
  }

  getSourceManager(): SourceManager {
    return this.sourceManager;
  }

  getRendererManager(): RendererManager {
    return this.rendererManager;
  }

  getSimulationManager(): SimulationManager {
    return this.simulationManager;
  }

  registerSimulation(simulation: Simulation): void {
    this.simulationManager.registerSimulation(simulation);
  }

  unregisterSimulation(id: string): void {
    this.simulationManager.unregisterSimulation(id);
  }

  enableSimulation(id: string): void {
    this.simulationManager.enableSimulation(id);
    this.eventBus.emit('simulation', { id, enabled: true });
  }

  disableSimulation(id: string): void {
    this.simulationManager.disableSimulation(id);
    this.eventBus.emit('simulation', { id, enabled: false });
  }

  getSimulation(id: string): Simulation | undefined {
    return this.simulationManager.getSimulation(id);
  }

  getEnabledSimulations(): Simulation[] {
    return this.simulationManager.getEnabled();
  }

  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  getPostProcessor(): PostProcessor {
    return this.postProcessor;
  }

  resetComposition(): void {
    this.layerManager.clear();
    this.postProcessor.reset();
    this.applyPresetLayers(this.preset);
    this.applyPresetPostProcessing(this.preset);
  }

  async connectAudio(input: AudioInputOptions): Promise<{ ok: boolean; error?: string }> {
    const result = await this.audioInput.connect(input);
    if (!result.ok) {
      this.eventBus.emit('audio', this.getSilentFeatures());
      return result;
    }

    this.audioAnalyzer.setAnalyser(this.audioInput.getAnalyser());
    this.audioFeatureExtractor.reset();
    this.audioMapper.snapshotBaseValues(this);
    this.lastAudioFeatures = null;
    return { ok: true };
  }

  disconnectAudio(): void {
    if (this.audioInput.isConnected()) {
      this.audioMapper.restoreBaseValues(this);
    }
    this.audioInput.disconnect();
    this.audioAnalyzer.setAnalyser(null);
    this.audioFeatureExtractor.reset();
    this.lastAudioFeatures = null;
    this.lastAudioUpdateMs = 0;
  }

  setAudioMapping(mapping: AudioMappingConfig): void {
    const wasConnected = this.audioInput.isConnected();
    if (wasConnected) {
      this.audioMapper.restoreBaseValues(this);
    }
    this.audioMapper.setMapping(mapping);
    if (wasConnected) {
      this.audioMapper.snapshotBaseValues(this);
    }
  }

  getAudioFeatures(): AudioFeatures | null {
    return this.lastAudioFeatures;
  }

  isAudioConnected(): boolean {
    return this.audioInput.isConnected();
  }

  async connectMidi(deviceId?: string): Promise<{ ok: boolean; error?: string }> {
    const result = await this.inputManager.connectMidi(deviceId);
    this.eventBus.emit('input', this.inputManager.getDebugState());
    return result;
  }

  disconnectMidi(): void {
    this.inputManager.disconnectMidi();
    this.eventBus.emit('input', this.inputManager.getDebugState());
  }

  async getMidiDevices(): Promise<MidiDeviceInfo[]> {
    return this.inputManager.getMidiDevices();
  }

  setInputMapping(mapping: InputMappingConfig): void {
    this.inputManager.setMapping(mapping);
  }

  getInputMapping(): InputMappingConfig {
    return this.inputManager.getMapping();
  }

  clearInputMapping(): void {
    this.inputManager.clearMapping();
  }

  resetInputMapping(): void {
    this.inputManager.resetMappings();
  }

  enableKeyboardInput(): void {
    this.inputManager.enableKeyboard();
    this.eventBus.emit('input', this.inputManager.getDebugState());
  }

  disableKeyboardInput(): void {
    this.inputManager.disableKeyboard();
    this.eventBus.emit('input', this.inputManager.getDebugState());
  }

  isKeyboardInputEnabled(): boolean {
    return this.inputManager.isKeyboardEnabled();
  }

  startInputLearn(target: PerformanceTarget, callback?: (mapping: LearnedMapping) => void): void {
    this.inputManager.startLearn(target, callback);
  }

  cancelInputLearn(): void {
    this.inputManager.cancelLearn();
  }

  inputPanic(): void {
    this.inputManager.panic();
    const burst = this.pluginManager.get('burst');
    if (burst && isEffectPlugin(burst)) {
      burst.reset();
    }
    this.eventBus.emit('input', this.inputManager.getDebugState());
  }

  getInputNoteMonitor() {
    return this.inputManager.getNoteMonitor();
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  setActiveRenderer(id: RendererId): { ok: boolean; warning: string | null } {
    const result = this.rendererManager.setActiveRenderer(id);
    this.eventBus.emit('renderer', {
      id: result.activeId,
      ok: result.ok,
      warning: result.warning,
    });
    return { ok: result.ok, warning: result.warning };
  }

  getActiveRendererId(): RendererId | null {
    return this.rendererManager.getActiveId();
  }

  setSourceMode(mode: SourceMode): void {
    this.sourceManager.setMode(mode);
    this.eventBus.emit('source', {
      mode,
      id: this.sourceManager.getActiveSource()?.id ?? null,
    });
  }

  getSourceMode(): SourceMode {
    return this.sourceManager.getMode();
  }

  setActiveSource(id: string | null): void {
    this.sourceManager.setActiveSource(id);
    this.eventBus.emit('source', {
      mode: this.sourceManager.getMode(),
      id,
    });
  }

  async loadSource(id: string, input: unknown): Promise<void> {
    await this.sourceManager.loadSource(id, input);
    this.eventBus.emit('source', {
      mode: this.sourceManager.getMode(),
      id: this.sourceManager.getActiveSource()?.id ?? null,
    });
  }

  setMotionWeight(id: string, weight: number): void {
    this.motionManager.setMotionWeight(id, weight);
  }

  /** @deprecated Use registerPlugin with a PatternPlugin wrapper */
  registerPattern(pattern: Pattern): void {
    this.registerPlugin(new PatternPlugin(pattern, { version: '1.0.0' }));
  }

  /** @deprecated Use unregisterPlugin */
  unregisterPattern(id: PatternId): void {
    this.unregisterPlugin(LEGACY_PATTERN_IDS[id] ?? id);
  }

  /** @deprecated Use enablePlugin */
  enablePattern(id: PatternId): void {
    const pluginId = LEGACY_PATTERN_IDS[id] ?? id;
    this.enablePlugin(pluginId);
    this.eventBus.emit('pattern', { id, enabled: true });
  }

  /** @deprecated Use disablePlugin */
  disablePattern(id: PatternId): void {
    const pluginId = LEGACY_PATTERN_IDS[id] ?? id;
    this.disablePlugin(pluginId);
    this.eventBus.emit('pattern', { id, enabled: false });
  }

  /** @deprecated Use getPlugin */
  getPattern(id: PatternId): Pattern | undefined {
    const plugin = this.pluginManager.get(LEGACY_PATTERN_IDS[id] ?? id);
    if (plugin instanceof PatternPlugin) {
      return plugin.getPattern();
    }
    return undefined;
  }

  /** @deprecated Use getEnabledPlugins filtered by type pattern */
  getEnabledPatterns(): PatternId[] {
    return this.pluginManager
      .getEnabledByType('pattern')
      .map((p) => {
        const reverse = Object.entries(LEGACY_PATTERN_IDS).find(([, v]) => v === p.id);
        return (reverse?.[0] ?? p.id) as PatternId;
      });
  }

  noteOn(event: NoteEvent = {}): void {
    this.lastNoteOn = { ...event };
    this.pluginManager.dispatchNoteOn(event);
    this.eventBus.emit('noteOn', event);
  }

  noteOff(event: NoteEvent = {}): void {
    this.pluginManager.dispatchNoteOff(event);
    this.eventBus.emit('noteOff', event);
  }

  emit(event: EngineEventPayload): void {
    this.eventBus.emit('custom', event);
  }

  on = this.eventBus.on.bind(this.eventBus);
  off = this.eventBus.off.bind(this.eventBus);

  resize(width: number, height: number): void {
    this.rendererManager.resize(width, height);
    this.eventBus.emit('resize', { width, height });
  }

  getPreset(): AsciiPreset {
    return this.preset;
  }

  getGridState(): GridState {
    return this.rendererManager.getGridState(this.time);
  }

  getEngineTime(): number {
    return this.time;
  }

  getEngineFps(): number {
    return this.lastFps;
  }

  applyGlyphLanguage(languageId: string): void {
    this.glyphRegistry.applyPresetConfig({ glyphLanguage: languageId });
    this.rendererManager.setGlyphSet(this.glyphRegistry.getResolvedGlyphSet());
  }

  isRunning(): boolean {
    return this.running;
  }

  getDebugState(): EngineDebugState {
    return {
      preset: this.preset.id,
      effects: this.pluginManager
        .getEnabledByType('effect')
        .map((plugin) => plugin.id),
      patterns: this.pluginManager
        .getEnabledByType('pattern')
        .map((plugin) => plugin.id),
      motions: this.motionManager.getEnabled().map((m) => m.id),
      density: this.getControl('density', this.preset.density),
      speed: this.getControl('speed', this.preset.speed),
      glitchAmount: this.getControl('glitchAmount', this.preset.glitchAmount),
      trailAmount: this.getControl('trailAmount', this.preset.trailAmount),
      symmetry: this.getControl('symmetry', this.preset.symmetry ?? 6),
      petals: this.getControl('petals', this.preset.petals ?? 5),
      spiralAmount: this.getControl('spiralAmount', this.preset.spiralAmount ?? 0.5),
      cellularAmount: this.getControl('cellularAmount', this.preset.cellularAmount ?? 0.5),
      scanlineAmount: this.getControl('scanlineAmount', this.preset.scanlineAmount ?? 0.5),
      strength: this.getControl('strength', this.preset.strength ?? 0.7),
      randomness: this.getControl('randomness', this.preset.randomness ?? 0.3),
      frequency: this.getControl('frequency', this.preset.frequency ?? 1),
      amplitude: this.getControl('amplitude', this.preset.amplitude ?? 1),
      lastNoteOn: this.lastNoteOn,
      fps: this.lastFps,
      time: this.time,
      motion: this.motionManager.getDebugState(),
      source: this.sourceManager.getDebugState(),
      renderer: this.rendererManager.getDebugState(),
      simulation: this.simulationManager.getDebugState(),
      compositing: this.layerManager.getDebugState(),
      postProcessing: this.postProcessor.getDebugState(),
      audio: {
        connected: this.audioInput.isConnected(),
        inputType: this.audioInput.getState().inputType,
        ready: this.audioInput.getState().ready,
        error: this.audioInput.getState().error,
        fftSize: this.audioAnalyzer.getFftSize(),
        features: this.lastAudioFeatures,
        mappingEnabled: this.audioMapper.getMapping().enabled !== false,
        updateTimeMs: this.lastAudioUpdateMs,
      },
      input: this.inputManager.getDebugState(),
      glyph: this.glyphRegistry.getDebugState(),
      export: this.exportManager.getDebugState(),
      script: this.scriptEngine.getDebugState(),
      performance: this.performanceManager.getDebugState(),
    };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getExportManager(): ExportManager {
    return this.exportManager;
  }

  getScriptEngine(): ScriptEngine {
    return this.scriptEngine;
  }

  registerScript(module: import('../scripting').ScriptModule): void {
    this.scriptEngine.registerScript(module);
  }

  registerScripts(modules: import('../scripting').ScriptModule[]): void {
    this.scriptEngine.registerScripts(modules);
  }

  async runScript(id: string): Promise<void> {
    await this.scriptEngine.runScript(id);
  }

  async stopScript(): Promise<void> {
    await this.scriptEngine.stopScript();
  }

  async reloadScript(id?: string): Promise<void> {
    await this.scriptEngine.reloadScript(id);
  }

  async restartScript(): Promise<void> {
    await this.scriptEngine.restartScript();
  }

  enableScript(): void {
    this.scriptEngine.enableScript();
  }

  disableScript(): void {
    this.scriptEngine.disableScript();
  }

  clearScriptConsole(): void {
    this.scriptEngine.clearConsole();
  }

  getPerformanceManager(): PerformanceManager {
    return this.performanceManager;
  }

  setQualityPreset(id: QualityPresetId): void {
    this.performanceManager.applyQualityPreset(id);
  }

  getQualityPreset(): QualityPresetId {
    return this.performanceManager.getQualityPreset();
  }

  getAudioMapping(): AudioMappingConfig {
    return this.audioMapper.getMapping();
  }

  getControls(): Record<string, number> {
    const controls: Record<string, number> = {};
    for (const name of KNOWN_CONTROLS) {
      controls[name] = this.getControl(name);
    }
    return controls;
  }

  applySceneDocument(doc: AsciiSceneDocument): void {
    this.setPreset(doc.preset);
    for (const [name, value] of Object.entries(doc.controls ?? {})) {
      this.setControl(name, value);
    }
    if (doc.inputMapping) this.setInputMapping(doc.inputMapping);
    if (doc.audioMapping) this.setAudioMapping(doc.audioMapping);
    if (doc.renderer) {
      this.setActiveRenderer(doc.renderer as RendererId);
    }
    if (doc.grid) {
      this.rendererManager.importGridState(doc.grid);
    }
  }

  async exportPNG(options?: ScreenshotOptions) {
    return this.exportManager.exportPNG(options);
  }

  exportSVG(options?: SvgExportOptions & { filename?: string }) {
    return this.exportManager.exportSVG(options);
  }

  async exportGIF(options?: GifExportOptions) {
    return this.exportManager.exportGIF(options);
  }

  exportJSON(name?: string) {
    return this.exportManager.exportJSON(name);
  }

  importJSON(json: string) {
    return this.exportManager.importJSON(json);
  }

  exportASCII(options?: AsciiExportOptions & { filename?: string }) {
    return this.exportManager.exportASCII(options);
  }

  async exportSequence(options?: SequenceExportOptions) {
    return this.exportManager.exportSequence(options);
  }

  startRecording(frameRate = 30) {
    return this.exportManager.startRecording(frameRate);
  }

  stopRecording() {
    return this.exportManager.stopRecording();
  }

  pauseRecording() {
    this.exportManager.pauseRecording();
  }

  resumeRecording() {
    this.exportManager.resumeRecording();
  }

  cancelRecording() {
    this.exportManager.cancelRecording();
  }

  playRecording(options?: { loop?: boolean; speed?: number; frameRate?: number }) {
    this.exportManager.playRecording(options);
  }

  pausePlayback() {
    this.exportManager.pausePlayback();
  }

  resumePlayback() {
    this.exportManager.resumePlayback();
  }

  stopPlayback() {
    this.exportManager.stopPlayback();
  }

  stepPlayback(delta: number) {
    this.exportManager.stepPlayback(delta);
  }

  scrubPlayback(index: number) {
    this.exportManager.scrubPlayback(index);
  }

  getGlyphRegistry(): GlyphRegistry {
    return this.glyphRegistry;
  }

  registerGlyphLanguage(config: GlyphLanguageConfig): void {
    this.glyphRegistry.registerGlyphLanguage(config);
  }

  getResolvedGlyphSet(): string[] {
    return this.glyphRegistry.getResolvedGlyphSet();
  }

  private initSimulations(): void {
    for (const simulation of createBuiltInSimulations()) {
      this.simulationManager.registerSimulation(simulation);
    }
  }

  private initRenderers(options: {
    canvas: HTMLCanvasElement;
    element?: HTMLElement;
    width: number;
    height: number;
    density: number;
    glyphSet: string[];
    activeId: RendererId;
  }): void {
    for (const renderer of createBuiltInRenderers(options)) {
      this.rendererManager.registerRenderer(renderer);
    }
    const result = this.rendererManager.setActiveRenderer(options.activeId);
    if (!result.ok && options.activeId !== 'canvas') {
      this.rendererManager.setActiveRenderer('canvas');
    }
  }

  private initSources(): void {
    for (const source of createBuiltInSources()) {
      this.sourceManager.registerSource(source);
    }
  }

  private initMotions(): void {
    for (const motion of createBuiltInMotions()) {
      this.motionManager.registerMotion(motion);
    }
  }

  private initPlugins(): void {
    for (const plugin of createBuiltInPlugins()) {
      this.pluginManager.register(plugin);
    }
  }

  private initControls(preset: AsciiPreset): void {
    this.controlValues.clear();

    for (const control of preset.controls) {
      this.controlValues.set(control.name, control.default);
    }

    this.controlValues.set('density', preset.density);
    this.controlValues.set('speed', preset.speed);
    this.controlValues.set('trailAmount', preset.trailAmount);
    this.controlValues.set('glitchAmount', preset.glitchAmount);
    this.controlValues.set('symmetry', preset.symmetry ?? 6);
    this.controlValues.set('petals', preset.petals ?? 5);
    this.controlValues.set('spiralAmount', preset.spiralAmount ?? 0.5);
    this.controlValues.set('cellularAmount', preset.cellularAmount ?? 0.5);
    this.controlValues.set('scanlineAmount', preset.scanlineAmount ?? 0.5);

    for (const [key, value] of Object.entries(DEFAULT_MOTION_CONTROLS)) {
      const presetValue = preset[key as keyof AsciiPreset];
      this.controlValues.set(
        key,
        typeof presetValue === 'number' ? presetValue : value,
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_SOURCE_CONTROLS)) {
      this.controlValues.set(key, value);
    }

    for (const [key, value] of Object.entries(DEFAULT_SIMULATION_CONTROLS)) {
      const presetValue = preset[key as keyof AsciiPreset];
      this.controlValues.set(
        key,
        typeof presetValue === 'number' ? presetValue : value,
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_POST_CONTROLS)) {
      const presetValue = preset[key as keyof AsciiPreset];
      this.controlValues.set(
        key,
        typeof presetValue === 'number' ? presetValue : value,
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_AUDIO_SMOOTHING_CONTROLS)) {
      const presetValue = preset[key as keyof AsciiPreset];
      this.controlValues.set(
        key,
        typeof presetValue === 'number' ? presetValue : value,
      );
    }

    for (const [key, value] of Object.entries(DEFAULT_PERFORMANCE_CONTROLS)) {
      this.controlValues.set(key, value);
    }
  }

  private applyPresetMotions(preset: AsciiPreset): void {
    const configs = resolvePresetMotions(preset);
    warnUnknownMotionIds(configs.map((c) => c.id));
    this.motionManager.setEnabledIds(configs);
    for (const config of configs) {
      if (config.weight !== undefined) {
        this.motionManager.setMotionWeight(config.id, config.weight);
      }
      if (config.priority !== undefined) {
        this.motionManager.setMotionPriority(config.id, config.priority);
      }
    }
  }

  private applyPresetPlugins(preset: AsciiPreset): void {
    const enabledIds = resolvePresetPlugins(preset);
    warnUnknownPluginIds(enabledIds);
    this.pluginManager.setEnabledIds(enabledIds);
  }

  private applyPresetSource(preset: AsciiPreset): void {
    const config = resolvePresetSource(preset);
    if (!config) {
      this.sourceManager.setMode('procedural');
      return;
    }

    const source = this.sourceManager.getSource(config.id);
    if (!source) return;

    this.sourceManager.setActiveSource(config.id);
    if (config.options?.fitMode) {
      source.setFitMode(config.options.fitMode as SourceFitMode);
    }
    void this.sourceManager.loadSource(config.id, config.options ?? {});
  }

  private applyPresetSimulations(preset: AsciiPreset): void {
    const configs = resolvePresetSimulations(preset);
    warnUnknownSimulationIds(configs.map((c) => c.id));
    this.simulationManager.setEnabledIds(configs);
  }

  private applyPresetLayers(preset: AsciiPreset): void {
    const configs = resolvePresetLayers(preset);
    this.layerManager.setFromPreset(configs);
  }

  private applyPresetPostProcessing(preset: AsciiPreset): void {
    const configs = resolvePresetPostProcessing(preset);
    this.postProcessor.setFromPreset(configs);
  }

  private applyPresetAudioMapping(preset: AsciiPreset): void {
    const mapping = resolveAudioMappingPreset(preset.audioMapping);
    if (mapping) {
      this.audioMapper.setMapping(mapping);
      if (this.audioInput.isConnected()) {
        this.audioMapper.snapshotBaseValues(this);
      }
    }
  }

  private applyPresetGlyphs(preset: AsciiPreset): void {
    this.glyphRegistry.applyPresetConfig(preset);
    this.rendererManager.setGlyphSet(this.glyphRegistry.getResolvedGlyphSet());
  }

  private applyPresetInputMapping(preset: AsciiPreset): void {
    if (preset.inputMapping) {
      this.inputManager.applyPresetConfig(preset.inputMapping);
    }
  }

  private updateInput(): void {
    this.inputManager.processQueuedEvents();
  }

  setPresetById(id: string): void {
    try {
      this.setPreset(getPreset(id as PresetId));
    } catch {
      console.warn(`[AsciiEngine] Unknown preset id "${id}"`);
    }
  }

  private syncAudioSmoothingFromControls(): void {
    this.audioMapper.setSmoothing({
      attack: this.getControl('audioAttack', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioAttack),
      release: this.getControl('audioRelease', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioRelease),
      sensitivity: this.getControl('audioSensitivity', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioSensitivity),
      noiseGate: this.getControl('audioNoiseGate', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioNoiseGate),
      minThreshold: this.getControl('audioMinThreshold', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioMinThreshold),
      maxClamp: this.getControl('audioMaxClamp', DEFAULT_AUDIO_SMOOTHING_CONTROLS.audioMaxClamp),
    });
  }

  private updateAudio(dt: number): void {
    if (!this.audioInput.isConnected()) return;

    const start = performance.now();
    this.syncAudioSmoothingFromControls();
    this.audioAnalyzer.update();
    const features = this.audioFeatureExtractor.extract(this.audioAnalyzer, start);
    this.lastAudioFeatures = features;
    this.audioMapper.apply(this, features, dt, start);
    this.lastAudioUpdateMs = performance.now() - start;
    this.performanceManager.setAudioLatencyMs(this.lastAudioUpdateMs);
    this.eventBus.emit('audio', features);
  }

  private getSilentFeatures(): AudioFeatures {
    return {
      amplitude: 0,
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
      spectralCentroid: 0,
      transient: 0,
      beat: 0,
    };
  }

  private buildCompositingContext(dt: number) {
    const grid = this.rendererManager.getGridState(this.time);
    return {
      engine: this,
      baseGrid: grid,
      targetGrid: grid,
      glyphSet: this.glyphRegistry.getResolvedGlyphSet(),
      time: this.time,
      dt,
      getControl: (name: string, fallback?: number) => this.getControl(name, fallback),
    };
  }

  private buildSimulationContext(dt: number) {
    const grid = this.rendererManager.getGridState(this.time);
    const useSpatial =
      this.performanceManager.isSpatialGridEnabled() ||
      this.getControl('spatialGrid', 0) > 0.5;
    const spatialGrid = useSpatial ? this.performanceManager.getSpatialGrid() : undefined;
    if (spatialGrid) {
      spatialGrid.resize(grid.cols, grid.rows, 1 / Math.max(grid.cols, 1));
    }
    return {
      engine: this,
      grid,
      glyphSet: this.glyphRegistry.getResolvedGlyphSet(),
      time: this.time,
      dt,
      cols: grid.cols,
      rows: grid.rows,
      cellCount: grid.cells.length,
      getControl: (name: string, fallback?: number) => this.getControl(name, fallback),
      spatialGrid,
      particleCapScale: this.performanceManager.getParticleCapacityScale(),
      simQualityScale: this.performanceManager.getSimQualityScale(),
    };
  }

  private buildSourceContext(dt: number) {
    const grid = this.rendererManager.getGridState(this.time);
    return {
      engine: this,
      grid,
      glyphSet: this.glyphRegistry.getResolvedGlyphSet(),
      time: this.time,
      dt,
      cols: grid.cols,
      rows: grid.rows,
      getControl: (name: string, fallback?: number) => this.getControl(name, fallback),
    };
  }

  private buildMotionContext(dt: number) {
    const grid = this.rendererManager.getGridState(this.time);
    return {
      engine: this,
      grid,
      time: this.time,
      dt,
      cols: grid.cols,
      rows: grid.rows,
      cellCount: grid.cells.length,
      getControl: (name: string, fallback?: number) => this.getControl(name, fallback),
    };
  }

  private applyMotionGlyphs(grid: GridState): void {
    if (this.glyphRegistry.isEnabled()) return;
    const glyphSet = this.glyphRegistry.getResolvedGlyphSet();
    const len = glyphSet.length;
    if (len <= 1) return;

    for (const cell of grid.cells) {
      const phase = ((cell.phase % 1) + 1) % 1;
      const index = Math.floor(phase * (len - 1));
      cell.char = glyphSet[Math.max(0, Math.min(len - 1, index))];
    }
  }

  private buildGlyphContext(_dt: number) {
    const grid = this.rendererManager.getGridState(this.time);
    const simDebug = this.simulationManager.getDebugState();
    return {
      time: this.time,
      cols: grid.cols,
      rows: grid.rows,
      audioAmplitude: this.lastAudioFeatures?.amplitude ?? 0,
      motionStrength: this.getControl('strength', this.preset.strength ?? 0.7),
      simulationEnergy: simDebug.totalParticles > 0
        ? Math.min(1, simDebug.totalParticles / Math.max(grid.cells.length, 1))
        : 0,
      density: this.getControl('density', this.preset.density),
    };
  }

  private buildPluginContext(dt: number): PluginContext {
    const grid = this.rendererManager.getGridState(this.time);
    return {
      engine: this,
      grid,
      glyphSet: this.glyphRegistry.getResolvedGlyphSet(),
      glyphLanguageActive: this.glyphRegistry.isEnabled(),
      time: this.time,
      dt,
      speed: this.getControl('speed', this.preset.speed),
      glitchAmount: this.getControl('glitchAmount', this.preset.glitchAmount),
      trailAmount: this.getControl('trailAmount', this.preset.trailAmount),
      getControl: (name, fallback) => this.getControl(name, fallback),
    };
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    this.performanceManager.beginFrame(now, dt);

    this.performanceManager.markPhase('script');
    this.scriptEngine.onFrameStart(dt, this.time);

    this.performanceManager.markPhase('audio');
    this.updateAudio(dt);

    this.performanceManager.markPhase('input');
    this.updateInput();

    const trailAmount = this.getControl('trailAmount', this.preset.trailAmount);

    this.performanceManager.markPhase('source');
    const sourceCtx = this.buildSourceContext(dt);
    this.sourceManager.update(dt, sourceCtx);

    const motionCtx = this.buildMotionContext(dt);
    const sourceApplied = this.sourceManager.applyToGrid(
      motionCtx.grid,
      this.glyphRegistry.getResolvedGlyphSet(),
      (name, fallback) => this.getControl(name, fallback),
    );

    const simulationsActive = this.simulationManager.isActive();
    const motionsActive = this.motionManager.getEnabled().length > 0;

    if (!sourceApplied) {
      if (simulationsActive) {
        this.performanceManager.markPhase('simulation');
        this.simulationManager.update(dt, this.buildSimulationContext(dt));
      } else if (motionsActive) {
        this.performanceManager.markPhase('motion');
        this.motionManager.combineMotions(motionCtx);
        this.applyMotionGlyphs(motionCtx.grid);
      }
    }

    this.performanceManager.markPhase('plugins');
    const ctx = this.buildPluginContext(dt);

    if (!sourceApplied && !simulationsActive && !motionsActive) {
      this.pluginManager.runMotionEffects(ctx);
    }
    this.pluginManager.updatePatterns(dt, ctx);
    this.pluginManager.applyPatterns(ctx);
    this.pluginManager.runPostEffects(ctx);

    const compositingActive = this.layerManager.isCompositingActive();
    const postActive = this.postProcessor.isActive();

    if (compositingActive) {
      this.performanceManager.markPhase('compositing');
      this.layerManager.renderLayers(this.buildCompositingContext(dt));
    }

    if (postActive) {
      this.performanceManager.markPhase('post');
      const grid = this.rendererManager.getGridState(this.time);
      this.postProcessor.process(
        grid,
        this.glyphRegistry.getResolvedGlyphSet(),
        this.time,
        dt,
        (name, fallback) => this.getControl(name, fallback),
      );
    }

    this.performanceManager.markPhase('glyphs');
    this.glyphRegistry.setDeltaTime(dt);
    const glyphGrid = this.rendererManager.getGridState(this.time);
    this.glyphRegistry.applyToGrid(glyphGrid, this.buildGlyphContext(dt));

    this.performanceManager.markPhase('render');
    const trailsEnabled = this.pluginManager.get('trails')?.enabled ?? false;
    const perf = this.performanceManager;
    this.rendererManager.render(
      { trailAmount: trailsEnabled ? trailAmount : 0, time: this.time },
      {
        engine: this,
        dt,
        getControl: (name, fallback) => this.getControl(name, fallback),
        glyphCache: perf.getGlyphCache(),
        dirtyTracker: perf.getDirtyTracker(),
        dirtyRendering: perf.isDirtyRenderingEnabled(),
        onRenderComplete: (metrics) => perf.setRenderMetrics(metrics),
      },
    );

    this.performanceManager.markPhase('export');
    this.exportManager.onFrameRendered(this.time);

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      this.lastFps = this.frameCount;
      this.motionManager.setFps(this.frameCount);
      this.simulationManager.setFps(this.frameCount);
      this.performanceManager.setFps(this.frameCount);
      this.performanceManager.endFrame(this.frameCount);
      this.eventBus.emit('frame', {
        time: this.time,
        fps: this.frameCount,
      });
      this.frameCount = 0;
      this.fpsTime = now;
    } else {
      this.performanceManager.endFrame(this.instantFpsEstimate());
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private instantFpsEstimate(): number {
    const totalMs = this.performanceManager.getProfilerLastTotalMs();
    return totalMs > 0 ? Math.min(240, 1000 / totalMs) : this.lastFps;
  }
}
