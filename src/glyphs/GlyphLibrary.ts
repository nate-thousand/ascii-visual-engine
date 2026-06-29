import type { Glyph, GlyphCategoryId } from './Glyph';

function g(
  id: string,
  character: string,
  category: GlyphCategoryId,
  weight = 0.5,
  density = 0.5,
): Glyph {
  return {
    id,
    character,
    category,
    weight,
    density,
    orientation: 0,
    symmetry: 1,
  };
}

export const ORGANIC_GLYPHS: Glyph[] = [
  g('org-dot', '.', 'organic', 0.1, 0.2),
  g('org-mid-dot', '·', 'organic', 0.15, 0.25),
  g('org-bullet', '•', 'organic', 0.2, 0.3),
  g('org-degree', '°', 'organic', 0.25, 0.35),
  g('org-star', '*', 'organic', 0.35, 0.45),
  g('org-star4', '✦', 'organic', 0.5, 0.55),
  g('org-star4-outline', '✧', 'organic', 0.55, 0.6),
  g('org-flower', '✿', 'organic', 0.7, 0.7),
  g('org-flower2', '❀', 'organic', 0.75, 0.75),
  g('org-flower3', '❁', 'organic', 0.8, 0.8),
  g('org-flower4', '✾', 'organic', 0.82, 0.82),
  g('org-flower5', '✽', 'organic', 0.85, 0.85),
  g('org-slash-f', '╱', 'organic', 0.4, 0.5),
  g('org-slash-b', '╲', 'organic', 0.42, 0.52),
  g('org-cross', '╳', 'organic', 0.45, 0.55),
  g('org-arc', '⌒', 'organic', 0.38, 0.48),
  g('org-arc2', '⌢', 'organic', 0.4, 0.5),
  g('org-arc3', '⌣', 'organic', 0.42, 0.52),
];

export const TERMINAL_GLYPHS: Glyph[] = [
  g('term-dot', '.', 'terminal', 0.1, 0.15),
  g('term-colon', ':', 'terminal', 0.2, 0.25),
  g('term-semi', ';', 'terminal', 0.25, 0.3),
  g('term-pipe', '|', 'terminal', 0.3, 0.35),
  g('term-slash-f', '/', 'terminal', 0.35, 0.4),
  g('term-slash-b', '\\', 'terminal', 0.38, 0.42),
  g('term-hash', '#', 'terminal', 0.55, 0.6),
  g('term-at', '@', 'terminal', 0.65, 0.7),
  g('term-percent', '%', 'terminal', 0.5, 0.55),
  g('term-amp', '&', 'terminal', 0.52, 0.57),
  g('term-plus', '+', 'terminal', 0.45, 0.5),
  g('term-eq', '=', 'terminal', 0.42, 0.47),
  g('term-minus', '-', 'terminal', 0.3, 0.35),
  g('term-under', '_', 'terminal', 0.28, 0.33),
];

export const NOISE_GLYPHS: Glyph[] = [
  g('noise-light', '░', 'noise', 0.2, 0.25),
  g('noise-mid', '▒', 'noise', 0.45, 0.5),
  g('noise-heavy', '▓', 'noise', 0.7, 0.75),
  g('noise-full', '█', 'noise', 0.95, 1),
  g('noise-hash', '#', 'noise', 0.6, 0.65),
  g('noise-at', '@', 'noise', 0.75, 0.8),
  g('noise-percent', '%', 'noise', 0.55, 0.6),
  g('noise-amp', '&', 'noise', 0.58, 0.63),
  g('noise-q', '?', 'noise', 0.4, 0.45),
  g('noise-bang', '!', 'noise', 0.5, 0.55),
];

export const GEOMETRIC_GLYPHS: Glyph[] = [
  g('geo-dot', '.', 'geometric', 0.1, 0.15),
  g('geo-plus', '+', 'geometric', 0.3, 0.35),
  g('geo-x', '×', 'geometric', 0.4, 0.45),
  g('geo-box', '□', 'geometric', 0.5, 0.55),
  g('geo-filled', '■', 'geometric', 0.7, 0.75),
  g('geo-diamond', '◇', 'geometric', 0.55, 0.6),
  g('geo-diamond-f', '◆', 'geometric', 0.75, 0.8),
  g('geo-circle', '○', 'geometric', 0.45, 0.5),
  g('geo-circle-f', '●', 'geometric', 0.65, 0.7),
  g('geo-tri', '△', 'geometric', 0.5, 0.55),
  g('geo-tri-f', '▲', 'geometric', 0.72, 0.77),
];

export const TECHNICAL_GLYPHS: Glyph[] = [
  g('tech-bracket-l', '[', 'technical', 0.3, 0.35),
  g('tech-bracket-r', ']', 'technical', 0.32, 0.37),
  g('tech-brace-l', '{', 'technical', 0.35, 0.4),
  g('tech-brace-r', '}', 'technical', 0.37, 0.42),
  g('tech-lt', '<', 'technical', 0.28, 0.33),
  g('tech-gt', '>', 'technical', 0.3, 0.35),
  g('tech-pipe', '|', 'technical', 0.4, 0.45),
  g('tech-hash', '#', 'technical', 0.55, 0.6),
  g('tech-dollar', '$', 'technical', 0.5, 0.55),
  g('tech-tilde', '~', 'technical', 0.38, 0.43),
];

export const PARTICLE_GLYPHS: Glyph[] = [
  g('part-dot', '.', 'particle', 0.15, 0.2),
  g('part-mid', '·', 'particle', 0.2, 0.25),
  g('part-star', '*', 'particle', 0.4, 0.45),
  g('part-plus', '+', 'particle', 0.35, 0.4),
  g('part-x', '×', 'particle', 0.45, 0.5),
  g('part-spark', '✦', 'particle', 0.6, 0.65),
  g('part-spark2', '✧', 'particle', 0.55, 0.6),
  g('part-circle', '○', 'particle', 0.5, 0.55),
  g('part-circle-f', '●', 'particle', 0.7, 0.75),
];

export const FLUID_GLYPHS: Glyph[] = [
  g('fluid-wave', '~', 'fluid', 0.3, 0.35),
  g('fluid-tilde', '≈', 'fluid', 0.4, 0.45),
  g('fluid-dash', '-', 'fluid', 0.25, 0.3),
  g('fluid-eq', '=', 'fluid', 0.35, 0.4),
  g('fluid-colon', ':', 'fluid', 0.2, 0.25),
  g('fluid-dot', '.', 'fluid', 0.15, 0.2),
  g('fluid-s', 'S', 'fluid', 0.5, 0.55),
  g('fluid-percent', '%', 'fluid', 0.55, 0.6),
  g('fluid-amp', '&', 'fluid', 0.52, 0.57),
];

export const ARCHITECTURE_GLYPHS: Glyph[] = [
  g('arch-line-h', '─', 'architecture', 0.3, 0.35),
  g('arch-line-v', '│', 'architecture', 0.32, 0.37),
  g('arch-corner', '┌', 'architecture', 0.4, 0.45),
  g('arch-corner2', '┐', 'architecture', 0.42, 0.47),
  g('arch-corner3', '└', 'architecture', 0.44, 0.49),
  g('arch-corner4', '┘', 'architecture', 0.46, 0.51),
  g('arch-cross', '┼', 'architecture', 0.5, 0.55),
  g('arch-t', '┬', 'architecture', 0.48, 0.53),
  g('arch-block', '█', 'architecture', 0.75, 0.8),
  g('arch-shade', '▓', 'architecture', 0.65, 0.7),
];

export const MINIMAL_GLYPHS: Glyph[] = [
  g('min-space', ' ', 'minimal', 0, 0),
  g('min-dot', '.', 'minimal', 0.2, 0.25),
  g('min-colon', ':', 'minimal', 0.35, 0.4),
  g('min-dash', '-', 'minimal', 0.45, 0.5),
  g('min-plus', '+', 'minimal', 0.55, 0.6),
  g('min-circle', '○', 'minimal', 0.65, 0.7),
  g('min-circle-f', '●', 'minimal', 0.8, 0.85),
];

export const ABSTRACT_GLYPHS: Glyph[] = [
  g('abs-slash', '/', 'abstract', 0.3, 0.35),
  g('abs-back', '\\', 'abstract', 0.32, 0.37),
  g('abs-pipe', '|', 'abstract', 0.35, 0.4),
  g('abs-star', '*', 'abstract', 0.5, 0.55),
  g('abs-plus', '+', 'abstract', 0.45, 0.5),
  g('abs-x', '×', 'abstract', 0.55, 0.6),
  g('abs-hash', '#', 'abstract', 0.65, 0.7),
  g('abs-at', '@', 'abstract', 0.75, 0.8),
  g('abs-percent', '%', 'abstract', 0.6, 0.65),
];

export const UNICODE_DECORATIVE_GLYPHS: Glyph[] = [
  g('uni-star', '★', 'unicodeDecorative', 0.6, 0.65),
  g('uni-star-o', '☆', 'unicodeDecorative', 0.5, 0.55),
  g('uni-snow', '❄', 'unicodeDecorative', 0.55, 0.6),
  g('uni-heart', '♥', 'unicodeDecorative', 0.65, 0.7),
  g('uni-spade', '♠', 'unicodeDecorative', 0.62, 0.67),
  g('uni-club', '♣', 'unicodeDecorative', 0.63, 0.68),
  g('uni-diamond', '♦', 'unicodeDecorative', 0.64, 0.69),
  g('uni-music', '♪', 'unicodeDecorative', 0.45, 0.5),
  g('uni-note', '♫', 'unicodeDecorative', 0.5, 0.55),
  g('uni-sun', '☀', 'unicodeDecorative', 0.7, 0.75),
  g('uni-moon', '☾', 'unicodeDecorative', 0.68, 0.73),
];

export const GLYPH_CATEGORY_LIBRARIES: Record<GlyphCategoryId, Glyph[]> = {
  organic: ORGANIC_GLYPHS,
  terminal: TERMINAL_GLYPHS,
  geometric: GEOMETRIC_GLYPHS,
  technical: TECHNICAL_GLYPHS,
  noise: NOISE_GLYPHS,
  particle: PARTICLE_GLYPHS,
  fluid: FLUID_GLYPHS,
  architecture: ARCHITECTURE_GLYPHS,
  minimal: MINIMAL_GLYPHS,
  abstract: ABSTRACT_GLYPHS,
  unicodeDecorative: UNICODE_DECORATIVE_GLYPHS,
};

export function getCategoryGlyphs(category: GlyphCategoryId): Glyph[] {
  return GLYPH_CATEGORY_LIBRARIES[category] ?? MINIMAL_GLYPHS;
}

export function glyphsToCharacters(glyphs: Glyph[]): string[] {
  return glyphs.map((g) => g.character);
}

export function resolveGlyphSetFromCategories(categories: GlyphCategoryId[]): string[] {
  const chars: string[] = [];
  const seen = new Set<string>();
  for (const cat of categories) {
    for (const glyph of getCategoryGlyphs(cat)) {
      if (!seen.has(glyph.character)) {
        seen.add(glyph.character);
        chars.push(glyph.character);
      }
    }
  }
  return chars.length > 0 ? chars : ['.', '#'];
}
