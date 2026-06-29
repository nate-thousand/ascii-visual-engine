export interface GlyphMetrics {
  width: number;
  height: number;
  advance: number;
  bearingX: number;
  bearingY: number;
}

export interface GlyphCacheStats {
  hits: number;
  misses: number;
  size: number;
  atlasGenerations: number;
}

export class GlyphCache {
  private cache = new Map<string, GlyphMetrics>();
  private hits = 0;
  private misses = 0;
  private atlasGenerations = 0;
  private fontKey = '';

  setFont(font: string): void {
    if (font !== this.fontKey) {
      this.fontKey = font;
      this.cache.clear();
      this.atlasGenerations++;
    }
  }

  measure(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    char: string,
    font: string,
  ): GlyphMetrics {
    this.setFont(font);
    const key = `${font}:${char}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;
    if (typeof ctx.measureText !== 'function') {
      return { width: 8, height: 12, advance: 8, bearingX: 0, bearingY: 8 };
    }
    ctx.font = font;
    const metrics = ctx.measureText(char);
    const width = metrics.width;
    const advance = metrics.width;
    const result: GlyphMetrics = {
      width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || width,
      advance,
      bearingX: metrics.actualBoundingBoxLeft ?? 0,
      bearingY: metrics.actualBoundingBoxAscent ?? 0,
    };
    this.cache.set(key, result);
    return result;
  }

  getKerning(_left: string, _right: string): number {
    return 0;
  }

  getSpacing(char: string, font: string): number {
    const key = `${font}:${char}:spacing`;
    const cached = this.cache.get(key);
    if (cached) return cached.advance;
    return 0;
  }

  prewarm(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    chars: string[],
    font: string,
  ): void {
    for (const char of chars) {
      this.measure(ctx, char, font);
    }
  }

  getStats(): GlyphCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      atlasGenerations: this.atlasGenerations,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
