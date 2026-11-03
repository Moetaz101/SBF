'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

/** Libellés français des segments d'URL */
const SEGMENT_TITLES: Record<string, string> = {
  dashboard: 'Tableau de bord',
  marches: 'Marchés',
  nouveau: 'Nouveau',
  modifier: 'Modifier',
  planning: 'Planning',
  import: 'Importer'
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  return useMemo<BreadcrumbItem[]>(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      // Un identifiant de marché s'affiche « Fiche »
      title: SEGMENT_TITLES[segment] ?? 'Fiche',
      link: `/${segments.slice(0, index + 1).join('/')}`
    }));
  }, [pathname]);
}
