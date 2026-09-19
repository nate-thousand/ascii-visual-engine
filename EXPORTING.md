# Exporting

Capture and export ASCII visuals as PNG, SVG, GIF, plain text, JSON scenes, and frame sequences.

---

## Overview

The export system works with any renderer, preset, pattern, simulation, or glyph language. Exports run after the render pass and do not modify engine state unless you explicitly import a scene.

---

## Export Formats

| Format | API | Status |
| --- | --- | --- |
| PNG screenshot | `engine.exportPNG()` | Implemented |
| SVG vector | `engine.exportSVG()` | Implemented |
| Animated GIF | `engine.exportGIF()` | Implemented (record first) |
| ASCII text | `engine.exportASCII()` | Implemented |
| JSON scene | `engine.exportJSON()` | Implemented |
| Frame sequence | `engine.exportSequence()` | Implemented |
| WebM / MP4 video | `engine.startVideoRecording()` / `stopVideoRecording()` | Implemented (real time, `MediaRecorder`) |
| PDF | `engine.exportPDF()` | Planned |

---

## Screenshot (PNG)

```typescript
await engine.exportPNG({
  transparent: false,
  width: 1920,
  height: 1080,
  pixelRatio: 2,       // retina
  copyToClipboard: true,
  filename: 'my-art.png',
});
```

Captures the current canvas frame. Supports custom resolution and retina scaling via offscreen compositing.

---

## SVG Export

```typescript
engine.exportSVG({
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#00ff88',
  backgroundColor: 'transparent',
  transparent: true,
});
```

Converts the current grid into vector `<tspan>` elements with configurable spacing and fonts.

---

## ASCII Text Export

```typescript
engine.exportASCII({
  format: 'plain',   // 'plain' | 'ansi' | 'unicode'
  filename: 'frame.txt',
});
```

Exports pure character grid text from `GridState` — independent of canvas rendering.

---

## JSON Scene Export

```typescript
engine.exportJSON('my-scene');
engine.importJSON(jsonString);
```

Exports complete engine state for later reload. See [SCENE_FORMAT.md](./SCENE_FORMAT.md).

---

## GIF & Frame Sequence

1. Start recording: `engine.startRecording(30)`
2. Run the engine (visuals animate)
3. Stop: `engine.stopRecording()`
4. Export: `await engine.exportGIF({ frameRate: 15, loop: true })`
5. Or: `await engine.exportSequence({ prefix: 'frame' })` → `frame-0001.png`, `frame-0002.png`, …

---

## Video (WebM or MP4)

Real time capture of the canvas through the browser's `MediaRecorder`. Independent of the timeline recorder: the browser encodes the canvas as it paints, so the file is what the audience saw, dropped frames included, and it costs nothing on the engine's frame. For frame perfect output at any speed use the timeline recorder with `exportSequence()` and encode offline.

```typescript
const started = engine.startVideoRecording({ frameRate: 30 });
if (!started.ok) console.warn(started.error);   // no MediaRecorder, DOM renderer, tainted canvas
// ... perform ...
const result = await engine.stopVideoRecording();   // downloads ascii-<timestamp>.webm
result.blob;                                        // the file, also when download: false
```

| Option | Default | Description |
| --- | --- | --- |
| `mimeType` | first supported of `VIDEO_MIME_PREFERENCE` | VP9 WebM, VP8 WebM, plain WebM, then MP4. Chrome and Firefox produce WebM, Safari MP4. An unsupported explicit type fails `start` |
| `frameRate` | `30` | Frames per second pulled from the canvas; `0` captures on every paint |
| `videoBitsPerSecond` | `8000000` | Encoder target |
| `audioTracks` | none | Host audio to mux, for example `audioContext.createMediaStreamDestination().stream.getAudioTracks()`. The tracks are left running afterwards |
| `maxSeconds` | none | Stop on its own |
| `filename` | `ascii-<timestamp>.<webm|mp4>` | Download name |

`pauseVideoRecording()`, `resumeVideoRecording()`, `cancelVideoRecording()` (drops the data), `getVideoRecordingStatus()` returns `{ state, supported, mimeType, duration, bytes }` and is also in `getDebugState().export.video`. `stopVideoRecording({ download: false })` keeps the blob on the result only. `VideoRecorder` is exported on its own for hosts that record a different canvas; its constructor takes `MediaRecorder` and `captureStream` replacements so it can be tested without a browser.

The recorded resolution is the canvas backing store, so it follows `pixelRatio`: 1920x1080 CSS pixels at ratio 2 records 3840x2160. Pin `setPixelRatio(1)` for a lighter file.

---

## Engine API

| Method | Description |
| --- | --- |
| `exportPNG(options?)` | Screenshot with optional retina/transparent |
| `exportSVG(options?)` | Vector SVG download |
| `exportGIF(options?)` | Animated GIF from recorded frames |
| `exportJSON(name?)` | Download JSON scene |
| `importJSON(json)` | Restore scene from JSON |
| `exportASCII(options?)` | Plain text grid download |
| `exportSequence(options?)` | Numbered PNG sequence |
| `startVideoRecording(options?)`, `stopVideoRecording()`, `pauseVideoRecording()`, `resumeVideoRecording()`, `cancelVideoRecording()`, `getVideoRecordingStatus()` | Real time WebM or MP4 through `MediaRecorder` |
| `getExportManager()` | Direct access to export subsystem |

---

## Vanilla Demo

The demo includes an **Export & Recording** panel:

- Screenshot PNG, SVG, ASCII, JSON scene
- Import JSON scene (file picker)
- Start/stop recording with indicator and frame counter
- Export GIF and frame sequence
- Record video, stop and save, discard, with state, type, duration, and size
- Playback controls: play, stop, step forward/back

---

## Performance

- Grid snapshots use pre-cloned cell arrays (no shared references)
- PNG capture uses offscreen canvas only when scaling/transparency is requested
- Recording captures frames on the render timeline without blocking the main loop
- GIF encoding runs asynchronously after recording stops

See also: [RECORDING.md](./RECORDING.md)
