'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects, useTasks } from '@/lib/sbf/api';
import { dateFinClient, dateFinSbf, santeDelai } from '@/lib/sbf/calc';
import { parseISODate } from '@/lib/sbf/format';
import { useToday } from '@/lib/sbf/use-today';
import { ErrorBox } from './dashboard-view';
import { Gantt, type GanttRow } from './gantt';

const FILTERS = {
  actifs: { label: 'Chantiers en cours', statuses: ['Attribué', 'En exécution'] },
  tous: { label: 'Tous les marchés datés', statuses: null }
} as const;

/** Vue planning de tous les chantiers (basée sur la date d'OS et les délais) */
export function PlanningOverview() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: tasks } = useTasks();
  const [filter, setFilter] = useState<keyof typeof FILTERS>('actifs');
  const today = useToday();

  if (isLoading) return <Skeleton className='h-80 rounded-xl' />;
  if (error) return <ErrorBox message={error.message} />;

  const statuses = FILTERS[filter].statuses as readonly string[] | null;

  const rows: GanttRow[] = (projects ?? [])
    .filter((p) => !statuses || statuses.includes(p.status))
    .flatMap((p): GanttRow[] => {
      const ownTasks = (tasks ?? []).filter((t) => t.project_id === p.id);
      const start =
        parseISODate(p.date_os) ??
        (ownTasks.length
          ? new Date(Math.min(...ownTasks.map((t) => parseISODate(t.start_date)!.getTime())))
          : null);
      const end =
        dateFinSbf(p) ??
        dateFinClient(p) ??
        (ownTasks.length
          ? new Date(Math.max(...ownTasks.map((t) => parseISODate(t.end_date)!.getTime())))
          : null);
      if (!start || !end) return [];
      const sante = santeDelai(p, today);
      return [
        {
          id: p.id,
          label: p.name,
          sublabel: [p.client, `${Math.round(p.avancement ?? 0)} %`].filter(Boolean).join(' · '),
          href: `/dashboard/marches/${encodeURIComponent(p.id)}`,
          start,
          end,
          deadline: dateFinClient(p),
          progress: p.avancement ?? 0,
          tone: sante === 'na' ? 'default' : sante
        }
      ];
    })
    .toSorted((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className='flex flex-col gap-3'>
      <NativeSelect
        value={filter}
        onChange={(e) => setFilter(e.target.value as keyof typeof FILTERS)}
        className='w-full sm:w-64'
        aria-label='Filtrer'
      >
        {Object.entries(FILTERS).map(([k, v]) => (
          <NativeSelectOption key={k} value={k}>
            {v.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              Aucun chantier daté. Renseignez la date d&apos;OS et les délais dans la fiche du
              marché.
            </p>
          ) : (
            <Gantt rows={rows} today={today} />
          )}
        </CardContent>
      </Card>
      <p className='text-muted-foreground text-xs'>
        La barre va de l&apos;OS à la fin de l&apos;objectif SBF ; le trait rouge marque
        l&apos;échéance client. Les couleurs indiquent l&apos;état : vert dans les délais, orange à
        surveiller, rouge en retard.
      </p>
    </div>
  );
}
