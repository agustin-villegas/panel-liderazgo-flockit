-- 0001 · Usuarios, sesiones, intentos de login y auditoría.
-- RLS activo sin políticas: solo el backend (rol de servidor) accede.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(254) not null unique,
  name varchar(120) not null,
  role varchar(20) not null default 'team_manager'
    check (role in ('admin', 'team_manager', 'cliente')),
  pwd_hash varchar(200) not null,
  must_change_pwd boolean not null default false,
  account_id uuid,
  disabled_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null,
  ip varchar(64),
  agent varchar(300),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on public.sessions(user_id);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email varchar(254) not null,
  ip varchar(64) not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_lookup_idx on public.login_attempts(email, ip, at);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action varchar(80) not null,
  entity varchar(60),
  entity_id varchar(80),
  data jsonb,
  ip varchar(64),
  at timestamptz not null default now()
);
create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists audit_events_action_idx on public.audit_events(action);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.audit_events enable row level security;
