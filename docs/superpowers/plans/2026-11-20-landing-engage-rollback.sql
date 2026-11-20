delete from public.funnel_events where event = 'landing_engage';
alter policy "Anonymous visitors insert pre-signup funnel events" on public.funnel_events
  with check ((user_id is null) and (event = any (array['start_view','pilot_request','monthly_waitlist','check_view','check_complete','check_cta']::text[])));
alter table public.funnel_events drop constraint funnel_events_event_check;
alter table public.funnel_events add constraint funnel_events_event_check check (event = any (array[
  'start_view','signup','brief_submitted','gate1_done','theories_no_fit',
  'framework_diagram_viewed','paywall_view','unlock_click','purchase',
  'pilot_request','monthly_waitlist','check_view','check_complete','check_cta'
]::text[]));
