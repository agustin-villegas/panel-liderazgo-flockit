"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

/** Renderiza un diagrama mermaid en el cliente, siguiendo el tema claro/oscuro. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: resolvedTheme === "dark" ? "dark" : "neutral",
        fontFamily: "inherit",
      });
      const out = await mermaid.render(`m${id}`, chart.trim());
      if (live) setSvg(out.svg);
    })().catch(() => {
      if (live) setSvg("");
    });
    return () => {
      live = false;
    };
  }, [chart, id, resolvedTheme]);

  if (!svg) return <pre className="text-sm opacity-60">{chart}</pre>;
  return (
    <div
      className="my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
