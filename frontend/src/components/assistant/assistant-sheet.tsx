"use client";

import { Loader2, RotateCcw, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError, post, type ChatOut, type Msg } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Turn = Msg & { tools?: string[] };

const MAX_HIST = 20; // el backend acepta hasta 20 mensajes
const HINTS = [
  "¿Qué proyectos están en riesgo?",
  "¿Cómo cerró el último sprint de cada proyecto?",
  "¿Qué issues quedaron sin terminar en el sprint en curso?",
  "Mostrame la tendencia de los últimos 6 sprints",
];

export function AssistantSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // en Chrome nuevo scrollIntoView devuelve una Promise: no retornarla
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function send(q: string) {
    const msg = q.trim();
    if (!msg || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: msg }];
    setTurns(next);
    setText("");
    setBusy(true);
    try {
      const hist = next.slice(-MAX_HIST).map(({ role, content }) => ({ role, content }));
      const res = await post<ChatOut>("/asistente/mensaje", { messages: hist });
      setTurns([...next, { role: "assistant", content: res.answer, tools: res.tools }]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "El asistente no respondió");
      setTurns(turns); // se descarta la pregunta fallida
      setText(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Asistente
          </SheetTitle>
          <SheetDescription>
            Consulta tus proyectos en Jira. Los números salen del motor, no de la IA.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 && (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">Probá con:</p>
              {HINTS.map((h) => (
                <Button
                  key={h}
                  variant="outline"
                  className="h-auto justify-start py-2 text-left whitespace-normal"
                  onClick={() => send(h)}
                >
                  {h}
                </Button>
              ))}
            </div>
          )}
          {turns.map((t, i) => (
            <Bubble key={i} turn={t} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Consultando…
            </div>
          )}
          <div ref={end} />
        </div>

        <form
          className="flex items-end gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder="¿Cómo viene el sprint de…?"
            aria-label="Pregunta al asistente"
            className="min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-col gap-1">
            <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Enviar">
              <SendHorizonal className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy || turns.length === 0}
              onClick={() => setTurns([])}
              aria-label="Nueva conversación"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const mine = turn.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap",
          mine ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {turn.content}
      </div>
      {!!turn.tools?.length && (
        <div className="flex flex-wrap gap-1">
          {turn.tools.map((t, i) => (
            <span
              key={i}
              className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
