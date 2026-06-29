import type { ExportEngineBridge } from '../export/ExportTypes';
import type { RecordedFrame, PlaybackStatus } from '../export/ExportTypes';

export class PlaybackSession {
  private frames: RecordedFrame[] = [];
  private importGrid: ((grid: import('../core/types').GridState) => void) | null = null;
  private frameIndex = 0;
  private playing = false;
  private paused = false;
  private loop = false;
  private speed = 1;
  private rafId: number | null = null;
  private lastTime = 0;
  private frameRate = 30;

  setEngine(_engine: ExportEngineBridge, importGrid: (grid: import('../core/types').GridState) => void): void {
    this.importGrid = importGrid;
  }

  loadFrames(frames: RecordedFrame[]): void {
    this.stop();
    this.frames = frames;
    this.frameIndex = 0;
  }

  play(options: { loop?: boolean; speed?: number; frameRate?: number } = {}): void {
    if (this.frames.length === 0 || !this.importGrid) return;
    this.loop = options.loop ?? false;
    this.speed = options.speed ?? 1;
    this.frameRate = options.frameRate ?? 30;
    this.playing = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.showFrame(this.frameIndex);
    this.scheduleStep();
  }

  pause(): void {
    this.paused = true;
    this.playing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.frames.length === 0) return;
    this.paused = false;
    this.playing = true;
    this.lastTime = performance.now();
    this.scheduleStep();
  }

  stop(): void {
    this.playing = false;
    this.paused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  step(delta: number): void {
    if (this.frames.length === 0 || !this.importGrid) return;
    this.frameIndex = Math.max(0, Math.min(this.frames.length - 1, this.frameIndex + delta));
    this.showFrame(this.frameIndex);
  }

  scrub(index: number): void {
    if (this.frames.length === 0 || !this.importGrid) return;
    this.frameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
    this.showFrame(this.frameIndex);
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, speed);
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  getStatus(): PlaybackStatus {
    const frame = this.frames[this.frameIndex];
    return {
      playing: this.playing,
      paused: this.paused,
      frameIndex: this.frameIndex,
      frameCount: this.frames.length,
      speed: this.speed,
      loop: this.loop,
      time: frame?.time ?? 0,
    };
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  private showFrame(index: number): void {
    const frame = this.frames[index];
    if (frame && this.importGrid) {
      this.importGrid(frame.grid);
    }
  }

  private scheduleStep(): void {
    if (!this.playing || this.paused) return;
    this.rafId = requestAnimationFrame((now) => {
      const interval = (1000 / this.frameRate / this.speed);
      if (now - this.lastTime >= interval) {
        this.lastTime = now;
        if (this.frameIndex >= this.frames.length - 1) {
          if (this.loop) {
            this.frameIndex = 0;
          } else {
            this.stop();
            return;
          }
        } else {
          this.frameIndex++;
        }
        this.showFrame(this.frameIndex);
      }
      this.scheduleStep();
    });
  }

  destroy(): void {
    this.stop();
    this.frames = [];
    this.importGrid = null;
  }
}
