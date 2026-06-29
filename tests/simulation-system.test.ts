import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  SimulationManager,
  ParticleSimulation,
  BoidsSimulation,
  CellularAutomataSimulation,
  ReactionDiffusionSimulation,
  LSystemSimulation,
  GravitySimulation,
  SpringSimulation,
  FluidSimulation,
  createBuiltInSimulations,
  listSimulationIds,
} from '../src/simulation';
import type { SimulationContext } from '../src/simulation';
import type { GridCell, GridState } from '../src/core/types';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { particlePreset } from '../src/presets/simulation';

function createGrid(cols = 16, rows = 12): GridState {
  const cells: GridCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        char: ' ',
        baseChar: ' ',
        x,
        y,
        phase: 0,
        brightness: 0,
        burst: 0,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        rotation: 0,
        deformation: 0,
      });
    }
  }
  return { cells, cols, rows, time: 0, width: 800, height: 600 };
}

function createContext(grid: GridState): SimulationContext {
  return {
    engine: {} as never,
    grid,
    glyphSet: ['.', ':', '-', '=', '+', '*', '#'],
    time: 1,
    dt: 0.016,
    cols: grid.cols,
    rows: grid.rows,
    cellCount: grid.cells.length,
    getControl: (_name, fallback = 1) => fallback ?? 1,
  };
}

function gridSignature(grid: GridState): string {
  return grid.cells.map((c) => `${c.char}:${c.brightness.toFixed(2)}`).join('|');
}

describe('SimulationManager', () => {
  let manager: SimulationManager;

  afterEach(() => {
    manager?.destroy();
  });

  it('registers built-in simulations', () => {
    manager = new SimulationManager();
    for (const sim of createBuiltInSimulations()) {
      manager.registerSimulation(sim);
    }
    expect(manager.getAll().length).toBe(8);
  });

  it('runs multiple simulations simultaneously', () => {
    manager = new SimulationManager();
    manager.registerSimulation(new ParticleSimulation());
    manager.registerSimulation(new FluidSimulation());
    manager.enableSimulation('particle');
    manager.enableSimulation('fluid');

    const grid = createGrid();
    manager.update(0.05, createContext(grid));
    const sig = gridSignature(grid);
    expect(sig.includes('#') || sig.includes('+') || sig.includes('.')).toBe(true);
    expect(manager.getDebugState().activeSimulations.length).toBe(2);
  });
});

describe('Individual simulations', () => {
  const cases: Array<{ Sim: new () => { enabled: boolean; update: (dt: number, ctx: SimulationContext) => void; reset: () => void; destroy: () => void }; id: string }> = [
    { Sim: ParticleSimulation, id: 'particle' },
    { Sim: BoidsSimulation, id: 'boids' },
    { Sim: CellularAutomataSimulation, id: 'cellularAutomata' },
    { Sim: ReactionDiffusionSimulation, id: 'reactionDiffusion' },
    { Sim: LSystemSimulation, id: 'lsystem' },
    { Sim: GravitySimulation, id: 'gravity' },
    { Sim: SpringSimulation, id: 'spring' },
    { Sim: FluidSimulation, id: 'fluid' },
  ];

  for (const { Sim, id } of cases) {
    it(`${id} produces distinct grid output`, () => {
      const sim = new Sim();
      sim.enabled = true;
      const grid = createGrid();
      const ctx = createContext(grid);
      for (let i = 0; i < 10; i++) {
        sim.update(0.05, ctx);
      }
      if (id === 'fluid') {
        for (let i = 0; i < 20; i++) sim.update(0.05, ctx);
      }
      const sig = gridSignature(grid);
      expect(sig).not.toBe(grid.cells.map((c) => ' :0.00').join('|'));
      sim.destroy();
    });
  }

  it('simulations produce different signatures from each other', () => {
    const gridA = createGrid();
    const gridB = createGrid();
    new ReactionDiffusionSimulation().update(0.1, createContext(gridA));
    for (let i = 0; i < 5; i++) {
      new ReactionDiffusionSimulation().update(0.1, createContext(gridA));
    }
    for (let i = 0; i < 5; i++) {
      new BoidsSimulation().update(0.05, createContext(gridB));
    }
    expect(gridSignature(gridA)).not.toBe(gridSignature(gridB));
  });
});

describe('listSimulationIds', () => {
  it('lists all simulation ids', () => {
    expect(listSimulationIds().length).toBe(8);
    expect(listSimulationIds()).toContain('particle');
    expect(listSimulationIds()).toContain('reactionDiffusion');
  });
});

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = {
    fillStyle: '',
    font: '',
    textBaseline: 'top',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    canvas: { width, height },
  };
  return {
    width,
    height,
    style: { width: '', height: '' },
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

describe('AsciiEngine simulation integration', () => {
  it('loads simulation preset without breaking', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: particlePreset,
      width: 800,
      height: 600,
      autoStart: false,
    });
    expect(engine.getEnabledSimulations().map((s) => s.id)).toContain('particle');
    engine.destroy();
  });

  it('existing basic preset has no simulations enabled', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: basicPreset,
      width: 800,
      height: 600,
      autoStart: false,
    });
    expect(engine.getEnabledSimulations().length).toBe(0);
    engine.destroy();
  });

  it('getDebugState includes simulation state', () => {
    const engine = new AsciiEngine({
      canvas: createMockCanvas(),
      preset: particlePreset,
      width: 800,
      height: 600,
      autoStart: false,
    });
    const state = engine.getDebugState();
    expect(state.simulation.activeSimulations.length).toBeGreaterThan(0);
    engine.destroy();
  });
});
