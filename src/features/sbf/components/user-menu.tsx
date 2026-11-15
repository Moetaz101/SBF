'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getSupabase } from '@/lib/supabase/client';

export function useCurrentUserEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return email;
}

export function UserMenu() {
  const email = useCurrentUserEmail();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await getSupabase().auth.signOut();
    qc.clear();
    router.replace('/login');
    router.refresh();
  }

  const initial = (email ?? '?').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label='Mon compte'
        className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold'
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='text-muted-foreground text-xs'>Connecté en tant que</div>
            <div className='truncate text-sm font-medium'>{email ?? '…'}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
            <Icons.settings />
            Paramètres
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <Icons.logout />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
