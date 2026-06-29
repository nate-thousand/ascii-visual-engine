import type { AsciiEngine } from '../core/AsciiEngine';
import type { EngineEventName, GridState } from '../core/types';
import { getPreset, listPresets, type PresetId } from '../presets/index';
import { ScriptLoader } from './ScriptLoader';
import { ScriptRegistry, globalScriptRegistry } from './ScriptRegistry';
import { ScriptRunner } from './ScriptRunner';
import type { ScriptDebugState, ScriptEngineBridge, ScriptModule } from './ScriptTypes';

export interface ScriptEngineOptions {
  hotReload?: boolean;
  registry?: ScriptRegistry;
}

export class ScriptEngine {
  private loader: ScriptLoader;
  private runner: ScriptRunner;
  private activeId: string | null = null;
  private hotReload: boolean;
  private eventUnsubs: Array<() => void> = [];
  private engine: AsciiEngine | null = null;

  constructor(options: ScriptEngineOptions = {}) {
    const registry = options.registry ?? globalScriptRegistry;
    this.loader = new ScriptLoader(registry);
    this.hotReload = options.hotReload ?? false;
    this.runner = new ScriptRunner(this.createBridge());
  }

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
    this.wireEvents();
  }

  getRegistry(): ScriptRegistry {
    return this.loader.getRegistry();
  }

  getLoader(): ScriptLoader {
    return this.loader;
  }

  registerScript(module: ScriptModule): void {
    this.loader.load(module);
  }

  registerScripts(modules: ScriptModule[]): void {
    this.loader.loadAll(modules);
  }

  listScripts(): ScriptModule[] {
    return this.loader.getRegistry().list();
  }

  getActiveScriptId(): string | null {
    return this.activeId;
  }

  isRunning(): boolean {
    return this.runner.getModule() !== null && this.runner.getState() === 'running';
  }

  async runScript(id: string): Promise<void> {
    const mod = this.loader.getCached(id);
    if (!mod) throw new Error(`Script not found: ${id}`);
    this.activeId = id;
    await this.runner.start(mod);
  }

  async stopScript(): Promise<void> {
    await this.runner.stop();
    this.activeId = null;
  }

  async restartScript(): Promise<void> {
    if (!this.activeId) return;
    const mod = this.loader.getCached(this.activeId);
    if (!mod) return;
    await this.runner.restart(mod);
  }

  async reloadScript(id?: string): Promise<void> {
    const targetId = id ?? this.activeId;
    if (!targetId) return;
    const mod = this.loader.getCached(targetId);
    if (!mod) throw new Error(`Script not found: ${targetId}`);
    if (this.hotReload) {
      this.loader.reload(mod);
    }
    if (this.activeId === targetId) {
      await this.runner.restart(mod);
    }
  }

  enableScript(): void {
    this.runner.setEnabled(true);
  }

  disableScript(): void {
    this.runner.setEnabled(false);
  }

  setHotReload(enabled: boolean): void {
    this.hotReload = enabled;
  }

  clearConsole(): void {
    this.runner.clearLogs();
  }

  getDebugState(): ScriptDebugState {
    return {
      activeScriptId: this.activeId,
      enabledScripts: this.activeId ? [this.activeId] : [],
      state: this.runner.getState(),
      error: this.runner.getError(),
      logs: this.runner.getLogs(),
      frameCount: this.runner.getFrameCount(),
    };
  }

  getContextVars(): Record<string, unknown> {
    return { ...this.runner.getContext().vars };
  }

  onFrameStart(dt: number, time: number): void {
    this.runner.onTick(dt, time);
    this.runner.onEvent('tick', { dt, time });
  }

  destroy(): void {
    void this.runner.stop();
    for (const unsub of this.eventUnsubs) unsub();
    this.eventUnsubs = [];
    this.engine = null;
  }

  private wireEvents(): void {
    if (!this.engine) return;
    for (const unsub of this.eventUnsubs) unsub();
    this.eventUnsubs = [];

    const events: EngineEventName[] = [
      'frame',
      'noteOn',
      'noteOff',
      'audio',
      'input',
      'resize',
      'preset',
      'control',
      'simulation',
      'custom',
    ];

    for (const event of events) {
      const unsub = this.engine.on(event, (data) => {
        this.runner.onEvent(event, data);
      });
      this.eventUnsubs.push(unsub);
    }
  }

  private createBridge(): ScriptEngineBridge {
    return {
      setPreset: (preset) => this.requireEngine().setPreset(preset),
      setPresetById: (id) => {
        const preset = getPreset(id as PresetId);
        if (!preset) throw new Error(`Unknown preset: ${id}`);
        this.requireEngine().setPreset(preset);
      },
      getPreset: () => this.requireEngine().getPreset(),
      setControl: (name, value) => this.requireEngine().setControl(name, value),
      getControl: (name, fallback) => this.requireEngine().getControl(name, fallback),
      enablePlugin: (id) => this.requireEngine().enablePlugin(id),
      disablePlugin: (id) => this.requireEngine().disablePlugin(id),
      enableMotion: (id) => this.requireEngine().enableMotion(id),
      disableMotion: (id) => this.requireEngine().disableMotion(id),
      setMotionWeight: (id, weight) => this.requireEngine().setMotionWeight(id, weight),
      enableSimulation: (id) => this.requireEngine().enableSimulation(id),
      disableSimulation: (id) => this.requireEngine().disableSimulation(id),
      resetSimulations: () => this.requireEngine().getSimulationManager().resetAll(),
      noteOn: (event) => this.requireEngine().noteOn(event),
      noteOff: (event) => this.requireEngine().noteOff(event),
      addLayer: (config) => this.requireEngine().getLayerManager().addLayer(config),
      removeLayer: (id) => this.requireEngine().getLayerManager().removeLayer(id),
      enableLayer: (id) => this.requireEngine().getLayerManager().enableLayer(id),
      disableLayer: (id) => this.requireEngine().getLayerManager().disableLayer(id),
      resetComposition: () => this.requireEngine().resetComposition(),
      registerGlyphLanguage: (config) => this.requireEngine().getGlyphRegistry().registerGlyphLanguage(config),
      applyGlyphLanguage: (languageId) => this.requireEngine().applyGlyphLanguage(languageId),
      getTime: () => this.requireEngine().getEngineTime(),
      getFps: () => this.requireEngine().getEngineFps(),
      getGridState: (): GridState => this.requireEngine().getGridState(),
      emitCustom: (type, data) => this.requireEngine().emit({ type, data }),
      onEngineEvent: (event, handler) => this.requireEngine().on(event, handler),
      listPresetIds: () => listPresets().map((p) => p.id),
      getBasePreset: (id) => getPreset(id as PresetId) ?? null,
    };
  }

  private requireEngine(): AsciiEngine {
    if (!this.engine) throw new Error('ScriptEngine not attached to AsciiEngine');
    return this.engine;
  }
}

export { ScriptAPI } from './ScriptAPI';
export type { ScriptModule, ScriptContext, ScriptDebugState } from './ScriptTypes';
