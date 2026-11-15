'use client';

import { useMemo, useState } from 'react';

import { Icons } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDTCompact } from '@/lib/sbf/format';
import type { Project } from '@/lib/sbf/types';

interface LocationGroup {
  name: string;
  count: number;
  amount: number;
}

/**
 * Widget Google Maps en bas du tableau de bord.
 * Les marchés ne stockent qu'une localité (ville / gouvernorat) sans
 * coordonnées : on utilise l'embed Google Maps sans clé API, qui gère
 * lui-même le géocodage de la requête.
 */
export function DashboardMap({ projects }: { projects: Project[] }) {
  const locations = useMemo<LocationGroup[]>(() => {
    const byName = new Map<string, LocationGroup>();
    for (const p of projects) {
      const raw = p.location?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const entry = byName.get(key) ?? { name: raw, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += p.amount_ht ?? 0;
      byName.set(key, entry);
    }
    return [...byName.values()].toSorted((a, b) => b.amount - a.amount);
  }, [projects]);

  const [selected, setSelected] = useState(locations[0]?.name ?? '');
  const active = locations.some((l) => l.name === selected) ? selected : (locations[0]?.name ?? '');

  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carte des marchés</CardTitle>
        </CardHeader>
        <CardContent className='flex items-center gap-3 py-6'>
          <Icons.mapPin className='text-muted-foreground size-8' />
          <div>
            <p className='font-medium'>Aucune localité renseignée</p>
            <p className='text-muted-foreground text-sm'>
              Renseignez le lieu d'un marché pour afficher sa position sur la carte.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const query = `${active}, Tunisie`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=10&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const totalAmount = locations.reduce((sum, l) => sum + l.amount, 0);

  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between gap-2'>
        <div>
          <CardTitle>Carte des marchés</CardTitle>
          <p className='text-muted-foreground text-xs'>
            {locations.length} localité(ies) · {formatDTCompact(totalAmount)} HT
          </p>
        </div>
        <a
          href={openUrl}
          target='_blank'
          rel='noreferrer'
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs hover:underline'
        >
          Ouvrir dans Google Maps
          <Icons.externalLink className='size-3.5' />
        </a>
      </CardHeader>
      <CardContent className='grid gap-4 lg:grid-cols-5'>
        <div className='overflow-hidden rounded-lg border lg:col-span-3'>
          <iframe
            title={`Carte Google Maps — ${active}`}
            src={embedUrl}
            className='h-64 w-full sm:h-80 lg:h-[340px]'
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
            sandbox='allow-scripts allow-popups allow-popups-to-escape-sandbox'
            allowFullScreen
          />
        </div>
        <ul className='divide-y lg:col-span-2'>
          {locations.map((l) => {
            const isActive = l.name === active;
            return (
              <li key={l.name}>
                <button
                  type='button'
                  onClick={() => setSelected(l.name)}
                  aria-pressed={isActive}
                  className={`-mx-2 flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left ${
                    isActive ? 'bg-muted/60' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <Icons.mapPin
                      className={`size-4 shrink-0 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <span className='truncate text-sm font-medium'>{l.name}</span>
                  </span>
                  <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                    {l.count} affaire(s) · {formatDTCompact(l.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
