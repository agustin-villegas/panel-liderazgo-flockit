-- 0004 · Notificaciones dentro de la app (un aviso por usuario y evento).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind varchar(20) not null,
  dedupe_key varchar(200) not null,
  title varchar(200) not null,
  body text not null,
  link varchar(200) not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create unique index if not exists notif_user_key_uq on public.notifications(user_id, dedupe_key);
create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
