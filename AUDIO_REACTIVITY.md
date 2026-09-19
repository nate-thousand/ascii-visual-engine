# Audio Reactivity

Connect real-time audio analysis to ASCII Visual Engine controls, layers, post passes, and note events.

---

## Overview

The audio system analyzes input from a microphone, audio file, media stream, or external `AnalyserNode`, extracts musical features, and maps them to visual parameters through configurable bindings with attack/release smoothing.

When audio is disconnected, the engine returns to its pre-audio control values. Non-audio visuals continue to work unchanged.

---

## Architecture

```
AudioInput → AnalyserNode → AudioAnalyzer
                                │
                                ▼
                      AudioFeatureExtractor
                                │
                                ▼
                      AudioReactiveMapper → engine controls / layers / noteOn
```

Each frame (when connected):

1. `AudioAnalyzer.update()` reads FFT and time-domain data
2. `AudioFeatureExtractor.extract()` computes features
3. `AudioReactiveMapper.apply()` writes smoothed values to targets

---

## Audio Sources

| Type | `AudioInputOptions` | Description |
| --- | --- | --- |
| `microphone` | `{ type: 'microphone' }` | `getUserMedia` mic input |
| `audioElement` | `{ type: 'audioElement', audioElement }` | HTML `<audio>` playback |
| `mediaStream` | `{ type: 'mediaStream', mediaStream }` | Any `MediaStream` with audio |
| `analyser` | `{ type: 'analyser', analyser }` | External Web Audio graph |

Microphone connection fails gracefully with `{ ok: false, error }` when permissions are denied or Web Audio is unavailable.

```typescript
const result = await engine.connectAudio({ type: 'microphone' });
if (!result.ok) console.warn(result.error);

await engine.connectAudio({ type: 'audioElement', audioElement: audioEl });
engine.disconnectAudio();
```

---

## Extracted Features

| Feature | Description |
| --- | --- |
| `amplitude` | RMS level from time-domain signal (0–1) |
| `bass` | Low frequency band energy |
| `lowMid` | Lower-mid band energy |
| `mid` | Mid band energy |
| `highMid` | Upper-mid band energy |
| `treble` | High frequency band energy |
| `spectralCentroid` | Brightness / pitch center (0–1) |
| `transient` | Onset detection from amplitude delta |
| `beat` | 1 on a detected onset, decaying over about a quarter second |
| `beatPhase` | 0 to 1 progress from the last onset toward the next predicted beat; 0 without a tempo |
| `beatConfidence` | 0 to 1 share of recent onsets that agree with the tempo estimate |
| `bpm` | Estimated tempo, 0 until enough onsets agree. As a mapping input it spans 0 to 1 over 60 to 200 BPM (`normalizeBpm`) |

```typescript
const features = engine.getAudioFeatures();
// { amplitude, bass, lowMid, mid, highMid, treble, spectralCentroid, transient, beat, beatPhase, beatConfidence, bpm }
```

### Beat detection

`BeatDetector` (`src/audio/BeatDetector.ts`) runs inside the feature extractor on the bass band. An onset is a frame where bass rises above `sensitivity` (1.3) times its recent one second average, is above a floor (0.15), and at least 150 ms have passed since the last onset. The tempo comes from the intervals between the last 16 onsets: each is folded into 60 to 200 BPM by doubling or halving, the median is taken, intervals within 10% of it are averaged, and their share is the confidence. The estimate holds through a few dropped kicks, fades in confidence once onsets stop, and is dropped after four seconds of silence. It is frame rate independent: the same signal at 30 and 120 fps lands within a couple of BPM. `extractor.getBeatDetector()` exposes the state and a `BeatDetector` can be built standalone with its own options for a host's own analysis.

`beatPhase` is the sawtooth a tempo synced motion wants; `beat` is the pulse a flash or a burst wants.

---

## AudioReactiveMapper

Maps features to engine targets:

| Target type | Effect |
| --- | --- |
| `control` | `engine.setControl(name, value)` |
| `layerOpacity` | Set opacity on a compositing layer |
| `postPass` | Set amount on a post processing pass |
| `noteOn` | Fire burst/note event on transients |

```typescript
engine.setAudioMapping({
  enabled: true,
  smoothing: {
    attack: 0.08,
    release: 0.25,
    sensitivity: 1,
    noiseGate: 0.02,
    minThreshold: 0,
    maxClamp: 1,
  },
  mappings: [
    { feature: 'bass', target: { type: 'control', control: 'strength', amount: 1, min: 0.2, max: 1 } },
    { feature: 'transient', target: { type: 'noteOn', cooldownMs: 100 } },
    { feature: 'beat', target: { type: 'postPass', passId: 'feedback', amount: 0.8, min: 0.2, max: 0.95 } },
  ],
});
```

Mappings are declarative — change behavior without editing engine code.

---

## Smoothing

| Parameter | Control name | Description |
| --- | --- | --- |
| Attack | `audioAttack` | Rise time (seconds) |
| Release | `audioRelease` | Fall time (seconds) |
| Sensitivity | `audioSensitivity` | Feature gain multiplier |
| Noise gate | `audioNoiseGate` | Silence below this amplitude |
| Min threshold | `audioMinThreshold` | Output floor |
| Max clamp | `audioMaxClamp` | Output ceiling |

Smoothing prevents jitter while preserving transients when attack is low.

---

## Engine API

| Method | Description |
| --- | --- |
| `connectAudio(input)` | Connect audio source; returns `{ ok, error? }` |
| `disconnectAudio()` | Disconnect and restore base control values |
| `setAudioMapping(config)` | Update feature → target bindings |
| `getAudioFeatures()` | Latest extracted features (null when disconnected) |
| `isAudioConnected()` | Whether audio input is active |

Debug state: `engine.getDebugState().audio`

Event: `engine.on('audio', (features) => { ... })`

---

## Preset Configuration

```typescript
const preset: AsciiPreset = {
  // ...
  audio: {
    mapping: {
      enabled: true,
      smoothing: { attack: 0.35, release: 0.6, sensitivity: 0.8 },
      mappings: [
        { feature: 'amplitude', target: { type: 'control', control: 'trailAmount', amount: 0.7, min: 0.1, max: 0.9 } },
        { feature: 'bass', target: { type: 'control', control: 'density', amount: 0.4, min: 0.6, max: 1.6 } },
      ],
    },
    audioAttack: 0.35,
    audioRelease: 0.6,
  },
};
```

### Built-in audio presets

| Preset ID | Character |
| --- | --- |
| `audioAmbient` | Slow attack/release, trails + density from amplitude/bass |
| `audioBass` | Bass → strength + particle spawn, beat → glitch |
| `audioGlitch` | Transients → noteOn + glitch spike |
| `audioVoice` | Mid/highMid → speed + spiral for speech/s vocals |
| `audioFullSpectrum` | Each band maps to a different parameter |

---

## Vanilla Example

The demo includes:

- Enable Microphone button
- Audio file input
- Disconnect Audio button
- Live meters: amplitude, bass, mid, treble
- Smoothing sliders: attack, release, sensitivity, noise gate
- Audio debug panel

Select an **Audio —** preset, connect a source, and watch controls respond.

---

## External Analyser Integration

Use your own Web Audio graph and pass the analyser:

```typescript
const ctx = new AudioContext();
const analyser = ctx.createAnalyser();
// ... connect your sources to analyser ...

await engine.connectAudio({ type: 'analyser', analyser, audioContext: ctx });
```

---

## Design Notes

- Generic framework — not tied to any specific product or MIDI
- CPU analysis only; no WebGL audio shaders
- Base control values are snapshotted on connect and restored on disconnect
- Preset `setPreset()` reloads the `audio.mapping` configuration
- Works alongside source, simulation, motion, compositing, post processing, and MIDI/keyboard input pipelines

See also: [MIDI_AND_INPUT.md](./MIDI_AND_INPUT.md) for hardware and keyboard performance controls.
