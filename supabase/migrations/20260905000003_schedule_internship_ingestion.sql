-- Schedule the deployed internship ingestion Edge Function once per day.
-- Required one-time Vault secrets (set outside Git before applying this migration):
--   project_url: the Supabase project URL, e.g. https://<project-ref>.supabase.co
--   ingestion_service_role_key: the Supabase service-role key
-- The secret values are intentionally not included in this migration.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  project_url text;
  service_role_key text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'ingestion_service_role_key';

  if project_url is null or service_role_key is null then
    raise exception 'Missing Vault secrets project_url or ingestion_service_role_key. Set both before applying this migration.';
  end if;

  perform cron.unschedule('daily-internship-ingestion');
exception
  when undefined_function then
    null;
end;
$$;

select cron.schedule(
  'daily-internship-ingestion',
  '0 2 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret || '/functions/v1/ingest-internships'
        from vault.decrypted_secrets
        where name = 'project_url'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'ingestion_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
