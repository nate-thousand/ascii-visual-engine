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
| `image` | `ImageSource` | URL string, `File`, `HTMLImageElement`, `{ src }`, `{ svg }` inline markup | Still image. SVG (by extension, MIME type, or markup) is read as text and sized before rasterizing, so files without `width`/`height` still draw; `svgSize` sets the longest side (default 1024). Pixels are read once per load |
| `video` | `VideoSource` | URL, `File`, or `HTMLVideoElement` | Real-time frame sampling; play/pause/loop/mute |
| `webcam` | `WebcamSource` | `{ facingMode?, fitMode? }` | Live camera; fails gracefully on denied permission |
| `canvas` | `CanvasSource` | `HTMLCanvasElement` or `{ canvas }` | Any canvas drawing → ASCII |
| `text` | `TextSource` | string or `{ text, font?, weight?, size?, align?, lineHeight?, letterSpacing?, padding?, fitMode? }` | Type, rasterized with the canvas text API at the grid's own size. `size` defaults to `fit` (largest that clears `padding`); newlines break lines. `setText()` and `setOptions()` change it live; `getLayout()` returns the placed lines |

### Logos and type

A logo or a wordmark is a shape, and the brightness ramp turns a shape into grey glyphs that dissolve at low density. Three things make them read:

- **Alpha is background.** A transparent pixel samples as 0 whatever its color, so a logo on a transparent ground is the logo, not a black rectangle.
- **`sourceInvert`** flips light and dark before the alpha scale: black type on transparent becomes a light shape instead of vanishing.
- **`sourceMask`** switches from the ramp to a mask. Every procedural stage runs as usual (motions, simulations, patterns, effects, glyph language), then cells whose sampled brightness is below `sourceThreshold` are dimmed by `sourceBlend` and blanked at 1. The look shows through the shape; outside is dark. Edge detection does not apply in mask mode.

```typescript
await engine.loadSource('image', { svg: logoMarkup });   // or 'logo.svg', or a File
engine.setControl('sourceInvert', 1);                   // black logo on transparent
engine.setControl('sourceMask', 1);
engine.setControl('sourceThreshold', 0.5);

await engine.loadSource('text', { text: 'ASCII\nENGINE', font: 'Inter', weight: 900 });
```

Fit modes compare the source's aspect ratio with the grid's pixel size, so a logo keeps its proportions even though cells are 1.6 times taller than wide. `size: 'fit'` type is sized at the grid's pixel size too, so it stays legible at any density.

**Sub cell anti aliasing.** With `sourceSmooth` on (the default) each cell averages the source over its whole footprint instead of reading the one pixel under its centre, through a summed area table so the cost per cell is constant. A stroke thinner than a cell contributes its share of the cell's brightness rather than being hit or missed, so thin type and fine logo detail survive at low density. In mask mode the same average makes the silhouette's edge cells fade over `softness` (0.25 in brightness) below `sourceThreshold` instead of snapping in or out. Set `sourceSmooth` to 0 for the nearest pixel look. The table is built once per still image or text raster and once per frame for video, webcam, and canvas sources (about 3 ms at 1280x720).

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
| `sourceBlend` | `1` | Source share: in ramp mode 1 = source only (patterns skipped), 0 = pattern only; in mask mode how far cells outside the shape are dimmed, 1 = blank |
| `sourceInvert` | `0` | 1 flips light and dark (before the alpha scale) |
| `sourceMask` | `0` | 1 treats the source as a shape over the procedural look instead of a brightness ramp |
| `sourceThreshold` | `0.5` | Brightness a cell needs to count as inside the shape in mask mode |
| `sourceSmooth` | `1` | Average the source over each cell's footprint (sub cell anti aliasing); 0 reads one pixel per cell |

```typescript
engine.setControl('sourceContrast', 1.5);
engine.setControl('sourceEdge', 0.5);
engine.setControl('sourceBlend', 1);
```

These are engine state, not preset values: they survive `setPreset()`.

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
2. Ramp mode, source ready → SourceManager.applyToGrid()
   Mask mode or no source     → simulations / MotionManager.combineMotions() / motion effects
3. PluginManager.updatePatterns() + applyPatterns()  (weight 1 - sourceBlend under a ramp)
4. PluginManager.runPostEffects(), compositing, post passes, glyph language
5. Mask mode → SourceManager.applyMask() over the finished grid
6. Renderer.render()
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
// { mode, applyMode ('brightness' | 'mask'), activeSourceId, activeSourceType, ready, error, width, height, fitMode }
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
