import type { AsciiPreset } from '../../core/types';
import { resolveGlyphSetFromCategories } from '../../glyphs/GlyphLibrary';
import { liveControlDefs } from '../controlCatalog';

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

  const { controls: _ignored, ...rest } = extra;
  const composed: Omit<AsciiPreset, 'controls'> = {
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
    density: 1,
    speed: 0.8,
    strength: 0.7,
    trailAmount: 0.5,
    glitchAmount: 0.1,
    ...rest,
  };

  // Sliders are derived from what the composition reads, so a glyph preset
  // never offers a control nothing consumes.
  return { ...composed, controls: liveControlDefs(composed) };
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
  speed: 0.55,
  trailAmount: 0.4,
  glitchAmount: 0,
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
    speed: 0.45,
    trailAmount: 0.35,
    glitchAmount: 0,
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
  trailAmount: 0.3,
  glitchAmount: 0.18,
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
    trailAmount: 0.25,
    glitchAmount: 0.45,
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
  trailAmount: 0.45,
  glitchAmount: 0,
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
  density: 0.65,
  speed: 0.4,
  trailAmount: 0.35,
  glitchAmount: 0,
});
