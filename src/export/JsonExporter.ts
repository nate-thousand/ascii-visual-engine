import type { ExportEngineBridge } from './ExportTypes';
import type { AsciiSceneDocument } from './SceneFormat';
import { SCENE_FORMAT_VERSION } from './SceneFormat';

function cloneJson<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
import { cloneGridState, gridToAscii } from './gridUtils';

export function buildSceneDocument(engine: ExportEngineBridge, name?: string): AsciiSceneDocument {
  const debug = engine.getDebugState();
  return {
    version: SCENE_FORMAT_VERSION,
    metadata: {
      exportedAt: new Date().toISOString(),
      engineVersion: '0.1.0',
      name: name ?? engine.getPreset().name,
    },
    preset: cloneJson(engine.getPreset()),
    renderer: engine.getActiveRendererId(),
    controls: engine.getControls(),
    enabledPlugins: debug.effects,
    enabledMotions: debug.motions,
    enabledSimulations: debug.simulation.activeSimulations.map((s: { id: string }) => s.id),
    inputMapping: cloneJson(engine.getInputMapping()),
    audioMapping: cloneJson(engine.getAudioMapping()),
    glyphSet: [...engine.getResolvedGlyphSet()],
    grid: cloneGridState(engine.getGridState()),
    camera: {
      width: engine.getGridState().width,
      height: engine.getGridState().height,
      density: debug.density,
    },
  };
}

export function serializeScene(doc: AsciiSceneDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseScene(json: string): AsciiSceneDocument {
  const doc = JSON.parse(json) as AsciiSceneDocument;
  if (!doc.version || !doc.preset) {
    throw new Error('Invalid scene document: missing version or preset');
  }
  return doc;
}

export function exportSceneJson(engine: ExportEngineBridge, name?: string): string {
  return serializeScene(buildSceneDocument(engine, name));
}

export function importSceneJson(engine: ExportEngineBridge, json: string): AsciiSceneDocument {
  const doc = parseScene(json);
  engine.applySceneDocument(doc);
  return doc;
}

export function downloadJson(filename: string, json: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsciiFromGrid(
  grid: import('../core/types').GridState,
  options: { format?: 'plain' | 'ansi' | 'unicode'; lineEnding?: string } = {},
): string {
  const text = gridToAscii(grid);
  const ending = options.lineEnding ?? '\n';
  if (options.format === 'ansi') {
    return text.split('\n').map((line) => `\x1b[32m${line}\x1b[0m`).join(ending);
  }
  return text.split('\n').join(ending);
}

export { SCENE_FORMAT_VERSION };
export type { AsciiSceneDocument };
