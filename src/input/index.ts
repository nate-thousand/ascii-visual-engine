export type {
  InputSource,
  InputEventType,
  InputEvent,
  MidiDeviceInfo,
  PerformanceTargetType,
  PerformanceControlTarget,
  PerformanceNoteTarget,
  PerformanceLayerTarget,
  PerformancePostPassTarget,
  PerformanceTogglePluginTarget,
  PerformanceSetPresetTarget,
  PerformanceTarget,
  CcMapping,
  NoteMapping,
  PitchBendMapping,
  AftertouchMapping,
  LearnedMapping,
  InputMappingConfig,
  InputMappingPresetConfig,
  DevicePresetId,
  InputDebugState,
  NoteMonitorEntry,
} from './InputTypes';
export {
  INPUT_STORAGE_KEY,
  MOD_WHEEL_CC,
  clamp01,
  midiNoteToNormalized,
  midiVelocityToNormalized,
  mapMidiToNoteEvent,
} from './InputTypes';
export { MidiInput, type MidiInputState } from './MidiInput';
export { KeyboardInput } from './KeyboardInput';
export {
  PerformanceMapper,
  resolveInputMappingPreset,
  type PerformanceEngineBridge,
} from './PerformanceMapper';
export { InputManager, resolvePresetInputMapping } from './InputManager';
export {
  getDevicePresetMapping,
  DEVICE_PRESET_IDS,
  INPUT_DEVICE_PRESETS,
} from './devicePresets';
