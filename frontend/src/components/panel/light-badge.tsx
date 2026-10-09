import { cn } from "@/lib/utils";
import { LIGHT, type Light } from "@/lib/format";

type Props = { light: string; className?: string };

/** Semáforo: siempre color + texto (nunca color solo). */
export function LightBadge({ light, className }: Props) {
  const l = LIGHT[(light as Light) in LIGHT ? (light as Light) : "none"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        l.cls,
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", l.bar)} aria-hidden />
      {l.label}
    </span>
  );
}
