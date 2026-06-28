# API Reference

Public API for ASCII Visual Engine v0.3.0.

All symbols listed here are exported from the package entry point:

```typescript
import { AsciiEngine, /* ... */ } from 'ascii-visual-engine';
```

---

## AsciiEngine

Primary entry point. Manages lifecycle, presets, controls, plugins, rendering, and events.

### Constructor

```typescript
new AsciiEngine(options: AsciiEngineOptions)
```

#### AsciiEngineOptions

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | *required* | Target canvas element |
| `preset` | `AsciiPreset` | built-in default | Initial visual preset |
| `width` | `number` | `window.innerWidth` | Canvas width in pixels |
| `height` | `number` | `window.innerHeight` | Canvas height in pixels |
| `autoStart` | `boolean` | `true` | Start animation loop on construction |

### Methods

#### `start(): void`

Starts the animation loop. No-op if already running or destroyed. Emits `start` event.

#### `stop(): void`

Stops the animation loop. Preserves engine state. Emits `stop` event.

#### `destroy(): void`

Permanently tears down the engine. Stops loop, resets effects, clears renderer and event listeners. Cannot be restarted.

#### `setPreset(preset: AsciiPreset): void`

Switches active preset. Enables plugins from preset configuration. Emits `preset` event.

#### `registerPlugin(plugin: Plugin): void`

Registers a plugin with the engine. Calls `plugin.initialize(engine)`.

#### `unregisterPlugin(id: string): void`

Removes and destroys a plugin.

#### `enablePlugin(id: string): void`

Enables a registered plugin. Emits `plugin` event.

#### `disablePlugin(id: string): void`

Disables a plugin without removing it. Emits `plugin` event.

#### `getPlugin(id: string): Plugin | undefined`

Returns a registered plugin by id.

#### `getEnabledPlugins(): Plugin[]`

Returns all currently enabled plugins.

#### `getPluginManager(): PluginManager`

Returns the internal plugin manager for advanced use.

#### `registerPattern(pattern: Pattern): void` *(deprecated)*

Wraps pattern in `PatternPlugin` and calls `registerPlugin`.

#### `enablePattern(id: PatternId): void` *(deprecated)*

Calls `enablePlugin`. Maps legacy `wave` → `wavePattern`.

#### `disablePattern(id: PatternId): void` *(deprecated)*

Calls `disablePlugin`.

#### `setControl(name: string, value: number): void`

Sets a runtime control value by name. Known controls:

| Name | Effect |
| --- | --- |
| `density` | Rebuilds renderer grid at new density |
| `speed` | Animation speed multiplier |
| `trailAmount` | Frame fade strength (0–1) |
| `glitchAmount` | Random corruption intensity (0–1) |

Emits `control` event with `{ name, value }`.

#### `getControl(name: string, fallback?: number): number`

Returns current control value. Falls back to provided default or `0`.

#### `noteOn(event?: NoteEvent): void`

Triggers a visual burst and forwards to effect `onNoteOn` handlers. Emits `noteOn` event.

#### `noteOff(event?: NoteEvent): void`

Releases a note. Forwards to effect `onNoteOff` handlers. Emits `noteOff` event. Reserved for future sustained effects.

#### `emit(event: EngineEventPayload): void`

Emits a custom application event. Delivered to `custom` event listeners.

#### `resize(width: number, height: number): void`

Resizes canvas and rebuilds character grid. Emits `resize` event.

#### `getPreset(): AsciiPreset`

Returns the currently active preset object.

### Event methods

#### `on<K>(event: K, listener: (payload: EngineEventMap[K]) => void): () => void`

Subscribe to a typed event. Returns an unsubscribe function.

#### `off<K>(event: K, listener: (payload: EngineEventMap[K]) => void): void`

Remove a specific event listener.

### Events

| Event | Payload type | Description |
| --- | --- | --- |
| `start` | `void` | Engine started |
| `stop` | `void` | Engine stopped |
| `preset` | `AsciiPreset` | Preset changed |
| `control` | `{ name: string; value: number }` | Control updated |
| `noteOn` | `NoteEvent` | Note triggered |
| `noteOff` | `NoteEvent` | Note released |
| `resize` | `{ width: number; height: number }` | Canvas resized |
| `frame` | `{ time: number; fps: number }` | Emitted once per second |
| `custom` | `EngineEventPayload` | Custom application event |

---

## CanvasAsciiRenderer

Low-level canvas renderer. Most applications should use `AsciiEngine` directly.

### Constructor

```typescript
new CanvasAsciiRenderer(options: RendererOptions)
```

#### RendererOptions

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | *required* | Target canvas |
| `width` | `number` | *required* | Width in pixels |
| `height` | `number` | *required* | Height in pixels |
| `density` | `number` | *required* | Grid density multiplier |
| `glyphSet` | `string[]` | *required* | Available characters |
| `fontFamily` | `string` | `'monospace'` | CSS font family |
| `color` | `string` | `'#00ff88'` | Glyph color (hex) |
| `backgroundColor` | `string` | `'#000000'` | Background color (hex) |

### Methods

| Method | Description |
| --- | --- |
| `render(trailAmount?: number)` | Clear (with optional trail fade) and draw all cells |
| `clear(trailAmount?: number)` | Clear canvas or apply trail fade |
| `resize(width, height)` | Resize canvas and rebuild grid |
| `setDensity(density)` | Change density and rebuild grid |
| `setGlyphSet(glyphSet)` | Update character set |
| `setColor(color)` | Set glyph color |
| `setBackgroundColor(color)` | Set background color |
| `getGridState(time)` | Return current `GridState` for effect processing |
| `getDimensions()` | Return `{ cols, rows, cellWidth, cellHeight }` |
| `destroy()` | Clear grid and canvas |

---

## EventBus

Standalone typed pub/sub utility. Used internally by `AsciiEngine` but also exported for custom integrations.

### Methods

| Method | Description |
| --- | --- |
| `on(event, listener)` | Subscribe. Returns unsubscribe function. |
| `off(event, listener)` | Remove a listener. |
| `emit(event, payload)` | Dispatch to all listeners. |
| `clear()` | Remove all listeners. |

---

## Effect (interface)

Contract for visual effect modules. Built-in effects implement this interface.

```typescript
interface Effect {
  readonly type: EffectType;
  update(ctx: EffectContext): void;
  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
  reset?(): void;
}
```

### Built-in implementations

| Class | `type` | Description |
| --- | --- | --- |
| `NoiseField` | `'noise'` | Organic sine-product glyph animation |
| `WaveField` | `'wave'` | Sine wave glyph patterns |
| `GlyphBurst` | `'burst'` | Radial burst on `noteOn` |
| `Glitch` | `'glitch'` | Random glyph corruption |
| `Trails` | `'trails'` | Burst decay and frame fade |

### EffectContext

Passed to `update()` each frame:

| Field | Type | Description |
| --- | --- | --- |
| `grid` | `GridState` | Mutable grid state |
| `glyphSet` | `string[]` | Active character set |
| `speed` | `number` | Speed multiplier |
| `glitchAmount` | `number` | Glitch intensity (0–1) |
| `trailAmount` | `number` | Trail fade strength (0–1) |
| `dt` | `number` | Delta time in seconds |
| `time` | `number` | Total elapsed time in seconds |

---

## Preset utilities

### Built-in presets

```typescript
import {
  basicPreset,
  terminalPreset,
  organicPreset,
  presets,
  getPreset,
  listPresets,
} from 'ascii-visual-engine';
```

| Export | Description |
| --- | --- |
| `basicPreset` | Wave motion, classic ASCII glyphs |
| `terminalPreset` | Noise motion, hex digit glyphs |
| `organicPreset` | Noise motion, soft dot glyphs |
| `presets` | `{ basic, terminal, organic }` map |
| `getPreset(id)` | Get preset by id |
| `listPresets()` | Array of all built-in presets |

---

## Types

### NoteEvent

```typescript
interface NoteEvent {
  id?: string | number;
  x?: number;        // normalized 0–1, default random
  y?: number;        // normalized 0–1, default random
  intensity?: number; // default 1
  data?: Record<string, unknown>;
}
```

### EngineEventPayload

```typescript
interface EngineEventPayload {
  type: string;
  data?: unknown;
}
```

### AsciiPreset

See [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) for the complete format.

### GridCell

```typescript
interface GridCell {
  char: string;
  baseChar: string;
  x: number;
  y: number;
  phase: number;
  brightness: number;
  burst: number;
}
```

### GridState

```typescript
interface GridState {
  cells: GridCell[];
  cols: number;
  rows: number;
  time: number;
  width: number;
  height: number;
}
```

### ControlDef

```typescript
interface ControlDef {
  name: string;
  label?: string;
  min: number;
  max: number;
  default: number;
  step?: number;
}
```

---

## PluginManager

Central registry for all plugins.

| Method | Description |
| --- | --- |
| `register(plugin)` | Add plugin, call initialize |
| `unregister(id)` | Remove and destroy plugin |
| `enable(id)` / `disable(id)` | Toggle plugin enabled state |
| `get(id)` | Lookup by id |
| `getAll()` | All registered plugins |
| `getByType(type)` | Filter by plugin type |
| `getEnabled()` | All enabled plugins |
| `setEnabledIds(ids)` | Enable only listed ids |
| `runMotionEffects(ctx)` | Motion-phase effect plugins |
| `applyPatterns(ctx)` | Composite pattern plugins |
| `runPostEffects(ctx)` | Post-phase effect plugins |
| `destroy()` | Destroy all plugins |

See [PLUGIN_API.md](./PLUGIN_API.md) for building custom plugins.

---

## MotionManager

Procedural motion engine — independent from rendering and effects. See [MOTION_SYSTEM.md](./MOTION_SYSTEM.md).

| Method | Description |
| --- | --- |
| `registerMotion(motion)` | Register a motion behavior |
| `unregisterMotion(id)` | Remove and destroy motion |
| `enableMotion(id)` / `disableMotion(id)` | Toggle motion |
| `getMotion(id)` | Lookup by id |
| `getAll()` / `getEnabled()` | List motions |
| `setMotionWeight(id, weight)` | Set blend weight |
| `setMotionPriority(id, priority)` | Set blend priority |
| `setEnabledIds(configs)` | Enable motions from preset config |
| `combineMotions(context)` | Run and blend all enabled motions |
| `getDebugState()` | Frame time, velocities, active motions |
| `destroy()` | Destroy all motions |

### AsciiEngine motion API

| Method | Description |
| --- | --- |
| `registerMotion(motion)` | Register custom motion |
| `enableMotion(id)` / `disableMotion(id)` | Toggle motion |
| `getMotion(id)` | Get motion instance |
| `getEnabledMotions()` | List enabled motions |
| `setMotionWeight(id, weight)` | Adjust blend weight |
| `getMotionManager()` | Direct manager access |

---

## PatternRegistry *(legacy)*

Still exported. Engine uses `PluginManager` internally.

## Pattern (interface)

```typescript
interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: PatternSampleContext): void;
  sample(x: number, y: number, context: PatternSampleContext): number;
  destroy(): void;
}
```

### Built-in patterns

| Class | Id |
| --- | --- |
| `RadialSymmetryPattern` | `radialSymmetry` |
| `SpiralPattern` | `spiral` |
| `WavePattern` | `wave` (plugin id: `wavePattern`) |
| `GridPattern` | `grid` |
| `CellularPattern` | `cellular` |
| `ScanlinePattern` | `scanline` |

---

## Future APIs

### AsciiRenderer interface *(planned)*

```typescript
engine.setRenderer(renderer: AsciiRenderer): void;
```

### PresetLoader *(planned v0.3)*

```typescript
loadPreset(url: string): Promise<AsciiPreset>;
validatePreset(preset: unknown): AsciiPreset;
interpolatePresets(a: AsciiPreset, b: AsciiPreset, t: number): AsciiPreset;
```

### InputAdapter *(planned v0.3)*

```typescript
engine.connectInput(adapter: InputAdapter): void;
engine.disconnectInput(adapter: InputAdapter): void;
```

### useAsciiEngine *(planned v0.4)*

```typescript
function useAsciiEngine(options: AsciiEngineOptions): {
  engine: AsciiEngine;
  preset: AsciiPreset;
  setControl: (name: string, value: number) => void;
};
```

### AudioMapper *(planned v0.3)*

```typescript
createAudioMapper(analyser: AnalyserNode): AudioMapper;
mapper.bindControl(controlName: string, bin: number): void;
mapper.bindNote(frequency: number, threshold: number): void;
```

See [ROADMAP.md](./ROADMAP.md) for implementation timeline.
