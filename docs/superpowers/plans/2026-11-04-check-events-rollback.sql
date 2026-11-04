-- Rollback of 2026-11-04-check-events-migration.sql.
-- Delete check events first, or the narrower constraint will fail to add.
delete from public.funnel_events where event in ('check_view', 'check_complete', 'check_cta');

alter table public.funnel_events drop constraint if exists funnel_events_event_check;
alter table public.funnel_events add constraint funnel_events_event_check check (event in (
  'start_view', 'signup', 'brief_submitted', 'gate1_done', 'theories_no_fit',
  'framework_diagram_viewed', 'paywall_view', 'unlock_click', 'purchase',
  'pilot_request', 'monthly_waitlist'
));

drop policy if exists "Anonymous visitors insert pre-signup funnel events" on public.funnel_events;
create policy "Anonymous visitors insert pre-signup funnel events"
  on public.funnel_events for insert to anon
  with check (user_id is null and event in ('start_view', 'pilot_request', 'monthly_waitlist'));
