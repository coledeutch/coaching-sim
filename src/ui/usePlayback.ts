import { useEffect, useRef, useState } from 'react';
import type { SimResult } from '../model/types';

/** Animate a play's frames in real time (scaled by `speed`). Calls onDone when the last frame is reached. */
export function usePlayback(result: SimResult | null | undefined, speed: number, onDone?: () => void) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!playing || !result) return;
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * speed;
      last = now;
      const steps = Math.floor(acc / 0.05);
      if (steps > 0) {
        acc -= steps * 0.05;
        setFrameIdx((i) => {
          const next = Math.min(result.frames.length - 1, i + steps);
          if (next === result.frames.length - 1) {
            setPlaying(false);
            done.current?.();
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, result, speed]);

  const start = () => {
    setFrameIdx(0);
    setPlaying(true);
  };
  const atEnd = !!result && frameIdx >= result.frames.length - 1;
  return { frameIdx, setFrameIdx, playing, setPlaying, start, atEnd, frame: result ? result.frames[Math.min(frameIdx, result.frames.length - 1)] : null };
}
