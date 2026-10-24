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
  theories vs the 8 seeded in `schema.sql`. Found 2026-10-24: `schema.sql` relies on
  the old Supabase default of full table grants to anon/authenticated/service_role.
  Current Supabase (local CLI 2.109) grants only TRUNCATE/REFERENCES/TRIGGER on new
  tables, so the baseline must state the grants explicitly (prod's set: SELECT,
  INSERT, DELETE, … then the column-level INSERT/UPDATE fixes).
- **`export_count` cleanup.** Dead since the Paddle paywall removed
  `export/actions.ts`. It's a key inside `research_context` (not a DB column): remove
  the field from `types/database.ts` (see the TODO there) and, if wanted, strip the key
  from existing projects.
- **Atomic, non-user-writable diagram-refresh counter.** `free_diagram_refreshes`
  lives in `research_context`, which users can write via the API (they can reset
  it), and the cap check is read-then-write (parallel page loads can overshoot 5).
  Move the counter to a column/table users can't write and claim a slot atomically
  (`update … set n = n + 1 where n < 5 returning n`) before calling Claude.
- **`public.paywall_start()` duplicates `PAYWALL_START`.** The free-cap trigger can't
  read app env, so the start date is hardcoded in that SQL function. If the launch
  date moves, change both (or move it to a config table).

## Ops

- **Never run `supabase config push` against prod** — `supabase/config.toml` has
  local-only weak auth settings (no email confirmation, 6-char passwords).
