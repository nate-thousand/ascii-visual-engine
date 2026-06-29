import type { SequenceExportOptions } from './ExportTypes';
import type { ExportEngineBridge } from './ExportTypes';
import { padFrameIndex } from './gridUtils';
import { downloadBlob } from './ScreenshotExporter';
import { FrameRecorder, type CapturedFrame } from './FrameRecorder';

export class SequenceExporter {
  private recorder = new FrameRecorder();

  async exportFromFrames(
    frames: CapturedFrame[],
    options: SequenceExportOptions = {},
  ): Promise<{ ok: boolean; count: number; error?: string }> {
    const prefix = options.prefix ?? 'frame';
    let count = 0;

    for (const frame of frames) {
      if (!frame.png) continue;
      const name = `${prefix}-${padFrameIndex(frame.index + 1)}.png`;
      downloadBlob(name, frame.png);
      count++;
    }

    return { ok: count > 0, count, error: count === 0 ? 'No PNG frames available' : undefined };
  }

  async captureSequence(
    engine: ExportEngineBridge,
    frameCount: number,
    intervalMs: number,
  ): Promise<CapturedFrame[]> {
    const frames: CapturedFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push(await this.recorder.captureFrameAsync(engine, engine.getGridState().time, i));
      if (i < frameCount - 1 && intervalMs > 0) {
        await sleep(intervalMs);
      }
    }
    return frames;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function exportFrameSequence(
  frames: CapturedFrame[],
  options: SequenceExportOptions = {},
): Promise<{ ok: boolean; count: number; error?: string }> {
  return new SequenceExporter().exportFromFrames(frames, options);
}
