import { EventBus } from './EventBus';
import { CanvasAsciiRenderer } from '../renderers/CanvasAsciiRenderer';
import {
  PluginManager,
  PatternPlugin,
  createBuiltInPlugins,
  resolvePresetPlugins,
} from '../plugins';
import type { Plugin, PluginContext } from '../plugins';
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
import { warnUnknownControl, warnUnknownPluginIds, warnUnknownMotionIds } from './validate';
import type { EngineDebugState } from './debug';

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
  private renderer: CanvasAsciiRenderer;
  private eventBus = new EventBus();
  private pluginManager = new PluginManager();
  private motionManager = new MotionManager();
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
    this.preset = options.preset ?? DEFAULT_PRESET;

    const width = options.width ?? window.innerWidth;
    const height = options.height ?? window.innerHeight;

    this.renderer = new CanvasAsciiRenderer({
      canvas: this.canvas,
      width,
      height,
      density: this.preset.density,
      glyphSet: this.preset.glyphSet,
    });

    this.pluginManager.setEngine(this);
    this.motionManager.setEngine(this);
    this.initPlugins();
    this.initMotions();
    this.initControls(this.preset);
    this.applyPresetPlugins(this.preset);
    this.applyPresetMotions(this.preset);

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
    this.renderer.destroy();
    this.eventBus.clear();
  }

  setPreset(preset: AsciiPreset): void {
    this.preset = preset;
    this.initControls(preset);
    this.renderer.setDensity(this.getControl('density', preset.density));
    this.renderer.setGlyphSet(preset.glyphSet);
    this.pluginManager.resetEffects();
    this.applyPresetPlugins(preset);
    this.applyPresetMotions(preset);
    this.eventBus.emit('preset', preset);
  }

  setControl(name: string, value: number): void {
    warnUnknownControl(name);
    this.controlValues.set(name, value);

    if (name === 'density') {
      this.renderer.setDensity(value);
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
    this.renderer.resize(width, height);
    this.eventBus.emit('resize', { width, height });
  }

  getPreset(): AsciiPreset {
    return this.preset;
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
    };
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

  private buildMotionContext(dt: number) {
    const grid = this.renderer.getGridState(this.time);
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
    const { glyphSet } = this.preset;
    const len = glyphSet.length;
    if (len <= 1) return;

    for (const cell of grid.cells) {
      const phase = ((cell.phase % 1) + 1) % 1;
      const index = Math.floor(phase * (len - 1));
      cell.char = glyphSet[Math.max(0, Math.min(len - 1, index))];
    }
  }

  private buildPluginContext(dt: number): PluginContext {
    const grid = this.renderer.getGridState(this.time);
    return {
      engine: this,
      grid,
      glyphSet: this.preset.glyphSet,
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

    const trailAmount = this.getControl('trailAmount', this.preset.trailAmount);
    const motionCtx = this.buildMotionContext(dt);
    const motionsActive = this.motionManager.getEnabled().length > 0;

    if (motionsActive) {
      this.motionManager.combineMotions(motionCtx);
      this.applyMotionGlyphs(motionCtx.grid);
    }

    const ctx = this.buildPluginContext(dt);

    if (!motionsActive) {
      this.pluginManager.runMotionEffects(ctx);
    }
    this.pluginManager.updatePatterns(dt, ctx);
    this.pluginManager.applyPatterns(ctx);
    this.pluginManager.runPostEffects(ctx);

    const trailsEnabled = this.pluginManager.get('trails')?.enabled ?? false;
    this.renderer.render(trailsEnabled ? trailAmount : 0);

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      this.lastFps = this.frameCount;
      this.motionManager.setFps(this.frameCount);
      this.eventBus.emit('frame', {
        time: this.time,
        fps: this.frameCount,
      });
      this.frameCount = 0;
      this.fpsTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
