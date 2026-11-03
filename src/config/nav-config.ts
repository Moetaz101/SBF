import { NavGroup } from '@/types';

/**
 * Navigation de la barre latérale (ordinateur).
 * Sur téléphone, la barre du bas (mobile-nav.tsx) reprend les liens principaux.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'SBF',
    items: [
      { title: 'Tableau de bord', url: '/dashboard', icon: 'dashboard', items: [] },
      { title: 'Marchés', url: '/dashboard/marches', icon: 'workspace', items: [] },
      { title: 'Nouveau marché', url: '/dashboard/marches/nouveau', icon: 'plusCircle', items: [] },
      { title: 'Planning', url: '/dashboard/planning', icon: 'calendar', items: [] }
    ]
  },
  {
    label: 'Données',
    items: [{ title: 'Importer (JSON)', url: '/dashboard/import', icon: 'upload', items: [] }]
  }
];
