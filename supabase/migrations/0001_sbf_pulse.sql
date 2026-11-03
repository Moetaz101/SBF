-- =====================================================================
-- SBF Pulse — schéma de base de données (Supabase / PostgreSQL)
-- À exécuter une seule fois : Supabase → SQL Editor → coller → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Marchés / appels d'offres
--    Les colonnes reprennent les champs du fichier
--    sbf_marches_chiffrage_*.json (camelCase → snake_case).
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id                text primary key default gen_random_uuid()::text,

  -- Identité
  name              text not null,
  description       text,

  -- Client & site
  client            text,
  location          text,
  type              text,
  status            text not null default 'En étude',

  -- Intervenants
  chef_projet       text,
  architecte        text,
  bet               text,
  ing_conseil       text,
  bureau_controle   text,

  -- Financier (TND)
  amount_ht         numeric(16, 3),
  amount_ttc        numeric(16, 3),
  coef_reglement    numeric(8, 4),
  margin            numeric(8, 3),          -- marge prévue en %

  -- Conditions contractuelles
  avance            numeric(6, 2),          -- % d'avance
  retenue_garantie  numeric(6, 2),          -- % de retenue de garantie
  modalite_paiement text,
  penalite_retard   text,

  -- Dates & délais
  date_remise_offre date,
  date_os           date,                   -- ordre de service
  duree_client      numeric(8, 2),          -- délai contractuel (mois)
  duree_sbf         numeric(8, 2),          -- objectif interne SBF (mois)

  -- Site
  surf_terrain      numeric(14, 2),
  surf_couverte     numeric(14, 2),

  -- Suivi d'exécution (nouveaux champs)
  avancement        numeric(5, 2) not null default 0
                    check (avancement between 0 and 100),
  montant_facture   numeric(16, 3) not null default 0,  -- décomptes cumulés HT
  cout_reel         numeric(16, 3) not null default 0,  -- dépenses réelles cumulées
  notes             text,

  -- Champs du JSON d'origine non repris ci-dessus (rien n'est perdu)
  extra             jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_client_idx on public.projects (client);

-- ---------------------------------------------------------------------
-- 2. Documents (PDF) — le fichier est dans Storage, la ligne ici
-- ---------------------------------------------------------------------
create table if not exists public.project_documents (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null references public.projects (id) on delete cascade,
  name          text not null,
  storage_path  text not null unique,
  size_bytes    bigint,
  mime_type     text,
  created_at    timestamptz not null default now()
);

create index if not exists project_documents_project_idx
  on public.project_documents (project_id);

-- ---------------------------------------------------------------------
-- 3. Planning des travaux (tâches par marché)
-- ---------------------------------------------------------------------
create table if not exists public.planning_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  text not null references public.projects (id) on delete cascade,
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  progress    numeric(5, 2) not null default 0 check (progress between 0 and 100),
  responsable text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists planning_tasks_project_idx
  on public.planning_tasks (project_id);

-- ---------------------------------------------------------------------
-- 4. updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists planning_tasks_updated_at on public.planning_tasks;
create trigger planning_tasks_updated_at
  before update on public.planning_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Sécurité (RLS) : tout utilisateur connecté peut lire et modifier.
--    Les visiteurs non connectés ne voient rien.
-- ---------------------------------------------------------------------
alter table public.projects          enable row level security;
alter table public.project_documents enable row level security;
alter table public.planning_tasks    enable row level security;

drop policy if exists "auth full access" on public.projects;
create policy "auth full access" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.project_documents;
create policy "auth full access" on public.project_documents
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.planning_tasks;
create policy "auth full access" on public.planning_tasks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 6. Stockage des PDF (bucket privé "documents")
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 52428800, null)  -- 50 Mo max par fichier
on conflict (id) do nothing;

drop policy if exists "auth read documents" on storage.objects;
create policy "auth read documents" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

drop policy if exists "auth upload documents" on storage.objects;
create policy "auth upload documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "auth update documents" on storage.objects;
create policy "auth update documents" on storage.objects
  for update to authenticated using (bucket_id = 'documents');

drop policy if exists "auth delete documents" on storage.objects;
create policy "auth delete documents" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

-- ---------------------------------------------------------------------
-- 7. Synchronisation temps réel (toute modification est poussée
--    instantanément aux autres appareils connectés)
-- ---------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.projects;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.project_documents;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.planning_tasks;
  exception when duplicate_object then null;
  end;
end;
$$;
