export type {
  Motion,
  MotionContext,
  MotionBuffer,
  MotionConfig,
  MotionDebugInfo,
  MotionManagerDebugState,
  MotionControlName,
} from './Motion';
export {
  MOTION_CONTROLS,
  DEFAULT_MOTION_CONTROLS,
  createMotionBuffer,
  clearMotionBuffer,
} from './Motion';
export { MotionManager } from './MotionManager';
export {
  createBuiltInMotions,
  motionCatalog,
  listMotionIds,
  resolvePresetMotions,
} from './builtins';
export { clamp, clamp01, lerp, hash2, noise2, curlNoise, dist } from './motionMath';

export { FlowFieldMotion } from './motions/FlowFieldMotion';
export { OrganicGrowthMotion } from './motions/OrganicGrowthMotion';
export { OrbitalMotion } from './motions/OrbitalMotion';
export { WaveMotion } from './motions/WaveMotion';
export { GravityMotion } from './motions/GravityMotion';
export { BrownianMotion } from './motions/BrownianMotion';
export { FlockingMotion } from './motions/FlockingMotion';
export { WindMotion } from './motions/WindMotion';
export { PulseMotion } from './motions/PulseMotion';
export { BreathingMotion } from './motions/BreathingMotion';
export { SpiralMotion } from './motions/SpiralMotion';
export { CurlNoiseMotion } from './motions/CurlNoiseMotion';
