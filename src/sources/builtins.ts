import {
  ImageSource,
  VideoSource,
  WebcamSource,
  CanvasSource,
  type Source,
} from '../sources';

export function createBuiltInSources(): Source[] {
  return [
    new ImageSource('image', 'Image'),
    new VideoSource('video', 'Video'),
    new WebcamSource('webcam', 'Webcam'),
    new CanvasSource('canvas', 'Canvas'),
  ];
}

export function listSourceIds(): string[] {
  return createBuiltInSources().map((s) => s.id);
}

export function resolvePresetSource(preset: {
  source?: { type: string; options?: Record<string, unknown> };
}): { id: string; options?: Record<string, unknown> } | null {
  if (!preset.source) return null;
  const id = preset.source.type;
  return { id, options: preset.source.options };
}
