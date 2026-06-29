import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AsciiEngine } from '../src/core/AsciiEngine';
import { basicPreset } from '../src/presets/basic';
import { terminalPreset } from '../src/presets/terminal';
import { organicPreset } from '../src/presets/organic';
import type { AsciiPreset } from '../src/core/types';
import { createMockCanvas, stubAnimationFrame, gridFingerprint } from './helpers/mockCanvas';

function runPresetSnapshot(preset: AsciiPreset, frames = 60): string {
  const { advanceFrames } = stubAnimationFrame();
  const engine = new AsciiEngine({
    canvas: createMockCanvas(640, 480),
    preset,
    width: 640,
    height: 480,
    autoStart: true,
  });

  engine.disablePlugin('glitch');
  engine.setControl('glitchAmount', 0);
  advanceFrames(frames);

  const cells = engine.getRendererManager().getGridState(0).cells;
  const fingerprint = gridFingerprint(cells);
  engine.destroy();
  return fingerprint;
}

describe('Visual grid snapshots', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('basic preset grid fingerprint', () => {
    expect(runPresetSnapshot(basicPreset)).toMatchSnapshot();
  });

  it('terminal preset grid fingerprint', () => {
    expect(runPresetSnapshot(terminalPreset)).toMatchSnapshot();
  });

  it('organic preset grid fingerprint', () => {
    expect(runPresetSnapshot(organicPreset)).toMatchSnapshot();
  });
});
