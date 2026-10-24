-- ROLLBACK for 2026-10-24-prompt4-lead-signups-migration.sql. Do not run unless asked.
-- DESTRUCTIVE: deletes every waitlist and pilot signup — export them first.
drop table if exists public.lead_signups;
