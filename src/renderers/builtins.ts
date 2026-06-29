import { CanvasRenderer } from './CanvasRenderer';
import { DomRenderer } from './DomRenderer';
import { OffscreenCanvasRenderer } from './OffscreenCanvasRenderer';
import { WebGLRendererStub } from './WebGLRendererStub';
import type { Renderer, RendererId } from './Renderer';
import type { RendererManagerOptions } from './RendererManager';

export function createBuiltInRenderers(options: RendererManagerOptions): Renderer[] {
  const shared = {
    width: options.width,
    height: options.height,
    density: options.density,
    glyphSet: options.glyphSet,
  };

  const renderers: Renderer[] = [
    new CanvasRenderer({ canvas: options.canvas, ...shared }),
    new OffscreenCanvasRenderer({ canvas: options.canvas, ...shared }),
    new WebGLRendererStub(shared),
  ];

  if (options.element) {
    renderers.push(new DomRenderer({ element: options.element, ...shared }));
  } else if (typeof document !== 'undefined') {
    const element = document.createElement('pre');
    element.id = 'ascii-dom-renderer-fallback';
    renderers.push(new DomRenderer({ element, ...shared }));
  }

  return renderers;
}

export function resolveRendererId(
  id: RendererId | undefined,
  fallback: RendererId = 'canvas',
): RendererId {
  if (!id) return fallback;
  return id;
}

export function listRendererIds(): RendererId[] {
  return ['canvas', 'dom', 'offscreen-canvas', 'webgl'];
}
