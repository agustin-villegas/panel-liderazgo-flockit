"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Tone = "brand" | "ok" | "warn" | "crit";

const FILL: Record<Tone, string> = {
  brand: "bg-brand",
  ok: "bg-[linear-gradient(90deg,var(--ok),#a78bfa)]",
  warn: "bg-[linear-gradient(90deg,#fb923c,var(--warn))]",
  crit: "bg-[linear-gradient(90deg,#f87171,var(--crit))]",
};

type Props = { value: number; label: string; tone?: Tone; size?: "sm" | "md"; className?: string };

/** Barra animada con el gradiente de marca: arranca en 0 y se llena. */
export function BrandBar({ value, label, tone = "brand", size = "md", className }: Props) {
  const [w, setW] = useState(0);
  const target = Math.max(0, Math.min(value, 1)) * 100;

  useEffect(() => {
    const id = requestAnimationFrame(() => setW(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(target)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "overflow-hidden rounded-full bg-muted",
        size === "sm" ? "h-2" : "h-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full transition-[width] duration-1000 ease-out",
          FILL[tone],
        )}
        style={{ width: `${w}%` }}
      >
        {w > 0 && <span className="bar-shine" aria-hidden />}
      </div>
    </div>
  );
}
