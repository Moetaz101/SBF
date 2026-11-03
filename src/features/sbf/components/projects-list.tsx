'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUTS } from '@/config/sbf';
import { useProjects } from '@/lib/sbf/api';
import { santeDelai } from '@/lib/sbf/calc';
import { formatDTCompact, formatDateFr, formatPct } from '@/lib/sbf/format';
import type { Project } from '@/lib/sbf/types';
import { useToday } from '@/lib/sbf/use-today';
import { SanteBadge, StatusBadge } from './badges';
import { ErrorBox } from './dashboard-view';

/** Texte sans accents ni majuscules, pour une recherche tolérante */
function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function haystack(p: Project) {
  return normalize(
    [
      p.name,
      p.description,
      p.client,
      p.location,
      p.type,
      p.status,
      p.chef_projet,
      p.architecte,
      p.bet,
      p.ing_conseil,
      p.bureau_controle,
      p.id,
      p.notes
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function ProjectsList() {
  const { data: projects, isLoading, error } = useProjects();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const deferredQuery = useDeferredValue(query);
  const today = useToday();

  const types = useMemo(
    () => [...new Set((projects ?? []).map((p) => p.type).filter(Boolean))] as string[],
    [projects]
  );

  const filtered = useMemo(() => {
    const words = normalize(deferredQuery).split(/\s+/).filter(Boolean);
    return (projects ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (type && p.type !== type) return false;
      if (!words.length) return true;
      const h = haystack(p);
      return words.every((w) => h.includes(w));
    });
  }, [projects, deferredQuery, status, type]);

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-col gap-2 sm:flex-row'>
        <div className='relative flex-1'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            type='search'
            inputMode='search'
            autoFocus
            placeholder='Rechercher : nom, client, lieu, chef de projet…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='h-11 pl-9 text-base sm:h-9 sm:text-sm'
          />
        </div>
        <div className='grid grid-cols-2 gap-2 sm:flex'>
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className='w-full sm:w-44'
            aria-label='Filtrer par statut'
          >
            <NativeSelectOption value=''>Tous les statuts</NativeSelectOption>
            {STATUTS.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {s}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={type}
            onChange={(e) => setType(e.target.value)}
            className='w-full sm:w-48'
            aria-label='Filtrer par type'
          >
            <NativeSelectOption value=''>Tous les types</NativeSelectOption>
            {types.map((t) => (
              <NativeSelectOption key={t} value={t}>
                {t}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {isLoading ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-20 rounded-xl' />
          ))}
        </div>
      ) : error ? (
        <ErrorBox message={error.message} />
      ) : (
        <>
          <p className='text-muted-foreground text-xs'>
            {filtered.length} marché{filtered.length > 1 ? 's' : ''}
            {filtered.length !== projects?.length && ` sur ${projects?.length}`}
          </p>

          {filtered.length === 0 ? (
            <p className='text-muted-foreground py-10 text-center text-sm'>Aucun résultat.</p>
          ) : (
            <>
              {/* Téléphone : cartes */}
              <ul className='flex flex-col gap-2 md:hidden'>
                {filtered.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/marches/${encodeURIComponent(p.id)}`}
                      className='bg-card active:bg-muted/50 flex flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <span className='font-medium leading-snug'>{p.name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {[p.client, p.location].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='font-semibold tabular-nums'>
                          {formatDTCompact(p.amount_ht)}
                        </span>
                        <span className='text-muted-foreground'>Marge {formatPct(p.margin)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Ordinateur : tableau */}
              <div className='hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 md:block'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/50 text-muted-foreground text-left text-xs'>
                    <tr>
                      <th className='px-3 py-2 font-medium'>Marché</th>
                      <th className='px-3 py-2 font-medium'>Client</th>
                      <th className='px-3 py-2 font-medium'>Statut</th>
                      <th className='px-3 py-2 text-right font-medium'>Montant HT</th>
                      <th className='px-3 py-2 text-right font-medium'>Marge</th>
                      <th className='px-3 py-2 font-medium'>Remise offre</th>
                      <th className='px-3 py-2 font-medium'>Délais</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {filtered.map((p) => (
                      <tr key={p.id} className='hover:bg-muted/40'>
                        <td className='max-w-80 px-3 py-2'>
                          <Link
                            href={`/dashboard/marches/${encodeURIComponent(p.id)}`}
                            className='font-medium hover:underline'
                          >
                            {p.name}
                          </Link>
                          <div className='text-muted-foreground truncate text-xs'>
                            {[p.type, p.location].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className='px-3 py-2'>{p.client ?? '—'}</td>
                        <td className='px-3 py-2'>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className='px-3 py-2 text-right font-medium tabular-nums'>
                          {formatDTCompact(p.amount_ht)}
                        </td>
                        <td className='px-3 py-2 text-right tabular-nums'>{formatPct(p.margin)}</td>
                        <td className='px-3 py-2 whitespace-nowrap'>
                          {formatDateFr(p.date_remise_offre)}
                        </td>
                        <td className='px-3 py-2'>
                          <SanteBadge sante={santeDelai(p, today)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
