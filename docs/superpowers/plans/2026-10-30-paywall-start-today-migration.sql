-- Move the paywall start from 2026-11-01 00:00 Bishkek to TODAY 2026-10-30
-- 16:00 Bishkek (10:00 UTC). Must match the app's PAYWALL_START env
-- (prod: 2026-10-30T16:00:00+06:00). Used by enforce_free_project_cap (free
-- project cap trigger). Same signature, so create or replace keeps the trigger.
create or replace function public.paywall_start()
returns timestamptz
language sql
immutable
set search_path = ''
as $$ select '2026-10-30T16:00:00+06:00'::timestamptz $$;
