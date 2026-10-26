-- funnel_summary: drop test traffic. A "test person" is anyone who carried
-- utm_source=test at any point: an anonymous id or user with an event tagged
-- that way, or a user whose signup_source says so. All of that person's events
-- are excluded (not only the tagged one), so a test run never leaks into the
-- numbers through its later, untagged events (paywall_view, purchase, …).
-- Same columns as before, so create or replace keeps grants and options.

create or replace view public.funnel_summary
with (security_invoker = true)
as
with test_events as (
  select user_id, anon_id
  from public.funnel_events
  where lower(props->>'utm_source') = 'test'
)
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
  and coalesce(lower(p.signup_source->>'utm_source'), '') <> 'test'
  and not exists (select 1 from test_events t where t.anon_id = e.anon_id)
  and not exists (select 1 from test_events t where t.user_id = e.user_id)
group by 1, 2, 3
order by 1, 2, 3;

revoke all on public.funnel_summary from anon, authenticated;
