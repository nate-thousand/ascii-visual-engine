import type { ExportResult, GifExportOptions } from './ExportTypes';
import { downloadBlob } from './ScreenshotExporter';

/** Minimal GIF89a encoder for indexed-color frames (ASCII-friendly palette). */
export function encodeGif(frames: ImageData[], delaysMs: number[], loop = true): Uint8Array {
  if (frames.length === 0) throw new Error('GifExporter: no frames');

  const width = frames[0].width;
  const height = frames[0].height;
  const parts: number[] = [];

  // Header
  pushString(parts, 'GIF89a');
  pushUint16LE(parts, width);
  pushUint16LE(parts, height);
  // Global color table: 16 colors, 4-bit
  parts.push(0x70);
  parts.push(0x00);
  parts.push(0x00);
  pushPalette16(parts);

  if (loop) {
    parts.push(0x21, 0xff, 0x0b);
    pushString(parts, 'NETSCAPE2.0');
    parts.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const delay = Math.max(2, Math.round((delaysMs[i] ?? 100) / 10));
    const indexed = quantizeFrame(frame);

    // Graphic Control Extension
    parts.push(0x21, 0xf9, 0x04, 0x00);
    parts.push(delay & 0xff, (delay >> 8) & 0xff);
    parts.push(0x00, 0x00);

    // Image Descriptor
    parts.push(0x2c, 0x00, 0x00, 0x00, 0x00);
    pushUint16LE(parts, width);
    pushUint16LE(parts, height);
    parts.push(0x00);

    const lzw = lzwEncode(indexed, 4);
    parts.push(0x04);
    let pos = 0;
    while (pos < lzw.length) {
      const chunk = lzw.slice(pos, pos + 255);
      parts.push(chunk.length);
      parts.push(...chunk);
      pos += 255;
    }
    parts.push(0x00);
  }

  parts.push(0x3b);
  return Uint8Array.from(parts);
}

function quantizeFrame(image: ImageData): Uint8Array {
  const out = new Uint8Array(image.width * image.height);
  for (let i = 0; i < out.length; i++) {
    const r = image.data[i * 4];
    const g = image.data[i * 4 + 1];
    const b = image.data[i * 4 + 2];
    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    if (lum < 0.08) out[i] = 0;
    else if (lum < 0.2) out[i] = 1;
    else if (lum < 0.35) out[i] = 2;
    else if (lum < 0.5) out[i] = 3;
    else if (lum < 0.65) out[i] = 4;
    else if (lum < 0.78) out[i] = 5;
    else if (g > r && g > b) out[i] = 6;
    else out[i] = 7;
  }
  return out;
}

function pushPalette16(parts: number[]): void {
  const palette = [
    0, 0, 0, 34, 34, 34, 68, 68, 68, 102, 102, 102,
    0, 68, 34, 0, 136, 68, 0, 204, 102, 0, 255, 136,
    136, 255, 170, 170, 255, 204, 204, 255, 238, 255, 255, 255,
    68, 0, 0, 136, 0, 0, 204, 0, 0, 255, 68, 68,
  ];
  parts.push(...palette);
}

function lzwEncode(pixels: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  const dict = new Map<string, number>();
  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);
  let sequence = String(pixels[0] ?? 0);

  for (let i = 1; i < pixels.length; i++) {
    const next = String(pixels[i]);
    const combined = sequence + ',' + next;
    if (dict.has(combined)) {
      sequence = combined;
    } else {
      const code = dict.get(sequence) ?? Number(sequence.split(',')[0]);
      writeCode(code);
      if (nextCode < 4096) {
        dict.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      }
      sequence = next;
      if (nextCode >= 4096) {
        writeCode(clearCode);
        dict.clear();
        nextCode = endCode + 1;
        codeSize = minCodeSize + 1;
      }
    }
  }

  writeCode(dict.get(sequence) ?? Number(sequence.split(',')[0]));
  writeCode(endCode);
  if (bitCount > 0) output.push(bitBuffer & 0xff);
  return output;
}

function pushString(parts: number[], s: string): void {
  for (let i = 0; i < s.length; i++) parts.push(s.charCodeAt(i));
}

function pushUint16LE(parts: number[], n: number): void {
  parts.push(n & 0xff, (n >> 8) & 0xff);
}

export async function exportGifFromCanvases(
  canvases: HTMLCanvasElement[],
  options: GifExportOptions = {},
): Promise<ExportResult> {
  if (typeof document === 'undefined') {
    return { ok: false, format: 'gif', error: 'GIF export requires a browser environment' };
  }
  if (canvases.length === 0) {
    return { ok: false, format: 'gif', error: 'No frames to encode' };
  }

  try {
    const frameRate = options.frameRate ?? 15;
    const delayMs = 1000 / frameRate;
    const frames: ImageData[] = [];

    for (const canvas of canvases) {
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    const bytes = encodeGif(frames, frames.map(() => delayMs), options.loop !== false);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
    const filename = `ascii-animation-${Date.now()}.gif`;
    downloadBlob(filename, blob);
    return { ok: true, format: 'gif', blob, filename };
  } catch (err) {
    return {
      ok: false,
      format: 'gif',
      error: err instanceof Error ? err.message : 'GIF export failed',
    };
  }
}

export function futureFormatPlaceholder(format: 'mp4' | 'webm' | 'pdf'): ExportResult {
  return {
    ok: false,
    format,
    error: `${format.toUpperCase()} export is planned for a future release`,
  };
}
