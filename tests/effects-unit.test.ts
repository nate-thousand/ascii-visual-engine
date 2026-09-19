import { describe, it, expect, vi, afterEach } from 'vitest';
import { NoiseField } from '../src/effects/NoiseField';
import { WaveField } from '../src/effects/WaveField';
import { Glitch } from '../src/effects/Glitch';
import { GlyphBurst } from '../src/effects/GlyphBurst';
import { Trails } from '../src/effects/Trails';
import type { EffectContext, GridCell, GridState } from '../src/core/types';

function makeGrid(cols = 12, rows = 8): GridState {
  const cells: GridCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ char: '?', baseChar: '?', x, y, phase: 0, brightness: 0.5, burst: 0, ox: 0, oy: 0, vx: 0, vy: 0, scale: 1, rotation: 0, deformation: 0 });
    }
  }
  return { cells, cols, rows, time: 0, width: cols * 10, height: rows * 16 };
}

const GLYPHS = ['.', ':', '-', '=', '+', '*', '#', '@'];

function ctx(grid: GridState, overrides: Partial<EffectContext> = {}): EffectContext {
  return { grid, glyphSet: GLYPHS, speed: 1, glitchAmount: 0, trailAmount: 0, dt: 1 / 60, time: 0, ...overrides };
}

const inRange = (cells: GridCell[]) => cells.every((c) => c.brightness >= 0 && c.brightness <= 1 && GLYPHS.includes(c.char));

describe('NoiseField', () => {
  it('writes every cell a glyph from the set and a brightness in [floor, 1]', () => {
    const grid = makeGrid();
    new NoiseField().update(ctx(grid, { time: 1.3 }));
    expect(inRange(grid.cells)).toBe(true);
    expect(grid.cells.every((c) => c.brightness >= 0.4)).toBe(true);
    expect(new Set(grid.cells.map((c) => c.char)).size).toBeGreaterThan(1);
  });

  it('is deterministic in time and speed, and moves when either advances', () => {
    const a = makeGrid();
    const b = makeGrid();
    const noise = new NoiseField();
    noise.update(ctx(a, { time: 2 }));
    noise.update(ctx(b, { time: 2 }));
    expect(b.cells.map((c) => c.brightness)).toEqual(a.cells.map((c) => c.brightness));

    const later = makeGrid();
    noise.update(ctx(later, { time: 2.5 }));
    expect(later.cells.map((c) => c.brightness)).not.toEqual(a.cells.map((c) => c.brightness));

    const faster = makeGrid();
    noise.update(ctx(faster, { time: 2, speed: 2 }));
    expect(faster.cells.map((c) => c.brightness)).not.toEqual(a.cells.map((c) => c.brightness));
  });

  it('floor raises the darkest cell and scales come through', () => {
    const noise = new NoiseField();
    noise.setParams({ floor: 0.8 });
    const grid = makeGrid();
    noise.update(ctx(grid, { time: 1 }));
    expect(Math.min(...grid.cells.map((c) => c.brightness))).toBeGreaterThanOrEqual(0.8);

    const wide = new NoiseField();
    wide.setParams({ scaleX: 0.05, scaleY: 0.05 });
    const g2 = makeGrid();
    wide.update(ctx(g2, { time: 1 }));
    // Low frequency: neighbors differ less than at the default scale.
    const diff = (g: GridState) => Math.abs(g.cells[0].brightness - g.cells[1].brightness);
    const g3 = makeGrid();
    new NoiseField().update(ctx(g3, { time: 1 }));
    expect(diff(g2)).toBeLessThan(diff(g3));
  });

  it('cell phase offsets the glyph choice without touching brightness', () => {
    const a = makeGrid(1, 1);
    const b = makeGrid(1, 1);
    b.cells[0].phase = 3;
    const noise = new NoiseField();
    noise.update(ctx(a, { time: 0.7 }));
    noise.update(ctx(b, { time: 0.7 }));
    expect(b.cells[0].brightness).toBe(a.cells[0].brightness);
    expect(b.cells[0].char).not.toBe(a.cells[0].char);
  });
});

describe('WaveField', () => {
  it('maps the wave sum to glyph index and brightness in [floor, 1]', () => {
    const grid = makeGrid();
    new WaveField().update(ctx(grid, { time: 0.4 }));
    expect(inRange(grid.cells)).toBe(true);
    expect(grid.cells.every((c) => c.brightness >= 0.3)).toBe(true);
    // Brighter cells get later glyphs: monotone mapping.
    const sorted = [...grid.cells].sort((a, b) => a.brightness - b.brightness);
    for (let i = 1; i < sorted.length; i++) {
      expect(GLYPHS.indexOf(sorted[i].char)).toBeGreaterThanOrEqual(GLYPHS.indexOf(sorted[i - 1].char));
    }
  });

  it('time zero is a pure function of position', () => {
    const grid = makeGrid(4, 1);
    new WaveField().update(ctx(grid, { time: 0 }));
    const expected = grid.cells.map((c) => 0.3 + ((Math.sin(c.x * 0.3) + Math.sin(0)) + 2) / 4 * 0.7);
    grid.cells.forEach((c, i) => expect(c.brightness).toBeCloseTo(expected[i], 10));
  });

  it('a zero floor uses the full range', () => {
    const wave = new WaveField();
    wave.setParams({ floor: 0, scaleX: 2, scaleY: 2 });
    const grid = makeGrid(40, 40);
    wave.update(ctx(grid, { time: 0.25 }));
    const values = grid.cells.map((c) => c.brightness);
    expect(Math.min(...values)).toBeLessThan(0.15);
    expect(Math.max(...values)).toBeGreaterThan(0.85);
  });
});

describe('Glitch', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing at glitchAmount 0', () => {
    const grid = makeGrid();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    new Glitch().update(ctx(grid, { glitchAmount: 0 }));
    expect(grid.cells.every((c) => c.char === '?' && c.brightness === 0.5)).toBe(true);
  });

  it('corrupts a share of cells proportional to glitchAmount times rate', () => {
    // A deterministic "random" ramp: each call returns the next value in [0, 1).
    let n = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ((n++ * 0.6180339887) % 1));
    const grid = makeGrid(50, 40);
    new Glitch().update(ctx(grid, { glitchAmount: 1 }));
    const hit = grid.cells.filter((c) => c.char !== '?').length;
    const share = hit / grid.cells.length;
    // Default rate 0.28; the ramp is uniform so the hit share lands near it.
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.36);
    expect(grid.cells.filter((c) => c.char !== '?').every((c) => c.brightness >= 0 && c.brightness <= 1)).toBe(true);
  });

  it('symbolShare decides between glitch symbols and the glyph set', () => {
    let n = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ((n++ * 0.6180339887) % 1));
    const onlySet = new Glitch();
    onlySet.setParams({ rate: 1, symbolShare: 0 });
    const a = makeGrid(20, 10);
    onlySet.update(ctx(a, { glitchAmount: 1 }));
    expect(a.cells.every((c) => GLYPHS.includes(c.char))).toBe(true);

    n = 0;
    const onlySymbols = new Glitch();
    onlySymbols.setParams({ rate: 1, symbolShare: 1 });
    const b = makeGrid(20, 10);
    for (const c of b.cells) c.char = 'Z';
    onlySymbols.update(ctx(b, { glitchAmount: 1 }));
    const GLITCH_CHARS = '@#$%&!?<>{}[]|\\/~';
    expect(b.cells.every((c) => c.char !== 'Z' && GLITCH_CHARS.includes(c.char))).toBe(true);
  });
});

describe('GlyphBurst', () => {
  it('a noteOn adds a burst that brightens cells near it and fades with age', () => {
    const burst = new GlyphBurst();
    burst.onNoteOn({ x: 0.5, y: 0.5, intensity: 1 });
    const grid = makeGrid(21, 21);
    burst.update(ctx(grid, { dt: 0.016 }));
    const center = grid.cells.find((c) => c.x === 10 && c.y === 10)!;
    const corner = grid.cells.find((c) => c.x === 0 && c.y === 0)!;
    expect(center.burst).toBeGreaterThan(0.5);
    expect(center.brightness).toBe(1);
    expect(corner.burst).toBe(0);

    // Age it out: maxAge = life 0.9 + intensity 0.7 = 1.6 s.
    const later = makeGrid(21, 21);
    for (let i = 0; i < 100; i++) burst.update(ctx(makeGrid(1, 1), { dt: 0.016 }));
    burst.update(ctx(later, { dt: 0.016 }));
    expect(later.cells.every((c) => c.burst === 0)).toBe(true);
  });

  it('intensity widens the radius and gain scales the burst value', () => {
    const soft = new GlyphBurst();
    soft.onNoteOn({ x: 0.5, y: 0.5, intensity: 0.5 });
    const loud = new GlyphBurst();
    loud.onNoteOn({ x: 0.5, y: 0.5, intensity: 2 });
    const a = makeGrid(41, 41);
    const b = makeGrid(41, 41);
    soft.update(ctx(a, { dt: 0.001 }));
    loud.update(ctx(b, { dt: 0.001 }));
    const lit = (g: GridState) => g.cells.filter((c) => c.burst > 0).length;
    expect(lit(b)).toBeGreaterThan(lit(a));

    const quiet = new GlyphBurst();
    quiet.setParams({ gain: 0.2 });
    quiet.onNoteOn({ x: 0.5, y: 0.5, intensity: 1 });
    const c = makeGrid(21, 21);
    quiet.update(ctx(c, { dt: 0.001 }));
    const center = (g: GridState) => g.cells.find((x) => x.x === 10 && x.y === 10)!.burst;
    const stock = new GlyphBurst();
    stock.onNoteOn({ x: 0.5, y: 0.5, intensity: 1 });
    const d = makeGrid(21, 21);
    stock.update(ctx(d, { dt: 0.001 }));
    expect(center(c)).toBeCloseTo(center(d) * (0.2 / 1.4), 6);
  });

  it('random position when the note has none; reset drops every burst', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const burst = new GlyphBurst();
    burst.onNoteOn({});
    const grid = makeGrid(21, 21);
    burst.update(ctx(grid, { dt: 0.001 }));
    const brightest = grid.cells.reduce((m, c) => (c.burst > m.burst ? c : m));
    expect(brightest.x).toBe(5);
    expect(brightest.y).toBe(5);
    burst.reset();
    const after = makeGrid(21, 21);
    burst.update(ctx(after, { dt: 0.001 }));
    expect(after.cells.every((c) => c.burst === 0)).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('Trails', () => {
  it('decays burst by trailAmount times decay per frame and snaps small values to zero', () => {
    const trails = new Trails();
    const grid = makeGrid(2, 1);
    grid.cells[0].burst = 1;
    grid.cells[1].burst = 0.0105;
    trails.update(ctx(grid, { trailAmount: 0.5 }));
    expect(grid.cells[0].burst).toBeCloseTo(1 - 0.5 * 0.15, 10);
    expect(grid.cells[1].burst).toBe(0);

    trails.setParams({ decay: 1 });
    grid.cells[0].burst = 1;
    trails.update(ctx(grid, { trailAmount: 1 }));
    expect(grid.cells[0].burst).toBe(0);
  });

  it('leaves the grid alone at trailAmount 0', () => {
    const grid = makeGrid(1, 1);
    grid.cells[0].burst = 0.9;
    new Trails().update(ctx(grid, { trailAmount: 0 }));
    expect(grid.cells[0].burst).toBe(0.9);
  });

  it('applyFade covers the whole backing store at identity and restores the transform', () => {
    const calls: string[] = [];
    const fake = {
      fillStyle: '',
      canvas: { width: 640, height: 480 },
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      setTransform: (...a: number[]) => calls.push(`setTransform ${a.join(',')}`),
      fillRect: (...a: number[]) => calls.push(`fillRect ${a.join(',')}`),
    } as unknown as CanvasRenderingContext2D;
    const trails = new Trails();
    trails.applyFade(fake, 0.5);
    expect(calls).toEqual(['save', 'setTransform 1,0,0,1,0,0', 'fillRect 0,0,640,480', 'restore']);
    expect(fake.fillStyle).toBe(`rgba(0, 0, 0, ${0.12 + 0.5 * 0.86})`);

    calls.length = 0;
    trails.applyFade(fake, 0);
    expect(calls).toEqual([]);

    trails.applyFade(fake, 1);
    expect(fake.fillStyle).toBe('rgba(0, 0, 0, 0.98)');
  });
});
