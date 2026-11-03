import { cn } from '@/lib/utils';
import type { Sante } from '@/lib/sbf/calc';

const STATUS_STYLES: Record<string, string> = {
  'En étude': 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  'Offre remise': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Attribué: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'En exécution': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Terminé: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Perdu: 'bg-red-500/10 text-red-700 dark:text-red-300',
  Abandonné: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {status}
    </span>
  );
}

const SANTE: Record<Sante, { label: string; className: string } | null> = {
  ok: {
    label: 'Dans les délais',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  },
  attention: {
    label: 'À surveiller',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  },
  retard: { label: 'En retard', className: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  na: null
};

export function SanteBadge({ sante }: { sante: Sante }) {
  const s = SANTE[sante];
  if (!s) return null;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        s.className
      )}
    >
      {s.label}
    </span>
  );
}
