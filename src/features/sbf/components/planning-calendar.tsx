'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDateFr } from '@/lib/sbf/format';
import {
  addDays,
  formatWeekdayShort,
  isoWeekNumber,
  planningEntryCoversDay,
  weekDaysOf,
  weekStart
} from '@/lib/sbf/planning';
import type { PlanningEntry } from '@/lib/sbf/types';

const DECISION_STYLES: Record<PlanningEntry['decision'], string> = {
  'En attente': 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  Oui: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
  Non: 'border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200'
};

type PlanningCalendarProps = {
  week: string;
  entries: PlanningEntry[];
  todayISO: string;
  onWeekChange: (week: string) => void;
  onEdit: (entry: PlanningEntry) => void;
};

export function PlanningCalendar({
  week,
  entries,
  todayISO,
  onWeekChange,
  onEdit
}: PlanningCalendarProps) {
  const weekDays = weekDaysOf(week);
  const weekEnd = weekDays[weekDays.length - 1];
  const weekNumber = isoWeekNumber(week);
  const weekEntries = entries.filter(
    (entry) => entry.start_date <= weekEnd && entry.end_date >= week
  );

  return (
    <Card>
      <CardHeader className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <CardTitle>Calendrier de la semaine</CardTitle>
          <p className='text-muted-foreground text-xs'>
            {weekNumber ? `Semaine ${weekNumber} · ` : ''}
            {formatDateFr(week)} → {formatDateFr(weekEnd)} · {weekEntries.length} planification
            {weekEntries.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='icon-sm'
            aria-label='Semaine précédente'
            onClick={() => onWeekChange(addDays(week, -7))}
          >
            <Icons.chevronLeft />
          </Button>
          <Input
            type='date'
            value={week}
            onChange={(event) => {
              if (event.target.value) onWeekChange(weekStart(event.target.value));
            }}
            className='h-9 w-36'
            aria-label='Semaine à afficher'
          />
          <Button
            variant='outline'
            size='icon-sm'
            aria-label='Semaine suivante'
            onClick={() => onWeekChange(addDays(week, 7))}
          >
            <Icons.chevronRight />
          </Button>
          <Button variant='outline' size='sm' onClick={() => onWeekChange(weekStart(todayISO))}>
            Aujourd’hui
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-7'>
          {weekDays.map((isoDate) => {
            const dayEntries = weekEntries.filter((entry) =>
              planningEntryCoversDay(entry, isoDate)
            );
            const isToday = isoDate === todayISO;

            return (
              <div
                key={isoDate}
                className={cn(
                  'bg-muted/30 flex min-h-32 flex-col rounded-lg border p-2',
                  isToday && 'border-primary/50 bg-primary/5 ring-primary/20 ring-2'
                )}
              >
                <div className='mb-2 flex items-center justify-between gap-1'>
                  <span className='text-[11px] font-semibold uppercase'>
                    {formatWeekdayShort(isoDate)}
                  </span>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {Number(isoDate.slice(8, 10))}
                  </span>
                </div>

                <div className='flex flex-1 flex-col gap-1'>
                  {dayEntries.length === 0 ? (
                    <span className='text-muted-foreground/60 text-[11px]'>—</span>
                  ) : (
                    dayEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type='button'
                        onClick={() => onEdit(entry)}
                        title={`${entry.code} · ${entry.name}`}
                        aria-label={`Modifier ${entry.code}, ${entry.name}`}
                        className={cn(
                          'w-full rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-opacity hover:opacity-80',
                          DECISION_STYLES[entry.decision]
                        )}
                      >
                        <span className='block font-mono text-[10px] font-bold'>{entry.code}</span>
                        <span className='block truncate'>{entry.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
