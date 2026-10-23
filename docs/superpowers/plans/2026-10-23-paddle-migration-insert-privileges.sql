-- Fix: 2026-07-27-paddle-migration-privileges.sql narrowed UPDATE on
-- public.projects, but anon/authenticated still held table-level INSERT, and
-- the only RLS policy ("Users can manage their own projects") checks
-- auth.uid() = user_id and nothing else. A logged-in user could therefore
-- POST /rest/v1/projects with paid_at set and get a paid project for free.
-- Verified on prod via has_column_privilege(..., 'INSERT') on 2026-10-23.
--
-- Same pattern as the UPDATE fix: revoke INSERT entirely, then re-grant it
-- only on the columns the app's session-scoped client actually writes.
-- paid_at and paddle_transaction_id stay writable only by the service-role
-- webhook, which bypasses table/column grants and RLS entirely.
--
-- Column set verified against the codebase: the only insert paths are
-- app/projects/actions.ts and app/onboarding/actions.ts, both writing
-- user_id, title, research_context, context_version (everything else uses
-- column defaults). No upserts exist. anon is not re-granted: RLS already
-- rejects its inserts (auth.uid() is null).

revoke insert on public.projects from authenticated, anon;

grant insert (user_id, title, research_context, context_version)
  on public.projects to authenticated;
