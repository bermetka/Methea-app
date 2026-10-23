# Post-launch TODO

Deferred on purpose during the funnel + paywall sprint (paywall live Nov 1, 2026).
Not for before launch.

## Database

- **Baseline migration.** Prod's migration history starts with `create_waitlist_table`.
  The core tables (`projects`, `research_context_versions`, `theories`,
  `project_theories`) were created in the SQL editor from `supabase/schema.sql`, so a
  fresh Supabase dev branch fails replaying `add_paid_at_entitlement` (it alters a
  `projects` table that doesn't exist yet). Add `schema.sql` as a baseline migration so
  branches work without manual bootstrapping. Writing it into prod's migration history
  is a prod change and needs explicit approval. Checked 2026-10-23: `schema.sql`
  matches prod for these tables (columns, constraints, RLS, grants); prod has 42
  theories vs the 8 seeded in `schema.sql`.
- **`export_count` cleanup.** Dead since the Paddle paywall removed
  `export/actions.ts`. It's a key inside `research_context` (not a DB column): remove
  the field from `types/database.ts` (see the TODO there) and, if wanted, strip the key
  from existing projects.
