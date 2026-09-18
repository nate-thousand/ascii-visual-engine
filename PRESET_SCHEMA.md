# Preset Schema

A preset is a plain JSON serializable object that describes a look. The engine interprets it at runtime; it carries no code. This is the 0.3 nested shape. The 0.2 flat shape is still accepted everywhere and normalized on load (see the end of this document); it is deprecated at 1.0. The flat reference is kept at `docs/PRESET_SCHEMA-0.2-flat.md`.

## Shape

```typescript
interface AsciiPreset {
  id: string;
  name: string;
  glyphSet: string[];

  plugins?: PluginConfig[];        // effects and patterns to enable
  controls?: ControlDef[];         // slider metadata; derived from the composition when absent

  density?: number;                // default 1
  speed?: number;                  // default 1
  trailAmount?: number;            // default 0.3
  glitchAmount?: number;           // default 0.1

  motion?: {
    field?: 'noise' | 'wave' | 'none';   // legacy field; ignored when behaviors are listed
    behaviors?: MotionConfig[];          // { id, weight?, priority?, enabled? }
    strength?, randomness?, frequency?, amplitude?, decay?, drag?, gravity?, noiseScale?, flowStrength?: number;
  };
  pattern?: { symmetry?, petals?, spiralAmount?, cellularAmount?, scanlineAmount?: number };
  simulation?: {
    behaviors?: SimulationConfig[];      // { id, enabled? }
    simStrength?, simSpeed?, simDensity?, simDecay?, simSpawnRate?: number;
  };
  post?: {
    passes?: PostProcessingPresetConfig[];   // { id, enabled?, amount? }
    postFeedback?, postSmear?, postDisplacement?, postThreshold?, postInvert?,
    postEdge?, postPosterize?, postScanline?, postDither?: number;
  };
  audio?: {
    mapping?: AudioMappingPresetConfig;
    audioAttack?, audioRelease?, audioSensitivity?, audioNoiseGate?, audioMinThreshold?, audioMaxClamp?: number;
  };
  input?: InputMappingPresetConfig;
  glyphs?: {
    language?: string | string[];
    categories?: GlyphCategoryId[];
    rules?: GlyphRuleConfig[];
    morphing?: GlyphMorphConfig;
    animation?: GlyphAnimationConfig;
  };
  layers?: LayerPresetConfig[];
  source?: SourcePresetConfig;
}
```

Three rules make the shape predictable:

1. **Every group is optional.** `{ id, name, glyphSet }` is a valid preset: a static grid with the engine defaults.
2. **A numeric field inside a group is the default for the control of the same name.** `motion.strength: 0.5` means `getControl('strength')` starts at 0.5. The control names are the same flat identifiers hosts pass to `setControl()`; the group only says where the default lives. `CONTROL_GROUP` in the package maps every control name to its group.
3. **Composition lists live next to their defaults.** `motion.behaviors`, `simulation.behaviors`, `post.passes`, `audio.mapping`, `layers`, and `plugins` decide what runs; the numbers beside them tune it.

## Fields

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Non empty. Used for selection, `?preset=` in the harness, and warnings |
| `name` | yes | Display name |
| `glyphSet` | yes | Ordered characters from dark to bright. Ignored for character choice when `glyphs.language` or `glyphs.categories` is set, still required |
| `plugins` | no | `{ id, type: 'effect' \| 'pattern', enabled? }`. Effects: `noise wave burst glitch trails`. Patterns: `radialSymmetry spiral wavePattern grid cellular scanline` |
| `controls` | no | `{ name, label?, min, max, default, step? }`. When absent, derived from what the composition reads (see `listLiveControls()`). A declared entry keeps its range and label; its `default` follows the preset's own value for that control |
| `density` `speed` `trailAmount` `glitchAmount` | no | Base values every preset has. `trailAmount` only draws when the `trails` effect is enabled, `glitchAmount` when `glitch` is |
| `motion` | no | See MOTION_SYSTEM.md. `field` alone (no behaviors) maps to the legacy noise or wave behavior set |
| `pattern` | no | Knobs for the pattern plugins: `symmetry` and `petals` for `radialSymmetry`, `spiralAmount` for `spiral`, `cellularAmount` for `cellular`, `scanlineAmount` for `scanline` |
| `simulation` | no | See SIMULATION_ENGINE.md. `simSpawnRate` for particle and fluid, `simDensity` for cellular automata, `simDecay` for particle, spring, and cellular automata |
| `post` | no | See POST_PROCESSING.md. Each pass reads the `post*` control of its name |
| `audio` | no | See AUDIO_REACTIVITY.md. The `audio*` values tune the analyzer once audio is connected |
| `input` | no | See MIDI_AND_INPUT.md. `devicePreset` picks a CC layout; `ccMappings` overrides it |
| `glyphs` | no | See GLYPH_LANGUAGE.md. `language` turns on semantic glyph selection; `categories` alone builds a custom set |
| `layers` | no | See COMPOSITING.md |
| `source` | no | `{ type: 'image' \| 'video' \| 'webcam' \| 'canvas', options? }`. Sets a pixel source when the preset loads. Presets without it leave the active source alone |

## Validation

`AsciiEngine.setPreset()` and the constructor run `assertValidPreset()`, which normalizes, validates, and throws with every structural problem listed. Soft problems (a default outside its range, an unknown control name, the deprecated flat shape) warn once per preset id. `validatePreset(json)` does the same without throwing and returns `{ ok, errors, warnings, preset }`, where `preset` is the normalized nested object with `controls` filled in.

Structural errors: missing or mistyped `id`, `name`, `glyphSet`; `plugins` or `controls` not arrays; a plugin `type` outside `pattern effect input renderer utility`; a control with `min > max` or a non positive `step`; a base or group number that is not finite; `density` not greater than 0; `motion.field` outside `noise wave none`; a group that is not an object; a legacy `patterns` id that is not a known pattern.

## Examples

Minimal:

```json
{ "id": "dots", "name": "Dots", "glyphSet": [".", ":", "*"] }
```

A look with motion, a pattern, and tuned defaults:

```json
{
  "id": "bloom",
  "name": "Bloom",
  "glyphSet": [".", ":", "-", "=", "+", "*", "#", "@"],
  "plugins": [
    { "id": "burst", "type": "effect" },
    { "id": "trails", "type": "effect" },
    { "id": "radialSymmetry", "type": "pattern" }
  ],
  "speed": 0.6,
  "trailAmount": 0.45,
  "motion": {
    "behaviors": [{ "id": "organicGrowth", "weight": 0.7 }, { "id": "breathing", "weight": 0.3 }],
    "strength": 0.7,
    "frequency": 1.2
  },
  "pattern": { "symmetry": 8, "petals": 6 },
  "glyphs": { "language": "organicBloom" }
}
```

Audio reactive with a simulation and a post pass:

```json
{
  "id": "pulse",
  "name": "Pulse",
  "glyphSet": [" ", ".", ":", "=", "#"],
  "plugins": [{ "id": "glitch", "type": "effect" }, { "id": "trails", "type": "effect" }],
  "glitchAmount": 0,
  "simulation": { "behaviors": [{ "id": "particle" }], "simSpawnRate": 0.3 },
  "post": { "passes": [{ "id": "feedback", "amount": 0.5 }], "postFeedback": 0.5 },
  "audio": {
    "mapping": {
      "enabled": true,
      "mappings": [
        { "feature": "bass", "target": { "type": "control", "control": "simSpawnRate", "amount": 0.9, "min": 0, "max": 1 } },
        { "feature": "beat", "target": { "type": "control", "control": "glitchAmount", "amount": 0.5, "min": 0, "max": 0.6 } }
      ]
    },
    "audioAttack": 0.06,
    "audioRelease": 0.2
  }
}
```

## Using presets

```typescript
import { createEngine, listPresets, validatePreset } from 'ascii-visual-engine';

const engine = createEngine(canvas, { preset: 'glyphOrganicBloom' });
engine.setPreset(myNestedPreset);      // objects or built in ids
engine.setPreset(myOldFlatPreset);     // still fine, warns once

const result = validatePreset(JSON.parse(text));
if (result.ok) engine.setPreset(result.preset!);
else console.error(result.errors);
```

`listLiveControls(preset)` returns the control names a preset's composition actually reads; `liveControlDefs(preset)` turns that into slider definitions; `withLiveControls(preset)` fills `controls` the same way the built ins do.

## The flat shape (deprecated at 1.0)

The 0.1 and 0.2 shape kept every field at the top level. Any preset carrying a flat only key is treated as flat and normalized:

| Flat | Nested |
| --- | --- |
| `motionField` | `motion.field` (dropped when it is `none` or when behaviors are listed) |
| `motions` | `motion.behaviors` |
| `strength randomness frequency amplitude decay drag gravity noiseScale flowStrength` | `motion.*` |
| `symmetry petals spiralAmount cellularAmount scanlineAmount` | `pattern.*` |
| `simulations` | `simulation.behaviors` |
| `sim*` | `simulation.*` |
| `postProcessing` | `post.passes` |
| `post*` | `post.*` |
| `audioMapping` | `audio.mapping` |
| `audio*` | `audio.*` |
| `inputMapping` | `input` |
| `glyphLanguage glyphCategories glyphRules glyphMorphing glyphAnimation` | `glyphs.language categories rules morphing animation` |
| `effects`, `patterns` | folded into `plugins` when `plugins` is empty, as they always were |

`normalizePreset(flat)` performs this mapping; `flattenPreset(nested)` is its inverse for hosts that still read flat fields; `isFlatPreset(x)` tells the two apart. `tests/fixtures/flat-presets.json` holds the 30 built ins exactly as 0.2.0 shipped them, and `tests/preset-shape.test.ts` proves each normalizes to its converted nested form and renders the same frames.
