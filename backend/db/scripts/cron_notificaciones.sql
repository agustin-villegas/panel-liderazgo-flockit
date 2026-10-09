-- Cron de notificaciones: cada 15 minutos llama al backend de prod (plan §1, pg_cron + pg_net).
-- Correr en Supabase → SQL Editor.
-- ANTES: reemplazá <CRON_SECRET> por el valor de CRON_SECRET del proyecto panel-liderazgo-api
-- en Vercel (Settings → Environment Variables). No lo commitees: este archivo queda con el placeholder.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- si ya existía, lo reemplaza
select cron.unschedule('panel-notificaciones')
where exists (select 1 from cron.job where jobname = 'panel-notificaciones');

select cron.schedule(
  'panel-notificaciones',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://panel-liderazgo-api.vercel.app/internal/jobs/notificaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Verificación: el job y sus últimas corridas
select jobid, jobname, schedule, active from cron.job where jobname = 'panel-notificaciones';
-- select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'panel-notificaciones')
--   order by start_time desc limit 5;
-- Respuestas HTTP: select status_code, content from net._http_response order by created desc limit 5;
