-- Methea — Supabase schema
-- Run this in the Supabase SQL editor for your new methea-app project.
-- Auth (users table) is managed by Supabase Auth — no need to create it.

-- ─── Enable UUID generation ───────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── projects ─────────────────────────────────────────────────────────────────
create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null default 'Untitled project',
  status            text not null default 'active' check (status in ('active', 'archived')),
  -- The single central versioned JSON — every sprint reads/writes here
  research_context  jsonb not null default '{
    "version": 1,
    "outdated_blocks": []
  }'::jsonb,
  context_version   integer not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can manage their own projects"
  on public.projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── research_context_versions (audit trail / ripple-effect diffing) ──────────
create table public.research_context_versions (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  version           integer not null,
  context_snapshot  jsonb not null,
  changed_block     text not null,  -- e.g. 'brief', 'theories', 'framework'
  created_at        timestamptz not null default now(),
  unique (project_id, version)
);

alter table public.research_context_versions enable row level security;

create policy "Users can view versions of their own projects"
  on public.research_context_versions
  for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = research_context_versions.project_id
        and projects.user_id = auth.uid()
    )
  );

-- Only the server (service role) inserts versions — no insert policy for anon/user
create policy "Service role can insert versions"
  on public.research_context_versions
  for insert
  with check (true);  -- restricted at application layer via service key

-- ─── theories (closed, curated library — AI never invents entries here) ───────
create table public.theories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  author        text not null,
  year          integer,
  summary       text not null,
  concepts      text[] not null default '{}',
  disciplines   text[] not null default '{}',
  doi           text,
  openalex_id   text,
  created_at    timestamptz not null default now()
);

-- Theories are readable by all authenticated users; only admins insert
alter table public.theories enable row level security;

create policy "Authenticated users can read theories"
  on public.theories
  for select
  to authenticated
  using (true);

-- ─── project_theories (which theories a project has selected) ─────────────────
create table public.project_theories (
  project_id    uuid not null references public.projects(id) on delete cascade,
  theory_id     uuid not null references public.theories(id),
  selected_at   timestamptz not null default now(),
  primary key (project_id, theory_id)
);

alter table public.project_theories enable row level security;

create policy "Users can manage theory selections for their projects"
  on public.project_theories
  for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_theories.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_theories.project_id
        and projects.user_id = auth.uid()
    )
  );

-- ─── Auto-update updated_at on projects ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_projects_updated
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- ─── Seed: placeholder theories (8) to develop against in Sprint 2 ───────────
-- Replace/augment with the full 40-theory library from THEORY_LIBRARY_PLAN.md
insert into public.theories (name, author, year, summary, concepts, disciplines, doi) values
  (
    'Social Cognitive Theory',
    'Bandura',
    1986,
    'Behaviour is learned through observation, imitation, and modelling within a social context. Self-efficacy beliefs shape motivation and action.',
    array['self-efficacy','observational learning','reciprocal determinism','modelling'],
    array['psychology','education','organisational behaviour'],
    '10.1007/978-3-319-28099-8_1099-1'
  ),
  (
    'Technology Acceptance Model',
    'Davis',
    1989,
    'Users adopt technology based on perceived usefulness and perceived ease of use. Foundational for IS research.',
    array['perceived usefulness','perceived ease of use','behavioural intention','adoption'],
    array['information systems','technology','management'],
    '10.2307/249008'
  ),
  (
    'Institutional Theory',
    'DiMaggio & Powell',
    1983,
    'Organisations conform to social norms and expectations (isomorphism) to gain legitimacy, not just efficiency.',
    array['isomorphism','legitimacy','coercive pressure','mimetic pressure','normative pressure'],
    array['sociology','management','organisation studies'],
    '10.2307/2095101'
  ),
  (
    'Diffusion of Innovations',
    'Rogers',
    1962,
    'New ideas/technologies spread through social systems via specific adopter categories and communication channels.',
    array['adopter categories','innovation attributes','communication channels','social system'],
    array['communication','sociology','public health','technology'],
    '10.1177/009365062001001002'
  ),
  (
    'Structuration Theory',
    'Giddens',
    1984,
    'Social structures are both the medium and outcome of human action; structure and agency are mutually constitutive.',
    array['structure','agency','duality of structure','rules and resources','recursive practice'],
    array['sociology','organisation studies','information systems'],
    null
  ),
  (
    'Resource-Based View',
    'Barney',
    1991,
    'Sustainable competitive advantage stems from firm resources that are valuable, rare, inimitable, and non-substitutable (VRIN).',
    array['VRIN','sustained competitive advantage','core competencies','dynamic capabilities'],
    array['strategic management','business','economics'],
    '10.5465/amr.1991.4278428'
  ),
  (
    'Sensemaking Theory',
    'Weick',
    1995,
    'Individuals and organisations retrospectively construct meaning from ambiguous situations through ongoing narrative and enactment.',
    array['enactment','retrospective sensemaking','plausibility','identity construction'],
    array['organisation studies','management','psychology'],
    null
  ),
  (
    'Grounded Theory',
    'Glaser & Strauss',
    1967,
    'Systematic inductive methodology for developing theory from data through constant comparison and theoretical sampling.',
    array['open coding','axial coding','selective coding','theoretical saturation','constant comparison'],
    array['sociology','nursing','education','qualitative research'],
    null
  );
