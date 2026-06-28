# Architecture

System design for ASCII Visual Engine. This document describes how the engine is structured, how data flows through each frame, and where future extension points will live.

---

## System Overview

```
                    ┌──────────────────────────────────┐
                    │           Application            │
                    │  (UI, input, audio, game logic)  │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │           AsciiEngine            │
                    │                                  │
                    │  ┌─────────┐  ┌──────────────┐  │
                    │  │ Preset  │  │ Control State│  │
                    │  │ Manager │  │   (Map)      │  │
                    │  └────┬────┘  └──────┬───────┘  │
                    │       │               │          │
                    │  ┌────▼───────────────▼───────┐  │
                    │  │       Effect Pipeline      │  │
                    │  │  Motion → Burst → Glitch   │  │
                    │  │         → Trails           │  │
                    │  └────────────┬───────────────┘  │
                    │               │                  │
                    │  ┌────────────▼───────────────┐  │
                    │  │     CanvasAsciiRenderer    │  │
                    │  └────────────┬───────────────┘  │
                    │               │                  │
                    │  ┌────────────▼───────────────┐  │
                    │  │         EventBus           │  │
                    │  └────────────────────────────┘  │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │        HTMLCanvasElement         │
                    └──────────────────────────────────┘
```

The application sits above the engine. It creates the engine, passes a canvas, loads presets, routes input to `noteOn`/`setControl`, and subscribes to events. The engine owns the frame loop, effect pipeline, and renderer.

---

## Engine Lifecycle

```
  construct ──► start ──► [running] ──► stop ──► [idle]
                  │                              │
                  │         destroy ◄────────────┘
                  │              │
                  └──────────────► [destroyed]
```

### States

| State | Description |
| --- | --- |
| **Constructed** | Engine created, renderer initialized, preset loaded. May auto-start. |
| **Running** | `requestAnimationFrame` loop active. Effects update and renderer draws each frame. |
| **Idle** | Loop stopped via `stop()`. Engine state preserved. Can restart with `start()`. |
| **Destroyed** | All resources released. Event listeners cleared. Cannot restart. |

### Lifecycle methods

```typescript
const engine = new AsciiEngine({ canvas, preset });  // construct (+ auto-start)
engine.stop();                                        // pause loop
engine.start();                                       // resume loop
engine.destroy();                                     // tear down permanently
```

On construction the engine:

1. Stores the canvas reference
2. Resolves preset (provided or default)
3. Creates `CanvasAsciiRenderer` with preset density and glyph set
4. Initializes control values from preset defaults
5. Builds the effect pipeline from preset configuration
6. Starts the animation loop (unless `autoStart: false`)

On destroy:

1. Stops the animation loop
2. Calls `reset()` on all active effects
3. Clears renderer grid and canvas
4. Clears all event bus listeners

---

## Rendering Pipeline

Each frame follows a fixed sequence:

```
┌─────────────┐
│  RAF tick   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────────────────────────┐
│ Compute dt  │────►│ Cap dt at 50ms (tab-switch safe) │
└──────┬──────┘     └──────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Advance time│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌────────────────────────────┐
│ Read controls│────►│ density, speed, trail,     │
│              │     │ glitchAmount               │
└──────┬──────┘     └────────────────────────────┘
       │
       ▼
┌─────────────┐
│ getGridState│────► GridCell[] with char, brightness, burst
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Effect pipeline│──► for each effect: effect.update(ctx)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ renderer.   │────► clear (with trail fade) → draw glyphs
│ render()    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Emit frame  │────► once per second: { time, fps }
│ event       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Schedule    │
│ next RAF    │
└─────────────┘
```

### Grid structure

The renderer maintains a flat array of `GridCell` objects:

```
Grid (cols × rows)
┌───┬───┬───┬───┐
│ . │ : │ - │ = │  row 0
├───┼───┼───┼───┤
│ + │ * │ # │ @ │  row 1
├───┼───┼───┼───┤
│ . │ : │ - │ = │  row 2
└───┴───┴───┴───┘
```

Each cell stores:

| Field | Purpose |
| --- | --- |
| `char` | Current displayed character (modified by effects) |
| `baseChar` | Original character from glyph set |
| `x`, `y` | Grid coordinates |
| `phase` | Deterministic seed for glyph variation |
| `brightness` | Opacity multiplier (0–1) |
| `burst` | Temporary burst intensity from `noteOn` |

Grid dimensions are computed from canvas size and density:

```
cols = floor(width / (12 / density))
cellWidth = width / cols
cellHeight = cellWidth × 1.6
rows = floor(height / cellHeight)
```

---

## Effect Pipeline

Effects are applied sequentially each frame. Order matters: motion fields run first, then modifiers.

```
Preset config
     │
     ▼
┌──────────────┐
│ Motion Field │  NoiseField OR WaveField (one active)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ GlyphBurst   │  Applies burst intensity from active notes
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Glitch       │  Random glyph corruption (if enabled)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Trails       │  Decays burst values; renderer applies fade
└──────────────┘
```

### Effect context

Every effect receives the same `EffectContext` each frame:

```typescript
interface EffectContext {
  grid: GridState;       // mutable cell array
  glyphSet: string[];    // active character set
  speed: number;         // animation speed multiplier
  glitchAmount: number;  // 0–1 glitch intensity
  trailAmount: number;   // 0–1 trail fade strength
  dt: number;            // delta time in seconds
  time: number;          // elapsed engine time in seconds
}
```

Effects mutate `grid.cells` in place. The renderer reads the final state.

---

## Plugin Lifecycle

> **Status: Planned.** The current v0.1.0 release uses a hardcoded effect pool. The plugin architecture described here is the target design for v0.2.0+.

```
register ──► init ──► [active] ──► update (each frame) ──► destroy
                │                        │
                │         onNoteOn/off   │
                └────────────────────────┘
```

### Planned plugin interface

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;

  init(engine: AsciiEngine): void;
  update(ctx: EffectContext): void;
  destroy(): void;

  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
}
```

### Current effect interface (v0.1.0)

Built-in effects implement a simpler interface today:

```typescript
interface Effect {
  readonly type: EffectType;
  update(ctx: EffectContext): void;
  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
  reset?(): void;
}
```

This interface is the foundation the plugin system will extend.

---

## Preset Loading

```
setPreset(preset)
     │
     ├── Store preset reference
     │
     ├── initControls(preset)
     │     └── Set density, speed, trailAmount, glitchAmount
     │         + any custom control defaults
     │
     ├── renderer.setDensity(preset.density)
     ├── renderer.setGlyphSet(preset.glyphSet)
     │
     ├── rebuildEffects(preset.effects, preset.motionField)
     │     ├── Reset all current effects
     │     ├── Filter enabled effects from config
     │     └── Select motion field matching motionField type
     │
     └── emit('preset', preset)
```

Presets are plain objects. No async loading in v0.1.0. Future versions will support JSON fetch, validation, and interpolation.

---

## Event System

The `EventBus` provides typed pub/sub:

```
Publisher                    EventBus                    Subscribers
─────────                    ────────                    ───────────
engine.noteOn()  ──emit──►  noteOn  ──dispatch──►  listener A
engine.setControl() ──emit──► control ──dispatch──►  listener B
engine.emit()    ──emit──►  custom  ──dispatch──►  listener C
tick (1/sec)     ──emit──►  frame   ──dispatch──►  listener D
```

### Event map

| Event | Payload | When |
| --- | --- | --- |
| `start` | `void` | Engine loop begins |
| `stop` | `void` | Engine loop pauses |
| `preset` | `AsciiPreset` | Preset changed |
| `control` | `{ name, value }` | Control updated |
| `noteOn` | `NoteEvent` | Note triggered |
| `noteOff` | `NoteEvent` | Note released |
| `resize` | `{ width, height }` | Canvas resized |
| `frame` | `{ time, fps }` | Once per second |
| `custom` | `EngineEventPayload` | Application-defined |

Subscriptions return an unsubscribe function:

```typescript
const unsub = engine.on('noteOn', handler);
unsub(); // remove listener
```

---

## Renderer Abstraction

> **Status: Partial.** `CanvasAsciiRenderer` is the only implementation. A formal interface is planned.

### Current: CanvasAsciiRenderer

- Uses Canvas 2D `fillText` for each grid cell
- Supports density, glyph set, color, and background changes
- Handles trail fade via semi-transparent fill rect
- Rebuilds grid on resize or density change

### Planned: AsciiRenderer interface

```typescript
interface AsciiRenderer {
  render(trailAmount?: number): void;
  clear(trailAmount?: number): void;
  resize(width: number, height: number): void;
  setDensity(density: number): void;
  setGlyphSet(glyphSet: string[]): void;
  getGridState(time: number): GridState;
  destroy(): void;
}
```

### Planned renderers

| Renderer | Target | Status |
| --- | --- | --- |
| `CanvasAsciiRenderer` | Browser canvas 2D | Implemented |
| `WebGLAsciiRenderer` | GPU instanced glyphs | Planned |
| `TerminalRenderer` | stdout / DOM pre | Planned |
| `OffscreenRenderer` | Web Worker | Planned |

---

## Future Extension Points

| Extension point | Purpose | Status |
| --- | --- | --- |
| **Plugin registration** | Add custom effects and behaviors | Planned |
| **Renderer swap** | Switch between canvas, WebGL, terminal | Planned |
| **Input adapters** | Route MIDI, touch, keyboard to engine | Planned |
| **Preset loader** | Load/validate/morph presets at runtime | Planned |
| **Shader pipeline** | Post-processing effects on render output | Planned |
| **Audio mappers** | Map FFT/amplitude to controls and notes | Planned |
| **Custom controls** | Extend control schema beyond four defaults | Partial (schema supports it) |

---

## Module Dependencies

```
index.ts
  ├── core/AsciiEngine.ts
  │     ├── core/EventBus.ts
  │     ├── core/types.ts
  │     ├── renderers/CanvasAsciiRenderer.ts
  │     └── effects/*.ts
  ├── renderers/CanvasAsciiRenderer.ts
  │     ├── core/types.ts
  │     └── effects/Trails.ts
  ├── effects/*.ts
  │     └── core/types.ts
  └── presets/
        ├── basic.ts
        ├── terminal.ts
        ├── organic.ts
        └── index.ts
```

The dependency graph is intentionally shallow. Effects depend only on types. The engine orchestrates everything. No circular dependencies.

---

## Design Decisions

| Decision | Rationale |
| --- | --- |
| Flat grid array over 2D array | Simpler iteration for effects; cache-friendly |
| In-place cell mutation | Avoids allocation per frame; effects write directly |
| Hardcoded effect pool (v0.1) | Ships working effects fast; plugin API comes next |
| Presets as plain objects | JSON-serializable; no class instantiation required |
| Event bus over callbacks | Multiple listeners; clean unsubscribe; typed events |
| Canvas 2D first | Universal browser support; GPU comes after API stabilizes |
| No framework dependency | Maximum portability across React, Vue, vanilla, Node |
