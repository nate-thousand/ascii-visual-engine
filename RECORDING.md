# Recording & Playback

Record ASCII animation sessions and replay them with scrubbing, stepping, and speed control.

---

## Overview

The recording system captures grid state and optional PNG snapshots each frame while the engine runs. Playback restores grid states sequentially for review or export.

---

## Recording API

```typescript
engine.startRecording(30);   // 30 fps capture rate
engine.pauseRecording();
engine.resumeRecording();
const frames = engine.stopRecording();
engine.cancelRecording();
```

Recording state is available in debug:

```typescript
const { export: ex } = engine.getDebugState();
// ex.recording: { state, frameCount, duration, frameRate }
```

---

## How It Works

Each engine frame (after render):

1. `TimelineRecorder.onFrame(time)` checks if capture is due
2. `AnimationRecorder` clones grid state and async-captures canvas PNG
3. Frames accumulate until stop

Capture rate is independent of display refresh rate — frames are sampled at the configured FPS interval.

---

## Playback API

```typescript
engine.playRecording({ loop: true, speed: 1, frameRate: 30 });
engine.pausePlayback();
engine.resumePlayback();
engine.stopPlayback();
engine.stepPlayback(-1);   // previous frame
engine.stepPlayback(1);    // next frame
engine.scrubPlayback(42);  // jump to frame index
```

Playback imports grid state into the active renderer without restarting the engine.

---

## Architecture

```
AsciiEngine.tick()
    └── ExportManager.onFrameRendered(time)
            └── TimelineRecorder
                    ├── RecordingSession → AnimationRecorder
                    └── PlaybackSession → importGridState()
```

Modules:

| Module | Role |
| --- | --- |
| `RecordingSession` | Start/pause/stop/cancel lifecycle |
| `AnimationRecorder` | Frame buffer with grid + PNG |
| `PlaybackSession` | Play, scrub, step, loop, speed |
| `TimelineRecorder` | Coordinates record + playback |

---

## Export After Recording

```typescript
engine.startRecording(24);
// ... run visuals ...
engine.stopRecording();

await engine.exportGIF({ frameRate: 12, loop: true });
await engine.exportSequence({ prefix: 'ascii-frame' });
engine.exportJSON('recorded-session');
```

---

## Vanilla Demo

- **● REC** indicator when recording
- Frame counter updates live
- Play / Stop / Step controls for playback review

---

## Design Notes

- Recording does not pause or alter the visual pipeline
- Grid clones prevent mutation during async export
- Playback temporarily overrides grid state; live simulation resumes on stop
- Works with canvas, offscreen-canvas, and DOM renderers

See also: [EXPORTING.md](./EXPORTING.md), [SCENE_FORMAT.md](./SCENE_FORMAT.md)
