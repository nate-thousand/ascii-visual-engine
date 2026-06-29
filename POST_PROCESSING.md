# Post Processing

CPU-based post processing passes applied to the ASCII grid after compositing and before rendering.

---

## Overview

Post processing modifies the final grid brightness and glyph selection through a chain of optional passes. Passes run in registration order when enabled.

When no passes are enabled, post processing is skipped — zero overhead on the default pipeline.

---

## Pipeline Position

```
Base pipeline → LayerManager → PostProcessor → Renderer
```

The `PostProcessor` maintains a `previousBrightness` buffer for temporal effects (feedback, smear).

---

## Available Passes

| Pass ID | Class | Description |
| --- | --- | --- |
| `feedback` | `FeedbackPass` | Blends current frame with previous frame brightness (trails) |
| `smear` | `SmearPass` | Neighbor-averaged motion drag |
| `displacement` | `DisplacementPass` | Sine-wave spatial displacement |
| `threshold` | `ThresholdPass` | Binary threshold — affects glyph selection |
| `invert` | `InvertPass` | Inverts brightness |
| `edge` | `EdgePass` | Sobel-style edge detection |
| `posterize` | `PosterizePass` | Reduces brightness levels |
| `scanline` | `ScanlinePass` | Alternating row dimming |
| `dither` | `DitherPass` | Bayer matrix dither — affects glyph selection |

Each pass lives in `src/postprocessing/<Name>Pass.ts`.

---

## PostPass Interface

```typescript
interface PostPass {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  amount: number;
  apply(ctx: PostPassContext): void;
  reset(): void;
}

interface PostPassContext {
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  getControl: (name: string, fallback?: number) => number;
  previousBrightness: Float32Array | null;
}
```

Passes that modify brightness should call `applyBrightnessToGrid()` or `brightnessToChar()` to keep glyphs in sync.

---

## Controls

Post pass amounts are driven by engine controls:

| Control | Pass | Default |
| --- | --- | --- |
| `postFeedback` | feedback | 0.7 |
| `postSmear` | smear | 0.5 |
| `postDisplacement` | displacement | 0.3 |
| `postThreshold` | threshold | 0.5 |
| `postInvert` | invert | 1 |
| `postEdge` | edge | 0.6 |
| `postPosterize` | posterize | 4 (levels) |
| `postScanline` | scanline | 0.5 |
| `postDither` | dither | 0.5 |

```typescript
engine.setControl('postFeedback', 0.9);
engine.setControl('postThreshold', 0.4);
```

---

## PostProcessor API

```typescript
const post = engine.getPostProcessor();

post.enablePass('feedback');
post.disablePass('smear');
post.setPassAmount('feedback', 0.85);
post.getPass('threshold');
post.getEnabled();
post.isActive();
post.reset();   // clears previous frame buffer
post.process(grid, glyphSet, time, dt, getControl);
```

---

## Preset Configuration

```typescript
const preset: AsciiPreset = {
  // ...
  postProcessing: [
    { id: 'feedback', enabled: true, amount: 0.75 },
    { id: 'smear', enabled: true, amount: 0.35 },
    { id: 'threshold', enabled: false },
  ],
  postFeedback: 0.75,
  postSmear: 0.35,
};
```

Preset `postProcessing[]` entries enable passes on load. Amount defaults can also be set as top-level preset control values.

---

## Notable Pass Behavior

### Feedback

Blends each cell's brightness with the previous frame:

```
brightness = current * (1 - amount) + previous * amount
```

Creates obvious visual trails when `postFeedback` is high (0.7+).

### Smear

Averages each cell with its four neighbors, producing motion drag / blur.

### Threshold & Dither

Both remap brightness to glyphs via `brightnessToChar()`. Threshold binarizes; dither applies a Bayer matrix offset before glyph quantization — visibly changing character density and texture.

---

## Custom Passes

Register additional passes on the processor:

```typescript
import { PostProcessor } from 'ascii-visual-engine';

class MyPass implements PostPass {
  readonly id = 'myPass';
  readonly name = 'My Pass';
  enabled = false;
  amount = 1;
  apply(ctx: PostPassContext) { /* ... */ }
  reset() {}
}

engine.getPostProcessor().registerPass(new MyPass());
```

---

## Debug State

```typescript
engine.getDebugState().postProcessing;
// {
//   enabledPasses: ['feedback', 'smear'],
//   passCount: 2,
//   processTimeMs: 1.2,
//   feedbackActive: true,
// }
```

---

## Vanilla Example

The demo provides post pass checkboxes and sliders for feedback, smear, threshold, and dither. Toggle passes while the **Compositing Demo** preset is active to see trails and glyph changes.

See also: [COMPOSITING.md](./COMPOSITING.md)
