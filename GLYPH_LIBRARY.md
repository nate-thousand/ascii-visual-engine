# Glyph Library Reference

Curated built-in glyph categories for the Procedural Glyph Language.

---

## Organic

Soft, natural, botanical forms.

```
.  ·  •  °  *  ✦  ✧  ✿  ❀  ❁  ✾  ✽  ╱  ╲  ╳  ⌒  ⌢  ⌣
```

Best for: growth presets, floral patterns, ambient organic motion.

---

## Terminal

Classic CRT and command-line aesthetics.

```
.  :  ;  |  /  \  #  @  %  &  +  =  -  _
```

Best for: retro demos, scanline patterns, digital forest trunks.

---

## Noise

Signal degradation and dither ramps.

```
░  ▒  ▓  █  #  @  %  &  ?  !
```

Best for: glitch effects, corrupted broadcast, CRT fade.

Morph chain: `░ → ▒ → ▓ → █`

---

## Geometric

Structured shapes and symbols.

```
.  +  ×  □  ■  ◇  ◆  ○  ●  △  ▲
```

Best for: abstract geometry, symmetry patterns, mechanical motion.

---

## Technical

Code-like bracket and operator forms.

```
[  ]  {  }  <  >  |  #  $  ~
```

Best for: data visualization, edge detection, outline roles.

---

## Particle

Lightweight spark and dot forms.

```
.  ·  *  +  ×  ✦  ✧  ○  ●
```

Best for: simulations, nebula presets, burst effects.

---

## Fluid

Flow and wave characters.

```
~  ≈  -  =  :  .  S  %  &
```

Best for: flow field motion, water/smoke roles.

---

## Architecture

Box-drawing and structural blocks.

```
─  │  ┌  ┐  └  ┘  ┼  ┬  █  ▓
```

Best for: digital forest branches, grid overlays, outline roles.

---

## Minimal

Sparse zen vocabulary.

```
(space)  .  :  -  +  ○  ●
```

Best for: minimal zen presets, low-density compositions.

---

## Abstract

Expressive symbolic marks.

```
/  \  |  *  +  ×  #  @  %
```

Best for: chaotic motion, explosion roles, hybrid languages.

---

## Unicode Decorative

Ornamental symbols.

```
★  ☆  ❄  ♥  ♠  ♣  ♦  ♪  ♫  ☀  ☾
```

Best for: highlight roles, flower peaks, particle nebula accents.

---

## Accessing libraries in code

```typescript
import { getCategoryGlyphs, GLYPH_CATEGORY_LIBRARIES } from 'ascii-visual-engine';

const organic = getCategoryGlyphs('organic');
const allCategories = Object.keys(GLYPH_CATEGORY_LIBRARIES);
```

---

## Custom glyph sets

Register custom glyphs at runtime:

```typescript
engine.getGlyphRegistry().registerGlyphSet('mySet', [
  {
    id: 'custom1',
    character: '◈',
    category: 'abstract',
    weight: 0.6,
    density: 0.5,
    orientation: 0,
    symmetry: 1,
  },
]);
```
