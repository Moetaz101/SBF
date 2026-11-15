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
      { title: 'Planning', url: '/dashboard/planning', icon: 'calendar', items: [] },
      { title: 'Paramètres', url: '/dashboard/settings', icon: 'settings', items: [] }
    ]
  },
  {
    label: 'Analyse',
    items: [
      {
        title: 'Assistant IA',
        url: '/dashboard/assistant',
        icon: 'sparkles',
        items: []
      }
    ]
  },
  {
    label: 'Données',
    items: [{ title: 'Importer', url: '/dashboard/import', icon: 'upload', items: [] }]
  }
];
