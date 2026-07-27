-- Fix: Task 1's column-level REVOKE did not actually block writes to
-- paid_at/paddle_transaction_id, because authenticated/anon hold TABLE-level
-- UPDATE on public.projects, and a column-level REVOKE does not narrow an
-- existing table-level GRANT in Postgres. Verified on prod via
-- has_column_privilege() before writing this fix.
--
-- Correct fix: revoke UPDATE entirely, then re-grant it only on the exact
-- columns the app's session-scoped (anon/authenticated) Supabase client
-- actually writes. paid_at and paddle_transaction_id are deliberately
-- excluded — those are written only by the service-role webhook, which
-- bypasses table/column grants and RLS entirely.
--
-- Column set verified against the codebase (lib/research-context.ts is the
-- only UPDATE path against projects, writing research_context +
-- context_version) and confirmed working on prod via has_column_privilege:
-- title, status, research_context, context_version, updated_at.

revoke update on public.projects from authenticated, anon;

grant update (title, status, research_context, context_version, updated_at)
  on public.projects to authenticated, anon;
