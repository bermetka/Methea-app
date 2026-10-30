-- Prompt 2 — price variants, signup source, payment fields.
-- Run AFTER 2026-10-23-paddle-migration-insert-privileges.sql: the new projects
-- columns are protected only because INSERT/UPDATE on projects are column-level
-- grants that don't include them. The guard below refuses to run otherwise.

do $$
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'projects'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE')
  ) then
    raise exception 'projects still has a table-level INSERT/UPDATE grant for anon/authenticated — apply the INSERT-privileges fix first';
  end if;
end $$;

-- ─── profiles: one row per user, price variant set once ──────────────────────
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  price_variant  text not null check (price_variant in ('A', 'B')),
  signup_source  jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- New tables get ALL for anon/authenticated via Supabase default privileges.
-- Users may only read their own row; rows are created by the server with the
-- service role (lib/checkout.ts ensureProfile), never by the user — otherwise a
-- user could pick the cheaper variant.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Set once, never changed — enforced for every role, including service_role.
create function public.prevent_price_variant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price_variant is distinct from old.price_variant then
    raise exception 'profiles.price_variant is set once and cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_price_variant_immutable
  before update on public.profiles
  for each row execute function public.prevent_price_variant_change();

-- Backfill: everyone who exists before this migration is a tester → variant B.
insert into public.profiles (id, price_variant, signup_source)
select id, 'B', '{"variant_source": "backfill"}'::jsonb
from auth.users
on conflict (id) do nothing;

-- ─── projects: payment fields, written only by the Paddle webhook ────────────
alter table public.projects
  add column amount_paid         integer null,
  add column currency            text    null,
  add column paid_price_variant  text    null check (paid_price_variant in ('A', 'B')),
  add column discount_code       text    null;

comment on column public.projects.amount_paid is
  'Paddle details.totals.grand_total in minor units (e.g. cents), set by the webhook at payment.';
comment on column public.projects.paid_price_variant is
  'Price variant actually charged (from the transaction price id), set by the webhook.';

-- No grant changes needed for these columns: anon/authenticated hold only
-- column-level INSERT (user_id, title, research_context, context_version) and
-- UPDATE (title, status, research_context, context_version, updated_at) on
-- projects, so the new columns are writable by the service role only.

-- ─── Free project cap: max 3 unpaid, non-archived projects per user ──────────
-- The app checks this first (lib/project-cap.ts) and shows a friendly message;
-- this trigger is the backstop for direct REST inserts.
-- "Unpaid" matches lib/entitlement.ts: never paid, or paid more than 6 months
-- ago. Before the paywall starts nothing counts as unpaid (rule A).

-- Must match the app's PAYWALL_START env. Applied as 2026-11-01T00:00:00+06:00;
-- moved to 2026-10-30T16:00:00+06:00 by 2026-10-30-paywall-start-today-migration.sql.
create function public.paywall_start()
returns timestamptz
language sql
immutable
set search_path = ''
as $$ select '2026-11-01T00:00:00+06:00'::timestamptz $$;

create function public.enforce_free_project_cap()
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

create trigger projects_free_project_cap
  before insert on public.projects
  for each row execute function public.enforce_free_project_cap();
