# Renderer Pipeline

Pluggable output backends for ASCII Visual Engine. The renderer pipeline decouples grid simulation from visual output so the same engine can draw to canvas, DOM text, offscreen buffers, or (future) WebGL.

---

## Overview

```
AsciiEngine frame loop
        │
        ▼
  Grid pipeline (motions, sources, patterns, effects)
        │
        ▼
  RendererManager.render(frame, context)
        │
        ├── CanvasRenderer          → HTMLCanvasElement (2D)
        ├── OffscreenCanvasRenderer → OffscreenCanvas → blit to canvas
        ├── DomRenderer             → <pre> / <div> text
        └── WebGLRendererStub         → planned GPU path (no draw yet)
```

The grid state lives in the **active renderer**. When switching renderers, grid cells are transferred via `importGridState()`.

---

## Renderer Interface

```typescript
interface Renderer {
  readonly id: RendererId;
  readonly name: string;
  readonly type: RendererType;
  initialize(engine: AsciiEngine): void;
  resize(width: number, height: number): void;
  render(frame: RenderFrame, context: RenderContext): void;
  destroy(): void;
  getGridState(time: number): GridState;
  getDimensions(): GridDimensions;
  setDensity(density: number): void;
  setGlyphSet(glyphSet: string[]): void;
  importGridState(state: GridState): void;
  isAvailable(): boolean;
  supportsLiveSwitch(): boolean;
  getSwitchWarning(): string | null;
}
```

### RenderFrame

```typescript
interface RenderFrame {
  trailAmount: number;
  time: number;
}
```

### RenderContext

```typescript
interface RenderContext {
  engine: AsciiEngine;
  dt: number;
  getControl: (name: string, fallback?: number) => number;
}
```

---

## Built-in Renderers

| Id | Class | Output | Live switch | Notes |
| --- | --- | --- | --- | --- |
| `canvas` | `CanvasRenderer` | Canvas 2D | Yes | Default. Full motion offsets, trails fade |
| `dom` | `DomRenderer` | `<pre>` text | Yes | Terminal-style output. No trail fade |
| `offscreen-canvas` | `OffscreenCanvasRenderer` | Offscreen → canvas | Yes | Falls back to canvas 2D if unsupported |
| `webgl` | `WebGLRendererStub` | — | No | Interface only — planned for GPU optimization |

---

## RendererManager

```typescript
const manager = engine.getRendererManager();

manager.registerRenderer(customRenderer);
manager.setActiveRenderer('dom');       // returns { ok, warning, activeId }
manager.getActiveRenderer();
manager.getGridState(time);
manager.render(frame, context);
manager.resize(width, height);
manager.destroy();
```

### AsciiEngine API

| Method | Description |
| --- | --- |
| `getRendererManager()` | Direct manager access |
| `setActiveRenderer(id)` | Switch backend at runtime |
| `getActiveRendererId()` | Current renderer id |

### Engine options

```typescript
const engine = new AsciiEngine({
  canvas,                              // required for canvas/offscreen backends
  element: document.getElementById('output'), // optional, for DOM renderer
  renderer: 'canvas',                  // 'canvas' | 'dom' | 'offscreen-canvas' | 'webgl'
  preset,
  width,
  height,
});
```

---

## Renderer Switching

Switching is supported at runtime without restarting the engine:

```typescript
const result = engine.setActiveRenderer('dom');
if (!result.ok) {
  console.warn(result.warning);
}
```

| Switch | Safe | Notes |
| --- | --- | --- |
| canvas ↔ dom | Yes | Grid state transferred |
| canvas ↔ offscreen-canvas | Yes | May show fallback warning |
| any → webgl | No | Stub — activation rejected with warning |

Warnings are surfaced via:
- `setActiveRenderer()` return value
- `engine.getDebugState().renderer.switchWarning`
- `renderer` event on the event bus

---

## OffscreenCanvas Fallback

`OffscreenCanvasRenderer` detects `OffscreenCanvas` support at runtime:

- **Supported:** draws to offscreen buffer, blits to display canvas each frame
- **Unsupported:** falls back to drawing directly on the display canvas (same visual result)

No worker thread is required for the current implementation.

---

## WebGL Stub

`WebGLRendererStub` registers the renderer slot for future GPU work:

- `isAvailable()` returns `false`
- `setActiveRenderer('webgl')` is rejected with a clear message
- `render()` is a no-op — does not break builds or tests
- Grid pipeline still runs so future WebGL integration can consume the same grid state

---

## DOM Renderer

Renders the grid as monospace text in a `<pre>` or `<div>`:

```typescript
const pre = document.getElementById('ascii-output') as HTMLPreElement;

const engine = new AsciiEngine({
  canvas: document.createElement('canvas'), // still needed for engine init
  element: pre,
  renderer: 'dom',
});
```

Best for terminal-style output, debugging, and environments where canvas is unavailable.

**Limitation:** trail fade is not simulated — each frame rewrites the full text buffer.

---

## Custom Renderers

Implement the `Renderer` interface and register with the manager:

```typescript
class TerminalRenderer implements Renderer {
  readonly id = 'terminal';
  readonly name = 'Terminal';
  readonly type = 'dom';

  // ... implement interface
}

engine.getRendererManager().registerRenderer(new TerminalRenderer());
engine.setActiveRenderer('terminal');
```

Reuse `GridBuffer` for shared grid management:

```typescript
import { GridBuffer } from 'ascii-visual-engine';
```

---

## Debug State

```typescript
const { renderer } = engine.getDebugState();
// activeRendererId, activeRendererName, available, supportsLiveSwitch,
// switchWarning, offscreenSupported
```

The vanilla example includes a **Renderer Debug** panel and a renderer selector with live warnings.

---

## See Also

- [API.md](./API.md) — RendererManager reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) — frame pipeline
- [SOURCE_PIPELINE.md](./SOURCE_PIPELINE.md) — source input pipeline
