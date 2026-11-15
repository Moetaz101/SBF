'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountRecoveryForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    if (newPassword !== String(form.get('confirmPassword') ?? '')) {
      toast.error('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          token: form.get('token'),
          newPassword
        })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Code invalide.');
      setDone(true);
      toast.success('Mot de passe réinitialisé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de récupérer le compte.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compte récupéré</CardTitle>
          <CardDescription>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href='/login' aria-label='Retour à la connexion' />}
          >
            Retour à la connexion
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Récupérer un compte</CardTitle>
        <CardDescription>
          Utilisez l’e-mail du compte et le code temporaire fourni par Ahmed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='recovery-email'>E-mail</Label>
            <Input id='recovery-email' name='email' type='email' autoComplete='email' required />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='recovery-token'>Code temporaire</Label>
            <Input id='recovery-token' name='token' required />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='recovery-password'>Nouveau mot de passe</Label>
            <Input
              id='recovery-password'
              name='newPassword'
              type='password'
              minLength={8}
              autoComplete='new-password'
              required
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='recovery-confirm'>Confirmer le mot de passe</Label>
            <Input
              id='recovery-confirm'
              name='confirmPassword'
              type='password'
              minLength={8}
              autoComplete='new-password'
              required
            />
          </div>
          <Button type='submit' disabled={loading}>
            {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
          </Button>
          <Button
            nativeButton={false}
            variant='link'
            render={<Link href='/login' aria-label='Retour à la connexion' />}
          >
            Retour à la connexion
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
