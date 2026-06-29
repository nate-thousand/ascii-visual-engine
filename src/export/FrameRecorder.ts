import type { GridState } from '../core/types';
import type { ExportEngineBridge } from './ExportTypes';
import { cloneGridState } from './gridUtils';
import { captureCanvasBlob } from './ScreenshotExporter';

export interface CapturedFrame {
  index: number;
  time: number;
  grid: GridState;
  png?: Blob;
}

export class FrameRecorder {
  captureFrame(engine: ExportEngineBridge, time: number, index: number): CapturedFrame {
    const grid = cloneGridState(engine.getGridState());
    const frame: CapturedFrame = { index, time, grid };

    const canvas = engine.getCanvas();
    if (canvas && typeof document !== 'undefined') {
      void captureCanvasBlob(canvas).then((blob) => {
        frame.png = blob;
      });
    }

    return frame;
  }

  async captureFrameAsync(
    engine: ExportEngineBridge,
    time: number,
    index: number,
  ): Promise<CapturedFrame> {
    const grid = cloneGridState(engine.getGridState());
    const canvas = engine.getCanvas();
    let png: Blob | undefined;
    if (canvas) {
      png = await captureCanvasBlob(canvas);
    }
    return { index, time, grid, png };
  }
}
