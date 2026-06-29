import { basicPreset } from './basic';
import { terminalPreset } from './terminal';
import { organicPreset } from './organic';
import {
  ambientPreset,
  motionOrganicPreset,
  mechanicalPreset,
  motionTerminalPreset,
  chaoticPreset,
  minimalPreset,
} from './motion';
import {
  particlePreset,
  reactionDiffusionPreset,
  lsystemPreset,
} from './simulation';
import { compositingPreset } from './compositing';
import {
  audioAmbientPreset,
  audioBassPreset,
  audioGlitchPreset,
  audioVoicePreset,
  audioFullSpectrumPreset,
} from './audio';
import {
  performanceGenericPreset,
  performanceAkaiPreset,
  performanceLaunchkeyPreset,
  performanceQwertyPreset,
} from './input';
import {
  organicBloomPreset,
  digitalForestPreset,
  crtTerminalPreset,
  corruptedBroadcastPreset,
  flowFieldPreset,
  particleNebulaPreset,
  abstractGeometryPreset,
  minimalZenPreset,
} from './glyphs';
import type { AsciiPreset } from '../core/types';

export { basicPreset } from './basic';
export { terminalPreset } from './terminal';
export { organicPreset } from './organic';
export {
  ambientPreset,
  motionOrganicPreset,
  mechanicalPreset,
  motionTerminalPreset,
  chaoticPreset,
  minimalPreset,
} from './motion';

export {
  particlePreset,
  reactionDiffusionPreset,
  lsystemPreset,
} from './simulation';

export { compositingPreset } from './compositing';

export {
  audioAmbientPreset,
  audioBassPreset,
  audioGlitchPreset,
  audioVoicePreset,
  audioFullSpectrumPreset,
} from './audio';

export {
  performanceGenericPreset,
  performanceAkaiPreset,
  performanceLaunchkeyPreset,
  performanceQwertyPreset,
} from './input';

export {
  organicBloomPreset,
  digitalForestPreset,
  crtTerminalPreset,
  corruptedBroadcastPreset,
  flowFieldPreset,
  particleNebulaPreset,
  abstractGeometryPreset,
  minimalZenPreset,
} from './glyphs';

export const presets = {
  basic: basicPreset,
  terminal: terminalPreset,
  organic: organicPreset,
  ambient: ambientPreset,
  motionOrganic: motionOrganicPreset,
  mechanical: mechanicalPreset,
  motionTerminal: motionTerminalPreset,
  chaotic: chaoticPreset,
  minimal: minimalPreset,
  particleSim: particlePreset,
  reactionDiffusionSim: reactionDiffusionPreset,
  lsystemSim: lsystemPreset,
  compositing: compositingPreset,
  audioAmbient: audioAmbientPreset,
  audioBass: audioBassPreset,
  audioGlitch: audioGlitchPreset,
  audioVoice: audioVoicePreset,
  audioFullSpectrum: audioFullSpectrumPreset,
  performanceGeneric: performanceGenericPreset,
  performanceAkai: performanceAkaiPreset,
  performanceLaunchkey: performanceLaunchkeyPreset,
  performanceQwerty: performanceQwertyPreset,
  glyphOrganicBloom: organicBloomPreset,
  glyphDigitalForest: digitalForestPreset,
  glyphCrtTerminal: crtTerminalPreset,
  glyphCorruptedBroadcast: corruptedBroadcastPreset,
  glyphFlowField: flowFieldPreset,
  glyphParticleNebula: particleNebulaPreset,
  glyphAbstractGeometry: abstractGeometryPreset,
  glyphMinimalZen: minimalZenPreset,
} as const;

export type PresetId = keyof typeof presets;

export function getPreset(id: PresetId): AsciiPreset {
  return presets[id];
}

export function listPresets(): AsciiPreset[] {
  return Object.values(presets);
}

export function listMotionPresets(): AsciiPreset[] {
  return [
    ambientPreset,
    motionOrganicPreset,
    mechanicalPreset,
    motionTerminalPreset,
    chaoticPreset,
    minimalPreset,
  ];
}

export function listSimulationPresets(): AsciiPreset[] {
  return [particlePreset, reactionDiffusionPreset, lsystemPreset];
}

export function listCompositingPresets(): AsciiPreset[] {
  return [compositingPreset];
}

export function listAudioPresets(): AsciiPreset[] {
  return [
    audioAmbientPreset,
    audioBassPreset,
    audioGlitchPreset,
    audioVoicePreset,
    audioFullSpectrumPreset,
  ];
}

export function listPerformancePresets(): AsciiPreset[] {
  return [
    performanceGenericPreset,
    performanceAkaiPreset,
    performanceLaunchkeyPreset,
    performanceQwertyPreset,
  ];
}

export function listGlyphPresets(): AsciiPreset[] {
  return [
    organicBloomPreset,
    digitalForestPreset,
    crtTerminalPreset,
    corruptedBroadcastPreset,
    flowFieldPreset,
    particleNebulaPreset,
    abstractGeometryPreset,
    minimalZenPreset,
  ];
}
