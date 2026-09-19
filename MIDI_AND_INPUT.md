# MIDI & Performance Controls

Play the ASCII Visual Engine like an instrument using Web MIDI, computer keyboard, and configurable performance mappings.

---

## Overview

The input system routes hardware and keyboard events through a `PerformanceMapper` that drives engine controls, glyph bursts, layer opacity, post passes, plugin toggles, and preset changes. Mappings are declarative, preset-driven, and persist learned CC bindings in `localStorage`.

When no input is connected, the engine behaves exactly as before — audio, rendering, simulation, and compositing are unchanged.

---

## Architecture

```
MidiInput ─────┐
KeyboardInput ─┼──► InputManager ──► PerformanceMapper ──► engine controls / noteOn / layers / plugins
PointerInput ──┘
```

1. `MidiInput`, `KeyboardInput`, and `PointerInput` normalize what they receive into `InputEvent` objects and hand each one to `InputManager.dispatch()` as it happens
2. `dispatch()` records the event if a take is running, then gives it to `PerformanceMapper`, which applies CC, pitch bend, aftertouch, and note mappings
3. Each frame, `InputManager.processQueuedEvents(dt, now)` advances the take clock and dispatches any replayed events that fell due

Every event goes through `dispatch()` exactly once, from a device or from playback.

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

## Pointer

Mouse, touch, and pen on one element through Pointer Events. Off by default; the plugin is registered like the keyboard and shares its queue and mapper.

- `engine.enablePointerInput(target?, options?)` listens on the engine's canvas unless `target` is given; `disablePointerInput()` removes the listeners and releases held pointers. The facade has `enablePointerInput(options?)` and `disablePointerInput()`.
- Position is normalized across the target's client rect: `engine.getPointerState()` returns `{ x, y, down, pointers, pressure }`, updated on every move. It is in `getDebugState().input.pointer` as well.
- A press is a `noteOn` at that position (`x`, `y` on the `InputEvent`, note id `1000 + pointerId`, velocity from pressure, 127 for a mouse) and the release the matching `noteOff`. Pens and multi touch work per pointer. `PerformanceMapper` uses the event's own position instead of deriving one from the note number.
- Options: `tapToNote` (default true; false only tracks position) and `captureTouch` (default true; sets `touch-action: none` on the target while enabled so touches do not scroll, restored on disable).
- `inputPanic()` releases held pointers too.

---

## MIDI Clock

`MidiClock` (`src/input/MidiClock.ts`) listens to the connected device's system realtime bytes: Timing Clock (`0xF8`, 24 per quarter note), Start (`0xFA`), Continue (`0xFB`), Stop (`0xFC`), and Song Position Pointer (`0xF2`). `MidiInput` routes any status byte at or above `0xF0` to it, so it needs no configuration beyond `connectMidi()`.

- `engine.getInputManager().getMidiClock().getState(now)` gives `{ active, running, bpm, beat, phase, ticks }`. `bpm` averages the last 48 tick intervals; `phase` is interpolated between ticks so it is smooth at any frame rate and never runs past the next tick. A device that only sends ticks and never Start is treated as running. Two seconds without a tick and the clock is inactive.
- `engine.getTempo()` (also on the facade) is the engine's single tempo: the MIDI clock when it is active, else the audio beat detector when it has an estimate, else `NO_TEMPO`. Shape: `{ source: 'midi' | 'audio' | 'none', bpm, phase, barPhase, beat, confidence }`, with bars of four beats.
- Motions receive it as `context.tempo`. `PulseMotion` (one cycle per beat) and `BreathingMotion` (one breath per bar) blend toward it by the `tempoSync` control (0 free running, 1 locked); `tempoAngle(tempo, beatsPerCycle)` turns a tempo into an angle for sine based motion. Without a tempo, `tempoSync` does nothing.
- `getDebugState().input.clock` and `getDebugState().tempo` carry both; the harness shows them in the Input and Preset readouts.

---

## Input Recording (takes)

A take is every input event the mapper received, with its offset from the start, as plain JSON. Record a rehearsal with the controller, replay it on stage without one, or replay it while tuning a look. Playback goes through the same mapper as live input, so mappings, learned bindings, and the burst plugin behave identically; the events carry `replayed: true` and are not recorded again, so a take can play while a new one records.

```typescript
engine.startInputRecording();
// ... play the controller ...
const take = engine.stopInputRecording('verse');   // also loaded for playback
downloadJson('verse.json', serializeInputRecording(take));

engine.playInputRecording();                       // the loaded take
engine.playInputRecording(parseInputRecording(json), { loop: true, speed: 1 });
engine.stopInputPlayback();                        // held notes get their noteOff
```

- Time is the engine clock (`dt` per frame), so a take made under `fixedTimestep` replays frame for frame; with the same `seed` the pictures match. `tests/input-recording.test.ts` proves it.
- `InputRecording` is `{ version: 1, duration, recordedAt?, name?, events: [{ t, event }] }`. `parseInputRecording()` validates and throws with the first problem; `serializeInputRecording()` pretty prints.
- `pauseInputPlayback()`, `resumeInputPlayback()`, `seekInputPlayback(seconds)` (releases held notes), `loadInputRecording(take)`, `getInputRecording()`, `cancelInputRecording()`.
- `getInputRecordingStatus()` is `{ state, eventCount, duration }`; `getInputPlaybackStatus()` is `{ state, position, duration, eventCount, index, loop, speed }`. Both are in `getDebugState().input` as `recording` and `playback`.
- The end of a take, a loop wrap, stop, and seek release any note the take left held, so nothing sticks.
- `InputRecorder` and `InputPlayer` are exported on their own.

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
input: {
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
| `enablePointerInput(target?, options?)` | Pointer notes and position on the canvas or another element |
| `disablePointerInput()` | Remove pointer listeners |
| `getPointerState()` | `{ x, y, down, pointers, pressure }` |
| `startInputLearn(target, callback?)` | Enter MIDI learn mode |
| `cancelInputLearn()` | Exit learn mode without binding |
| `inputPanic()` | All notes off — clears stuck notes |
| `getInputNoteMonitor()` | Recent note on/off events |
| `startInputRecording()`, `stopInputRecording(name?)`, `cancelInputRecording()` | Record a take of every mapped input event |
| `playInputRecording(take?, { loop?, speed? })`, `pauseInputPlayback()`, `resumeInputPlayback()`, `stopInputPlayback()`, `seekInputPlayback(s)` | Replay a take through the mapper |
| `getInputRecording()`, `loadInputRecording(take)`, `getInputRecordingStatus()`, `getInputPlaybackStatus()` | The loaded take and both statuses |
| `getInputManager()` | Direct access to input subsystem |

### Events

| Event | Payload |
| --- | --- |
| `input` | `InputDebugState` — connection, learn mode, active notes |
| `noteOn` | `NoteEvent` — fired when bursts are triggered |

### Debug state

```typescript
const { input } = engine.getDebugState();
// midiConnected, keyboardEnabled, pointerEnabled, pointer, clock, deviceName, learnMode, activeNotes, mappingCount, learnedCount, recording, playback
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
- Input take: record, stop, play, loop, stop playback, save as JSON, load a file, with a status line

Select a **Performance —** preset, enable the burst plugin, connect MIDI or keyboard, and play.

---

## Design Notes

- Generic framework — not tied to any specific product or controller brand beyond optional presets
- Web MIDI only; no native Node MIDI in this milestone
- Works alongside audio reactivity, source pipeline, simulation, motion, compositing, and post processing
- Preset `setPreset()` reloads the `input` configuration
- Panic clears mapper active notes, dispatches noteOff, and resets burst plugin state
