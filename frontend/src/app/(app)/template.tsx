/** Entrada suave de cada pantalla (solo CSS; se apaga con prefers-reduced-motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 animate-in flex-col gap-6 duration-500 fade-in slide-in-from-bottom-2">
      {children}
    </div>
  );
}
