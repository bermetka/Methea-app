-- Unlimited (comp) flag on profiles: full access to every project the user owns,
-- no 6-month expiry, no free-project cap. Set by us (SQL), never by the user.
--
-- Users can't write it: authenticated holds only SELECT on profiles (Prompt 2
-- migration), and a new column inherits no INSERT/UPDATE grant from that.

alter table public.profiles
  add column unlimited boolean not null default false;

comment on column public.profiles.unlimited is
  'Comp flag: full access to all own projects, no expiry, no free-project cap. Set by us, never by the user.';

-- Free-project cap: same as the Prompt 2 version, plus skip unlimited users.
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

  if exists (select 1 from public.profiles where id = new.user_id and unlimited) then
    return new;
  end if;

  -- Serialise concurrent inserts for the same user so two can't both pass the count.
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
