-- Rollback: paywall start back to 2026-11-01 00:00 Bishkek (2026-10-31 18:00 UTC).
-- Also set Vercel Production PAYWALL_START back to 2026-11-01T00:00:00+06:00 and redeploy.
create or replace function public.paywall_start()
returns timestamptz
language sql
immutable
set search_path = ''
as $$ select '2026-11-01T00:00:00+06:00'::timestamptz $$;
