-- 0002 · Conexiones de Jira, cuentas, proyectos y Team Managers asignados.

create table if not exists public.jira_connections (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null unique,
  kind varchar(10) not null default 'jira' check (kind in ('jira', 'demo')),
  site varchar(200),
  email varchar(254),
  token_enc varchar(600),          -- AES-256-GCM, nunca en claro
  token_last4 varchar(4),
  sp_field varchar(80),
  skip_subtasks boolean not null default true,
  status varchar(10) not null default 'ok',
  last_error varchar(300),
  checked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  name varchar(120) not null,
  conn_id uuid references public.jira_connections(id) on delete set null,
  board_id integer,
  board_name varchar(160),
  from_sprint varchar(40),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists projects_account_idx on public.projects(account_id);
create index if not exists projects_conn_idx on public.projects(conn_id);

create table if not exists public.project_managers (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (project_id, user_id)
);
create index if not exists project_managers_user_idx on public.project_managers(user_id);

alter table public.jira_connections enable row level security;
alter table public.accounts enable row level security;
alter table public.projects enable row level security;
alter table public.project_managers enable row level security;
