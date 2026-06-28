# Motion System

Procedural motion layer for ASCII Visual Engine — independent from rendering, glyph selection, and post-effects.

---

## Overview

The motion system drives continuous animation by updating per-cell properties each frame:

- Position offset (`ox`, `oy`)
- Velocity (`vx`, `vy`)
- Scale, rotation, deformation
- Brightness and phase (for glyph selection)

Multiple motions can run simultaneously with weighted blending.

---

## Architecture

```
AsciiEngine tick
  ├── MotionManager.combineMotions()   ← motion plugins (new)
  ├── applyMotionGlyphs()              ← phase → char mapping
  ├── PluginManager.runMotionEffects() ← legacy (skipped when motions active)
  ├── PluginManager.applyPatterns()
  ├── PluginManager.runPostEffects()
  └── CanvasAsciiRenderer.render()     ← uses ox/oy offsets
```

Motion is **independent** from:
- **Rendering** — renderer reads motion output, does not compute it
- **Patterns** — patterns shape brightness/glyphs after motion
- **Post-effects** — glitch, burst, trails run after motion + patterns

---

## Motion Interface

```typescript
interface Motion {
  readonly id: string;
  readonly name: string;
  enabled: boolean;
  weight: number;
  priority: number;
  initialize(engine: AsciiEngine): void;
  update(deltaTime: number, context: MotionContext): void;
  destroy(): void;
}
```

Each motion writes to a reusable `scratch` buffer in `MotionContext`. `MotionManager` blends scratch buffers by weight and priority, then applies results to grid cells.

---

## MotionManager API

| Method | Description |
| --- | --- |
| `registerMotion(motion)` | Register a motion plugin |
| `unregisterMotion(id)` | Remove and destroy a motion |
| `enableMotion(id)` | Enable a registered motion |
| `disableMotion(id)` | Disable a motion |
| `getMotion(id)` | Get motion by id |
| `setMotionWeight(id, weight)` | Set blend weight |
| `setMotionPriority(id, priority)` | Set execution priority (lower runs first in blend) |
| `setEnabledIds(configs)` | Enable only listed motions with optional weight/priority |
| `combineMotions(context)` | Run all enabled motions and blend results |
| `getDebugState()` | Frame time, velocities, active motions |

---

## Built-in Motions

| ID | Name | Behavior |
| --- | --- | --- |
| `flowField` | Flow Field | Curl-noise vector field displacement |
| `organicGrowth` | Organic Growth | Radial expansion with tendrils |
| `orbital` | Orbital | Cells orbit around drifting center |
| `wave` | Wave | Sine wave vertical/horizontal displacement |
| `gravity` | Gravity | Downward acceleration with drag |
| `brownian` | Brownian Motion | Random walk jitter |
| `flocking` | Flocking | Neighbor-aligned collective movement |
| `wind` | Wind | Horizontal gusts with turbulence |
| `pulse` | Pulse | Radial ring pulses from center |
| `breathing` | Breathing | Scale/brightness inhale/exhale oscillation |
| `spiral` | Spiral | Archimedean spiral displacement |
| `curlNoise` | Curl Noise | Multi-scale curl noise field |

---

## Motion Controls

Exposed via `engine.setControl()` / preset fields:

| Control | Default | Description |
| --- | --- | --- |
| `speed` | 1 | Global time multiplier |
| `strength` | 0.7 | Motion intensity |
| `randomness` | 0.3 | Noise/jitter amount |
| `frequency` | 1 | Oscillation rate |
| `amplitude` | 1 | Displacement scale |
| `decay` | 0.1 | Brownian decay rate |
| `drag` | 0.05 | Velocity damping (gravity) |
| `gravity` | 0.5 | Downward pull strength |
| `noiseScale` | 1 | Noise field scale |
| `flowStrength` | 0.8 | Flow/wind field strength |
| `blendWeight` | 1 | Global motion blend multiplier |

---

## Preset Configuration

```typescript
{
  id: 'ambient',
  motions: [
    { id: 'flowField', weight: 0.6, priority: 10 },
    { id: 'breathing', weight: 0.8, priority: 18 },
    { id: 'wave', weight: 0.4, priority: 5 },
  ],
  strength: 0.5,
  flowStrength: 0.6,
  // ...
}
```

Legacy presets without `motions` array fall back to `motionField`:

- `wave` → enables `wave` motion
- `noise` → enables `curlNoise` + `brownian`

---

## Example Presets

| Preset | Motions | Character |
| --- | --- | --- |
| **Ambient** | flowField + breathing + wave | Calm, flowing |
| **Organic** | organicGrowth + breathing + flowField | Living, expanding |
| **Mechanical** | orbital + pulse + spiral | Structured, rhythmic |
| **Terminal** | wind + pulse + brownian | Scanline drift |
| **Chaotic** | brownian + curlNoise + flocking + gravity | Unpredictable |
| **Minimal** | wave only | Subtle oscillation |

---

## Performance

- Reusable `Float32Array` buffers — no per-frame allocations in blend loop
- Motions write to pre-allocated scratch buffer
- Single pass apply to grid cells after blending
- Gravity and Brownian reuse persistent velocity/offset arrays

---

## Engine API

```typescript
engine.registerMotion(customMotion);
engine.enableMotion('flowField');
engine.disableMotion('wave');
engine.setMotionWeight('breathing', 0.8);
engine.getEnabledMotions();
engine.getMotionManager().getDebugState();
```

---

## Debug Panel

The vanilla example includes a Motion Debug panel showing:

- Active motions with weights and priorities
- Frame time (ms)
- Average cell velocity
- Particle (cell) count
- FPS

---

## Custom Motion Example

```typescript
import type { Motion, MotionContext } from 'ascii-visual-engine';

class MyMotion implements Motion {
  readonly id = 'myMotion';
  readonly name = 'My Motion';
  enabled = true;
  weight = 1;
  priority = 50;

  initialize(_engine) {}
  destroy() {}

  update(_dt: number, ctx: MotionContext): void {
    const { scratch, grid } = ctx;
    for (let i = 0; i < grid.cells.length; i++) {
      scratch.brightness[i] = 0.5 + Math.sin(grid.cells[i].x * 0.1) * 0.5;
    }
  }
}

engine.registerMotion(new MyMotion());
engine.enableMotion('myMotion');
```
