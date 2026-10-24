-- ROLLBACK for 2026-10-23-paddle-migration-insert-privileges.sql. Do not run unless
-- asked. Roll back the Prompt 2 migration FIRST: once this runs, users can INSERT
-- any projects column again (paid_at, paddle_transaction_id and Prompt 2's payment
-- columns) — it re-opens the "create an already-paid project" hole.
-- Does not remove the entry from supabase_migrations.schema_migrations.

revoke insert (user_id, title, research_context, context_version)
  on public.projects from authenticated;

grant insert on public.projects to authenticated, anon;
