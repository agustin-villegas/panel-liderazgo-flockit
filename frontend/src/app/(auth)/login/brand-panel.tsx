// Panel de marca del login "flock_modern": manifiesto + preview animado del panel.
const BARS = [
  { plan: 34, done: 31 },
  { plan: 30, done: 26 },
  { plan: 36, done: 33 },
  { plan: 32, done: 22 },
  { plan: 28, done: 26 },
  { plan: 35, done: 34 },
];

const TILES = [
  { label: "En margen", value: "4", dot: "bg-white" },
  { label: "Atención", value: "2", dot: "bg-white/60" },
  { label: "En riesgo", value: "1", dot: "bg-white/30" },
];

const FEATURES = ["Cumplimiento de sprints", "Tableros de Jira", "Satisfacción", "Informes"];

export function BrandPanel() {
  return (
    <aside className="login-brand">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-white/15 text-sm font-bold">
          F
        </span>
        Flock · Panel de liderazgo
      </div>

      <div className="hidden md:block">
        <p className="login-ghost" aria-hidden>
          Liderazgo
        </p>
        <p className="mt-2 max-w-md text-3xl leading-tight font-medium tracking-tight">
          <span className="font-bold">El estado de todos tus proyectos</span>, en un solo lugar.
        </p>
        <ul className="mt-4 flex max-w-md flex-wrap gap-2">
          {FEATURES.map((f) => (
            <li key={f} className="rounded-full bg-white/15 px-3 py-1 text-sm">
              {f}
            </li>
          ))}
        </ul>

        <div
          className="mt-8 grid max-w-md gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-sm"
          aria-hidden
        >
          <div className="grid grid-cols-3 gap-2">
            {TILES.map((t, i) => (
              <div
                key={t.label}
                className="animate-[grow_0.6s_ease-out_both] rounded-xl bg-white/10 p-2.5"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <p className="flex items-center gap-1.5 text-xs text-white/80">
                  <span className={`size-1.5 rounded-full ${t.dot}`} />
                  {t.label}
                </p>
                <p className="text-2xl font-bold">{t.value}</p>
              </div>
            ))}
          </div>
          <div className="flex h-24 items-end gap-3">
            {BARS.map((b, i) => (
              <div key={i} className="flex flex-1 items-end gap-1">
                <span
                  className="flex-1 origin-bottom animate-[grow_0.8s_ease-out_both] rounded-t bg-white/35"
                  style={{ height: `${b.plan * 2.4}px`, animationDelay: `${i * 90 + 300}ms` }}
                />
                <span
                  className="flex-1 origin-bottom animate-[grow_0.8s_ease-out_both] rounded-t bg-white"
                  style={{ height: `${b.done * 2.4}px`, animationDelay: `${i * 90 + 360}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="hidden text-sm text-white/70 md:block">Flockit · AI Day 2026</p>
    </aside>
  );
}
