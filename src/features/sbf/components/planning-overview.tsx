'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeletePlanningEntry, usePlanningEntries, useProjects } from '@/lib/sbf/api';
import { formatDateFr, toISODate } from '@/lib/sbf/format';
import {
  EMPTY_PLANNING_FILTERS,
  addDays,
  buildPlanningCsv,
  categoryLabel,
  filterPlanningEntries,
  hasActivePlanningFilters,
  isoWeekNumber,
  mondayOf,
  planningDurationDays,
  planningFilterOptions,
  planningStats,
  weekStart
} from '@/lib/sbf/planning';
import type { PlanningEntry } from '@/lib/sbf/types';
import { useToday } from '@/lib/sbf/use-today';
import { ErrorBox } from './dashboard-view';
import { PlanningCalendar } from './planning-calendar';
import { PlanningEntryDialog } from './planning-entry-dialog';
import { PlanningReport } from './planning-report';

const DECISION_BADGES: Record<PlanningEntry['decision'], string> = {
  'En attente': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Oui: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Non: 'bg-red-500/10 text-red-700 dark:text-red-300'
};

export function PlanningOverview() {
  const { data: entries, isLoading, error } = usePlanningEntries();
  const { data: projects } = useProjects();
  const remove = useDeletePlanningEntry();
  const today = useToday();
  const todayISO = toISODate(today);
  const [week, setWeek] = useState(() => mondayOf(today));
  const [filters, setFilters] = useState(EMPTY_PLANNING_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanningEntry | null>(null);

  const projectsById = useMemo(
    () => new Map((projects ?? []).map((project) => [project.id, project])),
    [projects]
  );

  const filtered = useMemo(() => filterPlanningEntries(entries ?? [], filters), [entries, filters]);
  const options = useMemo(() => planningFilterOptions(entries ?? []), [entries]);
  const stats = useMemo(() => planningStats(filtered), [filtered]);

  const weekEnd = addDays(week, 6);
  const weekLabel = isoWeekNumber(week);
  const weekCount = filtered.filter(
    (entry) => entry.start_date <= weekEnd && entry.end_date >= week
  ).length;
  const filtersActive = hasActivePlanningFilters(filters);
  const defaultDate = todayISO >= week && todayISO <= weekEnd ? todayISO : week;

  function marketLabel(entry: PlanningEntry) {
    if (!entry.project_id) return '—';
    const project = projectsById.get(entry.project_id);
    if (!project) return '—';
    return `${project.code ? `${project.code} · ` : ''}${project.name}`;
  }

  function setFilter<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingEntry(null);
    setDialogOpen(true);
  }

  function openEdit(entry: PlanningEntry) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingEntry(null);
  }

  function handleSaved(saved: PlanningEntry) {
    setDialogOpen(false);
    setEditingEntry(null);
    setWeek(weekStart(saved.start_date));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    remove.mutate(target.id, {
      onSuccess: () => toast.success(`${target.code} supprimé du planning`),
      onError: (deleteError) => toast.error(deleteError.message)
    });
  }

  function exportCsv() {
    if (!filtered.length) return;
    const csv = buildPlanningCsv(filtered, marketLabel);
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `planning-sbf-${todayISO}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!filtered.length) return;
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    document.title = `Planning SBF ${todayISO}`;
    window.print();
  }

  if (isLoading) return <PlanningSkeleton />;
  if (error) return <ErrorBox message={error.message} />;

  return (
    <>
      <div className='flex flex-col gap-4 print:hidden'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-muted-foreground text-sm'>
            Une planification couvre au maximum 7 jours. Le code{' '}
            <span className='text-foreground font-mono'>T/CATÉGORIE/N°/ANNÉE</span> est attribué
            automatiquement par catégorie et par année.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={exportCsv} disabled={!filtered.length}>
              <Icons.download /> CSV
            </Button>
            <Button variant='outline' onClick={printReport} disabled={!filtered.length}>
              <Icons.fileTypePdf /> PDF
            </Button>
            <Button onClick={openCreate}>
              <Icons.add /> Ajouter
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5'>
          <SummaryTile label='Planifications' value={stats.total} />
          <SummaryTile
            label={weekLabel ? `Semaine ${weekLabel}` : 'Semaine affichée'}
            value={weekCount}
          />
          <SummaryTile
            label='En attente'
            value={stats.pending}
            className='text-amber-700 dark:text-amber-300'
          />
          <SummaryTile
            label='Retenues'
            value={stats.accepted}
            className='text-emerald-700 dark:text-emerald-300'
          />
          <SummaryTile
            label='Refusées'
            value={stats.declined}
            className='text-red-700 dark:text-red-300'
          />
        </div>

        <Card>
          <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>Recherche par identifiant</CardTitle>
              <p className='text-muted-foreground text-xs'>
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                {filtersActive && entries?.length ? ` sur ${entries.length}` : ''}
              </p>
            </div>
            {filtersActive && (
              <Button variant='ghost' size='sm' onClick={() => setFilters(EMPTY_PLANNING_FILTERS)}>
                <Icons.refresh /> Réinitialiser
              </Button>
            )}
          </CardHeader>
          <CardContent className='grid gap-2 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='relative sm:col-span-2 lg:col-span-1'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
              <Input
                type='search'
                value={filters.query}
                onChange={(event) => setFilter('query', event.target.value)}
                placeholder='Code, projet, client…'
                className='pl-9'
                aria-label='Rechercher dans le planning'
              />
            </div>
            <NativeSelect
              value={filters.prefix}
              onChange={(event) => setFilter('prefix', event.target.value)}
              aria-label='Filtrer par préfixe'
            >
              <NativeSelectOption value=''>Tous les préfixes</NativeSelectOption>
              {options.prefixes.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.category}
              onChange={(event) => setFilter('category', event.target.value)}
              aria-label='Filtrer par catégorie'
            >
              <NativeSelectOption value=''>Toutes les catégories</NativeSelectOption>
              {options.categories.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {categoryLabel(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.number}
              onChange={(event) => setFilter('number', event.target.value)}
              aria-label='Filtrer par numéro'
            >
              <NativeSelectOption value=''>Tous les numéros</NativeSelectOption>
              {options.numbers.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  N° {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={filters.year}
              onChange={(event) => setFilter('year', event.target.value)}
              aria-label='Filtrer par année'
            >
              <NativeSelectOption value=''>Toutes les années</NativeSelectOption>
              {options.years.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </CardContent>
        </Card>

        <PlanningCalendar
          week={week}
          entries={filtered}
          todayISO={todayISO}
          onWeekChange={setWeek}
          onEdit={openEdit}
        />

        <Card>
          <CardHeader className='flex flex-row items-center justify-between gap-2'>
            <CardTitle>Tableau des planifications</CardTitle>
            <span className='text-muted-foreground text-xs'>
              {filtered.length} ligne{filtered.length > 1 ? 's' : ''}
            </span>
          </CardHeader>
          <CardContent className='overflow-x-auto'>
            {filtered.length === 0 ? (
              <div className='flex flex-col items-center gap-3 py-10 text-center'>
                <Icons.calendar className='text-muted-foreground size-8' />
                <div>
                  <p className='font-medium'>
                    {filtersActive ? 'Aucun résultat pour ces filtres' : 'Aucune planification'}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {filtersActive
                      ? 'Ajustez ou réinitialisez la recherche par identifiant.'
                      : 'Ajoutez la première remise d’offre de la semaine.'}
                  </p>
                </div>
                {filtersActive ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setFilters(EMPTY_PLANNING_FILTERS)}
                  >
                    <Icons.refresh /> Réinitialiser les filtres
                  </Button>
                ) : (
                  <Button size='sm' onClick={openCreate}>
                    <Icons.add /> Ajouter une planification
                  </Button>
                )}
              </div>
            ) : (
              <table className='w-full min-w-[900px] text-sm'>
                <caption className='sr-only'>
                  Planifications des remises d’offres, filtrées par identifiant
                </caption>
                <thead className='bg-muted/50 text-muted-foreground text-left text-xs'>
                  <tr>
                    <th className='px-3 py-2 font-medium'>Code</th>
                    <th className='px-3 py-2 font-medium'>Projet / offre</th>
                    <th className='px-3 py-2 font-medium'>Marché lié</th>
                    <th className='px-3 py-2 font-medium'>Client</th>
                    <th className='px-3 py-2 font-medium'>Période</th>
                    <th className='px-3 py-2 font-medium'>Décision</th>
                    <th className='px-3 py-2 text-right font-medium'>
                      <span className='sr-only'>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {filtered.map((entry) => {
                    const project = entry.project_id
                      ? projectsById.get(entry.project_id)
                      : undefined;
                    const duration = planningDurationDays(entry);

                    return (
                      <tr key={entry.id} className='hover:bg-muted/30'>
                        <td className='px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap'>
                          {entry.code}
                        </td>
                        <td className='max-w-72 px-3 py-2'>
                          <div className='truncate font-medium' title={entry.name}>
                            {entry.name}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {categoryLabel(entry.category)}
                          </div>
                        </td>
                        <td className='max-w-56 px-3 py-2'>
                          {project && entry.project_id ? (
                            <Link
                              href={`/dashboard/marches/${encodeURIComponent(entry.project_id)}`}
                              className='block truncate text-xs hover:underline'
                              title={marketLabel(entry)}
                            >
                              {marketLabel(entry)}
                            </Link>
                          ) : (
                            <span className='text-muted-foreground text-xs'>—</span>
                          )}
                        </td>
                        <td className='px-3 py-2 text-xs'>{entry.client || '—'}</td>
                        <td className='px-3 py-2 text-xs whitespace-nowrap'>
                          {formatDateFr(entry.start_date)} → {formatDateFr(entry.end_date)}
                          <span className='text-muted-foreground block text-[11px]'>
                            {duration} jour{duration > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className='px-3 py-2'>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${DECISION_BADGES[entry.decision]}`}
                          >
                            {entry.decision}
                          </span>
                        </td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Modifier ${entry.code}`}
                            onClick={() => openEdit(entry)}
                          >
                            <Icons.edit />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Supprimer ${entry.code}`}
                            onClick={() => setDeleteTarget(entry)}
                          >
                            <Icons.trash />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <PlanningEntryDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        entry={editingEntry}
        projects={projects ?? []}
        defaultDate={defaultDate}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteTarget?.code} ?</AlertDialogTitle>
            <AlertDialogDescription>
              La planification « {deleteTarget?.name} » sera définitivement supprimée. Le marché
              lié, s’il existe, n’est pas modifié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant='destructive' onClick={confirmDelete}>
              <Icons.trash /> Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanningReport entries={filtered} todayISO={todayISO} marketLabel={marketLabel} />
    </>
  );
}

function SummaryTile({
  label,
  value,
  className
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className='bg-card rounded-xl border p-3'>
      <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase'>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${className ?? ''}`}>{value}</p>
    </div>
  );
}

function PlanningSkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-10 rounded-xl' />
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className='h-20 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-28 rounded-xl' />
      <Skeleton className='h-64 rounded-xl' />
      <Skeleton className='h-80 rounded-xl' />
    </div>
  );
}
