"use client";

import { useEffect, useId, useState } from "react";

type Tone = "brand" | "ok" | "warn" | "crit";

const STOPS: Record<Tone, [string, string]> = {
  brand: ["var(--brand-from)", "var(--brand-to)"],
  ok: ["var(--ok-soft)", "var(--ok)"],
  warn: ["var(--warn-soft)", "var(--warn)"],
  crit: ["var(--crit-soft)", "var(--crit)"],
};

type Props = { value: number | null; label: string; tone?: Tone; size?: number; sub?: string };

/** Medidor circular animado: el % se lee de un vistazo. */
export function Gauge({ value, label, tone = "brand", size = 120, sub }: Props) {
  const id = useId();
  const [shown, setShown] = useState(0);
  const target = value === null ? 0 : Math.max(0, Math.min(value, 1));
  const stroke = Math.max(size * 0.1, 8);
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const [from, to] = STOPS[tone];
  return (
    <figure
      className="grid justify-items-center gap-1.5"
      aria-label={`${label}: ${value === null ? "sin datos" : `${Math.round(target * 100)}%`}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={len}
            strokeDashoffset={len * (1 - shown)}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl leading-none font-bold" style={{ fontSize: size * 0.22 }}>
            {value === null ? "—" : `${Math.round(target * 100)}%`}
          </span>
          {sub && <span className="mt-0.5 text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
      <figcaption className="text-xs font-medium text-muted-foreground">{label}</figcaption>
    </figure>
  );
}
