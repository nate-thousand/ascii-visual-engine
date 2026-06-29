import type { AsciiPreset, EngineEventName, NoteEvent } from '../core/types';
import type { LayerConfig } from '../compositing/Layer';
import type {
  CreatePresetOptions,
  ScriptEngineBridge,
  ScriptLogEntry,
  SpawnParticlesOptions,
} from './ScriptTypes';
import type { ScriptContext } from './ScriptTypes';

type EventHandler = (data: unknown) => void;

export class ScriptAPI {
  private unsubscribers: Array<() => void> = [];
  private logSink: (entry: ScriptLogEntry) => void;

  constructor(
    private bridge: ScriptEngineBridge,
    logSink: (entry: ScriptLogEntry) => void,
  ) {
    this.logSink = logSink;
  }

  log(...args: unknown[]): void {
    this.writeLog('log', args.map(String).join(' '));
  }

  warn(...args: unknown[]): void {
    this.writeLog('warn', args.map(String).join(' '));
  }

  error(...args: unknown[]): void {
    this.writeLog('error', args.map(String).join(' '));
  }

  private writeLog(level: ScriptLogEntry['level'], message: string): void {
    this.logSink({ level, message, timestamp: Date.now() });
  }

  // Preset
  setPreset(preset: AsciiPreset): void {
    this.bridge.setPreset(preset);
  }

  setPresetById(id: string): void {
    this.bridge.setPresetById(id);
  }

  getPreset(): AsciiPreset {
    return this.bridge.getPreset();
  }

  createPreset(options: CreatePresetOptions): AsciiPreset {
    const base = this.bridge.getBasePreset(options.basePresetId ?? 'basic');
    if (!base) throw new Error(`Unknown base preset: ${options.basePresetId}`);

    const motions = options.motions?.map((id) => ({
      id: normalizeId(id),
      enabled: true,
      weight: 1,
    }));

    const simulations = options.simulations?.map((id) => ({
      id: normalizeId(id),
      enabled: true,
    }));

    const preset: AsciiPreset = {
      ...base,
      ...options,
      id: options.id,
      name: options.name,
      glyphSet: options.glyphSet ?? base.glyphSet,
      plugins: options.plugins ?? base.plugins,
      patterns: options.patterns ?? base.patterns,
      motions: motions ?? base.motions,
      simulations: simulations ?? base.simulations,
      layers: options.layers ?? base.layers,
      controls: options.controls ?? base.controls,
    };

    if (options.glyphLanguage) {
      preset.glyphLanguage = options.glyphLanguage;
    }

    return preset;
  }

  listPresets(): string[] {
    return this.bridge.listPresetIds();
  }

  // Controls
  setControl(name: string, value: number): void {
    this.bridge.setControl(name, value);
  }

  getControl(name: string, fallback = 0): number {
    return this.bridge.getControl(name, fallback);
  }

  animateControl(name: string, to: number, duration: number, ctx: ScriptContext): void {
    const from = this.getControl(name);
    const start = ctx.time;
    ctx.vars[`anim:${name}`] = { from, to, start, duration };
  }

  // Plugins
  enablePlugin(id: string): void {
    this.bridge.enablePlugin(normalizeId(id));
  }

  disablePlugin(id: string): void {
    this.bridge.disablePlugin(normalizeId(id));
  }

  // Motions
  enableMotion(id: string): void {
    this.bridge.enableMotion(normalizeId(id));
  }

  disableMotion(id: string): void {
    this.bridge.disableMotion(normalizeId(id));
  }

  setMotionWeight(id: string, weight: number): void {
    this.bridge.setMotionWeight(normalizeId(id), weight);
  }

  // Simulations
  enableSimulation(id: string): void {
    this.bridge.enableSimulation(normalizeId(id));
  }

  disableSimulation(id: string): void {
    this.bridge.disableSimulation(normalizeId(id));
  }

  resetSimulations(): void {
    this.bridge.resetSimulations();
  }

  spawnParticles(options: SpawnParticlesOptions = {}): void {
    this.enableSimulation('particle');
    const rate = Math.min(1, (options.count ?? 5) / 10);
    this.setControl('simSpawnRate', rate);
    this.noteOn({
      x: options.x ?? 0.5,
      y: options.y ?? 0.5,
      intensity: options.intensity ?? 1.5,
    });
  }

  // Glyphs
  setGlyphLanguage(languageId: string): void {
    this.bridge.applyGlyphLanguage(languageId);
  }

  // Layers
  createLayer(config: LayerConfig): void {
    this.bridge.addLayer(config);
  }

  removeLayer(id: string): void {
    this.bridge.removeLayer(id);
  }

  enableLayer(id: string): void {
    this.bridge.enableLayer(id);
  }

  disableLayer(id: string): void {
    this.bridge.disableLayer(id);
  }

  resetComposition(): void {
    this.bridge.resetComposition();
  }

  // Performance
  noteOn(event: NoteEvent = {}): void {
    this.bridge.noteOn(event);
  }

  noteOff(event: NoteEvent = {}): void {
    this.bridge.noteOff(event);
  }

  // Introspection
  getTime(): number {
    return this.bridge.getTime();
  }

  getFps(): number {
    return this.bridge.getFps();
  }

  getGridState() {
    return this.bridge.getGridState();
  }

  // Events
  on(event: EngineEventName | 'tick' | 'presetChanged' | 'controlChange', handler: EventHandler): () => void {
    const mapped = mapScriptEvent(event);
    const unsub = this.bridge.onEngineEvent(mapped, handler);
    this.unsubscribers.push(unsub);
    return unsub;
  }

  off(unsub: () => void): void {
    unsub();
    this.unsubscribers = this.unsubscribers.filter((u) => u !== unsub);
  }

  emit(type: string, data?: unknown): void {
    this.bridge.emitCustom(type, data);
  }

  /** Process control animations stored in context.vars */
  tickAnimations(ctx: ScriptContext): void {
    for (const key of Object.keys(ctx.vars)) {
      if (!key.startsWith('anim:')) continue;
      const anim = ctx.vars[key] as { from: number; to: number; start: number; duration: number };
      const control = key.slice(5);
      const t = Math.min(1, (ctx.time - anim.start) / Math.max(anim.duration, 0.001));
      const value = anim.from + (anim.to - anim.from) * t;
      this.setControl(control, value);
      if (t >= 1) delete ctx.vars[key];
    }
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }
}

function normalizeId(id: string): string {
  if (id === 'FlowField') return 'flowField';
  if (id === 'Breathing') return 'breathing';
  if (id === 'Particles') return 'particle';
  if (id === 'Particle') return 'particle';
  return id.charAt(0).toLowerCase() + id.slice(1);
}

function mapScriptEvent(event: string): EngineEventName {
  switch (event) {
    case 'presetChanged':
      return 'preset';
    case 'controlChange':
      return 'control';
    case 'tick':
      return 'custom';
    case 'midi':
      return 'input';
    default:
      return event as EngineEventName;
  }
}
