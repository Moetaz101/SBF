-- =====================================================================
-- SBF Pulse — consolidation du planning hebdomadaire (migration 0004)
-- Corrige et renforce la migration 0003 :
--   * l'année du code est toujours dérivée de la date de début ;
--   * la numérotation est atomique (verrou par catégorie + année) ;
--   * une entrée est renumérotée si sa catégorie ou son année change ;
--   * l'ancienne table `submissions` (0002), devenue redondante, est
--     reprise dans `planning_entries` puis supprimée.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Génération fiable de l'identifiant T/CATÉGORIE/N°/ANNÉE
-- ---------------------------------------------------------------------
create or replace function public.set_planning_entry_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_category text;
  entry_year          integer;
  next_number         integer;
  renumber            boolean;
begin
  if new.start_date is null then
    raise exception 'La date de début du planning est obligatoire';
  end if;

  normalized_category := upper(btrim(coalesce(new.category, '')));
  if normalized_category = '' then
    raise exception 'La catégorie du planning est obligatoire';
  end if;

  -- La base reste la source de vérité : l'année vient toujours de la date.
  entry_year := extract(year from new.start_date)::integer;
  new.category := normalized_category;
  new.year := entry_year;

  if tg_op = 'INSERT' then
    renumber := true;
  else
    renumber := new.entry_number is null
      or new.entry_number <= 0
      or old.category is distinct from normalized_category
      or old.year is distinct from entry_year;
  end if;

  if renumber then
    -- Deux enregistrements simultanés dans la même catégorie/année ne
    -- peuvent pas obtenir le même numéro.
    perform pg_advisory_xact_lock(hashtext(normalized_category || ':' || entry_year::text));

    select coalesce(max(entry_number), 0) + 1
      into next_number
      from public.planning_entries
     where category = normalized_category
       and year = entry_year;

    new.entry_number := next_number;
  end if;

  new.code := format(
    'T/%s/%s/%s',
    new.category,
    lpad(new.entry_number::text, 2, '0'),
    new.year
  );

  return new;
end;
$$;

drop trigger if exists planning_entries_code on public.planning_entries;
create trigger planning_entries_code
  before insert or update of category, start_date, entry_number, year
  on public.planning_entries
  for each row execute function public.set_planning_entry_code();

-- ---------------------------------------------------------------------
-- 2. Reprise de l'ancien calendrier `submissions`
--    La table 0002 faisait doublon avec planning_entries. Elle est
--    vide sur les installations récentes ; les éventuelles lignes sont
--    conservées avant la suppression.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.submissions') is not null then
    insert into public.planning_entries (
      project_id,
      category,
      name,
      client,
      start_date,
      end_date,
      decision
    )
    select
      s.project_id,
      coalesce(nullif(upper(btrim(split_part(coalesce(s.code, ''), '/', 2))), ''), 'AUT'),
      s.name,
      s.client,
      s.deadline,
      s.deadline,
      s.decision
    from public.submissions s
    where not exists (
      select 1
      from public.planning_entries p
      where p.name = s.name
        and p.start_date = s.deadline
        and p.project_id is not distinct from s.project_id
    );

    drop table public.submissions;
  end if;
end;
$$;

-- Rafraîchit le cache de schéma exposé par l'API Supabase.
notify pgrst, 'reload schema';
