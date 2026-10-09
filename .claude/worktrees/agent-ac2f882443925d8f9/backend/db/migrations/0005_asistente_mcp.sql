-- 0005 · Asistente de IA (trazas) y tokens personales del MCP.

create table if not exists public.ai_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind varchar(20) not null default 'chat',
  model varchar(60) not null,
  tools jsonb not null default '[]',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_traces_user_idx on public.ai_traces(user_id, created_at desc);

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name varchar(80) not null,
  token_hash varchar(64) not null unique,
  last4 varchar(4) not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists mcp_tokens_user_idx on public.mcp_tokens(user_id);

-- Solo el backend accede: RLS activo y sin políticas.
alter table public.ai_traces enable row level security;
alter table public.mcp_tokens enable row level security;
