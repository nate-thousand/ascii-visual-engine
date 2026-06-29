import type { GlyphCategoryId, GlyphLanguageConfig } from './Glyph';
import { getBuiltinLanguage, mergeLanguageConfigs } from './GlyphLanguage';
import { resolveGlyphSetFromCategories } from './GlyphLibrary';

export class GlyphComposer {
  compose(languageIds: string[]): GlyphLanguageConfig | null {
    const configs = languageIds
      .map((id) => getBuiltinLanguage(id))
      .filter((c): c is GlyphLanguageConfig => c !== undefined);

    if (configs.length === 0) return null;
    if (configs.length === 1) return { ...configs[0], enabled: true };

    const merged = mergeLanguageConfigs(configs);
    merged.enabled = true;
    return merged;
  }

  composeFromConfig(config: GlyphLanguageConfig): GlyphLanguageConfig {
    if (config.composer?.length) {
      const composed = this.compose(config.composer);
      if (composed) {
        return {
          ...composed,
          ...config,
          categories: [
            ...new Set([...(composed.categories ?? []), ...(config.categories ?? [])]),
          ],
          roles: { ...composed.roles, ...config.roles },
        };
      }
    }
    return config;
  }

  resolveGlyphSet(language: GlyphLanguageConfig): string[] {
    if (language.categories?.length) {
      return resolveGlyphSetFromCategories(language.categories);
    }
    return ['.', ':', '-', '=', '+', '*', '#', '@'];
  }

  blendCategories(categories: GlyphCategoryId[]): GlyphCategoryId[] {
    return [...new Set(categories)];
  }
}
