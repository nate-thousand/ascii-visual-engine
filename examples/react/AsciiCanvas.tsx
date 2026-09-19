import { useEffect } from 'react';
import { useAsciiEngine } from './useAsciiEngine';

export interface AsciiCanvasProps {
  /** Built in preset id or a preset object. */
  preset?: string;
  /** Controls to push whenever they change, e.g. `{ speed: 0.8 }`. */
  controls?: Record<string, number>;
  /** Fires bursts on click and touch. */
  pointer?: boolean;
  className?: string;
}

/** A canvas that runs the engine for the life of the component. */
export function AsciiCanvas({ preset = 'glyphOrganicBloom', controls, pointer = false, className }: AsciiCanvasProps) {
  const { canvasRef, engine } = useAsciiEngine({ preset });

  useEffect(() => {
    engine?.setPreset(preset);
  }, [engine, preset]);

  useEffect(() => {
    if (!engine || !controls) return;
    for (const [name, value] of Object.entries(controls)) engine.setControl(name, value);
  }, [engine, controls]);

  useEffect(() => {
    if (!engine) return;
    if (pointer) engine.enablePointerInput();
    else engine.disablePointerInput();
  }, [engine, pointer]);

  return <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
