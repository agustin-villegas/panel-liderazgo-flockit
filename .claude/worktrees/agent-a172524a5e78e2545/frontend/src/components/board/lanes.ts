export type LaneKey = "todo" | "doing" | "blocked" | "done";

// Colores aptos para daltonismo (tokens de Flock); siempre con nombre y número.
export const LANES: Record<LaneKey, { label: string; dot: string; color: string }> = {
  todo: { label: "No iniciado", dot: "bg-todo", color: "var(--todo)" },
  doing: { label: "En curso", dot: "bg-doing", color: "var(--doing)" },
  blocked: { label: "Bloqueado", dot: "bg-blocked", color: "var(--blocked)" },
  done: { label: "Finalizado", dot: "bg-done", color: "var(--done)" },
};

export const LANE_ORDER: LaneKey[] = ["todo", "doing", "blocked", "done"];
