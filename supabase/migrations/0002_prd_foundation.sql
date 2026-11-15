-- =====================================================================
-- SBF Pulse — fondations PRD (migration 0002)
-- À exécuter après 0001_sbf_pulse.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouveaux champs du marché
--    code              : référence interne (ex. T/VRD/31/2026)
--    passation_mode    : appel d'offres ouvert, consultation, gré à gré…
--    cautions          : montants des cautions provisoire / définitive
-- ---------------------------------------------------------------------
alter table public.projects
  add column if not exists code                text,
  add column if not exists passation_mode      text,
  add column if not exists caution_provisoire  numeric(16, 3),
  add column if not exists caution_definitive  numeric(16, 3);

create index if not exists projects_code_idx on public.projects (code);

-- ---------------------------------------------------------------------
-- 2. Migration du vocabulaire des statuts vers le PRD
-- ---------------------------------------------------------------------
update public.projects set status = 'Offre déposée'       where status = 'Offre remise';
update public.projects set status = 'Adjugé'              where status = 'Attribué';
update public.projects set status = 'Offre non attribuée' where status = 'Perdu';

-- ---------------------------------------------------------------------
-- 3. Calendrier des remises d'offres
--    Chaque ligne peut être liée à un marché, ou rester autonome
--    (avant même la création de la fiche marché).
-- ---------------------------------------------------------------------
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  project_id  text references public.projects (id) on delete set null,
  code        text,
  name        text not null,
  client      text,
  deadline    date not null,
  decision    text not null default 'En attente'
              check (decision in ('En attente', 'Oui', 'Non')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists submissions_deadline_idx
  on public.submissions (deadline);
create index if not exists submissions_project_idx
  on public.submissions (project_id);

drop trigger if exists submissions_updated_at on public.submissions;
create trigger submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Sécurité (RLS) : même règle que les autres tables
-- ---------------------------------------------------------------------
alter table public.submissions enable row level security;

drop policy if exists "auth full access" on public.submissions;
create policy "auth full access" on public.submissions
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 5. Temps réel
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.submissions;
  exception when duplicate_object then null;
  end;
end;
$$;
