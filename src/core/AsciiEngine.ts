import { EventBus } from './EventBus';
import { CanvasAsciiRenderer } from '../renderers/CanvasAsciiRenderer';
import { NoiseField } from '../effects/NoiseField';
import { WaveField } from '../effects/WaveField';
import { GlyphBurst } from '../effects/GlyphBurst';
import { Glitch } from '../effects/Glitch';
import { Trails } from '../effects/Trails';
import type {
  AsciiEngineOptions,
  AsciiPreset,
  Effect,
  EffectConfig,
  EngineEventPayload,
  NoteEvent,
} from './types';

const DEFAULT_PRESET: AsciiPreset = {
  id: 'basic',
  name: 'Basic',
  glyphSet: ['.', ':', '-', '=', '+', '*', '#'],
  motionField: 'noise',
  effects: [
    { type: 'noise', enabled: true },
    { type: 'burst', enabled: true },
    { type: 'glitch', enabled: true },
    { type: 'trails', enabled: true },
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
  private preset: AsciiPreset;
  private effects: Effect[] = [];
  private controlValues = new Map<string, number>();
  private rafId: number | null = null;
  private running = false;
  private destroyed = false;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTime = 0;
  private time = 0;

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

    this.initControls(this.preset);
    this.rebuildEffects(this.preset.effects, this.preset.motionField);

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
    for (const effect of this.effects) {
      effect.reset?.();
    }
    this.renderer.destroy();
    this.eventBus.clear();
  }

  setPreset(preset: AsciiPreset): void {
    this.preset = preset;
    this.initControls(preset);
    this.renderer.setDensity(this.getControl('density', preset.density));
    this.renderer.setGlyphSet(preset.glyphSet);
    this.rebuildEffects(preset.effects, preset.motionField);
    this.eventBus.emit('preset', preset);
  }

  setControl(name: string, value: number): void {
    this.controlValues.set(name, value);

    switch (name) {
      case 'density':
        this.renderer.setDensity(value);
        break;
      default:
        break;
    }

    this.eventBus.emit('control', { name, value });
  }

  getControl(name: string, fallback?: number): number {
    if (this.controlValues.has(name)) {
      return this.controlValues.get(name)!;
    }
    return fallback ?? 0;
  }

  noteOn(event: NoteEvent = {}): void {
    for (const effect of this.effects) {
      effect.onNoteOn?.(event);
    }
    this.eventBus.emit('noteOn', event);
  }

  noteOff(event: NoteEvent = {}): void {
    for (const effect of this.effects) {
      effect.onNoteOff?.(event);
    }
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

  private initControls(preset: AsciiPreset): void {
    this.controlValues.set('density', preset.density);
    this.controlValues.set('speed', preset.speed);
    this.controlValues.set('trailAmount', preset.trailAmount);
    this.controlValues.set('glitchAmount', preset.glitchAmount);

    for (const control of preset.controls) {
      if (!this.controlValues.has(control.name)) {
        this.controlValues.set(control.name, control.default);
      }
    }
  }

  private rebuildEffects(
    configs: EffectConfig[],
    motionField: AsciiPreset['motionField'],
  ): void {
    for (const effect of this.effects) {
      effect.reset?.();
    }

    const enabled = new Set(
      configs.filter((c) => c.enabled !== false).map((c) => c.type),
    );

    const pool: Effect[] = [
      new NoiseField(),
      new WaveField(),
      new GlyphBurst(),
      new Glitch(),
      new Trails(),
    ];

    this.effects = pool.filter((effect) => {
      if (effect.type === 'noise' || effect.type === 'wave') {
        if (motionField === 'none') return false;
        return effect.type === motionField && enabled.has(effect.type);
      }
      return enabled.has(effect.type);
    });
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.time += dt;

    const speed = this.getControl('speed', this.preset.speed);
    const trailAmount = this.getControl('trailAmount', this.preset.trailAmount);
    const glitchAmount = this.getControl('glitchAmount', this.preset.glitchAmount);

    const grid = this.renderer.getGridState(this.time);
    const ctx = {
      grid,
      glyphSet: this.preset.glyphSet,
      speed,
      glitchAmount,
      trailAmount,
      dt,
      time: this.time,
    };

    for (const effect of this.effects) {
      effect.update(ctx);
    }

    this.renderer.render(trailAmount);

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
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
