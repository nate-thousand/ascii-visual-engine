# Preset Schema

Complete specification for ASCII Visual Engine preset objects.

Presets are plain, JSON-serializable objects that define the visual appearance and behavior of an ASCII animation. They contain no logic — the engine interprets the schema at runtime.

---

## Type Definition

```typescript
interface AsciiPreset {
  id: string;
  name: string;
  glyphSet: string[];
  motionField: MotionFieldType;
  plugins: PluginConfig[];
  /** @deprecated Use `plugins` array */
  effects?: EffectConfig[];
  /** @deprecated Use `plugins` array */
  patterns?: PatternId[];
  controls: ControlDef[];
  density: number;
  speed: number;
  trailAmount: number;
  glitchAmount: number;
  symmetry?: number;
  petals?: number;
  spiralAmount?: number;
  cellularAmount?: number;
  scanlineAmount?: number;
}

type PatternId =
  | 'radialSymmetry'
  | 'spiral'
  | 'wave'
  | 'grid'
  | 'cellular'
  | 'scanline';
```

---

## Field Reference

### `id`

| | |
| --- | --- |
| **Type** | `string` |
| **Required** | Yes |
| **Description** | Unique identifier for the preset. Used for selection, persistence, and URL routing. |
| **Constraints** | Lowercase alphanumeric and hyphens. No spaces. |
| **Example** | `"terminal"` |

---

### `name`

| | |
| --- | --- |
| **Type** | `string` |
| **Required** | Yes |
| **Description** | Human-readable display name shown in UI selectors and debug output. |
| **Example** | `"Terminal"` |

---

### `glyphSet`

| | |
| --- | --- |
| **Type** | `string[]` |
| **Required** | Yes |
| **Description** | Ordered array of characters used to render the grid. Order affects animation — earlier characters appear in lower-intensity regions. Motion fields index into this array. |
| **Constraints** | Minimum 1 character. Each entry is a single Unicode character. |
| **Example** | `[".", ":", "-", "=", "+", "*", "#", "@"]` |

---

### `motionField`

| | |
| --- | --- |
| **Type** | `'noise' \| 'wave' \| 'none'` |
| **Required** | Yes |
| **Description** | Primary motion algorithm that drives glyph selection across the grid. |

| Value | Effect class | Behavior |
| --- | --- | --- |
| `'noise'` | `NoiseField` | Organic, flowing movement using sine-product noise |
| `'wave'` | `WaveField` | Smooth sine wave patterns across the grid |
| `'none'` | — | Static base glyphs, no motion field active |

The corresponding effect must also be listed in `effects` with `enabled: true`.

---

### `effects`

| | |
| --- | --- |
| **Type** | `EffectConfig[]` |
| **Required** | Yes |
| **Description** | Array of effect configurations. Defines which visual effects are active and their parameters. |

#### EffectConfig

```typescript
interface EffectConfig {
  type: EffectType;
  enabled?: boolean;  // default: true
  params?: Record<string, number>;
}
```

#### EffectType values

| Type | Class | Role |
| --- | --- | --- |
| `'noise'` | `NoiseField` | Motion field — organic movement |
| `'wave'` | `WaveField` | Motion field — sine wave movement |
| `'burst'` | `GlyphBurst` | Radial burst on `noteOn` events |
| `'glitch'` | `Glitch` | Random glyph corruption |
| `'trails'` | `Trails` | Frame fade for motion persistence |

**Pipeline order:** Motion field → Burst → Glitch → Trails.

**Note:** Only one motion field (`noise` or `wave`) should be active, matching the `motionField` value. The `params` field is reserved for future per-effect configuration and is not yet consumed by the engine.

---

### `plugins`

| | |
| --- | --- |
| **Type** | `PluginConfig[]` |
| **Required** | Yes |
| **Description** | Declarative list of plugins to enable when the preset loads. |

```typescript
interface PluginConfig {
  id: string;
  type: 'pattern' | 'effect' | 'input' | 'renderer' | 'utility';
  enabled?: boolean;  // default: true
  options?: Record<string, unknown>;
}
```

Example:

```json
"plugins": [
  { "id": "radialSymmetry", "type": "pattern", "options": {} },
  { "id": "trails", "type": "effect", "options": {} },
  { "id": "glitch", "type": "effect" }
]
```

Legacy `effects` and `patterns` arrays are still supported and automatically migrated when `plugins` is omitted.

---

### `patterns` (deprecated)

Use `plugins` with `type: "pattern"` instead. Still supported for backward compatibility.

---

### `effects` (deprecated)

Use `plugins` with `type: "effect"` instead. Still supported for backward compatibility.

---

| | |
| --- | --- |
| **Type** | `PatternId[]` |
| **Required** | Yes (may be empty array) |
| **Description** | Procedural patterns enabled when the preset loads. Patterns shape glyph brightness and character selection. |

| Pattern id | Class | Visual character |
| --- | --- | --- |
| `'radialSymmetry'` | `RadialSymmetryPattern` | Flowers, mandalas, blooms |
| `'spiral'` | `SpiralPattern` | Growth, orbiting, hypnotic motion |
| `'wave'` | `WavePattern` | Ambient flowing motion |
| `'grid'` | `GridPattern` | Structured lattice |
| `'cellular'` | `CellularPattern` | Organic decay, mold, crawling texture |
| `'scanline'` | `ScanlinePattern` | Terminal, broadcast, CRT scanlines |

Example:

```json
"patterns": ["radialSymmetry", "cellular"]
```

**Pipeline order:** Motion field → Patterns → Burst → Glitch → Trails.

---

### Pattern control defaults

Optional top-level fields set initial pattern control values:

| Field | Type | Range | Description |
| --- | --- | --- | --- |
| `symmetry` | `number` | 2–12 | Radial fold count |
| `petals` | `number` | 3–12 | Petal count for radial forms |
| `spiralAmount` | `number` | 0–1 | Spiral pattern intensity |
| `cellularAmount` | `number` | 0–1 | Cellular/decay intensity |
| `scanlineAmount` | `number` | 0–1 | Scanline/broadcast intensity |

---

### `controls`

| | |
| --- | --- |
| **Type** | `ControlDef[]` |
| **Required** | Yes (may be empty array) |
| **Description** | UI control metadata for building sliders, knobs, or automation. Defines range, defaults, and labels. |

#### ControlDef

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

#### Standard controls

These four controls are recognized by the engine:

| Name | Description | Typical range |
| --- | --- | --- |
| `density` | Grid cell density multiplier | 0.3 – 2.0 |
| `speed` | Animation speed multiplier | 0.1 – 3.0 |
| `trailAmount` | Motion trail fade strength | 0.0 – 1.0 |
| `glitchAmount` | Random corruption intensity | 0.0 – 1.0 |

Custom control names are allowed but require application-level handling until plugin control binding is implemented.

---

### `density`

| | |
| --- | --- |
| **Type** | `number` |
| **Required** | Yes |
| **Description** | Initial grid density. Higher values produce more columns and smaller characters. Changing this at runtime via `setControl('density', value)` rebuilds the grid. |
| **Range** | 0.3 – 2.0 recommended |
| **Example** | `1.0` |

---

### `speed`

| | |
| --- | --- |
| **Type** | `number` |
| **Required** | Yes |
| **Description** | Initial animation speed multiplier. Affects all time-based motion in effects. |
| **Range** | 0.1 – 3.0 recommended |
| **Example** | `1.0` |

---

### `trailAmount`

| | |
| --- | --- |
| **Type** | `number` |
| **Required** | Yes |
| **Description** | Initial trail fade strength. At 0, each frame fully clears the canvas. At 1, maximum persistence creates long motion trails. |
| **Range** | 0.0 – 1.0 |
| **Example** | `0.35` |

---

### `glitchAmount`

| | |
| --- | --- |
| **Type** | `number` |
| **Required** | Yes |
| **Description** | Initial glitch corruption intensity. At 0, no random glyph corruption. Higher values increase the probability and frequency of character substitution. |
| **Range** | 0.0 – 1.0 |
| **Example** | `0.15` |

---

## Validation Rules

When preset validation is implemented (planned v0.2), the following rules will be enforced:

| Rule | Error |
| --- | --- |
| `id` is non-empty string | `"Preset id is required"` |
| `glyphSet` has at least one character | `"Glyph set must not be empty"` |
| `motionField` matches an enabled motion effect | `"Motion field 'wave' requires enabled wave effect"` |
| Control defaults are within min/max | `"Control 'speed' default 5.0 exceeds max 3.0"` |
| Top-level defaults match control defaults | Warning, not error |
| No duplicate effect types | Warning, last wins |

---

## Example: Organic

Soft, flowing dot characters with gentle noise motion and long trails. No glitch.

```json
{
  "id": "organic",
  "name": "Organic",
  "glyphSet": ["·", "°", "○", "●", "◦", "∘", "∙", "◉"],
  "motionField": "noise",
  "effects": [
    { "type": "noise", "enabled": true },
    { "type": "burst", "enabled": true },
    { "type": "glitch", "enabled": false },
    { "type": "trails", "enabled": true }
  ],
  "patterns": ["radialSymmetry", "cellular"],
  "controls": [
    { "name": "density", "label": "Density", "min": 0.3, "max": 2, "default": 0.9, "step": 0.1 },
    { "name": "speed", "label": "Speed", "min": 0.1, "max": 3, "default": 0.5, "step": 0.1 },
    { "name": "trailAmount", "label": "Trails", "min": 0, "max": 1, "default": 0.7, "step": 0.05 },
    { "name": "glitchAmount", "label": "Glitch", "min": 0, "max": 1, "default": 0, "step": 0.05 }
  ],
  "density": 0.9,
  "speed": 0.5,
  "trailAmount": 0.7,
  "glitchAmount": 0,
  "symmetry": 8,
  "petals": 7,
  "spiralAmount": 0.25,
  "cellularAmount": 0.65,
  "scanlineAmount": 0
}
```

**Character:** Calm, meditative, particle-like. Best for ambient installations and background visuals.

---

## Example: Terminal

Hex digit glyphs with noise motion, moderate glitch, and medium trails. Evokes retro computing aesthetics.

```json
{
  "id": "terminal",
  "name": "Terminal",
  "glyphSet": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "F"],
  "motionField": "noise",
  "effects": [
    { "type": "noise", "enabled": true },
    { "type": "burst", "enabled": true },
    { "type": "glitch", "enabled": true },
    { "type": "trails", "enabled": true }
  ],
  "patterns": ["scanline", "grid"],
  "controls": [
    { "name": "density", "label": "Density", "min": 0.3, "max": 2, "default": 1.2, "step": 0.1 },
    { "name": "speed", "label": "Speed", "min": 0.1, "max": 3, "default": 0.8, "step": 0.1 },
    { "name": "trailAmount", "label": "Trails", "min": 0, "max": 1, "default": 0.5, "step": 0.05 },
    { "name": "glitchAmount", "label": "Glitch", "min": 0, "max": 1, "default": 0.25, "step": 0.05 }
  ],
  "density": 1.2,
  "speed": 0.8,
  "trailAmount": 0.5,
  "glitchAmount": 0.25,
  "symmetry": 4,
  "petals": 4,
  "spiralAmount": 0.2,
  "cellularAmount": 0.15,
  "scanlineAmount": 0.75
}
```

**Character:** Data-stream, matrix-like, technical. Best for hacker aesthetics, data visualizations, and synth interfaces.

---

## Example: Abstract

Geometric symbols with wave motion, heavy glitch, and short trails. Designed for high-energy performances.

```json
{
  "id": "abstract",
  "name": "Abstract",
  "glyphSet": ["/", "\\", "|", "-", "+", "×", "÷", "≡", "∞", "∆", "∇", "◊"],
  "motionField": "wave",
  "effects": [
    { "type": "wave", "enabled": true },
    { "type": "burst", "enabled": true },
    { "type": "glitch", "enabled": true },
    { "type": "trails", "enabled": true }
  ],
  "patterns": ["spiral", "wave"],
  "controls": [
    { "name": "density", "label": "Density", "min": 0.3, "max": 2, "default": 1.4, "step": 0.1 },
    { "name": "speed", "label": "Speed", "min": 0.1, "max": 3, "default": 1.8, "step": 0.1 },
    { "name": "trailAmount", "label": "Trails", "min": 0, "max": 1, "default": 0.2, "step": 0.05 },
    { "name": "glitchAmount", "label": "Glitch", "min": 0, "max": 1, "default": 0.45, "step": 0.05 }
  ],
  "density": 1.4,
  "speed": 1.8,
  "trailAmount": 0.2,
  "glitchAmount": 0.45,
  "symmetry": 6,
  "petals": 6,
  "spiralAmount": 0.8,
  "cellularAmount": 0.1,
  "scanlineAmount": 0.3
}
```

**Character:** Aggressive, rhythmic, geometric. Best for live performances, VJ sets, and interactive bursts.

> **Note:** The `abstract` preset is a schema example. It is not included in the built-in preset library. Copy this JSON to create your own preset file.

---

## Usage

### TypeScript

```typescript
import { AsciiEngine } from 'ascii-visual-engine';
import abstractPreset from './presets/abstract.json';

const engine = new AsciiEngine({
  canvas,
  preset: abstractPreset,
});
```

### Runtime switching

```typescript
import { terminalPreset, organicPreset } from 'ascii-visual-engine';

engine.setPreset(terminalPreset);

// Later...
engine.setPreset(organicPreset);
```

### Custom preset inline

```typescript
const myPreset: AsciiPreset = {
  id: 'custom',
  name: 'Custom',
  glyphSet: ['*', '+', '#'],
  motionField: 'wave',
  effects: [
    { type: 'wave', enabled: true },
    { type: 'burst', enabled: true },
    { type: 'trails', enabled: true },
  ],
  controls: [],
  density: 1,
  speed: 1,
  trailAmount: 0.4,
  glitchAmount: 0,
};

engine.setPreset(myPreset);
```

---

## Schema Evolution

Future schema versions may add optional fields:

| Field | Status | Description |
| --- | --- | --- |
| `version` | Planned | Schema version for migration |
| `colors` | Planned | Foreground/background/palette colors |
| `font` | Planned | Font family and sizing overrides |
| `layers` | Planned | Multi-layer compositing config |
| `input` | Planned | Input mapping configuration |
| `plugins` | Planned | Required plugin ids |

Existing presets without these fields will continue to work with sensible defaults.

See [ROADMAP.md](./ROADMAP.md) Milestone 06 for preset system progress.
