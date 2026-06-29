import type { AsciiPreset } from '../../core/types';
import { resolveGlyphSetFromCategories } from '../../glyphs/GlyphLibrary';

function glyphPreset(
  id: string,
  name: string,
  glyphLanguage: string,
  extra: Partial<AsciiPreset> = {},
): AsciiPreset {
  const categories = extra.glyphCategories;
  const glyphSet = categories?.length
    ? resolveGlyphSetFromCategories(categories)
    : ['.', ':', '-', '=', '+', '*', '#', '@'];

  return {
    id,
    name,
    glyphSet,
    glyphLanguage,
    motionField: 'noise',
    plugins: [
      { id: 'noise', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
    patterns: ['radialSymmetry'],
    motions: [{ id: 'organicGrowth', weight: 0.5 }],
    controls: [
      { name: 'density', label: 'Density', min: 0.3, max: 2, default: 1, step: 0.1 },
      { name: 'speed', label: 'Speed', min: 0.1, max: 3, default: 0.8, step: 0.1 },
      { name: 'strength', label: 'Strength', min: 0, max: 1, default: 0.7, step: 0.05 },
      { name: 'trailAmount', label: 'Trails', min: 0, max: 1, default: 0.5, step: 0.05 },
      { name: 'glitchAmount', label: 'Glitch', min: 0, max: 1, default: 0.1, step: 0.05 },
    ],
    density: 1,
    speed: 0.8,
    strength: 0.7,
    trailAmount: 0.5,
    glitchAmount: 0.1,
    ...extra,
  };
}

export const organicBloomPreset = glyphPreset('glyphOrganicBloom', 'Glyph — Organic Bloom', 'organicBloom', {
  glyphCategories: ['organic', 'unicodeDecorative'],
  plugins: [
    { id: 'burst', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'radialSymmetry', type: 'pattern' },
    { id: 'cellular', type: 'pattern' },
  ],
  patterns: ['radialSymmetry', 'cellular'],
  motions: [{ id: 'organicGrowth', weight: 0.7 }, { id: 'breathing', weight: 0.3 }],
});

export const digitalForestPreset = glyphPreset(
  'glyphDigitalForest',
  'Glyph — Digital Forest',
  'digitalForest',
  {
    glyphCategories: ['organic', 'architecture', 'terminal'],
    plugins: [
      { id: 'noise', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'grid', type: 'pattern' },
      { id: 'cellular', type: 'pattern' },
    ],
    patterns: ['grid', 'cellular'],
    motions: [{ id: 'flowField', weight: 0.6 }],
  },
);

export const crtTerminalPreset = glyphPreset('glyphCrtTerminal', 'Glyph — CRT Terminal', 'crtTerminal', {
  glyphCategories: ['terminal', 'noise'],
  motionField: 'wave',
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'glitch', type: 'effect' },
    { id: 'scanline', type: 'pattern' },
  ],
  patterns: ['scanline'],
  scanlineAmount: 0.8,
  glitchAmount: 0.35,
});

export const corruptedBroadcastPreset = glyphPreset(
  'glyphCorruptedBroadcast',
  'Glyph — Corrupted Broadcast',
  'corruptedBroadcast',
  {
    glyphCategories: ['noise', 'terminal', 'abstract'],
    plugins: [
      { id: 'glitch', type: 'effect' },
      { id: 'burst', type: 'effect' },
      { id: 'scanline', type: 'pattern' },
    ],
    glitchAmount: 0.7,
    motions: [{ id: 'curlNoise', weight: 0.5 }],
  },
);

export const flowFieldPreset = glyphPreset('glyphFlowField', 'Glyph — Flow Field', 'flowField', {
  glyphCategories: ['fluid', 'particle', 'minimal'],
  plugins: [
    { id: 'wave', type: 'effect' },
    { id: 'trails', type: 'effect' },
    { id: 'spiral', type: 'pattern' },
  ],
  patterns: ['spiral'],
  motions: [{ id: 'flowField', weight: 0.8 }],
  flowStrength: 0.7,
});

export const particleNebulaPreset = glyphPreset(
  'glyphParticleNebula',
  'Glyph — Particle Nebula',
  'particleNebula',
  {
    glyphCategories: ['particle', 'unicodeDecorative', 'abstract'],
    simulations: [{ id: 'particle', enabled: true }],
    simSpawnRate: 0.5,
    plugins: [
      { id: 'burst', type: 'effect' },
      { id: 'trails', type: 'effect' },
      { id: 'radialSymmetry', type: 'pattern' },
    ],
  },
);

export const abstractGeometryPreset = glyphPreset(
  'glyphAbstractGeometry',
  'Glyph — Abstract Geometry',
  'abstractGeometry',
  {
    glyphCategories: ['geometric', 'abstract', 'technical'],
    plugins: [
      { id: 'wave', type: 'effect' },
      { id: 'grid', type: 'pattern' },
      { id: 'spiral', type: 'pattern' },
    ],
    patterns: ['grid', 'spiral'],
    symmetry: 8,
  },
);

export const minimalZenPreset = glyphPreset('glyphMinimalZen', 'Glyph — Minimal Zen', 'minimalZen', {
  glyphCategories: ['minimal'],
  plugins: [
    { id: 'trails', type: 'effect' },
    { id: 'wave', type: 'effect' },
  ],
  motions: [{ id: 'breathing', weight: 0.9 }],
  density: 0.7,
  trailAmount: 0.6,
});
