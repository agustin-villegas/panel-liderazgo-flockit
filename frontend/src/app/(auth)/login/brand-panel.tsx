// Panel de marca del login "flock_modern": manifiesto + preview animado del panel.
const BARS = [
  { plan: 34, done: 31 },
  { plan: 30, done: 26 },
  { plan: 36, done: 33 },
  { plan: 32, done: 22 },
  { plan: 28, done: 26 },
  { plan: 35, done: 34 },
];

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
          Planificado
        </p>
        <p className="mt-2 max-w-md text-3xl leading-tight font-medium tracking-tight">
          <span className="font-bold">Lo quemado</span>, auditado contra Jira.{" "}
          <span className="text-white/70">Sin planillas.</span>
        </p>

        <div
          className="mt-10 flex h-40 max-w-md items-end gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-sm"
          aria-hidden
        >
          {BARS.map((b, i) => (
            <div key={i} className="flex flex-1 items-end gap-1">
              <span
                className="flex-1 origin-bottom animate-[grow_0.8s_ease-out_both] rounded-t bg-white/35"
                style={{ height: `${b.plan * 3}px`, animationDelay: `${i * 90}ms` }}
              />
              <span
                className="flex-1 origin-bottom animate-[grow_0.8s_ease-out_both] rounded-t bg-white"
                style={{ height: `${b.done * 3}px`, animationDelay: `${i * 90 + 60}ms` }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="hidden text-sm text-white/70 md:block">Flockit · AI Day 2026</p>
    </aside>
  );
}
