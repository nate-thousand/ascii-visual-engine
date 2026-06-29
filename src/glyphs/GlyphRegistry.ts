import type { GridState } from '../core/types';
import type {
  Glyph,
  GlyphCategoryId,
  GlyphCellState,
  GlyphDebugState,
  GlyphLanguageConfig,
  GlyphPresetConfig,
} from './Glyph';
import { GlyphAtlas } from './GlyphAtlas';
import { GlyphComposer } from './GlyphComposer';
import { GlyphGenerator, type GlyphGeneratorContext } from './GlyphGenerator';
import { GlyphMorpher } from './GlyphMorpher';
import { GlyphAnimator } from './GlyphAnimator';
import { BUILTIN_GLYPH_LANGUAGES, getBuiltinLanguage } from './GlyphLanguage';
import { getCategoryGlyphs, resolveGlyphSetFromCategories } from './GlyphLibrary';

export class GlyphRegistry {
  private atlas = new GlyphAtlas();
  private generator = new GlyphGenerator();
  private morpher = new GlyphMorpher();
  private animator = new GlyphAnimator();
  private composer = new GlyphComposer();

  private languages = new Map<string, GlyphLanguageConfig>();
  private categories = new Map<string, GlyphCategoryId>();
  private customGlyphSets = new Map<string, Glyph[]>();

  private activeLanguage: GlyphLanguageConfig | null = null;
  private enabled = false;
  private resolvedGlyphSet: string[] = ['.', '#'];
  private inspectIndex = 0;
  private lastDt = 0;

  constructor() {
    for (const lang of BUILTIN_GLYPH_LANGUAGES) {
      this.languages.set(lang.id, lang);
    }
  }

  registerGlyphLanguage(config: GlyphLanguageConfig): void {
    this.languages.set(config.id, config);
  }

  registerGlyphCategory(id: string, category: GlyphCategoryId): void {
    this.categories.set(id, category);
  }

  registerGlyphSet(id: string, glyphs: Glyph[]): void {
    this.customGlyphSets.set(id, glyphs);
    this.atlas.clear();
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled && this.activeLanguage !== null;
  }

  applyPresetConfig(preset: GlyphPresetConfig & { glyphSet?: string[] }): void {
    const langIds = normalizeLanguageIds(preset.glyphLanguage);
    let language: GlyphLanguageConfig | null = null;

    if (langIds.length > 0) {
      if (langIds.length === 1) {
        language = getBuiltinLanguage(langIds[0]) ?? this.languages.get(langIds[0]) ?? null;
      } else {
        language = this.composer.compose(langIds);
      }
    }

    if (language) {
      language = this.composer.composeFromConfig({
        ...language,
        categories: preset.glyphCategories ?? language.categories,
        rules: preset.glyphRules ?? language.rules,
        morphing: preset.glyphMorphing ?? language.morphing,
        animation: preset.glyphAnimation ?? language.animation,
        enabled: true,
      });
      this.activeLanguage = language;
      this.enabled = true;
      this.resolvedGlyphSet = this.composer.resolveGlyphSet(language);
    } else if (preset.glyphCategories?.length) {
      this.activeLanguage = {
        id: 'custom',
        name: 'Custom Categories',
        categories: preset.glyphCategories,
        rules: preset.glyphRules,
        morphing: preset.glyphMorphing,
        animation: preset.glyphAnimation,
        enabled: true,
      };
      this.enabled = true;
      this.resolvedGlyphSet = resolveGlyphSetFromCategories(preset.glyphCategories);
    } else {
      this.activeLanguage = null;
      this.enabled = false;
      this.resolvedGlyphSet = preset.glyphSet ?? ['.', '#'];
    }
  }

  getResolvedGlyphSet(): string[] {
    return this.resolvedGlyphSet;
  }

  getActiveLanguage(): GlyphLanguageConfig | null {
    return this.activeLanguage;
  }

  applyToGrid(grid: GridState, ctx: GlyphGeneratorContext): void {
    if (!this.isEnabled() || !this.activeLanguage) {
      return;
    }

    const language = this.activeLanguage;
    const states = this.generator.updateCellStates(grid, language, this.atlas, ctx);

    this.morpher.update(ctx.time > 0 ? this.lastDt : 0.016, language.morphing);
    this.morpher.applyToStates(states, language.morphing, ctx.time);

    this.animator.update(this.lastDt, language.animation);
    const allGlyphs = (language.categories ?? []).flatMap((c) => getCategoryGlyphs(c));
    this.animator.applyToStates(states, allGlyphs, language.animation, ctx.time);

    for (let i = 0; i < grid.cells.length; i++) {
      grid.cells[i].char = states[i].character;
    }

    this.inspectIndex = Math.floor((ctx.time * 10) % grid.cells.length);
  }

  setDeltaTime(dt: number): void {
    this.lastDt = dt;
  }

  applyLegacyBrightness(grid: GridState): void {
    const set = this.resolvedGlyphSet;
    if (set.length <= 1) return;
    for (const cell of grid.cells) {
      cell.char = this.generator.pickByBrightness(cell.brightness, set);
    }
  }

  pickByBrightness(brightness: number): string {
    return this.generator.pickByBrightness(brightness, this.resolvedGlyphSet);
  }

  getCellState(index: number): GlyphCellState | null {
    return this.generator.getCellState(index);
  }

  getInspectCellState(): GlyphCellState | null {
    return this.generator.getCellState(this.inspectIndex);
  }

  setInspectIndex(index: number): void {
    this.inspectIndex = index;
  }

  listLanguages(): GlyphLanguageConfig[] {
    return [...this.languages.values()];
  }

  listCategories(): GlyphCategoryId[] {
    return [...new Set(this.categories.values())];
  }

  getDebugState(): GlyphDebugState {
    const lang = this.activeLanguage;
    const sample = this.getInspectCellState();
    return {
      enabled: this.isEnabled(),
      languageId: lang?.id ?? null,
      languageName: lang?.name ?? null,
      categories: lang?.categories ?? [],
      glyphCount: this.resolvedGlyphSet.length,
      atlasHits: this.atlas.getStats().hits,
      sampleCell: sample,
      morphState: this.morpher.getMorphState(lang?.morphing),
      animationState: this.animator.getAnimationState(lang?.animation),
    };
  }

  destroy(): void {
    this.disable();
    this.activeLanguage = null;
    this.atlas.clear();
  }
}

function normalizeLanguageIds(
  input: string | string[] | undefined,
): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

export function resolvePresetGlyphSet(preset: {
  glyphSet?: string[];
  glyphLanguage?: string | string[];
  glyphCategories?: GlyphCategoryId[];
}): string[] {
  if (preset.glyphLanguage) {
    const ids = normalizeLanguageIds(preset.glyphLanguage);
    const lang = ids.length === 1 ? getBuiltinLanguage(ids[0]) : null;
    if (lang?.categories) return resolveGlyphSetFromCategories(lang.categories);
    if (preset.glyphCategories) return resolveGlyphSetFromCategories(preset.glyphCategories);
  }
  if (preset.glyphCategories?.length) {
    return resolveGlyphSetFromCategories(preset.glyphCategories);
  }
  return preset.glyphSet ?? ['.', '#'];
}
