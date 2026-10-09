"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/panel/error-state";
import { PageHeader } from "@/components/panel/page-header";
import { ReportDoc } from "@/components/report/report-doc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  api,
  post,
  type Audience,
  type Compliance,
  type Preview,
  type Project,
  type Report,
  type Story,
} from "@/lib/api/client";

const AUDS: { value: Audience; label: string }[] = [
  { value: "equipo", label: "Equipo" },
  { value: "cliente", label: "Cliente" },
  { value: "gerencia", label: "Gerencia" },
];

export default function NewReportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [project, setProject] = useState("");
  const [sprint, setSprint] = useState("");
  const [audience, setAudience] = useState<Audience>("equipo");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [story, setStory] = useState<Story | null>(null);

  const projects = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });
  const comp = useQuery({
    queryKey: ["cumplimiento", project],
    queryFn: () => api<Compliance>(`/proyectos/${project}/cumplimiento`),
    enabled: !!project,
  });
  const sprints = [...(comp.data?.sprints ?? [])].reverse();

  const gen = useMutation({
    mutationFn: () =>
      post<Preview>("/informes/preview", { project_id: project, sprint_id: sprint, audience }),
    onSuccess: (p) => {
      setPreview(p);
      setStory(p.story ?? { resumen: "", puntos: [] });
      if (p.ai_error) toast.warning(p.ai_error);
    },
    onError: (e) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      post<Report>("/informes", {
        project_id: project,
        sprint_id: sprint,
        audience,
        story: story?.resumen.trim()
          ? { ...story, puntos: (story.puntos ?? []).filter((p) => p.trim()) }
          : null,
      }),
    onSuccess: (r) => {
      toast.success("Informe guardado");
      qc.invalidateQueries({ queryKey: ["informes"] });
      router.push(`/informes/${r.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => setPreview(null);

  return (
    <>
      <PageHeader
        back={{ href: "/informes", label: "Informes" }}
        title="Nuevo informe de sprint"
        description="Elegí proyecto, sprint y audiencia. La IA redacta; vos revisás y guardás."
      />

      <Card className="print:hidden">
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Field>
            <FieldLabel htmlFor="r-proj">Proyecto</FieldLabel>
            <NativeSelect
              id="r-proj"
              value={project}
              onChange={(e) => (setProject(e.target.value), setSprint(""), reset())}
            >
              <option value="">Elegí un proyecto…</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.account}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="r-sprint">Sprint</FieldLabel>
            <NativeSelect
              id="r-sprint"
              value={sprint}
              disabled={!project || comp.isLoading}
              onChange={(e) => (setSprint(e.target.value), reset())}
            >
              <option value="">{comp.isLoading ? "Cargando sprints…" : "Elegí un sprint…"}</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.provisional ? " (en curso)" : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="r-aud">Audiencia</FieldLabel>
            <NativeSelect
              id="r-aud"
              value={audience}
              onChange={(e) => (setAudience(e.target.value as Audience), reset())}
            >
              {AUDS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button
            onClick={() => gen.mutate()}
            disabled={!project || !sprint || gen.isPending}
            variant="brand"
          >
            {gen.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generar
          </Button>
        </CardContent>
      </Card>

      {projects.error && (
        <Card>
          <ErrorState
            message={`No se pudieron cargar los proyectos: ${projects.error.message}`}
            onRetry={() => projects.refetch()}
          />
        </Card>
      )}
      {comp.error && (
        <Card>
          <ErrorState
            message={`No se pudieron cargar los sprints: ${comp.error.message}`}
            onRetry={() => comp.refetch()}
          />
        </Card>
      )}

      {gen.isPending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Calculando y redactando la lectura…
        </p>
      )}

      {preview && story && (
        <>
          <ReportDoc
            data={preview.data}
            audience={audience}
            story={
              <StoryEditor
                story={story}
                onChange={setStory}
                model={preview.model}
                error={preview.ai_error}
              />
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
              <Sparkles className="size-4" /> Regenerar lectura
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar informe
            </Button>
          </div>
        </>
      )}
    </>
  );
}

type EditorProps = {
  story: Story;
  onChange: (s: Story) => void;
  model: string;
  error?: string | null;
};

function StoryEditor({ story, onChange, model, error }: EditorProps) {
  return (
    <div className="grid gap-3 rounded-xl bg-secondary/60 p-4">
      {error && <p className="text-sm text-warn-fg">{error}. Podés escribir la lectura a mano.</p>}
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Resumen</span>
        <textarea
          className="min-h-28 rounded-md border bg-background p-3 leading-relaxed"
          value={story.resumen}
          onChange={(e) => onChange({ ...story, resumen: e.target.value })}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Puntos clave (uno por línea)</span>
        <textarea
          className="min-h-20 rounded-md border bg-background p-3"
          value={(story.puntos ?? []).join("\n")}
          onChange={(e) => onChange({ ...story, puntos: e.target.value.split("\n") })}
        />
      </label>
      {!error && (
        <p className="text-xs text-muted-foreground">
          Redactado con {model} sobre los números calculados. Revisalo antes de guardar.
        </p>
      )}
    </div>
  );
}
