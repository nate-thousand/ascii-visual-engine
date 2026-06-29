import type { NoteEvent } from '../core/types';
import type { LayerManager } from '../compositing/LayerManager';
import type { PostProcessor } from '../compositing/PostProcessor';
import type {
  InputEvent,
  InputMappingConfig,
  InputMappingPresetConfig,
  LearnedMapping,
  NoteMapping,
  NoteMonitorEntry,
  PerformanceTarget,
} from './InputTypes';
import {
  INPUT_STORAGE_KEY,
  MOD_WHEEL_CC,
  clamp01,
  mapMidiToNoteEvent,
  midiVelocityToNormalized,
} from './InputTypes';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export interface PerformanceEngineBridge {
  setControl(name: string, value: number): void;
  getControl(name: string, fallback?: number): number;
  getLayerManager(): LayerManager;
  getPostProcessor(): PostProcessor;
  noteOn(event?: NoteEvent): void;
  noteOff(event?: NoteEvent): void;
  enablePlugin(id: string): void;
  disablePlugin(id: string): void;
  getPlugin(id: string): { enabled: boolean } | undefined;
  setPresetById?(id: string): void;
}

export class PerformanceMapper {
  private config: InputMappingConfig = {
    enabled: true,
    defaultNoteOn: true,
    defaultNoteOff: true,
    ccMappings: [],
    noteMappings: [],
    learnedMappings: [],
  };
  private activeNotes = new Set<number>();
  private learnMode = false;
  private learnTarget: PerformanceTarget | null = null;
  private learnCallback: ((mapping: LearnedMapping) => void) | null = null;
  private noteMonitor: NoteMonitorEntry[] = [];
  private maxMonitorEntries = 32;

  setMapping(config: InputMappingConfig): void {
    this.config = {
      enabled: config.enabled !== false,
      channelFilter: config.channelFilter ? [...config.channelFilter] : undefined,
      ccMappings: config.ccMappings ? [...config.ccMappings] : [],
      noteMappings: config.noteMappings ? [...config.noteMappings] : [],
      pitchBend: config.pitchBend,
      modWheel: config.modWheel,
      aftertouch: config.aftertouch,
      learnedMappings: config.learnedMappings ? [...config.learnedMappings] : [],
      defaultNoteOn: config.defaultNoteOn !== false,
      defaultNoteOff: config.defaultNoteOff !== false,
    };
  }

  getMapping(): InputMappingConfig {
    return {
      enabled: this.config.enabled,
      channelFilter: this.config.channelFilter ? [...this.config.channelFilter] : undefined,
      ccMappings: this.config.ccMappings ? [...this.config.ccMappings] : [],
      noteMappings: this.config.noteMappings ? [...this.config.noteMappings] : [],
      pitchBend: this.config.pitchBend,
      modWheel: this.config.modWheel,
      aftertouch: this.config.aftertouch,
      learnedMappings: this.config.learnedMappings ? [...this.config.learnedMappings] : [],
      defaultNoteOn: this.config.defaultNoteOn,
      defaultNoteOff: this.config.defaultNoteOff,
    };
  }

  clearMapping(): void {
    this.config.learnedMappings = [];
    this.saveToStorage();
  }

  resetMappings(): void {
    this.config.ccMappings = [];
    this.config.noteMappings = [];
    this.config.learnedMappings = [];
    this.config.pitchBend = undefined;
    this.config.modWheel = undefined;
    this.config.aftertouch = undefined;
    this.clearStorage();
  }

  startLearn(target: PerformanceTarget, callback?: (mapping: LearnedMapping) => void): void {
    this.learnMode = true;
    this.learnTarget = target;
    this.learnCallback = callback ?? null;
  }

  cancelLearn(): void {
    this.learnMode = false;
    this.learnTarget = null;
    this.learnCallback = null;
  }

  isLearnMode(): boolean {
    return this.learnMode;
  }

  getLearnTarget(): PerformanceTarget | null {
    return this.learnTarget;
  }

  getActiveNotes(): number[] {
    return [...this.activeNotes];
  }

  getNoteMonitor(): NoteMonitorEntry[] {
    return [...this.noteMonitor];
  }

  panic(engine: PerformanceEngineBridge): void {
    for (const note of this.activeNotes) {
      engine.noteOff(mapMidiToNoteEvent(note, 0, 0, 'midi'));
    }
    this.activeNotes.clear();
    this.noteMonitor = [];
  }

  handleEvent(engine: PerformanceEngineBridge, event: InputEvent): void {
    if (!this.config.enabled) return;
    if (!this.channelAllowed(event.channel)) return;

    this.recordMonitor(event);

    if (this.learnMode && event.type === 'controlChange' && event.controller !== undefined) {
      this.handleLearn(event);
      return;
    }

    switch (event.type) {
      case 'noteOn':
        this.handleNoteOn(engine, event);
        break;
      case 'noteOff':
        this.handleNoteOff(engine, event);
        break;
      case 'controlChange':
        this.handleControlChange(engine, event);
        break;
      case 'pitchBend':
        this.handlePitchBend(engine, event);
        break;
      case 'aftertouch':
        this.handleAftertouch(engine, event);
        break;
    }
  }

  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(INPUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { learnedMappings?: LearnedMapping[] };
      if (parsed.learnedMappings) {
        this.config.learnedMappings = parsed.learnedMappings;
      }
    } catch {
      // ignore corrupt storage
    }
  }

  saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        INPUT_STORAGE_KEY,
        JSON.stringify({ learnedMappings: this.config.learnedMappings ?? [] }),
      );
    } catch {
      // ignore quota errors
    }
  }

  clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(INPUT_STORAGE_KEY);
  }

  private channelAllowed(channel: number): boolean {
    if (!this.config.channelFilter?.length) return true;
    return this.config.channelFilter.includes(channel);
  }

  private handleLearn(event: InputEvent): void {
    if (!this.learnTarget || event.controller === undefined) return;
    const mapping: LearnedMapping = {
      id: `learned-${event.controller}-${event.channel ?? 'any'}`,
      controller: event.controller,
      channel: event.channel,
      target: this.learnTarget,
    };
    this.config.learnedMappings = [
      ...(this.config.learnedMappings ?? []).filter(
        (m) => !(m.controller === mapping.controller && m.channel === mapping.channel),
      ),
      mapping,
    ];
    this.learnMode = false;
    this.learnTarget = null;
    this.saveToStorage();
    this.learnCallback?.(mapping);
    this.learnCallback = null;
  }

  private handleNoteOn(engine: PerformanceEngineBridge, event: InputEvent): void {
    if (event.note === undefined) return;
    this.activeNotes.add(event.note);

    const custom = this.findNoteMapping(event.note, event.channel);
    if (custom) {
      this.applyTarget(engine, custom.target, event);
      return;
    }

    if (this.config.defaultNoteOn !== false) {
      engine.enablePlugin('burst');
      engine.noteOn(mapMidiToNoteEvent(
        event.note,
        event.velocity ?? 100,
        event.channel,
        event.source,
      ));
    }
  }

  private handleNoteOff(engine: PerformanceEngineBridge, event: InputEvent): void {
    if (event.note === undefined) return;
    this.activeNotes.delete(event.note);

    const custom = this.findNoteMapping(event.note, event.channel);
    if (custom?.target.type === 'noteOff' || custom?.target.type === 'noteOn') {
      if (custom.target.type === 'noteOff') {
        this.applyTarget(engine, custom.target, event);
      }
      return;
    }

    if (this.config.defaultNoteOff !== false) {
      engine.noteOff(mapMidiToNoteEvent(event.note, 0, event.channel, event.source));
    }
  }

  private handleControlChange(engine: PerformanceEngineBridge, event: InputEvent): void {
    if (event.controller === undefined || event.value === undefined) return;
    const normalized = event.value / 127;

    const learned = (this.config.learnedMappings ?? []).find(
      (m) => m.controller === event.controller && (m.channel === undefined || m.channel === event.channel),
    );
    if (learned) {
      this.applyTarget(engine, learned.target, event, normalized);
      return;
    }

    const cc = (this.config.ccMappings ?? []).find(
      (m) => m.controller === event.controller && (m.channel === undefined || m.channel === event.channel),
    );
    if (cc) {
      this.applyTarget(engine, cc.target, event, normalized);
      return;
    }

    if (event.controller === MOD_WHEEL_CC && this.config.modWheel) {
      this.applyControlTarget(engine, this.config.modWheel, normalized);
    }
  }

  private handlePitchBend(engine: PerformanceEngineBridge, event: InputEvent): void {
    if (event.pitchBend === undefined) return;
    const normalized = clamp01((event.pitchBend + 1) / 2);
    if (this.config.pitchBend) {
      this.applyControlTarget(engine, this.config.pitchBend.target, normalized);
    } else {
      engine.setControl('flowStrength', clamp(0.2 + normalized * 0.8, 0, 1));
    }
  }

  private handleAftertouch(engine: PerformanceEngineBridge, event: InputEvent): void {
    const pressure = event.pressure ?? 0;
    if (this.config.aftertouch) {
      this.applyControlTarget(engine, this.config.aftertouch.target, pressure);
    }
  }

  private findNoteMapping(note: number, channel: number): NoteMapping | undefined {
    return (this.config.noteMappings ?? []).find((m) => {
      if (m.channel !== undefined && m.channel !== channel) return false;
      if (m.note !== undefined) return m.note === note;
      if (m.minNote !== undefined && m.maxNote !== undefined) {
        return note >= m.minNote && note <= m.maxNote;
      }
      return false;
    });
  }

  private applyTarget(
    engine: PerformanceEngineBridge,
    target: PerformanceTarget,
    event: InputEvent,
    normalizedValue?: number,
  ): void {
    switch (target.type) {
      case 'control':
        this.applyControlTarget(engine, target, normalizedValue ?? midiVelocityToNormalized(event.velocity ?? 100));
        break;
      case 'noteOn':
        engine.enablePlugin('burst');
        engine.noteOn(this.buildNoteEvent(target, event));
        break;
      case 'noteOff':
        engine.noteOff(this.buildNoteEvent(target, event));
        break;
      case 'layerOpacity': {
        const layer = engine.getLayerManager().getLayer(target.layerId);
        if (!layer) return;
        const min = target.min ?? 0;
        const max = target.max ?? 1;
        layer.opacity = clamp(min + (normalizedValue ?? 0.5) * (max - min), min, max);
        break;
      }
      case 'postPass': {
        const min = target.min ?? 0;
        const max = target.max ?? 1;
        engine.getPostProcessor().setPassAmount(
          target.passId,
          clamp(min + (normalizedValue ?? 0.5) * (max - min), min, max),
        );
        break;
      }
      case 'togglePlugin': {
        const plugin = engine.getPlugin(target.pluginId);
        if (!plugin) return;
        if (plugin.enabled) engine.disablePlugin(target.pluginId);
        else engine.enablePlugin(target.pluginId);
        break;
      }
      case 'setPreset':
        engine.setPresetById?.(target.presetId);
        break;
    }
  }

  private applyControlTarget(
    engine: PerformanceEngineBridge,
    target: Extract<PerformanceTarget, { type: 'control' }>,
    normalized: number,
  ): void {
    const min = target.min ?? 0;
    const max = target.max ?? 1;
    engine.setControl(target.control, clamp(min + normalized * (max - min), min, max));
  }

  private buildNoteEvent(
    target: Extract<PerformanceTarget, { type: 'noteOn' | 'noteOff' }>,
    event: InputEvent,
  ): NoteEvent {
    const note = event.note ?? 60;
    const velocity = event.velocity ?? 100;
    const minI = target.minIntensity ?? 0.6;
    const maxI = target.maxIntensity ?? 2;
    const intensity = minI + midiVelocityToNormalized(velocity) * (maxI - minI);
    return {
      id: note,
      x: target.mapPitchToX !== false ? clamp01(note / 127) : 0.5,
      y: target.mapPitchToY !== false ? clamp01((note % 12) / 11) : 0.5,
      intensity: target.mapVelocityToIntensity !== false ? intensity : 1,
      data: { source: event.source, channel: event.channel, note, velocity },
    };
  }

  private recordMonitor(event: InputEvent): void {
    if (event.type !== 'noteOn' && event.type !== 'noteOff') return;
    if (event.note === undefined) return;
    this.noteMonitor.unshift({
      note: event.note,
      velocity: event.velocity ?? 0,
      channel: event.channel,
      source: event.source,
      type: event.type === 'noteOn' ? 'on' : 'off',
      timestamp: event.timestamp,
    });
    if (this.noteMonitor.length > this.maxMonitorEntries) {
      this.noteMonitor.length = this.maxMonitorEntries;
    }
  }
}

export function resolveInputMappingPreset(
  config: InputMappingPresetConfig | undefined,
): InputMappingConfig | null {
  if (!config) return null;
  return {
    enabled: config.enabled !== false,
    channelFilter: config.channelFilter,
    ccMappings: config.ccMappings ? [...config.ccMappings] : [],
    noteMappings: config.noteMappings ? [...config.noteMappings] : [],
    pitchBend: config.pitchBend,
    modWheel: config.modWheel,
    aftertouch: config.aftertouch,
    learnedMappings: config.learnedMappings ? [...config.learnedMappings] : [],
    defaultNoteOn: config.defaultNoteOn,
    defaultNoteOff: config.defaultNoteOff,
  };
}
