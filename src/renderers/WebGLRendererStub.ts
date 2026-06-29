import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import { GridBuffer } from './GridBuffer';
import type { RenderContext, RenderFrame, Renderer } from './Renderer';

/**
 * WebGL renderer stub — interface and grid host only.
 *
 * Full GPU-accelerated ASCII rendering is planned for a future milestone.
 * This class registers the renderer pipeline slot without performing draws.
 */
export class WebGLRendererStub implements Renderer {
  readonly id = 'webgl' as const;
  readonly name = 'WebGL (Planned)';
  readonly type = 'webgl' as const;

  private grid: GridBuffer;
  private initialized = false;

  constructor(options: { width: number; height: number; density: number; glyphSet: string[] }) {
    this.grid = new GridBuffer(options);
  }

  initialize(_engine: AsciiEngine): void {
    this.initialized = true;
  }

  getGridState(time: number): GridState {
    return this.grid.getGridState(time);
  }

  getDimensions(): GridDimensions {
    return this.grid.getDimensions();
  }

  setDensity(density: number): void {
    this.grid.setDensity(density);
  }

  setGlyphSet(glyphSet: string[]): void {
    this.grid.setGlyphSet(glyphSet);
  }

  importGridState(state: GridState): void {
    this.grid.importGridState(state);
  }

  resize(width: number, height: number): void {
    this.grid.resize(width, height);
  }

  render(_frame: RenderFrame, _context: RenderContext): void {
    // Stub — no GPU draw path yet. Grid pipeline still runs for future integration.
    void this.initialized;
  }

  destroy(): void {
    this.grid.clear();
    this.initialized = false;
  }

  isAvailable(): boolean {
    return false;
  }

  supportsLiveSwitch(): boolean {
    return false;
  }

  getSwitchWarning(): string | null {
    return 'WebGL renderer is not yet implemented. GPU-accelerated ASCII output is planned for a future release.';
  }
}
