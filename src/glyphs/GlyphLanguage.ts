import type { GlyphCategoryId, GlyphLanguageConfig, GlyphRole } from './Glyph';

export const DEFAULT_ROLE_CATEGORY: Record<GlyphRole, GlyphCategoryId> = {
  seed: 'organic',
  branch: 'organic',
  leaf: 'organic',
  flower: 'organic',
  root: 'organic',
  smoke: 'fluid',
  water: 'fluid',
  particle: 'particle',
  glitch: 'noise',
  shadow: 'minimal',
  highlight: 'unicodeDecorative',
  outline: 'architecture',
  fill: 'geometric',
  edge: 'technical',
  noise: 'noise',
  decay: 'terminal',
  growth: 'organic',
  explosion: 'particle',
};

export const BUILTIN_GLYPH_LANGUAGES: GlyphLanguageConfig[] = [
  {
    id: 'organicBloom',
    name: 'Organic Bloom',
    categories: ['organic', 'unicodeDecorative'],
    roles: {
      seed: 'organic',
      branch: 'organic',
      leaf: 'organic',
      flower: 'unicodeDecorative',
      growth: 'organic',
      decay: 'minimal',
    },
    morphing: {
      enabled: true,
      chains: [{ id: 'bloom', steps: ['.', '°', '*', '✦', '✿'], duration: 2, loop: true }],
      speed: 1,
      smooth: true,
    },
    animation: { enabled: true, kinds: ['breathing', 'bloom'], speed: 0.8, amount: 0.6 },
  },
  {
    id: 'digitalForest',
    name: 'Digital Forest',
    categories: ['organic', 'architecture', 'terminal'],
    roles: {
      seed: 'organic',
      branch: 'architecture',
      leaf: 'organic',
      root: 'terminal',
      shadow: 'terminal',
    },
    animation: { enabled: true, kinds: ['growth', 'cycle'], speed: 0.5 },
  },
  {
    id: 'crtTerminal',
    name: 'CRT Terminal',
    categories: ['terminal', 'noise'],
    roles: {
      fill: 'terminal',
      edge: 'terminal',
      glitch: 'noise',
      shadow: 'terminal',
      highlight: 'terminal',
    },
    morphing: {
      enabled: true,
      chains: [{ id: 'scan', steps: ['░', '▒', '▓', '█'], duration: 1.5, loop: true }],
      speed: 1.2,
    },
    animation: { enabled: true, kinds: ['cycle', 'corruption'], speed: 1.5 },
  },
  {
    id: 'corruptedBroadcast',
    name: 'Corrupted Broadcast',
    categories: ['noise', 'terminal', 'abstract'],
    roles: {
      glitch: 'noise',
      noise: 'noise',
      explosion: 'abstract',
      decay: 'terminal',
    },
    morphing: { enabled: true, speed: 2, smooth: false },
    animation: { enabled: true, kinds: ['corruption', 'randomize'], speed: 2, amount: 1 },
  },
  {
    id: 'flowField',
    name: 'Flow Field',
    categories: ['fluid', 'particle', 'minimal'],
    roles: {
      water: 'fluid',
      particle: 'particle',
      smoke: 'fluid',
      edge: 'minimal',
    },
    animation: { enabled: true, kinds: ['rotation', 'cycle'], speed: 0.7 },
  },
  {
    id: 'particleNebula',
    name: 'Particle Nebula',
    categories: ['particle', 'unicodeDecorative', 'abstract'],
    roles: {
      particle: 'particle',
      highlight: 'unicodeDecorative',
      explosion: 'abstract',
      seed: 'particle',
    },
    animation: { enabled: true, kinds: ['breathing', 'randomize'], speed: 1, amount: 0.8 },
  },
  {
    id: 'abstractGeometry',
    name: 'Abstract Geometry',
    categories: ['geometric', 'abstract', 'technical'],
    roles: {
      fill: 'geometric',
      outline: 'architecture',
      edge: 'technical',
      highlight: 'abstract',
    },
    animation: { enabled: true, kinds: ['rotation'], speed: 0.4 },
  },
  {
    id: 'minimalZen',
    name: 'Minimal Zen',
    categories: ['minimal'],
    roles: {
      fill: 'minimal',
      shadow: 'minimal',
      highlight: 'minimal',
      seed: 'minimal',
    },
    animation: { enabled: true, kinds: ['breathing'], speed: 0.3, amount: 0.4 },
  },
  {
    id: 'hybridOrganicTerminal',
    name: 'Hybrid Organic × Terminal',
    composer: ['organicBloom', 'crtTerminal'],
    categories: ['organic', 'terminal', 'noise'],
  },
];

export function getBuiltinLanguage(id: string): GlyphLanguageConfig | undefined {
  return BUILTIN_GLYPH_LANGUAGES.find((l) => l.id === id);
}

export function resolveRoleCategory(
  role: GlyphRole,
  language: GlyphLanguageConfig,
): GlyphCategoryId {
  return language.roles?.[role] ?? DEFAULT_ROLE_CATEGORY[role];
}

export function mergeLanguageConfigs(configs: GlyphLanguageConfig[]): GlyphLanguageConfig {
  const categories = new Set<GlyphCategoryId>();
  const roles: Partial<Record<GlyphRole, GlyphCategoryId>> = {};

  for (const config of configs) {
    for (const cat of config.categories ?? []) categories.add(cat);
    if (config.roles) Object.assign(roles, config.roles);
  }

  return {
    id: configs.map((c) => c.id).join('+'),
    name: configs.map((c) => c.name ?? c.id).join(' × '),
    categories: [...categories],
    roles,
    morphing: configs.find((c) => c.morphing?.enabled)?.morphing,
    animation: configs.find((c) => c.animation?.enabled)?.animation,
  };
}
