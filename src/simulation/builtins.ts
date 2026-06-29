import type { Simulation, SimulationConfig } from './Simulation';
import { ParticleSimulation } from './simulations/ParticleSimulation';
import { BoidsSimulation } from './simulations/BoidsSimulation';
import { CellularAutomataSimulation } from './simulations/CellularAutomataSimulation';
import { ReactionDiffusionSimulation } from './simulations/ReactionDiffusionSimulation';
import { LSystemSimulation } from './simulations/LSystemSimulation';
import { GravitySimulation } from './simulations/GravitySimulation';
import { SpringSimulation } from './simulations/SpringSimulation';
import { FluidSimulation } from './simulations/FluidSimulation';

export function createBuiltInSimulations(): Simulation[] {
  return [
    new ParticleSimulation(),
    new BoidsSimulation(),
    new CellularAutomataSimulation(),
    new ReactionDiffusionSimulation(),
    new LSystemSimulation(),
    new GravitySimulation(),
    new SpringSimulation(),
    new FluidSimulation(),
  ];
}

export const simulationCatalog = {
  particle: { id: 'particle', name: 'Particle System' },
  boids: { id: 'boids', name: 'Boids Flocking' },
  cellularAutomata: { id: 'cellularAutomata', name: 'Cellular Automata' },
  reactionDiffusion: { id: 'reactionDiffusion', name: 'Reaction Diffusion' },
  lsystem: { id: 'lsystem', name: 'L-System' },
  gravity: { id: 'gravity', name: 'Gravity Wells' },
  spring: { id: 'spring', name: 'Spring Network' },
  fluid: { id: 'fluid', name: 'Fluid Field' },
} as const;

export function listSimulationIds(): string[] {
  return Object.values(simulationCatalog).map((s) => s.id);
}

export function resolvePresetSimulations(preset: {
  simulations?: SimulationConfig[];
}): SimulationConfig[] {
  if (!preset.simulations?.length) return [];
  return preset.simulations.filter((s) => s.enabled !== false);
}
