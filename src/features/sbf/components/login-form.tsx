'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase/client';

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed': "Votre adresse e-mail n'est pas encore confirmée."
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: String(form.get('email')).trim(),
      password: String(form.get('password'))
    });
    if (error) {
      setError(ERRORS[error.message] ?? error.message);
      setLoading(false);
      return;
    }
    const next = params.get('next');
    router.replace(next && next.startsWith('/') ? next : '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='email'>E-mail</Label>
        <Input
          id='email'
          name='email'
          type='email'
          autoComplete='email'
          required
          className='h-11 text-base'
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='password'>Mot de passe</Label>
        <Input
          id='password'
          name='password'
          type='password'
          autoComplete='current-password'
          required
          className='h-11 text-base'
        />
      </div>
      {error && (
        <p role='alert' className='text-destructive text-sm'>
          {error}
        </p>
      )}
      <Button type='submit' size='lg' className='h-11 text-base' disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}
