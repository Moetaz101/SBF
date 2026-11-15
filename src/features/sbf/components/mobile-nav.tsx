'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: Icons.dashboard, exact: true },
  { href: '/dashboard/marches', label: 'Marchés', icon: Icons.workspace, exact: false },
  { href: '/dashboard/assistant', label: 'Assistant', icon: Icons.sparkles, exact: false },
  { href: '/dashboard/planning', label: 'Planning', icon: Icons.calendar, exact: false }
];

/** Barre de navigation en bas de l'écran, uniquement sur téléphone */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className='bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden'>
      <ul className='grid grid-cols-4'>
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== '/dashboard/marches/nouveau';
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className='size-6' />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
