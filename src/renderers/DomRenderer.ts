import type { AsciiEngine } from '../core/AsciiEngine';
import type { GridDimensions, GridState } from '../core/types';
import { GridBuffer } from './GridBuffer';
import type { RenderContext, RenderFrame, Renderer } from './Renderer';

export interface DomRendererOptions {
  element: HTMLElement;
  width: number;
  height: number;
  density: number;
  glyphSet: string[];
  color?: string;
  backgroundColor?: string;
}

export class DomRenderer implements Renderer {
  readonly id = 'dom' as const;
  readonly name = 'DOM Text';
  readonly type = 'dom' as const;

  private element: HTMLElement;
  private grid: GridBuffer;
  private color: string;
  private backgroundColor: string;

  constructor(options: DomRendererOptions) {
    this.element = options.element;
    this.color = options.color ?? '#00ff88';
    this.backgroundColor = options.backgroundColor ?? '#000000';

    this.grid = new GridBuffer({
      width: options.width,
      height: options.height,
      density: options.density,
      glyphSet: options.glyphSet,
    });

    this.applyElementStyles();
  }

  initialize(_engine: AsciiEngine): void {}

  getElement(): HTMLElement {
    return this.element;
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

  render(frame: RenderFrame, _context: RenderContext): void {
    void frame;
    const { cols, rows } = this.grid.getDimensions();
    const cells = this.grid.getGridState(0).cells;
    const lines: string[] = [];

    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const cell = cells[y * cols + x];
        line += cell?.char ?? ' ';
      }
      lines.push(line);
    }

    this.element.textContent = lines.join('\n');
  }

  destroy(): void {
    this.grid.clear();
    this.element.textContent = '';
  }

  isAvailable(): boolean {
    return Boolean(this.element);
  }

  supportsLiveSwitch(): boolean {
    return true;
  }

  getSwitchWarning(): string | null {
    return 'DOM renderer does not support trail fade — trails appear as full rewrites.';
  }

  private applyElementStyles(): void {
    this.element.style.color = this.color;
    this.element.style.backgroundColor = this.backgroundColor;
    this.element.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    this.element.style.whiteSpace = 'pre';
    this.element.style.overflow = 'hidden';
    this.element.style.margin = '0';
    this.element.style.padding = '0';
    this.element.style.lineHeight = '1';
    this.element.style.fontSize = `${this.grid.getDimensions().cellHeight}px`;
  }
}
