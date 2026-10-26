-- Rollback: restore the Prompt 3 funnel_summary (test traffic included again).

create or replace view public.funnel_summary
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
