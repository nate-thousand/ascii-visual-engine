import type { GridState } from '../core/types';
import type { AsciiPreset } from '../core/types';
import type { AudioMappingConfig } from '../audio/AudioTypes';
import type { InputMappingConfig } from '../input/InputTypes';

export const SCENE_FORMAT_VERSION = 1;

export interface AsciiSceneDocument {
  version: number;
  metadata: {
    exportedAt: string;
    engineVersion: string;
    name?: string;
    description?: string;
  };
  preset: AsciiPreset;
  renderer: string | null;
  controls: Record<string, number>;
  enabledPlugins: string[];
  enabledMotions: string[];
  enabledSimulations: string[];
  inputMapping: InputMappingConfig;
  audioMapping: AudioMappingConfig;
  glyphSet: string[];
  grid?: GridState;
  camera?: {
    width: number;
    height: number;
    density: number;
  };
}
