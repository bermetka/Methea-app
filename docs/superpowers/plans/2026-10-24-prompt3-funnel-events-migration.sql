-- Prompt 3 — funnel events + funnel_summary view.
-- Writes come from the app's server code through the visitor's own Supabase
-- session (role anon or authenticated), plus the service role for purchase and
-- for linking pre-signup events. Nobody can read events from the client; the
-- summary is queried from the Supabase dashboard.

create table public.funnel_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid null references auth.users(id) on delete set null,
  anon_id     text null check (anon_id is null or length(anon_id) <= 64),
  event       text not null check (event in (
                'start_view', 'signup', 'brief_submitted', 'gate1_done', 'theories_no_fit',
                'framework_diagram_viewed', 'paywall_view', 'unlock_click', 'purchase',
                'pilot_request', 'monthly_waitlist')),
  props       jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 4096),
  -- "once per user/project": e.g. 'paywall_view:<project id>'. Null = not deduplicated.
  dedupe_key  text null unique check (dedupe_key is null or length(dedupe_key) <= 200)
);

create index funnel_events_created_at_idx on public.funnel_events (created_at);
create index funnel_events_anon_id_idx on public.funnel_events (anon_id) where user_id is null;

alter table public.funnel_events enable row level security;

-- Logged-in users insert only rows for themselves, never purchase (server-only).
create policy "Users insert their own funnel events"
  on public.funnel_events
  for insert
  to authenticated
  with check (user_id = auth.uid() and event <> 'purchase');

-- Anonymous visitors (sales page) insert only anonymous, pre-signup events.
create policy "Anonymous visitors insert pre-signup funnel events"
  on public.funnel_events
  for insert
  to anon
  with check (user_id is null and event in ('start_view', 'pilot_request', 'monthly_waitlist'));

-- No SELECT/UPDATE/DELETE policy and no such grants: nobody reads or edits events
-- from the client. Insert only, and without RETURNING (the app never selects back).
revoke all on public.funnel_events from anon, authenticated;
grant insert (user_id, anon_id, event, props, dedupe_key) on public.funnel_events to anon, authenticated;
-- Explicit, rather than relying on Supabase's default privileges (which changed
-- in newer projects): purchase events + linking anon events at signup.
grant select, insert, update on public.funnel_events to service_role;

-- ─── funnel_summary: last 14 days, per event × angle × price variant ─────────
-- angle / price_variant: taken from the event's props (anonymous sales-page
-- events), else from the user's profile (signup_source.angle, price_variant).
-- Excludes unlimited (comp) users. Revenue only from purchase events that
-- carry an amount (minor units, as Paddle's grand_total).
create view public.funnel_summary
with (security_invoker = true)
as
select
  e.event,
  coalesce(e.props->>'angle', p.signup_source->>'angle', '(none)')   as angle,
  coalesce(e.props->>'price_variant', p.price_variant, '(none)')     as price_variant,
  count(*)                                                            as events,
  count(distinct coalesce(e.user_id::text, e.anon_id))                as people,
  sum((e.props->>'amount')::bigint) filter (
    where e.event = 'purchase' and e.props->>'amount' is not null)   as revenue_minor,
  string_agg(distinct e.props->>'currency', ',') filter (
    where e.event = 'purchase')                                       as currencies
from public.funnel_events e
left join public.profiles p on p.id = e.user_id
where e.created_at >= now() - interval '14 days'
  and coalesce(p.unlimited, false) = false
group by 1, 2, 3
order by 1, 2, 3;

-- Dashboard-only: not exposed to the client API.
revoke all on public.funnel_summary from anon, authenticated;
