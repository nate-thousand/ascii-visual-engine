import type { GridCell, GridState } from '../core/types';
import type { Glyph, GlyphCellState, GlyphPickContext } from './Glyph';
import { glyphUnicode } from './Glyph';
import { classifyRole, estimateCurvature, estimateNoise, rolePickIndex } from './GlyphClassifier';
import type { GlyphAtlas } from './GlyphAtlas';
import type { GlyphLanguageConfig } from './Glyph';
import { resolveRoleCategory } from './GlyphLanguage';

export interface GlyphGeneratorContext {
  time: number;
  cols: number;
  rows: number;
  audioAmplitude?: number;
  motionStrength?: number;
  simulationEnergy?: number;
  density?: number;
}

export class GlyphGenerator {
  private cellStates: GlyphCellState[] = [];
  private pickScratch: GlyphPickContext[] = [];

  ensureCapacity(count: number): void {
    const prev = this.cellStates.length;
    if (prev >= count) return;
    this.cellStates.length = count;
    this.pickScratch.length = count;
    for (let i = prev; i < count; i++) {
      this.cellStates[i] = {
        role: 'fill',
        category: 'minimal',
        glyphId: '',
        character: '.',
        morphProgress: 0,
        morphIndex: 0,
        animPhase: 0,
        animKind: null,
        weight: 0.5,
        density: 0.5,
        unicode: 46,
      };
    }
  }

  buildPickContext(
    cell: GridCell,
    grid: GridState,
    ctx: GlyphGeneratorContext,
  ): GlyphPickContext {
    const nx = cell.x / Math.max(grid.cols - 1, 1);
    const ny = cell.y / Math.max(grid.rows - 1, 1);
    const velocity = Math.sqrt(cell.vx * cell.vx + cell.vy * cell.vy);

    return {
      brightness: cell.brightness,
      velocity: Math.min(1, velocity * 4),
      density: ctx.density ?? 0.5,
      curvature: estimateCurvature(nx, ny, cell.phase),
      noise: estimateNoise(nx, ny, ctx.time),
      burst: cell.burst,
      audioAmplitude: ctx.audioAmplitude ?? 0,
      motionStrength: ctx.motionStrength ?? 0,
      simulationEnergy: ctx.simulationEnergy ?? 0,
      x: nx,
      y: ny,
      phase: cell.phase,
      time: ctx.time,
    };
  }

  pickGlyph(
    pickCtx: GlyphPickContext,
    language: GlyphLanguageConfig,
    atlas: GlyphAtlas,
  ): { glyph: Glyph; role: ReturnType<typeof classifyRole> } {
    const role = classifyRole(pickCtx);
    const category = resolveRoleCategory(role, language);
    const glyphs = atlas.getCategoryGlyphList(category);
    const index = rolePickIndex(role, pickCtx, glyphs.length);
    const glyph = glyphs[index] ?? glyphs[0];
    return { glyph, role };
  }

  updateCellStates(
    grid: GridState,
    language: GlyphLanguageConfig,
    atlas: GlyphAtlas,
    ctx: GlyphGeneratorContext,
  ): GlyphCellState[] {
    this.ensureCapacity(grid.cells.length);

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i];
      const pickCtx = this.buildPickContext(cell, grid, ctx);
      const { glyph, role } = this.pickGlyph(pickCtx, language, atlas);
      const category = resolveRoleCategory(role, language);
      const state = this.cellStates[i];

      state.role = role;
      state.category = category;
      state.glyphId = glyph.id;
      state.character = glyph.character;
      state.weight = glyph.weight;
      state.density = glyph.density;
      state.unicode = glyphUnicode(glyph.character);
      state.animPhase = pickCtx.phase;
    }

    return this.cellStates;
  }

  getCellState(index: number): GlyphCellState | null {
    return this.cellStates[index] ?? null;
  }

  /** Legacy brightness → glyphSet fallback */
  pickByBrightness(brightness: number, glyphSet: string[]): string {
    if (glyphSet.length === 0) return ' ';
    if (glyphSet.length === 1) return glyphSet[0];
    const index = Math.floor(Math.max(0, Math.min(1, brightness)) * (glyphSet.length - 1));
    return glyphSet[Math.max(0, Math.min(glyphSet.length - 1, index))];
  }
}

export function mapBrightnessToGlyph(brightness: number, glyphSet: string[]): string {
  const gen = brightnessMapper;
  return gen.pickByBrightness(brightness, glyphSet);
}

const brightnessMapper = new GlyphGenerator();
