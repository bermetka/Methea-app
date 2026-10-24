-- Prompt 4 — lead_signups: emails from the sales page's monthly-plan waitlist
-- (fake door) and pilot requests. Personal data lives here, never in
-- funnel_events. Visitors can only insert; nobody reads from the client
-- (query it from the Supabase dashboard).
--
-- Not reusing public.waitlist (old landing): email is UNIQUE there (one row per
-- person, so monthly + pilot would collide), it has no pilot fields, and its
-- insert policy covers anon only (logged-in visitors couldn't sign up).

create table public.lead_signups (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('monthly', 'pilot')),
  email       text not null check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name        text null check (length(name) <= 120),
  university  text null check (length(university) <= 200),
  role        text null check (length(role) <= 120),
  students    integer null check (students between 1 and 100000),
  anon_id     text null check (length(anon_id) <= 64),
  check (kind <> 'pilot' or (name is not null and university is not null))
);

-- One signup per email per kind (a repeat submit is a no-op for the visitor).
create unique index lead_signups_kind_email_key on public.lead_signups (kind, lower(email));

alter table public.lead_signups enable row level security;

create policy "Visitors can sign up"
  on public.lead_signups
  for insert
  to anon, authenticated
  with check (true);

revoke all on public.lead_signups from anon, authenticated;
grant insert (kind, email, name, university, role, students, anon_id) on public.lead_signups to anon, authenticated;
grant select, insert, update, delete on public.lead_signups to service_role;
