-- /check funnel events: check_view, check_complete, check_cta.
-- Widens the allowed event list and lets anonymous visitors (before sign-up)
-- record the three check events, like start_view. Run on a Supabase branch first.
-- The check constraint name is Postgres's default for the original inline check;
-- confirm it with: select conname from pg_constraint where conrelid = 'public.funnel_events'::regclass;

alter table public.funnel_events drop constraint if exists funnel_events_event_check;
alter table public.funnel_events add constraint funnel_events_event_check check (event in (
  'start_view', 'signup', 'brief_submitted', 'gate1_done', 'theories_no_fit',
  'framework_diagram_viewed', 'paywall_view', 'unlock_click', 'purchase',
  'pilot_request', 'monthly_waitlist',
  'check_view', 'check_complete', 'check_cta'
));

drop policy if exists "Anonymous visitors insert pre-signup funnel events" on public.funnel_events;
create policy "Anonymous visitors insert pre-signup funnel events"
  on public.funnel_events for insert to anon
  with check (user_id is null and event in (
    'start_view', 'pilot_request', 'monthly_waitlist',
    'check_view', 'check_complete', 'check_cta'
  ));
