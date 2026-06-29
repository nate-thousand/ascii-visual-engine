import type { Glyph, GlyphCategoryId, GlyphRole } from './Glyph';
import { getCategoryGlyphs } from './GlyphLibrary';

export class GlyphAtlas {
  private charCache = new Map<string, string[]>();
  private glyphCache = new Map<string, Glyph[]>();
  private hits = 0;
  private misses = 0;

  getCharacters(key: string, factory: () => string[]): string[] {
    const cached = this.charCache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }
    this.misses++;
    const chars = factory();
    this.charCache.set(key, chars);
    return chars;
  }

  getGlyphs(key: string, factory: () => Glyph[]): Glyph[] {
    const cached = this.glyphCache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }
    this.misses++;
    const glyphs = factory();
    this.glyphCache.set(key, glyphs);
    return glyphs;
  }

  getCategoryCharacters(category: GlyphCategoryId): string[] {
    return this.getCharacters(`cat:${category}`, () =>
      getCategoryGlyphs(category).map((g) => g.character),
    );
  }

  getCategoryGlyphList(category: GlyphCategoryId): Glyph[] {
    return this.getGlyphs(`cat:${category}`, () => getCategoryGlyphs(category));
  }

  getRoleCharacters(category: GlyphCategoryId, role: GlyphRole): string[] {
    return this.getCharacters(`role:${category}:${role}`, () => {
      const glyphs = getCategoryGlyphs(category);
      return glyphs.map((g) => g.character);
    });
  }

  clear(): void {
    this.charCache.clear();
    this.glyphCache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.charCache.size + this.glyphCache.size,
    };
  }
}
