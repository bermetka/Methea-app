-- ROLLBACK for 2026-10-24-prompt3-funnel-events-migration.sql. Do not run unless asked.
-- DESTRUCTIVE: deletes every recorded funnel event. Roll back the app first
-- (it inserts into funnel_events; failures are logged, not shown to users).

drop view if exists public.funnel_summary;
drop table if exists public.funnel_events;
