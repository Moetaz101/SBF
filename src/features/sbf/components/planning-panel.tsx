'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteTask, useSaveTask, useTasks } from '@/lib/sbf/api';
import { formatDateFr, parseISODate, parseNumber, toISODate } from '@/lib/sbf/format';
import type { PlanningTask, Project } from '@/lib/sbf/types';
import { dateFinClient } from '@/lib/sbf/calc';
import { useToday } from '@/lib/sbf/use-today';
import { Gantt } from './gantt';

/** Planning des travaux d'un marché : liste de tâches + diagramme */
export function PlanningPanel({ project }: { project: Project }) {
  const { data: allTasks } = useTasks();
  const tasks = (allTasks ?? []).filter((t) => t.project_id === project.id);
  const save = useSaveTask();
  const del = useDeleteTask();
  const [adding, setAdding] = useState(false);
  const deadline = dateFinClient(project);
  const today = useToday();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const start = String(f.get('start_date'));
    const end = String(f.get('end_date'));
    if (end < start) {
      toast.error('La date de fin doit être après la date de début.');
      return;
    }
    save.mutate(
      {
        project_id: project.id,
        title: String(f.get('title')).trim(),
        start_date: start,
        end_date: end,
        progress: Math.min(100, Math.max(0, parseNumber(f.get('progress')) ?? 0)),
        responsable: String(f.get('responsable') || '').trim() || null
      },
      {
        onSuccess: () => {
          toast.success('Tâche ajoutée');
          setAdding(false);
        },
        onError: (err) => toast.error(err.message)
      }
    );
  }

  function updateProgress(t: PlanningTask, value: string) {
    const n = parseNumber(value);
    if (n === null || n === t.progress) return;
    const { created_at: _c, updated_at: _u, ...rest } = t;
    save.mutate({ ...rest, progress: Math.min(100, Math.max(0, n)) });
  }

  const rows = tasks.map((t) => {
    const end = parseISODate(t.end_date)!;
    const late = end < today && t.progress < 100;
    return {
      id: t.id,
      label: t.title,
      sublabel: [t.responsable, `${Math.round(t.progress)} %`].filter(Boolean).join(' · '),
      start: parseISODate(t.start_date)!,
      end,
      progress: t.progress,
      deadline,
      tone: late ? ('retard' as const) : t.progress >= 100 ? ('ok' as const) : ('default' as const)
    };
  });

  const defaultStart = project.date_os ?? toISODate(today);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Planning des travaux</CardTitle>
        <Button variant='outline' size='sm' onClick={() => setAdding((v) => !v)}>
          <Icons.add /> Tâche
        </Button>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {adding && (
          <form onSubmit={onAdd} className='bg-muted/40 grid gap-3 rounded-lg p-3 sm:grid-cols-2'>
            <div className='flex flex-col gap-1.5 sm:col-span-2'>
              <Label htmlFor='title'>Tâche</Label>
              <Input
                id='title'
                name='title'
                required
                placeholder='Décapage, remblai, pose de buses…'
                className='h-10'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='start_date'>Début</Label>
              <Input
                id='start_date'
                name='start_date'
                type='date'
                required
                defaultValue={defaultStart}
                className='h-10'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='end_date'>Fin</Label>
              <Input
                id='end_date'
                name='end_date'
                type='date'
                required
                defaultValue={defaultStart}
                className='h-10'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='progress'>Avancement (%)</Label>
              <Input
                id='progress'
                name='progress'
                inputMode='decimal'
                defaultValue='0'
                className='h-10'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='responsable'>Responsable</Label>
              <Input id='responsable' name='responsable' className='h-10' />
            </div>
            <div className='flex gap-2 sm:col-span-2 sm:justify-end'>
              <Button type='button' variant='ghost' onClick={() => setAdding(false)}>
                Annuler
              </Button>
              <Button type='submit' disabled={save.isPending}>
                Ajouter
              </Button>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            Aucune tâche. Ajoutez les grandes phases du chantier pour suivre le planning.
          </p>
        ) : (
          <>
            <Gantt rows={rows} today={today} />
            <ul className='divide-y'>
              {tasks.map((t) => (
                <li key={t.id} className='flex items-center gap-3 py-2'>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium'>{t.title}</div>
                    <div className='text-muted-foreground text-xs'>
                      {formatDateFr(t.start_date)} → {formatDateFr(t.end_date)}
                      {t.responsable && ` · ${t.responsable}`}
                    </div>
                  </div>
                  <div className='relative w-20'>
                    <Input
                      aria-label={`Avancement ${t.title}`}
                      inputMode='decimal'
                      defaultValue={String(t.progress)}
                      onBlur={(e) => updateProgress(t, e.target.value)}
                      className='h-8 pr-6 text-right'
                    />
                    <span className='text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-xs'>
                      %
                    </span>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label={`Supprimer ${t.title}`}
                    onClick={() => {
                      if (confirm(`Supprimer la tâche « ${t.title} » ?`)) del.mutate(t.id);
                    }}
                  >
                    <Icons.trash />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
