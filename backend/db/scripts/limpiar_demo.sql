-- Limpieza de los 3 proyectos demo (datos sintéticos) en prod.
-- Correr en Supabase → SQL Editor. Es idempotente: si ya se corrió, no hace nada.
-- 1) Archiva los proyectos y sus avisos en el schema `archive` (la API no lo expone).
-- 2) Borra de `public`. Los avisos y asignaciones caen en cascada.
-- La conexión "Demo (datos sintéticos)" NO se toca: el backend la recrea al arrancar.

begin;

create schema if not exists archive;

create table if not exists archive.projects_demo as
  select p.*, now() as archived_on
  from public.projects p
  join public.jira_connections c on c.id = p.conn_id
  where c.kind = 'demo'
    and p.name in ('App Logística', 'Data Lake Comercial', 'Portal Clientes')
  with no data;

create table if not exists archive.notifications_demo as
  select n.*, now() as archived_on from public.notifications n with no data;

alter table archive.projects_demo enable row level security;
alter table archive.notifications_demo enable row level security;

-- proyectos demo a borrar
create temporary table demo_ids on commit drop as
  select p.id
  from public.projects p
  join public.jira_connections c on c.id = p.conn_id
  where c.kind = 'demo'
    and p.name in ('App Logística', 'Data Lake Comercial', 'Portal Clientes');

insert into archive.projects_demo
  select p.*, now() from public.projects p where p.id in (select id from demo_ids);

insert into archive.notifications_demo
  select n.*, now() from public.notifications n where n.project_id in (select id from demo_ids);

delete from public.projects where id in (select id from demo_ids);

commit;

-- Verificación
select
  (select count(*) from archive.projects_demo) as proyectos_archivados,
  (select count(*) from archive.notifications_demo) as avisos_archivados,
  (select string_agg(name, ', ' order by name) from public.projects) as proyectos_que_quedan;

-- Para restaurar (si hiciera falta):
-- insert into public.projects select id, account_id, name, conn_id, board_id, board_name,
--   from_sprint, archived_at, created_at from archive.projects_demo;
