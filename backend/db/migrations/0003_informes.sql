-- 0003 · Informes guardados: foto inmutable (no se editan ni se reescriben).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  kind varchar(20) not null default 'sprint',
  audience varchar(20) not null check (audience in ('equipo', 'cliente', 'gerencia')),
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id varchar(40) not null,
  title varchar(200) not null,
  data jsonb not null,
  story jsonb,
  ai_model varchar(60),
  ai_tokens integer not null default 0,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
create index if not exists reports_project_idx on public.reports(project_id, created_at desc);

-- Inmutabilidad: un informe guardado no se modifica nunca.
create or replace function public.reports_block_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Los informes guardados son inmutables';
end;
$$;

drop trigger if exists reports_no_update on public.reports;
create trigger reports_no_update before update on public.reports
for each row execute function public.reports_block_update();

alter table public.reports enable row level security;
