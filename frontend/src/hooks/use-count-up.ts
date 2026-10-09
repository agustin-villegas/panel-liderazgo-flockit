"use client";

import { useEffect, useState } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Número que sube de 0 al valor (sin animar si el usuario pidió menos movimiento). */
export function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduced()) {
      const id = requestAnimationFrame(() => setN(target));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const k = Math.min((t - t0) / ms, 1);
      setN(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, ms]);

  return n;
}
