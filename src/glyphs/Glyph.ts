export type GlyphCategoryId =
  | 'organic'
  | 'terminal'
  | 'geometric'
  | 'technical'
  | 'noise'
  | 'particle'
  | 'fluid'
  | 'architecture'
  | 'minimal'
  | 'abstract'
  | 'unicodeDecorative';

export type GlyphRole =
  | 'seed'
  | 'branch'
  | 'leaf'
  | 'flower'
  | 'root'
  | 'smoke'
  | 'water'
  | 'particle'
  | 'glitch'
  | 'shadow'
  | 'highlight'
  | 'outline'
  | 'fill'
  | 'edge'
  | 'noise'
  | 'decay'
  | 'growth'
  | 'explosion';

export type GlyphAnimationKind =
  | 'rotation'
  | 'cycle'
  | 'randomize'
  | 'breathing'
  | 'growth'
  | 'erosion'
  | 'decay'
  | 'bloom'
  | 'corruption';

export interface GlyphAnimationRule {
  kind: GlyphAnimationKind;
  speed?: number;
  amount?: number;
  phase?: number;
}

export interface Glyph {
  id: string;
  character: string;
  category: GlyphCategoryId;
  weight: number;
  density: number;
  orientation: number;
  symmetry: number;
  animationRules?: GlyphAnimationRule[];
  metadata?: Record<string, unknown>;
}

export interface GlyphMorphChain {
  id: string;
  steps: string[];
  duration?: number;
  loop?: boolean;
}

export interface GlyphRuleConfig {
  role: GlyphRole;
  category?: GlyphCategoryId;
  minBrightness?: number;
  maxBrightness?: number;
  minVelocity?: number;
  maxVelocity?: number;
}

export interface GlyphMorphConfig {
  enabled?: boolean;
  chains?: GlyphMorphChain[];
  speed?: number;
  smooth?: boolean;
}

export interface GlyphAnimationConfig {
  enabled?: boolean;
  kinds?: GlyphAnimationKind[];
  speed?: number;
  amount?: number;
}

export interface GlyphLanguageConfig {
  id: string;
  name?: string;
  categories?: GlyphCategoryId[];
  roles?: Partial<Record<GlyphRole, GlyphCategoryId>>;
  rules?: GlyphRuleConfig[];
  morphing?: GlyphMorphConfig;
  animation?: GlyphAnimationConfig;
  composer?: string[];
  enabled?: boolean;
}

export interface GlyphPresetConfig {
  glyphLanguage?: string | string[];
  glyphCategories?: GlyphCategoryId[];
  glyphRules?: GlyphRuleConfig[];
  glyphMorphing?: GlyphMorphConfig;
  glyphAnimation?: GlyphAnimationConfig;
}

export interface GlyphCellState {
  role: GlyphRole;
  category: GlyphCategoryId;
  glyphId: string;
  character: string;
  morphProgress: number;
  morphIndex: number;
  animPhase: number;
  animKind: GlyphAnimationKind | null;
  weight: number;
  density: number;
  unicode: number;
}

export interface GlyphPickContext {
  brightness: number;
  velocity: number;
  density: number;
  curvature: number;
  noise: number;
  burst: number;
  audioAmplitude: number;
  motionStrength: number;
  simulationEnergy: number;
  x: number;
  y: number;
  phase: number;
  time: number;
}

export interface GlyphDebugState {
  enabled: boolean;
  languageId: string | null;
  languageName: string | null;
  categories: GlyphCategoryId[];
  glyphCount: number;
  atlasHits: number;
  sampleCell: GlyphCellState | null;
  morphState: string;
  animationState: string;
}

export function glyphUnicode(char: string): number {
  return char.codePointAt(0) ?? 0;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
