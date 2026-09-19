import type {
  DevicePresetId,
  InputDebugState,
  InputEvent,
  InputMappingConfig,
  InputMappingPresetConfig,
  MidiDeviceInfo,
} from './InputTypes';
import { MidiInput } from './MidiInput';
import type { MidiClock } from './MidiClock';
import { KeyboardInput } from './KeyboardInput';
import { PointerInput, type PointerInputOptions, type PointerState, type PointerTarget } from './PointerInput';
import { PerformanceMapper, type PerformanceEngineBridge } from './PerformanceMapper';
import { getDevicePresetMapping } from './devicePresets';
import {
  InputRecorder,
  InputPlayer,
  type InputRecording,
  type InputRecordingStatus,
  type InputPlaybackOptions,
  type InputPlaybackStatus,
} from './InputRecorder';

export class InputManager {
  private midi = new MidiInput();
  private keyboard = new KeyboardInput();
  private pointer = new PointerInput();
  private mapper = new PerformanceMapper();
  private recorder = new InputRecorder();
  private player = new InputPlayer();
  private lastRecording: InputRecording | null = null;
  private lastEvent: InputEvent | null = null;
  private engine: PerformanceEngineBridge | null = null;

  constructor() {
    this.mapper.loadFromStorage();
    const handler = (event: InputEvent) => this.dispatch(event);
    this.midi.setMessageHandler(handler);
    this.keyboard.setMessageHandler(handler);
    this.pointer.setMessageHandler(handler);
  }

  /**
   * The one path every input event takes, from a device or from playback:
   * recorded if a take is running, then mapped onto the engine. Devices
   * deliver here as the event happens; playback delivers per frame.
   */
  dispatch(event: InputEvent): void {
    this.lastEvent = event;
    if (!event.replayed) this.recorder.record(event);
    if (this.engine) this.mapper.handleEvent(this.engine, event);
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

  enablePointer(target: PointerTarget, options?: PointerInputOptions): void {
    this.pointer.enable(target, options);
  }

  disablePointer(): void {
    this.pointer.disable();
  }

  isPointerEnabled(): boolean {
    return this.pointer.isEnabled();
  }

  getPointerState(): PointerState {
    return this.pointer.getState();
  }

  getMidiClock(): MidiClock {
    return this.midi.getClock();
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
    this.pointer.releaseAll();
  }

  /**
   * Per frame: advance the take clock and deliver replayed events that fell
   * due. Device events were already dispatched as they arrived; their queues
   * are drained here so they do not grow.
   */
  processQueuedEvents(dt = 0, now = typeof performance !== 'undefined' ? performance.now() : Date.now()): void {
    this.midi.drainQueue();
    this.keyboard.drainQueue();
    this.pointer.drainQueue();
    this.recorder.advance(dt);
    for (const event of this.player.advance(dt, now)) {
      this.dispatch(event);
    }
  }

  // Input recording and playback

  startInputRecording(): void {
    this.recorder.start();
  }

  /** Finish the take; also kept as the loaded recording for playback. */
  stopInputRecording(name?: string): InputRecording {
    const recording = this.recorder.stop(name);
    this.lastRecording = recording;
    this.player.load(recording);
    return recording;
  }

  cancelInputRecording(): void {
    this.recorder.cancel();
  }

  isInputRecording(): boolean {
    return this.recorder.isRecording();
  }

  /** The last take stopped or loaded. */
  getInputRecording(): InputRecording | null {
    return this.lastRecording;
  }

  loadInputRecording(recording: InputRecording): void {
    this.lastRecording = recording;
    this.player.load(recording);
  }

  /** Replay a take (the loaded one when omitted). False when there is nothing to play. */
  playInputRecording(recording?: InputRecording, options?: InputPlaybackOptions): boolean {
    if (recording) this.loadInputRecording(recording);
    this.stopInputPlayback();
    return this.player.play(options);
  }

  pauseInputPlayback(): void {
    this.player.pause();
  }

  resumeInputPlayback(): void {
    this.player.resume();
  }

  /** Stop replaying; held notes from the take get their `noteOff`. */
  stopInputPlayback(): void {
    for (const event of this.player.stop()) this.dispatch(event);
  }

  seekInputPlayback(seconds: number): void {
    for (const event of this.player.seek(seconds)) this.dispatch(event);
  }

  getInputRecordingStatus(): InputRecordingStatus {
    return this.recorder.getStatus();
  }

  getInputPlaybackStatus(): InputPlaybackStatus {
    return this.player.getStatus();
  }

  getDebugState(): InputDebugState {
    const midiState = this.midi.getState();
    const mapping = this.mapper.getMapping();
    return {
      midiConnected: midiState.connected,
      keyboardEnabled: this.keyboard.isEnabled(),
      pointerEnabled: this.pointer.isEnabled(),
      pointer: this.pointer.getState(),
      clock: this.midi.getClock().getState(typeof performance !== 'undefined' ? performance.now() : Date.now()),
      deviceId: midiState.deviceId,
      deviceName: midiState.deviceName,
      error: midiState.error,
      learnMode: this.mapper.isLearnMode(),
      learnTarget: this.mapper.getLearnTarget()?.type ?? null,
      activeNotes: this.mapper.getActiveNotes(),
      lastEvent: this.lastEvent,
      mappingCount: (mapping.ccMappings?.length ?? 0) + (mapping.noteMappings?.length ?? 0),
      learnedCount: mapping.learnedMappings?.length ?? 0,
      recording: this.recorder.getStatus(),
      playback: this.player.getStatus(),
    };
  }

  getNoteMonitor() {
    return this.mapper.getNoteMonitor();
  }

  getMapper(): PerformanceMapper {
    return this.mapper;
  }

  destroy(): void {
    this.recorder.cancel();
    this.player.stop();
    this.keyboard.disable();
    this.pointer.disable();
    this.midi.destroy();
    this.engine = null;
  }
}

export function resolvePresetInputMapping(preset: {
  input?: InputMappingPresetConfig;
}): InputMappingPresetConfig | null {
  return preset.input ?? null;
}
