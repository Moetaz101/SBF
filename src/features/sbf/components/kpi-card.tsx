import { useId } from 'react';
import type { Icon as IconType } from '@/components/icons';
import { cn } from '@/lib/utils';

export type KpiVariant =
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'sky'
  | 'orange'
  | 'slate';

const VARIANTS: Record<KpiVariant, { card: string; value: string; icon: string; spark: string }> = {
  indigo: {
    card: 'border-indigo-200/70 bg-indigo-100/60 dark:border-indigo-500/20 dark:bg-indigo-500/10',
    value: 'text-indigo-600 dark:text-indigo-300',
    icon: 'bg-indigo-200/70 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    spark: 'text-indigo-500 dark:text-indigo-400'
  },
  emerald: {
    card: 'border-emerald-200/70 bg-emerald-100/60 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    value: 'text-emerald-600 dark:text-emerald-300',
    icon: 'bg-emerald-200/70 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    spark: 'text-emerald-500 dark:text-emerald-400'
  },
  rose: {
    card: 'border-rose-200/70 bg-rose-100/60 dark:border-rose-500/20 dark:bg-rose-500/10',
    value: 'text-rose-600 dark:text-rose-300',
    icon: 'bg-rose-200/70 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
    spark: 'text-rose-500 dark:text-rose-400'
  },
  amber: {
    card: 'border-amber-200/70 bg-amber-100/60 dark:border-amber-500/20 dark:bg-amber-500/10',
    value: 'text-amber-600 dark:text-amber-300',
    icon: 'bg-amber-200/70 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    spark: 'text-amber-500 dark:text-amber-400'
  },
  violet: {
    card: 'border-violet-200/70 bg-violet-100/60 dark:border-violet-500/20 dark:bg-violet-500/10',
    value: 'text-violet-600 dark:text-violet-300',
    icon: 'bg-violet-200/70 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    spark: 'text-violet-500 dark:text-violet-400'
  },
  sky: {
    card: 'border-sky-200/70 bg-sky-100/60 dark:border-sky-500/20 dark:bg-sky-500/10',
    value: 'text-sky-600 dark:text-sky-300',
    icon: 'bg-sky-200/70 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
    spark: 'text-sky-500 dark:text-sky-400'
  },
  orange: {
    card: 'border-orange-200/70 bg-orange-100/60 dark:border-orange-500/20 dark:bg-orange-500/10',
    value: 'text-orange-600 dark:text-orange-300',
    icon: 'bg-orange-200/70 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
    spark: 'text-orange-500 dark:text-orange-400'
  },
  slate: {
    card: 'border-slate-200/80 bg-slate-100/70 dark:border-slate-500/20 dark:bg-slate-500/10',
    value: 'text-slate-600 dark:text-slate-300',
    icon: 'bg-slate-200/80 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
    spark: 'text-slate-500 dark:text-slate-400'
  }
};

function smoothPath(points: readonly (readonly [number, number])[]) {
  if (points.length < 2) return '';

  const d = [`M ${points[0][0]},${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }
  return d.join(' ');
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const id = `kpi-${useId().replace(/[:]/g, '')}`;

  if (data.length < 2) return null;

  const width = 200;
  const height = 56;
  const padding = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y =
      range === 0
        ? height / 2
        : height - padding - ((value - min) / range) * (height - padding * 2);
    return [x, y] as const;
  });

  const line = smoothPath(points);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio='none'
      aria-hidden='true'
      className={cn('absolute inset-x-0 bottom-0 h-14 w-full sm:h-16', className)}
    >
      <defs>
        <linearGradient id={id} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='currentColor' stopOpacity={0.25} />
          <stop offset='100%' stopColor='currentColor' stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  variant = 'indigo',
  icon: Icon,
  trend,
  tone = 'default'
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  variant?: KpiVariant;
  icon?: IconType;
  trend?: number[];
  tone?: 'default' | 'good' | 'bad' | 'warn';
}) {
  const v = VARIANTS[variant];

  return (
    <div
      data-tone={tone}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 shadow-sm shadow-black/[0.03] sm:p-5 dark:shadow-none',
        trend ? 'min-h-40 pb-16 sm:min-h-44 sm:pb-20' : 'min-h-32',
        v.card
      )}
    >
      {Icon && (
        <div
          className={cn(
            'absolute top-4 right-4 flex size-9 items-center justify-center rounded-lg sm:top-5 sm:right-5 sm:size-10',
            v.icon
          )}
        >
          <Icon className='size-5' stroke={1.8} />
        </div>
      )}

      <div className='relative flex flex-col gap-1'>
        <span className='text-muted-foreground block min-h-8 pr-12 text-[11px] font-semibold tracking-[0.08em] uppercase sm:pr-14'>
          {label}
        </span>
        <span
          className={cn(
            'text-2xl font-bold tracking-tight tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl 2xl:text-4xl',
            v.value
          )}
        >
          {value}
        </span>
        {hint && <span className='text-muted-foreground text-xs leading-snug'>{hint}</span>}
      </div>

      {trend && <Sparkline data={trend} className={v.spark} />}
    </div>
  );
}

/** Ligne « libellé : valeur » pour les fiches */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0'>
      <dt className='text-muted-foreground shrink-0 text-sm'>{label}</dt>
      <dd className='text-right text-sm font-medium break-words'>{children ?? '—'}</dd>
    </div>
  );
}
