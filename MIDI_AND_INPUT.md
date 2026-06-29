# MIDI & Performance Controls

Play the ASCII Visual Engine like an instrument using Web MIDI, computer keyboard, and configurable performance mappings.

---

## Overview

The input system routes hardware and keyboard events through a `PerformanceMapper` that drives engine controls, glyph bursts, layer opacity, post passes, plugin toggles, and preset changes. Mappings are declarative, preset-driven, and persist learned CC bindings in `localStorage`.

When no input is connected, the engine behaves exactly as before — audio, rendering, simulation, and compositing are unchanged.

---

## Architecture

```
MidiInput ──┐
            ├──► InputManager ──► PerformanceMapper ──► engine controls / noteOn / layers / plugins
KeyboardInput ┘
```

Each frame (when input is active):

1. `MidiInput` and `KeyboardInput` enqueue normalized `InputEvent` objects
2. `InputManager.processQueuedEvents()` drains queues into `PerformanceMapper`
3. `PerformanceMapper` applies CC, pitch bend, aftertouch, and note mappings

---

## Web MIDI

| Capability | Description |
| --- | --- |
| Device detection | Lists connected MIDI inputs via Web MIDI API |
| Connect / disconnect | Bind a specific device or first available input |
| noteOn / noteOff | Trigger glyph bursts and release active notes |
| controlChange | Map CC knobs to engine controls |
| pitchBend | Map bend wheel to motion distortion controls |
| aftertouch | Channel pressure when supported by device |

```typescript
const devices = await engine.getMidiDevices();
// [{ id, name, manufacturer, state, connection }, ...]

const result = await engine.connectMidi(devices[0]?.id);
if (!result.ok) console.warn(result.error);

engine.disconnectMidi();
```

Web MIDI requires a secure context (HTTPS or localhost) and user permission in supporting browsers (Chrome, Edge). When unavailable, methods fail gracefully with `{ ok: false, error }`.

---

## Computer Keyboard

QWERTY piano layout for note input without hardware:

| Keys | Notes |
| --- | --- |
| `A S D F G H J` | White keys (C major scale) |
| `W E T Y U O P ;` | Black keys |
| `-` / `=` | Octave down / up (±3 octaves) |

- Default velocity: 100 (configurable on `KeyboardInput`)
- Stuck-note prevention: `keyup`, window blur, and `engine.inputPanic()` release all active keys
- Enable with `engine.enableKeyboardInput()` / disable with `engine.disableKeyboardInput()`

---

## Performance Mapping

`PerformanceMapper` translates input events into engine actions:

| Input | Default behavior |
| --- | --- |
| noteOn | Glyph burst at pitch-mapped screen position |
| note velocity | Burst intensity |
| note pitch | X/Y screen position |
| mod wheel (CC 1) | Glitch amount |
| pitch bend | Motion distortion (`flowStrength`) |
| CC knobs | Density, speed, trails, particles, layer opacity |
| Pad notes (device presets) | Preset changes or effect toggles |

### Target types

| Target | Effect |
| --- | --- |
| `control` | `engine.setControl(name, value)` |
| `noteOn` / `noteOff` | Fire or release burst events |
| `layerOpacity` | Set compositing layer opacity |
| `postPass` | Set post processing pass amount |
| `togglePlugin` | Enable/disable a plugin |
| `setPreset` | Switch to a preset by id |

```typescript
engine.setInputMapping({
  enabled: true,
  defaultNoteOn: true,
  ccMappings: [
    { controller: 74, target: { type: 'control', control: 'speed', min: 0.2, max: 3 } },
    { controller: 1, target: { type: 'control', control: 'glitchAmount', min: 0, max: 1 } },
  ],
  pitchBend: { target: { type: 'control', control: 'flowStrength', min: 0, max: 1 } },
  modWheel: { type: 'control', control: 'glitchAmount', min: 0, max: 1 },
});
```

---

## Device Presets

Built-in mapping presets for common controllers:

| Preset ID | Description |
| --- | --- |
| `genericKeyboard` | Standard CC layout (mod wheel, volume, brightness, density) |
| `akaiMpkMini` | Akai MPK Mini knobs + pad note range |
| `novationLaunchkey` | Novation Launchkey CC layout |
| `qwertyKeyboard` | Keyboard-only noteOn/noteOff |

```typescript
import { getDevicePresetMapping, DEVICE_PRESET_IDS } from 'ascii-visual-engine';

const mapping = getDevicePresetMapping('akaiMpkMini');
engine.setInputMapping(mapping);
```

Presets can reference a device preset in the schema:

```typescript
inputMapping: {
  enabled: true,
  devicePreset: 'akaiMpkMini',
}
```

---

## MIDI Learn

Assign any CC knob to a control at runtime:

```typescript
engine.startInputLearn(
  { type: 'control', control: 'trailAmount', min: 0, max: 1 },
  (mapping) => console.log('Learned CC', mapping.controller),
);

// Move a knob on your controller — binding is saved automatically
engine.cancelInputLearn();
engine.clearInputMapping();   // Remove learned mappings only
engine.resetInputMapping();   // Reset to preset defaults
```

Learned mappings persist in `localStorage` under key `ascii-visual-engine:input-mapping`.

---

## Engine API

| Method | Description |
| --- | --- |
| `connectMidi(deviceId?)` | Connect Web MIDI input |
| `disconnectMidi()` | Disconnect active MIDI input |
| `getMidiDevices()` | List available MIDI input devices |
| `setInputMapping(config)` | Configure performance mappings |
| `getInputMapping()` | Current mapping config |
| `clearInputMapping()` | Clear learned CC bindings |
| `resetInputMapping()` | Reset to preset device mapping |
| `enableKeyboardInput()` | Enable QWERTY keyboard notes |
| `disableKeyboardInput()` | Disable keyboard input |
| `startInputLearn(target, callback?)` | Enter MIDI learn mode |
| `cancelInputLearn()` | Exit learn mode without binding |
| `inputPanic()` | All notes off — clears stuck notes |
| `getInputNoteMonitor()` | Recent note on/off events |
| `getInputManager()` | Direct access to input subsystem |

### Events

| Event | Payload |
| --- | --- |
| `input` | `InputDebugState` — connection, learn mode, active notes |
| `noteOn` | `NoteEvent` — fired when bursts are triggered |

### Debug state

```typescript
const { input } = engine.getDebugState();
// midiConnected, keyboardEnabled, deviceName, learnMode, activeNotes, mappingCount, learnedCount
```

---

## Performance Presets

Four built-in presets ship with input mappings:

| Preset ID | Device preset |
| --- | --- |
| `performanceGeneric` | Generic MIDI keyboard |
| `performanceAkai` | Akai MPK Mini |
| `performanceLaunchkey` | Novation Launchkey |
| `performanceQwerty` | QWERTY keyboard |

```typescript
import { listPerformancePresets } from 'ascii-visual-engine';

engine.setPreset(listPerformancePresets()[0]);
engine.enablePlugin('burst');
await engine.connectMidi();
engine.enableKeyboardInput();
```

---

## Vanilla Example

The demo includes:

- MIDI device selector + connect/disconnect buttons
- Input debug panel (connection status, learn mode, active notes)
- Keyboard input toggle
- MIDI learn mode with control target selector
- Mapping table (CC + learned bindings)
- Note monitor (recent noteOn/noteOff)
- Panic button — all notes off

Select a **Performance —** preset, enable the burst plugin, connect MIDI or keyboard, and play.

---

## Design Notes

- Generic framework — not tied to any specific product or controller brand beyond optional presets
- Web MIDI only; no native Node MIDI in this milestone
- Works alongside audio reactivity, source pipeline, simulation, motion, compositing, and post processing
- Preset `setPreset()` reloads `inputMapping` configuration
- Panic clears mapper active notes, dispatches noteOff, and resets burst plugin state
