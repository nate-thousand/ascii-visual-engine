# Glyph Authoring Guide

Create custom visual languages and presets for the ASCII Visual Engine.

---

## Quick start

1. Pick categories from [GLYPH_LIBRARY.md](./GLYPH_LIBRARY.md)
2. Define role → category mappings
3. Add morph chains and animation kinds
4. Reference the language in a preset

```typescript
import { AsciiEngine, type GlyphLanguageConfig } from 'ascii-visual-engine';

const myLanguage: GlyphLanguageConfig = {
  id: 'neonGarden',
  name: 'Neon Garden',
  categories: ['organic', 'unicodeDecorative', 'noise'],
  roles: {
    seed: 'organic',
    branch: 'organic',
    flower: 'unicodeDecorative',
    glitch: 'noise',
    highlight: 'unicodeDecorative',
  },
  morphing: {
    enabled: true,
    chains: [
      { id: 'grow', steps: ['.', '·', '•', '✦', '✿'], duration: 3, loop: true },
    ],
    speed: 0.8,
    smooth: true,
  },
  animation: {
    enabled: true,
    kinds: ['breathing', 'bloom'],
    speed: 0.6,
    amount: 0.5,
  },
};

const engine = new AsciiEngine({ canvas, preset: myPreset });
engine.registerGlyphLanguage(myLanguage);
engine.setPreset({
  ...myPreset,
  glyphLanguage: 'neonGarden',
  glyphCategories: ['organic', 'unicodeDecorative'],
});
```

---

## Preset template

```typescript
export const myGlyphPreset: AsciiPreset = {
  id: 'myGlyphPreset',
  name: 'My Glyph Preset',
  glyphSet: ['.', '*', '#'],  // fallback for renderer init
  glyphLanguage: 'neonGarden',
  glyphCategories: ['organic', 'unicodeDecorative'],
  glyphMorphing: { enabled: true, speed: 1 },
  glyphAnimation: { enabled: true, kinds: ['breathing'] },
  motionField: 'noise',
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
  ],
  controls: [/* ... */],
  density: 1,
  speed: 1,
  trailAmount: 0.4,
  glitchAmount: 0.1,
};
```

---

## Role mapping guide

Map roles to categories based on visual intent:

| Visual intent | Role | Suggested category |
| --- | --- | --- |
| Dark background texture | `shadow` | `minimal` or `terminal` |
| Growing tips | `seed` → `branch` → `flower` | `organic` |
| Signal corruption | `glitch` | `noise` |
| Simulation sparks | `particle` | `particle` |
| Flow motion | `water` | `fluid` |
| Burst hits | `explosion` | `particle` or `abstract` |
| Grid structure | `outline` / `edge` | `architecture` or `geometric` |

---

## Morph chains

Define character evolution sequences:

```typescript
glyphMorphing: {
  enabled: true,
  chains: [
    { id: 'dither', steps: ['░', '▒', '▓', '█'], duration: 1.5, loop: true },
    { id: 'bloom', steps: ['.', '°', '*', '✦', '✿'], duration: 2.5, loop: true },
  ],
  speed: 1,
  smooth: true,  // ease between steps
}
```

- `smooth: true` — gradual transitions with staggered per-cell phase
- `smooth: false` — hard step changes (good for glitch)

---

## Animation kinds

| Kind | Effect |
| --- | --- |
| `breathing` | Pulses glyph weight |
| `cycle` | Cycles through `metadata.cycle` chars |
| `randomize` | Random char swaps from `metadata.pool` |
| `growth` | Increases density over time |
| `erosion` / `decay` | Decreases density |
| `bloom` | Occasional swap to `metadata.bloomChar` |
| `corruption` | Random ASCII corruption |
| `rotation` | Advances anim phase |

```typescript
glyphAnimation: {
  enabled: true,
  kinds: ['breathing', 'corruption'],
  speed: 1.2,
  amount: 0.7,
}
```

---

## Composing hybrid languages

Combine two or more built-in languages:

```typescript
glyphLanguage: ['organicBloom', 'crtTerminal']
```

The composer merges categories and role maps. Use for hybrid aesthetics like organic growth on a CRT screen.

Built-in composed example: `hybridOrganicTerminal`.

---

## Glyph rules (advanced)

Override role selection with brightness/velocity thresholds:

```typescript
glyphRules: [
  { role: 'flower', category: 'unicodeDecorative', minBrightness: 0.7 },
  { role: 'glitch', category: 'noise', minVelocity: 0.5 },
]
```

---

## Debugging

Use the **Glyph Inspector** in the vanilla demo (`npm run dev`):

1. Select a **Glyph —** preset
2. Watch sample cell role, category, morph, and Unicode value
3. Verify atlas cache hits increase over time

Programmatic inspection:

```typescript
const registry = engine.getGlyphRegistry();
const state = registry.getCellState(42);
console.log(state?.role, state?.character, state?.unicode);
```

---

## Backward compatibility

Presets with only `glyphSet` (no `glyphLanguage`) behave exactly as before — brightness maps to the glyph ramp in patterns, sources, and motion effects.

Adding `glyphLanguage` activates semantic selection. Keep `glyphSet` populated for renderer initialization and legacy tooling.

---

## Built-in glyph presets

| Preset ID | Language |
| --- | --- |
| `glyphOrganicBloom` | Organic Bloom |
| `glyphDigitalForest` | Digital Forest |
| `glyphCrtTerminal` | CRT Terminal |
| `glyphCorruptedBroadcast` | Corrupted Broadcast |
| `glyphFlowField` | Flow Field |
| `glyphParticleNebula` | Particle Nebula |
| `glyphAbstractGeometry` | Abstract Geometry |
| `glyphMinimalZen` | Minimal Zen |

```typescript
import { listGlyphPresets } from 'ascii-visual-engine';

engine.setPreset(listGlyphPresets()[0]);
```
