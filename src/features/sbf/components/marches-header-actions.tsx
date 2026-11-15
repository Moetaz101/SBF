'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NewProjectDialog } from './new-project-dialog';

/** Header action for the Marchés page. `?new=1` opens the creation modal. */
export function MarchesHeaderActions() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = searchParams.get('new') === '1';

  function setOpen(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('new', '1');
    else params.delete('new');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <NewProjectDialog open={open} onOpenChange={setOpen} triggerClassName='hidden md:inline-flex' />
  );
}
