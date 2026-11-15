-- =====================================================================
-- SBF Pulse — planning hebdomadaire des remises d'offres
-- =====================================================================

create table if not exists public.planning_entries (
  id            uuid primary key default gen_random_uuid(),
  project_id    text references public.projects (id) on delete set null,
  code          text not null unique,
  category      text not null,
  entry_number  integer not null,
  year          integer not null,
  name          text not null,
  client        text,
  start_date    date not null,
  end_date      date not null,
  decision      text not null default 'En attente'
                check (decision in ('En attente', 'Oui', 'Non')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, entry_number, year),
  check (end_date >= start_date),
  check (end_date - start_date < 7)
);

create index if not exists planning_entries_dates_idx
  on public.planning_entries (start_date, end_date);
create index if not exists planning_entries_category_idx
  on public.planning_entries (category, year);
create index if not exists planning_entries_project_idx
  on public.planning_entries (project_id);

create or replace function public.set_planning_entry_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_number integer;
begin
  if new.category is null or btrim(new.category) = '' then
    raise exception 'La catégorie du planning est obligatoire';
  end if;

  if new.year is null then
    new.year = extract(year from new.start_date)::integer;
  end if;

  if new.entry_number is null or new.entry_number <= 0 then
    select coalesce(max(entry_number), 0) + 1
      into next_number
      from public.planning_entries
     where category = upper(btrim(new.category))
       and year = new.year;
    new.entry_number = next_number;
  end if;

  new.category = upper(btrim(new.category));
  new.code = format('T/%s/%s/%s', new.category, lpad(new.entry_number::text, 2, '0'), new.year);
  return new;
end;
$$;

drop trigger if exists planning_entries_code on public.planning_entries;
create trigger planning_entries_code
  before insert on public.planning_entries
  for each row execute function public.set_planning_entry_code();

drop trigger if exists planning_entries_updated_at on public.planning_entries;
create trigger planning_entries_updated_at
  before update on public.planning_entries
  for each row execute function public.set_updated_at();

alter table public.planning_entries enable row level security;

drop policy if exists "auth full access" on public.planning_entries;
create policy "auth full access" on public.planning_entries
  for all to authenticated using (true) with check (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.planning_entries;
  exception when duplicate_object then null;
  end;
end;
$$;
