# Source Pipeline

Reusable source pipeline for translating external visual inputs into ASCII glyphs.

The source pipeline sits alongside the procedural motion system, pattern plugins, and effect plugins. It does not replace them — when a source is active, it drives the base glyph layer; patterns, effects, and controls still apply on top.

---

## Overview

```
Application
    │
    ├── Image file / URL
    ├── Video file / element
    ├── Webcam (getUserMedia)
    └── HTMLCanvasElement
            │
            ▼
      SourceManager
            │
            ├── ImageSource
            ├── VideoSource
            ├── WebcamSource
            └── CanvasSource
            │
            ▼
      SourceSampler
            │
            ├── brightness sampling
            ├── contrast sampling
            ├── edge detection
            └── glyph mapping
            │
            ▼
      Grid cells (char, brightness, phase)
            │
            ▼
      Pattern + effect pipeline (unchanged)
```

---

## Source Interface

Every source implements:

```typescript
interface Source {
  readonly id: string;
  readonly name: string;
  readonly type: SourceType; // 'image' | 'video' | 'webcam' | 'canvas'
  initialize(engine: AsciiEngine): void;
  load(input: unknown): Promise<void>;
  update(deltaTime: number, context: SourceContext): void;
  sample(x: number, y: number, context: SourceContext): SourceSample;
  destroy(): void;
  isReady(): boolean;
  getError(): string | null;
  getFitMode(): SourceFitMode;
  setFitMode(mode: SourceFitMode): void;
}
```

---

## Source Types

| Type | Class | Input | Notes |
| --- | --- | --- | --- |
| `image` | `ImageSource` | URL string, `File`, or `HTMLImageElement` | Static image → ASCII |
| `video` | `VideoSource` | URL, `File`, or `HTMLVideoElement` | Real-time frame sampling; play/pause/loop/mute |
| `webcam` | `WebcamSource` | `{ facingMode?, fitMode? }` | Live camera; fails gracefully on denied permission |
| `canvas` | `CanvasSource` | `HTMLCanvasElement` or `{ canvas }` | Any canvas drawing → ASCII |

---

## Fit Modes

Sources map grid coordinates to pixel coordinates using a fit mode:

| Mode | Behavior |
| --- | --- |
| `fit` | Letterbox — entire source visible, aspect ratio preserved |
| `fill` | Cover — fills grid, may crop edges |
| `stretch` | Stretch source to fill grid |
| `center` | 1:1 pixel mapping centered on source |

---

## SourceManager

```typescript
const manager = engine.getSourceManager();

manager.registerSource(customSource);
manager.unregisterSource('mySource');
manager.setActiveSource('image');   // switches to source mode
manager.getActiveSource();
manager.setMode('procedural');      // back to procedural generation
manager.loadSource('image', file);
manager.update(dt, context);
manager.destroy();
```

### AsciiEngine API

| Method | Description |
| --- | --- |
| `getSourceManager()` | Direct manager access |
| `setSourceMode('procedural' \| 'source')` | Toggle pipeline mode |
| `getSourceMode()` | Current mode |
| `setActiveSource(id \| null)` | Activate a registered source |
| `loadSource(id, input)` | Load input into a source |

---

## SourceSampler

Utility for pixel → glyph conversion:

```typescript
const sampler = new SourceSampler();

sampler.sampleFromImageData(imageData, nx, ny, fitMode, targetW, targetH, contrast, edge);
sampler.applyToGrid(imageData, grid, cols, rows, glyphSet, fitMode, ...);
```

Helpers:

- `pixelBrightness(data, index)` — luminance from RGBA
- `pixelContrast(data, w, h, x, y)` — local 3×3 contrast
- `pixelEdge(data, w, h, x, y)` — neighbor gradient edge strength
- `mapBrightnessToGlyph(brightness, glyphSet)` — index into glyph set
- `mapNormalizedToSource(nx, ny, fitMode, ...)` — coordinate mapping

---

## Source Controls

| Control | Default | Description |
| --- | --- | --- |
| `sourceContrast` | `1` | Contrast multiplier on sampled brightness |
| `sourceEdge` | `0.3` | Edge emphasis blend (0 = off, 1 = full) |
| `sourceBlend` | `1` | How strongly source overwrites grid brightness |

```typescript
engine.setControl('sourceContrast', 1.5);
engine.setControl('sourceEdge', 0.5);
engine.setControl('sourceBlend', 1);
```

---

## Preset Configuration

Presets may optionally declare a source:

```json
{
  "id": "portrait",
  "name": "Portrait",
  "source": {
    "type": "image",
    "options": { "fitMode": "fit" }
  },
  "glyphSet": [".", ":", "-", "=", "+", "*", "#"],
  "plugins": [{ "id": "trails", "type": "effect" }],
  "controls": [],
  "density": 1,
  "speed": 1,
  "trailAmount": 0.3,
  "glitchAmount": 0.1,
  "motionField": "none"
}
```

When `source` is present, `setPreset()` activates that source type automatically.

---

## Frame Pipeline Integration

```
1. SourceManager.update()
2. If source mode + ready → SourceManager.applyToGrid()
   Else → MotionManager.combineMotions() OR legacy motion effects
3. PluginManager.updatePatterns() + applyPatterns()
4. PluginManager.runPostEffects()
5. Renderer.render()
```

The active renderer owns the grid buffer. `RendererManager` delegates `getGridState()` to the active backend. Switching renderers transfers grid state via `importGridState()`.

Supported backends: Canvas 2D, DOM text, OffscreenCanvas (with fallback), WebGL stub (planned). See [RENDERER_PIPELINE.md](./RENDERER_PIPELINE.md).

Procedural mode is unchanged when `getSourceMode() === 'procedural'`.

---

## Custom Sources

Extend `PixelSourceBase` for pixel-buffer sources:

```typescript
import { PixelSourceBase } from 'ascii-visual-engine';

class MySource extends PixelSourceBase {
  constructor() {
    super('mySource', 'My Source', 'canvas');
  }

  async load(input: unknown): Promise<void> {
    // load external data
    this.ready = true;
  }

  protected refreshCapture(): void {
    // draw to capture canvas, set this.cachedImageData
  }
}

engine.getSourceManager().registerSource(new MySource());
```

For non-pixel sources, implement the `Source` interface directly.

---

## Debug State

```typescript
const { source } = engine.getDebugState();
// { mode, activeSourceId, activeSourceType, ready, error, width, height, fitMode }
```

The vanilla example includes a **Source Debug** panel showing live source state.

---

## Error Handling

- **Webcam denied:** `WebcamSource.getError()` returns `"WebcamSource: camera permission denied"`, `isReady()` is `false`
- **Missing API:** Returns error when `navigator.mediaDevices` is unavailable
- **Invalid input:** `load()` sets error string, engine continues in procedural fallback until source is ready

---

## See Also

- [API.md](./API.md) — SourceManager reference
- [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) — `source` field
- [ARCHITECTURE.md](./ARCHITECTURE.md) — frame pipeline
- [MOTION_SYSTEM.md](./MOTION_SYSTEM.md) — procedural motion (alternative base layer)
