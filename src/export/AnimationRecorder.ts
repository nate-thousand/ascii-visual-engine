import type { GridState } from '../core/types';
import type { ExportEngineBridge, RecordedFrame } from './ExportTypes';
import { cloneGridState } from './gridUtils';
import { FrameRecorder } from './FrameRecorder';
import { captureCanvasBlob } from './ScreenshotExporter';

export class AnimationRecorder {
  private frameRecorder = new FrameRecorder();
  private frames: RecordedFrame[] = [];
  private frameRate = 30;
  private startTime = 0;
  private lastCaptureTime = 0;
  private captureInterval = 1 / 30;

  reset(): void {
    this.frames = [];
    this.startTime = 0;
    this.lastCaptureTime = 0;
  }

  setFrameRate(fps: number): void {
    this.frameRate = Math.max(1, fps);
    this.captureInterval = 1 / this.frameRate;
  }

  getFrameRate(): number {
    return this.frameRate;
  }

  getFrames(): RecordedFrame[] {
    return this.frames;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getDuration(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].time - this.frames[0].time;
  }

  shouldCapture(time: number): boolean {
    if (this.frames.length === 0) return true;
    return time - this.lastCaptureTime >= this.captureInterval;
  }

  captureIfDue(engine: ExportEngineBridge, time: number): RecordedFrame | null {
    if (!this.shouldCapture(time)) return null;
    return this.capture(engine, time);
  }

  capture(engine: ExportEngineBridge, time: number): RecordedFrame {
    const index = this.frames.length;
    const grid = cloneGridState(engine.getGridState());
    const frame: RecordedFrame = { index, time, grid };
    this.frames.push(frame);
    this.lastCaptureTime = time;
    if (this.startTime === 0) this.startTime = time;

    const canvas = engine.getCanvas();
    if (canvas) {
      void captureCanvasBlob(canvas).then((blob) => {
        frame.png = blob;
      });
    }

    return frame;
  }

  async captureAsync(engine: ExportEngineBridge, time: number): Promise<RecordedFrame> {
    const captured = await this.frameRecorder.captureFrameAsync(engine, time, this.frames.length);
    const frame: RecordedFrame = {
      index: captured.index,
      time: captured.time,
      grid: captured.grid,
      png: captured.png,
    };
    this.frames.push(frame);
    this.lastCaptureTime = time;
    if (this.startTime === 0) this.startTime = time;
    return frame;
  }

  getGridAt(index: number): GridState | null {
    return this.frames[index]?.grid ?? null;
  }
}

export function restoreGridToEngine(
  engine: ExportEngineBridge,
  grid: GridState,
  rendererManager: { importGridState: (s: GridState) => void },
): void {
  rendererManager.importGridState(grid);
  void engine;
}
