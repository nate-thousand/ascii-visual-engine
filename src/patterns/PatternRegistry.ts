import type { Pattern, PatternId, PatternSampleContext } from './Pattern';

export class PatternRegistry {
  private patterns = new Map<PatternId, Pattern>();
  private enabled = new Set<PatternId>();

  registerPattern(pattern: Pattern): void {
    if (this.patterns.has(pattern.id)) {
      throw new Error(`PatternRegistry: pattern "${pattern.id}" is already registered`);
    }
    this.patterns.set(pattern.id, pattern);
  }

  unregisterPattern(id: PatternId): void {
    const pattern = this.patterns.get(id);
    if (!pattern) return;
    pattern.destroy();
    this.patterns.delete(id);
    this.enabled.delete(id);
  }

  enablePattern(id: PatternId): void {
    if (!this.patterns.has(id)) {
      throw new Error(`PatternRegistry: unknown pattern "${id}"`);
    }
    this.enabled.add(id);
  }

  disablePattern(id: PatternId): void {
    this.enabled.delete(id);
  }

  getPattern(id: PatternId): Pattern | undefined {
    return this.patterns.get(id);
  }

  getEnabledPatterns(): Pattern[] {
    const result: Pattern[] = [];
    for (const id of this.enabled) {
      const pattern = this.patterns.get(id);
      if (pattern) result.push(pattern);
    }
    return result;
  }

  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  isEnabled(id: PatternId): boolean {
    return this.enabled.has(id);
  }

  setEnabledPatterns(ids: PatternId[]): void {
    this.enabled.clear();
    for (const id of ids) {
      if (this.patterns.has(id)) {
        this.enabled.add(id);
      }
    }
  }

  update(deltaTime: number, context: PatternSampleContext): void {
    for (const pattern of this.getEnabledPatterns()) {
      pattern.update(deltaTime, context);
    }
  }

  apply(context: PatternSampleContext): void {
    const enabled = this.getEnabledPatterns();
    if (enabled.length === 0) return;

    const { grid, glyphSet } = context;

    for (const cell of grid.cells) {
      const nx = cell.x / Math.max(grid.cols - 1, 1);
      const ny = cell.y / Math.max(grid.rows - 1, 1);

      let sum = 0;
      let weight = 0;

      for (const pattern of enabled) {
        const w = this.getPatternWeight(pattern.id, context);
        if (w <= 0) continue;
        sum += pattern.sample(nx, ny, context) * w;
        weight += w;
      }

      if (weight <= 0) continue;

      const value = sum / weight;
      cell.brightness = clamp01(cell.brightness * 0.25 + value * 0.75);

      const index = Math.floor(value * (glyphSet.length - 1));
      cell.char = glyphSet[Math.max(0, Math.min(glyphSet.length - 1, index))];
    }
  }

  destroy(): void {
    for (const pattern of this.patterns.values()) {
      pattern.destroy();
    }
    this.patterns.clear();
    this.enabled.clear();
  }

  private getPatternWeight(
    id: PatternId,
    context: PatternSampleContext,
  ): number {
    switch (id) {
      case 'spiral':
        return context.getControl('spiralAmount', 0.5);
      case 'cellular':
        return context.getControl('cellularAmount', 0.5);
      case 'scanline':
        return context.getControl('scanlineAmount', 0.5);
      case 'radialSymmetry':
        return Math.max(
          0.1,
          context.getControl('symmetry', 6) / 12,
        );
      default:
        return 1;
    }
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
