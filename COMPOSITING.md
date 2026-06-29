# Compositing

Layer-based visual compositing for ASCII Visual Engine. Compositing runs on the CPU after the main motion/pattern/effect pipeline and before post processing and rendering.

---

## Overview

The compositing system lets you stack multiple visual layers, each with its own content source, opacity, blend mode, and mask. Layers composite onto the engine grid in order before the final renderer draw.

When no layers are enabled, compositing is skipped entirely — existing procedural, source, simulation, and motion behavior is unchanged.

---

## Architecture

```
Base pipeline (source / simulation / motion / patterns / effects)
        │
        ▼
  LayerManager.renderLayers()
        │
        ▼
  PostProcessor.process()
        │
        ▼
  RendererManager.render()
```

### Key modules

| Module | Path | Role |
| --- | --- | --- |
| `Layer` | `src/compositing/Layer.ts` | Single layer config + scratch grid |
| `LayerManager` | `src/compositing/LayerManager.ts` | Layer stack CRUD and compositing |
| `BlendModes` | `src/compositing/BlendModes.ts` | Per-cell brightness/glyph blending |
| `Mask` | `src/compositing/Mask.ts` | Spatial masks per layer |

---

## Layer Configuration

Each layer is defined by a `LayerConfig`:

```typescript
interface LayerConfig {
  id: string;
  name?: string;
  enabled?: boolean;
  opacity?: number;           // 0–1, default 1
  blendMode?: BlendMode;      // default 'normal'
  mask?: MaskConfig;
  glyphSet?: string[];        // optional per-layer glyphs
  source?: string;            // source id (uses active source)
  pattern?: string;           // pattern plugin id
  simulation?: string;        // simulation id
  effects?: string[];         // reserved for future per-layer effects
  fill?: number;              // solid brightness fill (0–1)
}
```

### Layer content priority

When rendering a layer, content is resolved in this order:

1. **fill** — solid brightness
2. **simulation** — runs simulation into layer scratch grid
3. **pattern** — samples a single pattern plugin
4. **source** — applies active source to layer grid
5. **fallback** — animated pulse fill

---

## Blend Modes

Supported blend modes (`BlendMode`):

| Mode | Description |
| --- | --- |
| `normal` | Alpha blend by opacity |
| `add` | Additive brightness |
| `multiply` | Multiplicative darkening |
| `screen` | Inverse multiply (lighten) |
| `difference` | Absolute difference |
| `max` | Per-cell maximum |
| `min` | Per-cell minimum |
| `overlay` | Contrast-preserving overlay |

Blend modes affect cell **brightness** and **glyph selection** via `compositeCell()`.

---

## Masks

Masks modulate layer opacity per cell.

| Type | Description |
| --- | --- |
| `radial` | Circular falloff from center |
| `linear` | Gradient along an angle |
| `noise` | Procedural noise field |
| `brightness` | Uses source/cell brightness |

```typescript
interface MaskConfig {
  type: MaskType;
  amount?: number;
  angle?: number;      // linear mask degrees
  centerX?: number;      // 0–1 normalized
  centerY?: number;
  invert?: boolean;
}
```

Effective layer opacity at each cell: `layer.opacity * mask.sample(...)`.

---

## LayerManager API

```typescript
const layers = engine.getLayerManager();

layers.addLayer({ id: 'bg', pattern: 'radialSymmetry', opacity: 1 });
layers.addLayer({ id: 'fg', pattern: 'spiral', blendMode: 'add', opacity: 0.5 });
layers.enableLayer('fg');
layers.disableLayer('bg');
layers.reorderLayer('fg', 0);
layers.getLayer('bg');
layers.removeLayer('bg');
layers.clear();
```

`renderLayers(context)` is called internally each frame when compositing is active.

---

## Preset Configuration

Presets can declare layers:

```typescript
const preset: AsciiPreset = {
  // ...
  layers: [
    {
      id: 'base',
      pattern: 'radialSymmetry',
      blendMode: 'normal',
      opacity: 1,
      mask: { type: 'radial', amount: 1 },
    },
    {
      id: 'overlay',
      pattern: 'spiral',
      blendMode: 'add',
      opacity: 0.6,
      mask: { type: 'linear', angle: 45, amount: 0.8 },
    },
  ],
};
```

Use the built-in **Compositing Demo** preset (`compositing`) to see layered patterns with feedback and smear post passes.

---

## Engine Integration

```typescript
engine.getLayerManager();     // LayerManager instance
engine.getPostProcessor();    // PostProcessor instance
engine.resetComposition();    // Clear and reload preset layers + post passes
engine.getDebugState().compositing;
```

Compositing debug state includes layer count, enabled count, per-layer order/blend/opacity, and render time.

---

## Vanilla Example

The demo includes:

- Layer enable/disable checkboxes
- Blend mode selector for the active layer
- Layer opacity slider
- Add Layer / Reset Composition buttons
- Compositing debug panel

Run `npm run dev` and select the **Compositing Demo** preset to start with preconfigured layers.

---

## Design Notes

- Compositing is **CPU/Canvas based** — no WebGL required
- Each layer owns a scratch `GridCell[]` buffer sized to the current grid
- Layer pattern rendering samples a **single** pattern plugin, not all enabled patterns
- When compositing is disabled, the engine tick path is identical to pre-M08 behavior

See also: [POST_PROCESSING.md](./POST_PROCESSING.md)
