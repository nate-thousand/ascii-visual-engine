# Procedural Glyph Language

Evolve beyond brightness-based ASCII into an intelligent glyph system with categories, semantic roles, morphing, and animation.

---

## Overview

The glyph system treats characters as reusable visual primitives. Instead of mapping brightness to a flat glyph ramp, the engine classifies each cell into a **semantic role** (seed, branch, flower, glitch, etc.) and selects glyphs from **curated category libraries** (organic, terminal, noise, geometric, etc.).

Presets define **glyph languages** — composable visual vocabularies that can be combined, morphed, and animated without changing engine code.

When no `glyphLanguage` is configured, the engine falls back to legacy `glyphSet` brightness mapping. All existing presets continue to work unchanged.

---

## Architecture

```
Grid cell state (brightness, velocity, burst, phase)
        │
        ▼
  GlyphClassifier ──► semantic role (seed, flower, glitch, …)
        │
        ▼
  GlyphLanguage ──► category per role (organic, terminal, noise, …)
        │
        ▼
  GlyphGenerator ──► pick glyph from category library
        │
        ├──► GlyphMorpher ──► smooth character transitions
        │
        └──► GlyphAnimator ──► breathing, cycle, corruption, …
        │
        ▼
  cell.char (rendered by renderer)
```

Each frame (when glyph language is active):

1. Patterns, simulations, and sources set cell brightness and motion properties
2. `GlyphRegistry.applyToGrid()` classifies roles and selects glyphs
3. Morphing and animation update character state
4. Renderer draws `cell.char` (unchanged draw path)

---

## Glyph Interface

Every glyph is a structured visual primitive:

```typescript
interface Glyph {
  id: string;
  character: string;
  category: GlyphCategoryId;
  weight: number;       // visual emphasis 0–1
  density: number;      // fill density 0–1
  orientation: number;  // rotation hint
  symmetry: number;     // symmetry factor
  animationRules?: GlyphAnimationRule[];
  metadata?: Record<string, unknown>;
}
```

---

## Semantic Roles

| Role | Typical use |
| --- | --- |
| `seed` | Low-brightness origins, growth starts |
| `branch` | Structural connectors |
| `leaf` | Mid-brightness organic forms |
| `flower` | High-brightness bloom peaks |
| `root` | Grounded low-mid forms |
| `smoke` / `water` | Fluid motion fields |
| `particle` | High-velocity cells |
| `glitch` | Noise-driven corruption |
| `shadow` / `highlight` | Extremes of brightness |
| `outline` / `fill` / `edge` | Geometric structure |
| `noise` / `decay` | Entropy and erosion |
| `growth` / `explosion` | Simulation and burst events |

Roles are assigned by `GlyphClassifier` from brightness, velocity, burst, noise, audio amplitude, and simulation energy.

---

## Glyph Categories

Built-in libraries with curated character sets:

| Category | Examples |
| --- | --- |
| `organic` | `.` `·` `•` `*` `✦` `✿` `❀` `╱` `⌒` |
| `terminal` | `.` `:` `#` `@` `%` `\|` `/` `_` |
| `noise` | `░` `▒` `▓` `█` `#` `@` `?` `!` |
| `geometric` | `+` `×` `□` `■` `◇` `○` `●` `△` |
| `technical` | `[` `]` `{` `}` `<` `>` `#` `$` |
| `particle` | `.` `*` `+` `✦` `○` `●` |
| `fluid` | `~` `≈` `-` `=` `:` `.` |
| `architecture` | `─` `│` `┌` `┐` `└` `┘` `█` |
| `minimal` | ` ` `.` `:` `-` `+` `○` `●` |
| `abstract` | `/` `\` `*` `+` `#` `@` |
| `unicodeDecorative` | `★` `☆` `❄` `♥` `♪` `☀` |

See [GLYPH_LIBRARY.md](./GLYPH_LIBRARY.md) for full character lists.

---

## Glyph Languages

A glyph language binds roles to categories and optional morph/animation config:

```typescript
engine.registerGlyphLanguage({
  id: 'myLanguage',
  name: 'My Visual Language',
  categories: ['organic', 'noise'],
  roles: {
    seed: 'organic',
    flower: 'unicodeDecorative',
    glitch: 'noise',
  },
  morphing: {
    enabled: true,
    chains: [{ id: 'bloom', steps: ['.', '°', '*', '✦', '✿'], duration: 2, loop: true }],
    speed: 1,
    smooth: true,
  },
  animation: {
    enabled: true,
    kinds: ['breathing', 'bloom'],
    speed: 0.8,
    amount: 0.6,
  },
});
```

### Composing languages

Combine multiple languages into a hybrid vocabulary:

```typescript
glyphLanguage: ['organicBloom', 'crtTerminal']
// Organic × Terminal hybrid
```

---

## Preset Configuration

```typescript
{
  glyphSet: ['.', '#'],           // legacy fallback / renderer init
  glyphLanguage: 'organicBloom',  // or string[]
  glyphCategories: ['organic', 'unicodeDecorative'],
  glyphRules: [{ role: 'flower', category: 'unicodeDecorative' }],
  glyphMorphing: { enabled: true, speed: 1 },
  glyphAnimation: { enabled: true, kinds: ['breathing'] },
}
```

Eight built-in glyph presets ship with the engine — select **Glyph —** presets in the demo.

---

## Engine API

| Method | Description |
| --- | --- |
| `getGlyphRegistry()` | Access the glyph subsystem |
| `registerGlyphLanguage(config)` | Register a custom language |
| `getResolvedGlyphSet()` | Current character set for renderer |

### Debug state

```typescript
const { glyph } = engine.getDebugState();
// enabled, languageId, categories, glyphCount, sampleCell, morphState, animationState
```

---

## Glyph Inspector

The vanilla demo includes a **Glyph Inspector** panel showing:

- Active language and categories
- Sample cell: character, category, role
- Morph progress and animation state
- Weight, density, Unicode code point

Select a **Glyph —** preset and watch the inspector update each frame.

---

## Performance

- **GlyphAtlas** caches category glyph lists and character arrays
- **GlyphGenerator** reuses pre-allocated `GlyphCellState` buffers (no per-frame allocation)
- Role classification uses inline math — no object creation in the hot loop
- Atlas cache hits are reported in debug state

---

## Related docs

- [GLYPH_LIBRARY.md](./GLYPH_LIBRARY.md) — category reference
- [GLYPH_AUTHORING.md](./GLYPH_AUTHORING.md) — create custom languages and presets
