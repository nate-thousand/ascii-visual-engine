# Plugin API

Guide for building custom plugins for ASCII Visual Engine.

---

## Overview

ASCII Visual Engine is plugin-driven. Patterns, effects, inputs, and renderers are all registered through a unified `PluginManager`. The engine orchestrates plugin lifecycle and frame execution — you add behavior by registering plugins, not by modifying engine internals.

### Plugin types

| Type | Purpose | Status |
| --- | --- | --- |
| `effect` | Modify the grid each frame (motion, glitch, trails, burst) | Implemented |
| `pattern` | Procedural forms sampled across the grid | Implemented |
| `input` | Route MIDI, keyboard, touch to engine events | Planned |
| `renderer` | Alternative rendering backends (WebGL, terminal) | Planned |
| `utility` | Helpers, analyzers, adapters | Planned |

---

## Plugin Interface

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  type: PluginType;
  enabled: boolean;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: PluginContext): void;
  destroy(): void;
}
```

### Lifecycle

```
register ──► initialize(engine) ──► [enabled] ──► update (each frame) ──► destroy
                                        │
                              enable / disable (live)
```

| Hook | When called | Purpose |
| --- | --- | --- |
| `initialize` | Plugin registered with engine | Subscribe to events, allocate state |
| `update` | Every frame while enabled | Modify grid or internal state |
| `destroy` | Unregister or engine destroy | Release resources |

### PluginContext

```typescript
interface PluginContext {
  engine: AsciiEngine;
  grid: GridState;
  glyphSet: string[];
  time: number;
  dt: number;
  speed: number;
  glitchAmount: number;
  trailAmount: number;
  getControl: (name: string, fallback?: number) => number;
}
```

---

## Engine API

```typescript
engine.registerPlugin(plugin);
engine.unregisterPlugin('myPlugin');
engine.enablePlugin('glitch');
engine.disablePlugin('glitch');
engine.getPlugin('glitch');
engine.getEnabledPlugins();
engine.getPluginManager();
engine.describePluginParams('spiral');
engine.getPluginParams('spiral');
engine.setPluginParams('spiral', { arms: 5 });
```

Events:

```typescript
engine.on('plugin', ({ id, type, enabled }) => {
  console.log(`Plugin ${id} (${type}) ${enabled ? 'enabled' : 'disabled'}`);
});
```

---

## Typed Plugin Wrappers

### EffectPlugin

Wraps an existing `Effect` implementation as a plugin.

```typescript
import { EffectPlugin, Glitch } from 'ascii-visual-engine';

const glitchPlugin = new EffectPlugin(new Glitch(), {
  id: 'glitch',
  name: 'Glitch',
  version: '1.0.0',
  phase: 'post',  // 'motion' | 'post'
});

engine.registerPlugin(glitchPlugin);
engine.enablePlugin('glitch');
```

**Phases:**
- `motion` — runs before patterns (NoiseField, WaveField)
- `post` — runs after patterns (GlyphBurst, Glitch, Trails)

### PatternPlugin

Wraps a `Pattern` implementation as a plugin.

```typescript
import { PatternPlugin, RadialSymmetryPattern } from 'ascii-visual-engine';

engine.registerPlugin(
  new PatternPlugin(new RadialSymmetryPattern(), { version: '1.0.0' }),
);
engine.enablePlugin('radialSymmetry');
```

Pattern plugins are composited during the pattern layer. Multiple enabled patterns are blended via weighted averaging.

### InputPlugin / RendererPlugin

Abstract base classes for future input and renderer plugins:

```typescript
import { InputPlugin, type PluginContext } from 'ascii-visual-engine';

class MidiInput extends InputPlugin {
  readonly id = 'midi';
  readonly name = 'MIDI Input';
  readonly version = '1.0.0';

  initialize(engine) { /* Web MIDI setup */ }
  update(_dt, _ctx) { /* poll input */ }
  destroy() { /* cleanup */ }
}
```

---

## Example: Custom Effect Plugin

```typescript
import {
  AsciiEngine,
  EffectPlugin,
  type Effect,
  type EffectContext,
} from 'ascii-visual-engine';

class PulseEffect implements Effect {
  readonly type = 'pulse' as const;

  update(ctx: EffectContext): void {
    const pulse = (Math.sin(ctx.time * ctx.speed * 2) + 1) * 0.5;
    for (const cell of ctx.grid.cells) {
      cell.brightness = 0.3 + pulse * 0.7;
    }
  }
}

const engine = new AsciiEngine({ canvas });
engine.registerPlugin(
  new EffectPlugin(new PulseEffect(), {
    id: 'pulse',
    name: 'Pulse',
    version: '1.0.0',
    phase: 'post',
  }),
);
engine.enablePlugin('pulse');
```

No engine source changes required.

---

## Example: Custom Pattern Plugin

```typescript
import {
  Pattern,
  PatternPlugin,
  PatternSampleContext,
  clamp01,
} from 'ascii-visual-engine';

class VinePattern implements Pattern {
  readonly id = 'vine' as const;
  readonly name = 'Vine';

  initialize() {}
  update() {}
  destroy() {}

  sample(x: number, y: number, ctx: PatternSampleContext): number {
    const vine = Math.sin(x * 20 + ctx.time) * Math.cos(y * 15 - ctx.time * 0.5);
    return clamp01((vine + 1) * 0.5);
  }
}

engine.registerPlugin(
  new PatternPlugin(new VinePattern(), { id: 'vine', version: '1.0.0' }),
);
engine.enablePlugin('vine');
```

---

## Preset Configuration

Presets declare plugins declaratively:

```typescript
const preset: AsciiPreset = {
  id: 'bloom',
  name: 'Bloom',
  glyphSet: ['·', '○', '●', '◉'],
  plugins: [
    { id: 'noise', type: 'effect' },
    { id: 'trails', type: 'effect', params: { decay: 0.08 } },
    { id: 'radialSymmetry', type: 'pattern', params: { ringFrequency: 20, bloom: 0.4 } },
    { id: 'cellular', type: 'pattern' },
  ],
  density: 1,
  speed: 0.6,
  trailAmount: 0.7,
  glitchAmount: 0,
};
```

Legacy `effects`, `patterns`, and `motionField` are part of the 0.2 flat shape, rejected since 0.5.0; `migratePreset()` folds them into `plugins` once.

### Params

A plugin can declare tunables beyond the shared controls. `params` on a plugin config sets them when the preset loads; every plugin's params return to their defaults on each `setPreset()`, so a preset that says nothing about a plugin gets stock behavior. Values are clamped to the declared range and unknown names are ignored, so a preset written for a newer plugin still loads.

Every built in pattern and effect declares params, with defaults equal to the constants they replaced:

| Plugin | Params |
| --- | --- |
| `spiral` | `arms` 3, `twist` 8, `orbit` 16 |
| `radialSymmetry` | `fold` 0.35, `petal` 0.35, `bloom` 0.2, `ring` 0.1 (mix weights), `ringFrequency` 12 |
| `cellular` | `scale` 6, `threshold` 0.42 |
| `scanline` | `spacing` 0.035, `lineWidth` 0.35, `staticAmount` 0.4 |
| `grid` | `cols` 10, `rows` 8, `lineWidth` 0.08 |
| `wavePattern` | `frequencyX` 4, `frequencyY` 3, `frequencyDiagonal` 5 |
| `glitch` | `rate` 0.28, `symbolShare` 0.5 |
| `noise` | `scaleX` 0.7, `scaleY` 0.5, `floor` 0.4 |
| `wave` | `scaleX` 0.3, `scaleY` 0.25, `floor` 0.3 |
| `burst` | `radius` 0.5, `spread` 2.5, `life` 0.9, `gain` 1.4 |
| `trails` | `decay` 0.15, `fade` 0.86 |

Runtime: `engine.describePluginParams(id)` returns the definitions (`{ name, label, min, max, default, step }`, the `ControlDef` shape), `engine.getPluginParams(id)` the values, `engine.setPluginParams(id, { name: value })` sets some of them and emits `plugin`. `exportPreset()` writes only the params that differ from their defaults.

Third party plugins opt in by implementing `Parameterized` (`describeParams`, `getParams`, `setParams`, `resetParams`); `ParamStore` does the bookkeeping:

```typescript
import { ParamStore, type ParamDef, type Parameterized } from 'ascii-visual-engine';

class Ripple implements Pattern, Parameterized {
  readonly params = new ParamStore<'rings' | 'speed'>([
    { name: 'rings', min: 1, max: 20, default: 6, step: 1 },
    { name: 'speed', min: 0, max: 4, default: 1, step: 0.1 },
  ]);
  describeParams(): ParamDef[] { return this.params.describeParams(); }
  getParams() { return this.params.getParams(); }
  setParams(p: Record<string, number>) { this.params.setParams(p); }
  resetParams() { this.params.resetParams(); }
  sample(x: number, y: number, ctx: PatternSampleContext) {
    return Math.sin(Math.hypot(x - 0.5, y - 0.5) * this.params.get('rings') * Math.PI - ctx.time * this.params.get('speed')) * 0.5 + 0.5;
  }
  // ...
}
```

`PatternPlugin` and `EffectPlugin` forward the four methods to the wrapped pattern or effect.

---

## PluginManager

Low-level access for advanced use:

```typescript
const manager = engine.getPluginManager();

manager.register(plugin);
manager.getByType('effect');
manager.getByType('pattern');
manager.runMotionEffects(context);
manager.applyPatterns(context);
manager.runPostEffects(context);
manager.dispatchNoteOn(event);
```

---

## Built-in Plugins

| Id | Type | Phase | Description |
| --- | --- | --- | --- |
| `noise` | effect | motion | Organic noise motion field |
| `wave` | effect | motion | Sine wave motion field |
| `burst` | effect | post | Radial burst on noteOn |
| `glitch` | effect | post | Random glyph corruption |
| `trails` | effect | post | Motion trail fade |
| `radialSymmetry` | pattern | — | Flowers, mandalas, blooms |
| `spiral` | pattern | — | Orbiting spiral motion |
| `wavePattern` | pattern | — | Ambient flowing waves |
| `grid` | pattern | — | Structured lattice |
| `cellular` | pattern | — | Organic decay texture |
| `scanline` | pattern | — | CRT/broadcast scanlines |

> **Note:** The wave motion effect uses id `wave`. The wave pattern uses id `wavePattern` to avoid id conflicts.

---

## Best Practices

1. **Use typed wrappers** — `EffectPlugin` and `PatternPlugin` rather than implementing `Plugin` from scratch unless necessary.
2. **Unique ids** — Plugin ids must be unique across all types.
3. **No allocation in update** — Reuse state allocated in `initialize`.
4. **Use getControl** — Read runtime parameters from context, not hardcoded values.
5. **Implement destroy** — Clean up listeners and state.
6. **Choose the right phase** — Motion effects before patterns; post effects after.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for frame pipeline ordering and [PRESET_SCHEMA.md](./PRESET_SCHEMA.md) for preset plugin configuration.
