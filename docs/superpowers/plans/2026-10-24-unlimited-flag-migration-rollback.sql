-- ROLLBACK for 2026-10-24-unlimited-flag-migration.sql. Do not run unless asked.
-- Removes everyone's comp flag; roll back the app first (it reads profiles.unlimited).

-- Restore the Prompt 2 free-cap function (no unlimited exemption).
create or replace function public.enforce_free_project_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  unpaid_count integer;
begin
  if now() < public.paywall_start() or new.status <> 'active' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('free_project_cap:' || new.user_id::text));

  select count(*) into unpaid_count
  from public.projects
  where user_id = new.user_id
    and status = 'active'
    and (paid_at is null or paid_at + interval '6 months' <= now());

  if unpaid_count >= 3 then
    raise exception 'free project cap reached: max 3 unpaid projects'
      using errcode = 'P0001', hint = 'Unlock or archive a project to start another.';
  end if;

  return new;
end;
$$;

alter table public.profiles drop column if exists unlimited;
