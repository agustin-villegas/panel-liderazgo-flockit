import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Sin HTML crudo (react-markdown lo escapa por defecto) y links siempre en pestaña nueva.
const C: Components = {
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mt-2 grid list-disc gap-1 pl-4 marker:text-primary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 grid list-decimal gap-1 pl-4 marker:text-primary">{children}</ol>
  ),
  h1: ({ children }) => <p className="mt-2 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mt-2 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mt-2 font-semibold">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background px-1 font-mono text-[0.85em]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b bg-muted px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border-b px-2 py-1 tabular-nums">{children}</td>,
};

/** Respuesta del asistente con formato (negritas, listas, tablas). */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={C}>
      {text}
    </ReactMarkdown>
  );
}
