import type {
  AsciiExportOptions,
  ExportDebugState,
  ExportEngineBridge,
  ExportResult,
  GifExportOptions,
  ScreenshotOptions,
  SequenceExportOptions,
  SvgExportOptions,
} from './ExportTypes';
import { exportPngScreenshot, downloadBlob } from './ScreenshotExporter';
import { exportSvg } from './SvgExporter';
import {
  exportSceneJson,
  importSceneJson,
  downloadJson,
  exportAsciiFromGrid,
} from './JsonExporter';
import { exportGifFromCanvases, futureFormatPlaceholder } from './GifExporter';
import { exportFrameSequence } from './SequenceExporter';
import { TimelineRecorder } from '../recording/TimelineRecorder';

export class ExportManager {
  private engine: ExportEngineBridge | null = null;
  private timeline = new TimelineRecorder();
  private lastExportFormat: import('./ExportTypes').ExportFormat | null = null;
  private lastExportTime: number | null = null;

  setEngine(
    engine: ExportEngineBridge,
    importGrid?: (grid: import('../core/types').GridState) => void,
  ): void {
    this.engine = engine;
    if (importGrid) {
      this.timeline.setEngine(engine, importGrid);
    } else {
      this.timeline.setEngine(engine, () => {});
    }
  }

  onFrameRendered(time: number): void {
    this.timeline.onFrame(time);
  }

  async exportPNG(options: ScreenshotOptions = {}): Promise<ExportResult> {
    if (!this.engine) return { ok: false, format: 'png', error: 'Engine not connected' };
    const result = await exportPngScreenshot(this.engine.getCanvas(), options);
    this.markExport('png');
    return result;
  }

  exportSVG(options: SvgExportOptions & { filename?: string } = {}): ExportResult {
    if (!this.engine) return { ok: false, format: 'svg', error: 'Engine not connected' };
    const result = exportSvg(this.engine.getGridState(), options);
    this.markExport('svg');
    return result;
  }

  async exportGIF(options: GifExportOptions = {}): Promise<ExportResult> {
    const frames = this.timeline.getTimeline();
    const pngFrames = frames.filter((f) => f.png);
    if (pngFrames.length === 0) {
      return { ok: false, format: 'gif', error: 'No recorded frames. Start recording first.' };
    }

    await waitForRecordedFrameBlobs(pngFrames);
    const readyFrames = pngFrames.filter((f) => f.png);
    if (readyFrames.length === 0) {
      return { ok: false, format: 'gif', error: 'Recorded frames are still processing.' };
    }

    const canvases = await blobsToCanvases(readyFrames.map((f) => f.png!));
    const result = await exportGifFromCanvases(canvases, options);
    this.markExport('gif');
    return result;
  }

  exportJSON(name?: string): ExportResult {
    if (!this.engine) return { ok: false, format: 'json', error: 'Engine not connected' };
    try {
      const json = exportSceneJson(this.engine, name);
      const filename = `ascii-scene-${Date.now()}.json`;
      downloadJson(filename, json);
      this.markExport('json');
      return { ok: true, format: 'json', data: json, filename };
    } catch (err) {
      return {
        ok: false,
        format: 'json',
        error: err instanceof Error ? err.message : 'JSON export failed',
      };
    }
  }

  importJSON(json: string): { ok: boolean; error?: string } {
    if (!this.engine) return { ok: false, error: 'Engine not connected' };
    try {
      importSceneJson(this.engine, json);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'JSON import failed' };
    }
  }

  exportASCII(options: AsciiExportOptions & { filename?: string } = {}): ExportResult {
    if (!this.engine) return { ok: false, format: 'ascii', error: 'Engine not connected' };
    const text = exportAsciiFromGrid(this.engine.getGridState(), options);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const filename = options.filename ?? `ascii-${Date.now()}.txt`;
    downloadBlob(filename, blob);
    this.markExport('ascii');
    return { ok: true, format: 'ascii', data: text, blob, filename };
  }

  async exportSequence(options: SequenceExportOptions = {}): Promise<ExportResult> {
    const frames = this.timeline.getTimeline();
    const result = await exportFrameSequence(frames, options);
    this.markExport('sequence');
    return {
      ok: result.ok,
      format: 'sequence',
      error: result.error,
      data: `${result.count} frames exported`,
    };
  }

  exportMP4(): ExportResult {
    return futureFormatPlaceholder('mp4');
  }

  exportWebM(): ExportResult {
    return futureFormatPlaceholder('webm');
  }

  exportPDF(): ExportResult {
    return futureFormatPlaceholder('pdf');
  }

  startRecording(frameRate = 30): { ok: boolean; error?: string } {
    const result = this.timeline.startRecording(frameRate);
    return result;
  }

  stopRecording() {
    return this.timeline.stopRecording();
  }

  pauseRecording(): void {
    this.timeline.pauseRecording();
  }

  resumeRecording(): void {
    this.timeline.resumeRecording();
  }

  cancelRecording(): void {
    this.timeline.cancelRecording();
  }

  playRecording(options?: { loop?: boolean; speed?: number; frameRate?: number }): void {
    this.timeline.playRecording(options);
  }

  pausePlayback(): void {
    this.timeline.pausePlayback();
  }

  resumePlayback(): void {
    this.timeline.resumePlayback();
  }

  stopPlayback(): void {
    this.timeline.stopPlayback();
  }

  stepPlayback(delta: number): void {
    this.timeline.stepPlayback(delta);
  }

  scrubPlayback(index: number): void {
    this.timeline.scrubPlayback(index);
  }

  getDebugState(): ExportDebugState {
    return {
      recording: this.timeline.getRecordingStatus(),
      playback: this.timeline.getPlaybackStatus(),
      lastExport: this.lastExportFormat,
      lastExportTime: this.lastExportTime,
    };
  }

  getTimelineRecorder(): TimelineRecorder {
    return this.timeline;
  }

  destroy(): void {
    this.timeline.destroy();
    this.engine = null;
  }

  private markExport(format: import('./ExportTypes').ExportFormat): void {
    this.lastExportFormat = format;
    this.lastExportTime = Date.now();
  }
}

async function blobsToCanvases(blobs: Blob[]): Promise<HTMLCanvasElement[]> {
  if (typeof document === 'undefined') return [];
  const canvases: HTMLCanvasElement[] = [];
  for (const blob of blobs) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(bitmap, 0, 0);
    bitmap.close();
    canvases.push(canvas);
  }
  return canvases;
}

async function waitForRecordedFrameBlobs(
  frames: { png?: Blob }[],
  timeoutMs = 8000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (frames.every((frame) => frame.png)) return;
    await new Promise((resolve) => window.setTimeout(resolve, 16));
  }
}
