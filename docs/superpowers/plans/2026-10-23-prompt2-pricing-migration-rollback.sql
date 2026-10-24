-- ROLLBACK for 2026-10-23-prompt2-pricing-migration.sql. Do not run unless asked.
-- DESTRUCTIVE: drops every user's price_variant (profiles) and all recorded
-- payment fields (amount_paid, currency, paid_price_variant, discount_code).
-- paid_at / paddle_transaction_id are untouched, so paid projects stay paid.
-- Roll back the app first: feat/funnel-paywall code reads these objects.
-- Does not remove the entry from supabase_migrations.schema_migrations.
-- Dropping the free-cap trigger leaves the cap enforced only in the app's server
-- actions; a direct REST insert could then exceed it until the trigger is restored.

-- Free project cap
drop trigger if exists projects_free_project_cap on public.projects;
drop function if exists public.enforce_free_project_cap();
drop function if exists public.paywall_start();

-- Payment fields
alter table public.projects
  drop column if exists discount_code,
  drop column if exists paid_price_variant,
  drop column if exists currency,
  drop column if exists amount_paid;

-- Profiles (drops its policy and the immutable-variant trigger with it)
drop table if exists public.profiles;
drop function if exists public.prevent_price_variant_change();
