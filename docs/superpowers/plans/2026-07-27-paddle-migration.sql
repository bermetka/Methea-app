-- Paddle entitlement — run on a Supabase development branch first.
-- Do NOT run against prod until the user has explicitly approved (see Task 15).

alter table public.projects
  add column paid_at timestamptz null,
  add column paddle_transaction_id text null;

comment on column public.projects.paid_at is
  'Set by the Paddle webhook when a $49 one-time payment for this project is verified. NULL = free/unpaid.';
