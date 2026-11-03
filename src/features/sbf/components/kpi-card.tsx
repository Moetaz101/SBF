import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default'
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'warn';
}) {
  return (
    <Card size='sm'>
      <CardContent className='flex flex-col gap-1'>
        <span className='text-muted-foreground text-xs font-medium'>{label}</span>
        <span
          className={cn(
            'text-xl font-semibold tabular-nums sm:text-2xl',
            tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
            tone === 'bad' && 'text-red-600 dark:text-red-400',
            tone === 'warn' && 'text-amber-600 dark:text-amber-400'
          )}
        >
          {value}
        </span>
        {hint && <span className='text-muted-foreground text-xs'>{hint}</span>}
      </CardContent>
    </Card>
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
