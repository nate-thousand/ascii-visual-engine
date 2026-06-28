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
  motionField: 'none',
  plugins: [
    { id: 'noise', type: 'effect' },
    { id: 'trails', type: 'effect', options: {} },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern', options: {} },
  ],
  controls: [],
  density: 1,
  speed: 0.6,
  trailAmount: 0.7,
  glitchAmount: 0,
};
```

Legacy `effects` and `patterns` arrays are still supported and auto-migrated via `resolvePresetPlugins()`.

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
