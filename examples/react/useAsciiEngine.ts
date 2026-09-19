import { useEffect, useRef, useState, type RefObject } from 'react';
import { createEngine, type CreateEngineOptions, type EngineHandle, type EngineState } from 'ascii-visual-engine';

export interface UseAsciiEngineResult {
  /** Attach to the `<canvas>` the engine should draw on. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** The host facade, null until the canvas is mounted. */
  engine: EngineHandle | null;
  state: EngineState;
}

/**
 * Mount the engine on a canvas for the life of the component. Creates it when
 * the canvas mounts, follows the element's size with a ResizeObserver, and
 * destroys it on unmount. Options are read once; change the look afterwards
 * through `engine.setPreset()` and `engine.setControl()`.
 *
 * ```tsx
 * function Visual({ preset }: { preset: string }) {
 *   const { canvasRef, engine } = useAsciiEngine({ preset });
 *   useEffect(() => { engine?.setPreset(preset); }, [engine, preset]);
 *   return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
 * }
 * ```
 */
export function useAsciiEngine(options: CreateEngineOptions = {}): UseAsciiEngineResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<EngineHandle | null>(null);
  const [state, setState] = useState<EngineState>('idle');
  const optionsRef = useRef(options);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const handle = createEngine(canvas, {
      width: rect.width || undefined,
      height: rect.height || undefined,
      ...optionsRef.current,
    });
    const offState = handle.on('state', setState);
    setState(handle.getState());
    setEngine(handle);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) handle.resize(width, height);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      offState();
      handle.destroy();
      setEngine(null);
    };
  }, []);

  return { canvasRef, engine, state };
}
