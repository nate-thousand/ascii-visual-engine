export type {
  Source,
  SourceContext,
  SourceSample,
  SourceType,
  SourceFitMode,
  SourceMode,
  SourceDebugState,
  SourceControlName,
  SourceApplyMode,
} from './Source';
export {
  SOURCE_CONTROLS,
  DEFAULT_SOURCE_CONTROLS,
} from './Source';
export { SourceManager } from './SourceManager';
export {
  SourceSampler,
  mapNormalizedToSource,
  mapNormalizedToSourceF,
  mapBrightnessToGlyph,
  pixelBrightness,
  pixelCoverage,
  pixelEdge,
  pixelContrast,
  clamp01,
} from './SourceSampler';
export { PixelSourceBase } from './PixelSourceBase';
export { ImageSource, type ImageSourceOptions } from './ImageSource';
export { VideoSource, type VideoSourceOptions } from './VideoSource';
export { WebcamSource, type WebcamSourceOptions } from './WebcamSource';
export { CanvasSource, type CanvasSourceOptions } from './CanvasSource';
export {
  createBuiltInSources,
  listSourceIds,
  resolvePresetSource,
} from './builtins';
export { TextSource, layoutText } from './TextSource';
export type { TextSourceOptions, TextLayout, TextLayoutLine } from './TextSource';
export { isSvgMarkup, sizeSvgMarkup } from './ImageSource';
