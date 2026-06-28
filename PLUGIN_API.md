# Plugin API

Guide for building custom plugins and effects for ASCII Visual Engine.

> **Version note:** v0.1.0 ships a hardcoded effect pipeline. The formal plugin registration API (`engine.registerPlugin`) is planned for v0.2.0. This document describes both the **current effect interface** you can study and extend today, and the **planned plugin architecture** you should target for forward compatibility.

---

## Overview

Plugins extend the engine with custom visual behavior. They can:

- Modify the character grid each frame
- React to `noteOn` / `noteOff` events
- Subscribe to engine events
- Expose custom controls via presets

Built-in effects (`NoiseField`, `WaveField`, `GlyphBurst`, `Glitch`, `Trails`) are reference implementations of the plugin pattern.

---

## Current: Effect Interface (v0.1.0)

Today, custom effects can be used by importing the `Effect` interface and integrating directly. Built-in effects are registered internally by the engine based on preset configuration.

### Interface

```typescript
interface Effect {
  readonly type: EffectType;
  update(ctx: EffectContext): void;
  onNoteOn?(event: NoteEvent): void;
  onNoteOff?(event: NoteEvent): void;
  reset?(): void;
}
```

### Lifecycle

```
Construction ──► update (every frame) ──► reset (on preset change) ──► GC
                      │
                      ├── onNoteOn (when note triggered)
                      └── onNoteOff (when note released)
```

| Hook | When called | Purpose |
| --- | --- | --- |
| `update(ctx)` | Every frame while engine is running | Modify grid cells, brightness, characters |
| `onNoteOn(event)` | `engine.noteOn()` called | Trigger burst, ripple, or sustained effect |
| `onNoteOff(event)` | `engine.noteOff()` called | End sustained effect |
| `reset()` | Preset change or engine destroy | Clear internal state |

### EffectContext

Your `update` method receives a shared context:

```typescript
interface EffectContext {
  grid: GridState;       // Read/write the cell array
  glyphSet: string[];    // Available characters from preset
  speed: number;         // Current speed control value
  glitchAmount: number;  // Current glitch control value
  trailAmount: number;   // Current trail control value
  dt: number;            // Seconds since last frame
  time: number;          // Total elapsed seconds
}
```

**Important:** Mutate `grid.cells` in place. Do not replace the array.

---

## Example: Custom Pulse Effect

A simple effect that creates a pulsing brightness wave from the center:

```typescript
import type { Effect, EffectContext } from 'ascii-visual-engine';

export class PulseEffect implements Effect {
  readonly type = 'pulse' as const;

  update(ctx: EffectContext): void {
    const { grid, time, speed } = ctx;
    const pulse = (Math.sin(time * speed * 2) + 1) * 0.5;

    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);
      const dist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
      cell.brightness = 0.3 + pulse * (1 - dist) * 0.7;
    }
  }
}
```

To use this today, you would fork the engine's effect pool in `AsciiEngine.rebuildEffects()`. After v0.2.0, registration will be:

```typescript
engine.registerPlugin(new PulseEffect());
```

---

## Example: Note-Triggered Ripple

An effect that creates expanding rings on `noteOn`:

```typescript
import type { Effect, EffectContext, NoteEvent } from 'ascii-visual-engine';

interface Ripple {
  x: number;
  y: number;
  age: number;
}

export class RippleEffect implements Effect {
  readonly type = 'ripple' as const;
  private ripples: Ripple[] = [];

  onNoteOn(event: NoteEvent): void {
    this.ripples.push({
      x: event.x ?? 0.5,
      y: event.y ?? 0.5,
      age: 0,
    });
  }

  update(ctx: EffectContext): void {
    const { grid, dt } = ctx;

    for (const ripple of this.ripples) {
      ripple.age += dt;
    }
    this.ripples = this.ripples.filter((r) => r.age < 2);

    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);

      for (const ripple of this.ripples) {
        const dx = nx - ripple.x;
        const dy = ny - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ring = Math.abs(dist - ripple.age * 0.3);
        const intensity = Math.max(0, 1 - ring * 10);
        cell.brightness = Math.max(cell.brightness, intensity);
      }
    }
  }

  reset(): void {
    this.ripples = [];
  }
}
```

---

## Planned: Plugin Interface (v0.2.0)

The full plugin system will extend the effect interface with metadata and lifecycle management:

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
  reset?(): void;
}
```

### Planned registration

```typescript
import { AsciiEngine } from 'ascii-visual-engine';
import { PulseEffect } from './PulseEffect';

const engine = new AsciiEngine({ canvas });

engine.registerPlugin({
  id: 'pulse',
  name: 'Pulse Effect',
  version: '1.0.0',
  init() { /* setup */ },
  update(ctx) { /* per frame */ },
  destroy() { /* cleanup */ },
});
```

### Planned plugin manager

```
registerPlugin(plugin)
     │
     ├── Validate id uniqueness
     ├── Call plugin.init(engine)
     ├── Insert into pipeline by priority
     └── Emit 'plugin:registered' event

unregisterPlugin(id)
     │
     ├── Call plugin.destroy()
     ├── Remove from pipeline
     └── Emit 'plugin:unregistered' event
```

---

## Events

Plugins can subscribe to engine events during `init`:

```typescript
init(engine: AsciiEngine): void {
  this.unsub = engine.on('control', ({ name, value }) => {
    if (name === 'speed') {
      this.speedMultiplier = value;
    }
  });
}

destroy(): void {
  this.unsub?.();
}
```

Available events: `start`, `stop`, `preset`, `control`, `noteOn`, `noteOff`, `resize`, `frame`, `custom`.

---

## Rendering

Plugins do not render directly. They modify `GridState` and the active renderer draws the result.

### What plugins can modify

| Cell property | Use case |
| --- | --- |
| `char` | Change displayed character |
| `brightness` | Control opacity/intensity |
| `burst` | Temporary highlight (auto-decayed by Trails) |

### What plugins should not modify

| Property | Reason |
| --- | --- |
| `x`, `y` | Grid topology is renderer-managed |
| `baseChar` | Reserved for preset glyph set |
| `phase` | Deterministic seed; modify `char` instead |

---

## Best Practices

### Performance

- Avoid allocating new objects inside `update()`. Reuse arrays and pre-allocate state in the constructor.
- Iterate `grid.cells` with a `for` loop, not `forEach` or `map`.
- Keep per-cell math simple. Complex effects should precompute lookup tables.
- Use `dt` for time-based animation, not frame counting.

### State management

- Always implement `reset()` to clear internal arrays and counters.
- Store burst/ripple/particle state in the plugin instance, not on grid cells.
- Use normalized coordinates (0–1) for spatial effects so they work at any grid size.

### Compatibility

- Do not assume a specific grid size. Always derive from `grid.cols` and `grid.rows`.
- Do not depend on effect execution order unless documented.
- Use `glyphSet` from context, not hardcoded character arrays.
- Target the `Effect` interface today; migrate to `Plugin` when v0.2.0 ships.

### Naming

- Plugin ids: lowercase kebab-case (`'pulse-effect'`, `'color-shift'`)
- Class names: PascalCase (`PulseEffect`, `ColorShift`)
- Effect type strings: lowercase single word matching the id

---

## Preset Integration

Reference your plugin in a preset's `effects` array:

```typescript
const myPreset: AsciiPreset = {
  id: 'pulse-demo',
  name: 'Pulse Demo',
  glyphSet: ['*', '+', '#'],
  motionField: 'wave',
  effects: [
    { type: 'wave', enabled: true },
    { type: 'pulse', enabled: true, params: { frequency: 2.0 } },
    { type: 'trails', enabled: true },
  ],
  controls: [],
  density: 1,
  speed: 1,
  trailAmount: 0.5,
  glitchAmount: 0,
};
```

> **Note:** Custom effect types require plugin registration. Built-in types (`noise`, `wave`, `burst`, `glitch`, `trails`) work out of the box.

---

## File Structure for Plugins

Recommended layout for a plugin package:

```
my-ascii-plugin/
├── src/
│   ├── PulseEffect.ts
│   ├── RippleEffect.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
// index.ts
export { PulseEffect } from './PulseEffect';
export { RippleEffect } from './RippleEffect';
```

---

## Reference Implementations

Study the built-in effects in `src/effects/`:

| File | Pattern demonstrated |
| --- | --- |
| `NoiseField.ts` | Motion field — per-cell glyph selection from noise |
| `WaveField.ts` | Motion field — sine-driven glyph animation |
| `GlyphBurst.ts` | Event-driven — burst on `noteOn` with spatial falloff |
| `Glitch.ts` | Stochastic — random corruption with intensity control |
| `Trails.ts` | Decay — gradual value reduction over time |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for pipeline ordering and [API.md](./API.md) for type definitions.
