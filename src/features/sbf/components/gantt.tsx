'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDateFr } from '@/lib/sbf/format';

export interface GanttRow {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  start: Date;
  /** Fin prévue (objectif SBF ou fin de tâche) */
  end: Date;
  /** Échéance contractuelle client (trait rouge) */
  deadline?: Date | null;
  progress?: number;
  tone?: 'ok' | 'attention' | 'retard' | 'default';
}

const DAY = 86_400_000;
const MONTHS = [
  'janv',
  'févr',
  'mars',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc'
];

const TONE: Record<NonNullable<GanttRow['tone']>, string> = {
  default: 'bg-primary/25',
  ok: 'bg-emerald-500/25',
  attention: 'bg-amber-500/30',
  retard: 'bg-red-500/30'
};
const TONE_FILL: Record<NonNullable<GanttRow['tone']>, string> = {
  default: 'bg-primary',
  ok: 'bg-emerald-500',
  attention: 'bg-amber-500',
  retard: 'bg-red-500'
};

export function Gantt({ rows, today }: { rows: GanttRow[]; today: Date }) {
  if (!rows.length) return null;

  const times = rows.flatMap((r) => [
    r.start.getTime(),
    r.end.getTime(),
    r.deadline?.getTime() ?? r.end.getTime()
  ]);
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times, today.getTime()));
  // Aligne sur des mois entiers
  const from = new Date(min.getFullYear(), min.getMonth(), 1);
  const to = new Date(max.getFullYear(), max.getMonth() + 1, 1);
  const span = to.getTime() - from.getTime() || DAY;
  const pos = (d: Date) => ((d.getTime() - from.getTime()) / span) * 100;

  const months: Date[] = [];
  for (let d = new Date(from); d < to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
    months.push(d);
  const showEvery = Math.ceil(months.length / 12);
  const todayPos = pos(today);

  return (
    <div className='overflow-x-auto'>
      <div className='min-w-[640px]'>
        {/* Échelle des mois */}
        <div className='grid grid-cols-[minmax(140px,220px)_1fr] gap-2'>
          <div />
          <div className='text-muted-foreground relative h-5 text-[10px]'>
            {months.map((m, i) =>
              i % showEvery === 0 ? (
                <span
                  key={m.toISOString()}
                  className='absolute top-0'
                  style={{ left: `${pos(m)}%` }}
                >
                  {MONTHS[m.getMonth()]} {String(m.getFullYear()).slice(2)}
                </span>
              ) : null
            )}
          </div>
        </div>

        <ul className='flex flex-col'>
          {rows.map((r) => {
            const tone = r.tone ?? 'default';
            const left = pos(r.start);
            const width = Math.max(pos(r.end) - left, 0.8);
            const label = (
              <>
                <div className='truncate text-sm font-medium'>{r.label}</div>
                {r.sublabel && (
                  <div className='text-muted-foreground truncate text-xs'>{r.sublabel}</div>
                )}
              </>
            );
            return (
              <li
                key={r.id}
                className='grid grid-cols-[minmax(140px,220px)_1fr] items-center gap-2 border-t py-2'
              >
                <div className='min-w-0'>
                  {r.href ? (
                    <Link href={r.href} className='hover:underline'>
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </div>
                <div className='relative h-7'>
                  {/* lignes des mois */}
                  {months.map((m) => (
                    <div
                      key={m.toISOString()}
                      className='bg-border absolute inset-y-0 w-px'
                      style={{ left: `${pos(m)}%` }}
                    />
                  ))}
                  <div
                    className={cn('absolute top-1 h-5 overflow-hidden rounded', TONE[tone])}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${formatDateFr(r.start)} → ${formatDateFr(r.end)}`}
                  >
                    <div
                      className={cn('h-full', TONE_FILL[tone])}
                      style={{ width: `${Math.min(100, r.progress ?? 0)}%` }}
                    />
                  </div>
                  {r.deadline && (
                    <div
                      className='absolute inset-y-0 w-0.5 bg-red-500'
                      style={{ left: `${pos(r.deadline)}%` }}
                      title={`Échéance client : ${formatDateFr(r.deadline)}`}
                    />
                  )}
                  {todayPos >= 0 && todayPos <= 100 && (
                    <div
                      className='bg-foreground/60 absolute inset-y-0 w-px border-l border-dashed'
                      style={{ left: `${todayPos}%` }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className='text-muted-foreground mt-2 flex flex-wrap gap-4 text-xs'>
          <span className='flex items-center gap-1'>
            <span className='bg-primary inline-block h-2 w-4 rounded' /> avancement
          </span>
          <span className='flex items-center gap-1'>
            <span className='inline-block h-3 w-0.5 bg-red-500' /> échéance client
          </span>
          <span className='flex items-center gap-1'>
            <span className='bg-foreground/60 inline-block h-3 w-px' /> aujourd&apos;hui
          </span>
        </div>
      </div>
    </div>
  );
}
