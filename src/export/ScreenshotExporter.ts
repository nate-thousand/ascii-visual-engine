import type { ExportResult, ScreenshotOptions } from './ExportTypes';

export async function captureCanvasBlob(
  canvas: HTMLCanvasElement,
  options: ScreenshotOptions = {},
): Promise<Blob> {
  const mimeType = options.mimeType ?? 'image/png';
  const pixelRatio = options.pixelRatio ?? 1;
  const targetW = options.width ?? canvas.width;
  const targetH = options.height ?? canvas.height;

  if (
    pixelRatio === 1 &&
    targetW === canvas.width &&
    targetH === canvas.height &&
    !options.transparent
  ) {
    return canvasToBlob(canvas, mimeType);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(targetW * pixelRatio);
  offscreen.height = Math.round(targetH * pixelRatio);
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('ScreenshotExporter: unable to create 2D context');

  if (options.transparent) {
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
  }

  ctx.scale(pixelRatio, pixelRatio);
  ctx.drawImage(canvas, 0, 0, targetW, targetH);
  return canvasToBlob(offscreen, mimeType);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ScreenshotExporter: toBlob failed'))),
      mimeType,
    );
  });
}

export async function exportPngScreenshot(
  canvas: HTMLCanvasElement | null,
  options: ScreenshotOptions = {},
): Promise<ExportResult> {
  if (!canvas) {
    return { ok: false, format: 'png', error: 'No canvas available for PNG export' };
  }

  try {
    const blob = await captureCanvasBlob(canvas, options);
    const filename = options.filename ?? `ascii-frame-${Date.now()}.png`;

    if (options.copyToClipboard && typeof navigator !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } catch {
        // clipboard may fail silently in unsupported contexts
      }
    }

    downloadBlob(filename, blob);
    return { ok: true, format: 'png', blob, filename };
  } catch (err) {
    return {
      ok: false,
      format: 'png',
      error: err instanceof Error ? err.message : 'PNG export failed',
    };
  }
}

export function downloadBlob(filename: string, blob: Blob): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function canvasSnapshotDataUrl(canvas: HTMLCanvasElement, mimeType = 'image/png'): string {
  return canvas.toDataURL(mimeType);
}
