"use client";

import {
  ChevronDown,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  RotateCcw,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError, post, type ChatOut, type Msg } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { ChatCards, type ChatCard } from "./chat-cards";
import { ChatMarkdown } from "./chat-markdown";

type Turn = Msg & { tools?: string[]; cards?: ChatCard[] };

const NAME = "Asistente TM";
const STORE = "asistente-tm"; // historial por pestaña
const MAX_HIST = 20; // el backend acepta hasta 20 mensajes
const HINTS = [
  "¿Qué proyectos están en riesgo?",
  "¿Cómo cerró el último sprint de cada proyecto?",
  "¿Qué issues quedaron sin terminar en el sprint en curso?",
  "Mostrame la tendencia de los últimos 6 sprints",
];

function load(): Turn[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as Turn[];
  } catch {
    return [];
  }
}

function save(turns: Turn[]) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(turns));
  } catch {
    // sin storage (modo privado): el chat sigue andando en memoria
  }
}

/** Chat flotante abajo a la derecha: se abre, se agranda y se minimiza sin tapar la página. */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [big, setBig] = useState(false);
  const [unread, setUnread] = useState(false);
  // solo se monta en el cliente (después de cargar el usuario): leer storage acá es seguro
  const [turns, setTurns] = useState<Turn[]>(load);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) input.current?.focus();
  }, [open]);

  function toggle(next: boolean) {
    setOpen(next);
    if (next) setUnread(false);
  }
  useEffect(() => {
    // en Chrome nuevo scrollIntoView devuelve una Promise: no retornarla
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, open]);

  function update(next: Turn[]) {
    setTurns(next);
    save(next);
  }

  async function send(q: string) {
    const msg = q.trim();
    if (!msg || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: msg }];
    update(next);
    setText("");
    setBusy(true);
    try {
      const hist = next.slice(-MAX_HIST).map(({ role, content }) => ({ role, content }));
      const res = await post<ChatOut>("/asistente/mensaje", { messages: hist });
      update([
        ...next,
        { role: "assistant", content: res.answer, tools: res.tools, cards: res.cards ?? [] },
      ]);
      if (!openRef.current) setUnread(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "El asistente no respondió");
      update(turns); // se descarta la pregunta fallida
      setText(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section
        role="dialog"
        aria-label={NAME}
        aria-hidden={!open}
        inert={!open}
        onKeyDown={(e) => e.key === "Escape" && toggle(false)}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border bg-popover text-sm text-popover-foreground shadow-2xl",
          "origin-bottom-right transition-all duration-200 ease-out",
          // celular: pantalla completa · escritorio: flotante sobre el launcher
          "inset-0 sm:inset-auto sm:right-6 sm:bottom-24 sm:rounded-2xl",
          big
            ? "sm:h-[min(85vh,860px)] sm:w-[min(720px,calc(100vw-3rem))]"
            : "sm:h-[min(620px,calc(100vh-8rem))] sm:w-[380px]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <header className="bg-brand flex items-center gap-3 px-4 py-3 text-white">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="leading-tight font-semibold">{NAME}</p>
            <p className="truncate text-xs text-white/80">
              Tus proyectos en Jira · los números salen del motor
            </p>
          </div>
          <HeadBtn
            label="Nueva conversación"
            onClick={() => update([])}
            disabled={busy || turns.length === 0}
          >
            <RotateCcw className="size-4" />
          </HeadBtn>
          <HeadBtn
            label={big ? "Achicar" : "Agrandar"}
            onClick={() => setBig(!big)}
            className="hidden sm:inline-flex"
          >
            {big ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </HeadBtn>
          <HeadBtn label="Minimizar" onClick={() => toggle(false)}>
            <Minus className="size-4" />
          </HeadBtn>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {turns.length === 0 && (
            <div className="grid gap-2">
              <p className="text-muted-foreground">
                Hola. Preguntame por el cumplimiento, los sprints o los riesgos de tus proyectos.
              </p>
              {HINTS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => send(h)}
                  className="rounded-xl border px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          {turns.map((t, i) => (
            <Bubble key={i} turn={t} wide={big} />
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
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="¿Cómo viene el sprint de…?"
            aria-label="Pregunta al asistente"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full"
            disabled={busy || !text.trim()}
            aria-label="Enviar"
          >
            <SendHorizonal className="size-4" />
          </Button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-label={open ? `Minimizar ${NAME}` : `Abrir ${NAME}`}
        aria-expanded={open}
        title={NAME}
        className={cn(
          "bg-brand fixed right-6 bottom-6 z-50 size-14 items-center justify-center rounded-full text-white shadow-lg",
          "transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95",
          // en celular el panel ocupa todo: el launcher se esconde mientras está abierto
          open ? "hidden sm:flex" : "flex",
        )}
      >
        {open ? <ChevronDown className="size-6" /> : <Sparkles className="size-6" />}
        {unread && !open && (
          <span className="absolute top-0.5 right-0.5 size-3 rounded-full border-2 border-background bg-accent" />
        )}
      </button>
    </>
  );
}

function HeadBtn({
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20 disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

function Bubble({ turn, wide }: { turn: Turn; wide: boolean }) {
  const mine = turn.role === "user";
  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <span className="bg-brand mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white">
          <Sparkles className="size-3" />
        </span>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          mine ? "max-w-[85%] items-end" : "flex-1 items-start",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3 py-2",
            mine
              ? "rounded-br-sm bg-primary whitespace-pre-wrap text-primary-foreground"
              : "rounded-bl-sm bg-muted",
          )}
        >
          {mine ? turn.content : <ChatMarkdown text={turn.content} />}
        </div>
        {!!turn.cards?.length && <ChatCards cards={turn.cards} wide={wide} />}
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
    </div>
  );
}
