import type { AsciiEngine } from '../core/AsciiEngine';
import type {
  Simulation,
  SimulationContext,
  SimulationDebugInfo,
  SimulationManagerDebugState,
} from './Simulation';

export class SimulationManager {
  private simulations = new Map<string, Simulation>();
  private engine: AsciiEngine | null = null;
  private lastUpdateTimeMs = 0;
  private lastFps = 0;
  private perSimTimeMs = new Map<string, number>();

  setEngine(engine: AsciiEngine): void {
    this.engine = engine;
  }

  setFps(fps: number): void {
    this.lastFps = fps;
  }

  registerSimulation(simulation: Simulation): void {
    if (this.simulations.has(simulation.id)) {
      throw new Error(`SimulationManager: simulation "${simulation.id}" is already registered`);
    }
    this.simulations.set(simulation.id, simulation);
    if (this.engine) {
      simulation.initialize(this.engine);
    }
  }

  unregisterSimulation(id: string): void {
    const simulation = this.simulations.get(id);
    if (!simulation) return;
    simulation.destroy();
    this.simulations.delete(id);
    this.perSimTimeMs.delete(id);
  }

  enableSimulation(id: string): void {
    const simulation = this.simulations.get(id);
    if (!simulation) {
      throw new Error(`SimulationManager: unknown simulation "${id}"`);
    }
    simulation.enabled = true;
  }

  disableSimulation(id: string): void {
    const simulation = this.simulations.get(id);
    if (!simulation) return;
    simulation.enabled = false;
  }

  getSimulation(id: string): Simulation | undefined {
    return this.simulations.get(id);
  }

  getAll(): Simulation[] {
    return Array.from(this.simulations.values());
  }

  getEnabled(): Simulation[] {
    return this.getAll().filter((s) => s.enabled);
  }

  setEnabledIds(configs: { id: string; enabled?: boolean }[]): void {
    for (const simulation of this.simulations.values()) {
      simulation.enabled = false;
    }
    for (const config of configs) {
      const simulation = this.simulations.get(config.id);
      if (!simulation) continue;
      simulation.enabled = config.enabled !== false;
    }
  }

  resetAll(): void {
    for (const simulation of this.simulations.values()) {
      simulation.reset();
    }
  }

  update(deltaTime: number, context: SimulationContext): void {
    const start = performance.now();
    const enabled = this.getEnabled();
    for (const simulation of enabled) {
      const simStart = performance.now();
      simulation.update(deltaTime, context);
      this.perSimTimeMs.set(simulation.id, performance.now() - simStart);
    }
    this.lastUpdateTimeMs = performance.now() - start;
  }

  isActive(): boolean {
    return this.getEnabled().length > 0;
  }

  getDebugState(): SimulationManagerDebugState {
    const enabled = this.getEnabled();
    let totalParticles = 0;
    let totalMemory = 0;
    const activeSimulations: SimulationDebugInfo[] = enabled.map((sim) => {
      totalParticles += sim.getParticleCount();
      totalMemory += sim.getMemoryBytes();
      return {
        id: sim.id,
        name: sim.name,
        enabled: sim.enabled,
        particleCount: sim.getParticleCount(),
        memoryBytes: sim.getMemoryBytes(),
        updateTimeMs: this.perSimTimeMs.get(sim.id) ?? 0,
      };
    });

    return {
      activeSimulations,
      totalParticles,
      totalMemoryBytes: totalMemory,
      updateTimeMs: this.lastUpdateTimeMs,
      fps: this.lastFps,
    };
  }

  destroy(): void {
    for (const simulation of this.simulations.values()) {
      simulation.destroy();
    }
    this.simulations.clear();
    this.perSimTimeMs.clear();
    this.engine = null;
  }
}
