import type { AsciiPreset } from '../../core/types';
import { resolveGlyphSetFromCategories } from '../../glyphs/GlyphLibrary';
import { withLiveControls } from '../controlCatalog';

function glyphPreset(
  id: string,
  name: string,
  language: string,
  extra: Partial<AsciiPreset> = {},
): AsciiPreset {
  const categories = extra.glyphs?.categories;
  const glyphSet = categories?.length
    ? resolveGlyphSetFromCategories(categories)
    : ['.', ':', '-', '=', '+', '*', '#', '@'];

  const { controls: _ignored, ...rest } = extra;
  const composed: AsciiPreset = {
    id,
    name,
    glyphSet,
    plugins: [
      { id: 'noise', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    density: 1,
    speed: 0.8,
    trailAmount: 0.5,
    glitchAmount: 0.1,
    ...rest,
    motion: { behaviors: [{ id: 'organicGrowth', weight: 0.5 }], strength: 0.7, ...extra.motion },
    glyphs: { language, ...extra.glyphs },
  };

  // Sliders are derived from what the composition reads, so a glyph preset
  // never offers a control nothing consumes.
  return withLiveControls(composed);
}

export const organicBloomPreset = glyphPreset('glyphOrganicBloom', 'Organic Bloom', 'organicBloom', {
  glyphs: { categories: ['organic', 'unicodeDecorative'] },
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern' },
  ],
  motion: { behaviors: [{ id: 'organicGrowth', weight: 0.7 }, { id: 'breathing', weight: 0.3 }] },
  speed: 0.55,
  trailAmount: 0.4,
  glitchAmount: 0,
});

export const digitalForestPreset = glyphPreset(
  'glyphDigitalForest',
  'Digital Forest',
  'digitalForest',
  {
    glyphs: { categories: ['organic', 'architecture', 'terminal'] },
    plugins: [
      { id: 'noise', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'grid', type: 'pattern' },
      { id: 'cellular', type: 'pattern' },
    ],
    motion: { behaviors: [{ id: 'flowField', weight: 0.6 }] },
    speed: 0.45,
    trailAmount: 0.35,
    glitchAmount: 0,
  },
);

export const crtTerminalPreset = glyphPreset('glyphCrtTerminal', 'CRT Terminal', 'crtTerminal', {
  glyphs: { categories: ['terminal', 'noise'] },
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'scanline', type: 'pattern' },
  ],
  pattern: { scanlineAmount: 0.8 },
  trailAmount: 0.3,
  glitchAmount: 0.18,
});

export const corruptedBroadcastPreset = glyphPreset(
  'glyphCorruptedBroadcast',
  'Corrupted Broadcast',
  'corruptedBroadcast',
  {
    glyphs: { categories: ['noise', 'terminal', 'abstract'] },
    plugins: [
      { id: 'glitch', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'scanline', type: 'pattern' },
    ],
    trailAmount: 0.25,
    glitchAmount: 0.45,
    motion: { behaviors: [{ id: 'curlNoise', weight: 0.5 }] },
  },
);

export const flowFieldPreset = glyphPreset('glyphFlowField', 'Flow Field', 'flowField', {
  glyphs: { categories: ['fluid', 'particle', 'minimal'] },
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'spiral', type: 'pattern' },
  ],
  motion: { behaviors: [{ id: 'flowField', weight: 0.8 }], flowStrength: 0.7 },
  trailAmount: 0.45,
  glitchAmount: 0,
});

export const particleNebulaPreset = glyphPreset(
  'glyphParticleNebula',
  'Particle Nebula',
  'particleNebula',
  {
    glyphs: { categories: ['particle', 'unicodeDecorative', 'abstract'] },
    simulation: { behaviors: [{ id: 'particle', enabled: true }], simSpawnRate: 0.5 },
    plugins: [
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
  },
);

export const abstractGeometryPreset = glyphPreset(
  'glyphAbstractGeometry',
  'Abstract Geometry',
  'abstractGeometry',
  {
    glyphs: { categories: ['geometric', 'abstract', 'technical'] },
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'grid', type: 'pattern' },
      { id: 'spiral', type: 'pattern' },
    ],
    pattern: { symmetry: 8 },
  },
);

export const minimalZenPreset = glyphPreset('glyphMinimalZen', 'Minimal Zen', 'minimalZen', {
  glyphs: { categories: ['minimal'] },
  plugins: [
    { id: 'trails', type: 'effect' },
    { id: 'wave', type: 'effect' },
  ],
  motion: { behaviors: [{ id: 'breathing', weight: 0.9 }] },
  density: 0.65,
  speed: 0.4,
  trailAmount: 0.35,
  glitchAmount: 0,
});
