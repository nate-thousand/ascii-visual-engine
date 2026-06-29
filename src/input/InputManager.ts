import type {
  DevicePresetId,
  InputDebugState,
  InputEvent,
  InputMappingConfig,
  InputMappingPresetConfig,
  MidiDeviceInfo,
} from './InputTypes';
import { MidiInput } from './MidiInput';
import { KeyboardInput } from './KeyboardInput';
import { PerformanceMapper, type PerformanceEngineBridge } from './PerformanceMapper';
import { getDevicePresetMapping } from './devicePresets';

export class InputManager {
  private midi = new MidiInput();
  private keyboard = new KeyboardInput();
  private mapper = new PerformanceMapper();
  private lastEvent: InputEvent | null = null;
  private engine: PerformanceEngineBridge | null = null;

  constructor() {
    this.mapper.loadFromStorage();
    const handler = (event: InputEvent) => {
      this.lastEvent = event;
      if (this.engine) {
        this.mapper.handleEvent(this.engine, event);
      }
    };
    this.midi.setMessageHandler(handler);
    this.keyboard.setMessageHandler(handler);
  }

  setEngine(engine: PerformanceEngineBridge): void {
    this.engine = engine;
  }

  async connectMidi(deviceId?: string): Promise<{ ok: boolean; error?: string }> {
    return this.midi.connect(deviceId);
  }

  disconnectMidi(): void {
    this.midi.disconnect();
  }

  async getMidiDevices(): Promise<MidiDeviceInfo[]> {
    const access = await this.midi.requestAccess();
    if (!access.ok) return [];
    return this.midi.listDevices();
  }

  enableKeyboard(): void {
    this.keyboard.enable();
  }

  disableKeyboard(): void {
    this.keyboard.disable();
  }

  isKeyboardEnabled(): boolean {
    return this.keyboard.isEnabled();
  }

  setMapping(config: InputMappingConfig): void {
    this.mapper.setMapping(config);
  }

  getMapping(): InputMappingConfig {
    return this.mapper.getMapping();
  }

  applyDevicePreset(presetId: DevicePresetId): void {
    const mapping = getDevicePresetMapping(presetId);
    const current = this.mapper.getMapping();
    this.mapper.setMapping({ ...current, ...mapping });
  }

  applyPresetConfig(config: InputMappingPresetConfig | undefined): void {
    if (!config) return;
    const base = getDevicePresetMapping(config.devicePreset ?? 'genericKeyboard');
    this.mapper.setMapping({
      ...base,
      ...config,
      ccMappings: config.ccMappings?.length ? config.ccMappings : base.ccMappings,
      noteMappings: config.noteMappings?.length ? config.noteMappings : base.noteMappings,
      learnedMappings: [
        ...(config.learnedMappings ?? []),
        ...(this.mapper.getMapping().learnedMappings ?? []),
      ],
    });
  }

  clearMapping(): void {
    this.mapper.clearMapping();
  }

  resetMappings(): void {
    this.mapper.resetMappings();
  }

  startLearn(
    target: import('./InputTypes').PerformanceTarget,
    callback?: (mapping: import('./InputTypes').LearnedMapping) => void,
  ): void {
    this.mapper.startLearn(target, callback);
  }

  cancelLearn(): void {
    this.mapper.cancelLearn();
  }

  panic(): void {
    if (this.engine) {
      this.mapper.panic(this.engine);
    }
    this.keyboard.releaseAll();
  }

  processQueuedEvents(): void {
    if (!this.engine) return;
    for (const event of this.midi.drainQueue()) {
      this.mapper.handleEvent(this.engine, event);
    }
    for (const event of this.keyboard.drainQueue()) {
      this.mapper.handleEvent(this.engine, event);
    }
  }

  getDebugState(): InputDebugState {
    const midiState = this.midi.getState();
    const mapping = this.mapper.getMapping();
    return {
      midiConnected: midiState.connected,
      keyboardEnabled: this.keyboard.isEnabled(),
      deviceId: midiState.deviceId,
      deviceName: midiState.deviceName,
      error: midiState.error,
      learnMode: this.mapper.isLearnMode(),
      learnTarget: this.mapper.getLearnTarget()?.type ?? null,
      activeNotes: this.mapper.getActiveNotes(),
      lastEvent: this.lastEvent,
      mappingCount: (mapping.ccMappings?.length ?? 0) + (mapping.noteMappings?.length ?? 0),
      learnedCount: mapping.learnedMappings?.length ?? 0,
    };
  }

  getNoteMonitor() {
    return this.mapper.getNoteMonitor();
  }

  getMapper(): PerformanceMapper {
    return this.mapper;
  }

  destroy(): void {
    this.keyboard.disable();
    this.midi.destroy();
    this.engine = null;
  }
}

export function resolvePresetInputMapping(preset: {
  inputMapping?: InputMappingPresetConfig;
}): InputMappingPresetConfig | null {
  if (!preset.inputMapping) return null;
  return preset.inputMapping;
}
