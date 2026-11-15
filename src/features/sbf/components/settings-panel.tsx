'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
};

type Account = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  createdAt: string;
  lastSignInAt: string | null;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'La requête a échoué.');
  return body;
}

async function changePasswordRequest(event: React.FormEvent<HTMLFormElement>): Promise<void> {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const newPassword = String(form.get('newPassword') ?? '');
  if (newPassword !== String(form.get('confirmPassword') ?? '')) {
    toast.error('Les nouveaux mots de passe ne correspondent pas.');
    return;
  }
  try {
    await requestJson('/api/account/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword') ?? ''),
        newPassword
      })
    });
    event.currentTarget.reset();
    toast.success('Mot de passe modifié.');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Impossible de modifier le mot de passe.');
  }
}

export function SettingsPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState('30');
  const [recoveryCode, setRecoveryCode] = useState<{ token: string; expiresAt: string } | null>(
    null
  );

  const loadAccounts = useCallback(async () => {
    const data = await requestJson<{ users: Account[] }>('/api/admin/users');
    setAccounts(data.users);
  }, []);

  useEffect(() => {
    requestJson<{ profile: Profile }>('/api/account/profile')
      .then(async ({ profile: nextProfile }) => {
        setProfile(nextProfile);
        setFullName(nextProfile.full_name ?? '');
        if (nextProfile.role === 'admin') await loadAccounts();
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [loadAccounts]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = await requestJson<{ profile: Profile }>('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName })
      });
      setProfile(data.profile);
      toast.success('Profil enregistré.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer le profil.');
    }
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await requestJson('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          fullName: form.get('fullName'),
          password: form.get('password')
        })
      });
      event.currentTarget.reset();
      await loadAccounts();
      toast.success('Compte créé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de créer le compte.');
    }
  }

  async function generateRecoveryCode() {
    if (!selectedAccount) {
      toast.error('Sélectionnez un compte.');
      return;
    }
    try {
      const data = await requestJson<{ token: string; expiresAt: string }>('/api/admin/recovery', {
        method: 'POST',
        body: JSON.stringify({ userId: selectedAccount, timeoutMinutes: Number(timeoutMinutes) })
      });
      setRecoveryCode(data);
      toast.success('Code généré. Il ne sera plus affiché après cette page.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de générer le code.');
    }
  }

  async function resetAccountPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccount) {
      toast.error('Sélectionnez un compte.');
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await requestJson(`/api/admin/users/${selectedAccount}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: form.get('password') })
      });
      event.currentTarget.reset();
      toast.success('Mot de passe administrateur mis à jour.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Impossible de réinitialiser le mot de passe.'
      );
    }
  }

  if (loading) return <div className='bg-muted h-64 animate-pulse rounded-xl' />;
  if (!profile) return <p className='text-destructive'>Profil introuvable.</p>;

  return (
    <Tabs defaultValue='profile' className='flex flex-col gap-4'>
      <TabsList>
        <TabsTrigger value='profile'>
          <Icons.user /> Profil
        </TabsTrigger>
        <TabsTrigger value='security'>
          <Icons.lock /> Sécurité
        </TabsTrigger>
        {profile.role === 'admin' && (
          <TabsTrigger value='admin'>
            <Icons.settings /> Administration
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value='profile'>
        <Card>
          <CardHeader>
            <CardTitle>Mon profil</CardTitle>
            <CardDescription>
              Ces informations sont visibles dans votre espace de travail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className='flex max-w-xl flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='settings-email'>E-mail</Label>
                <Input id='settings-email' value={profile.email} disabled />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='settings-name'>Nom affiché</Label>
                <Input
                  id='settings-name'
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div className='flex items-center gap-2 text-sm'>
                Rôle{' '}
                <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                  {profile.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </Badge>
              </div>
              <Button type='submit' className='w-fit'>
                Enregistrer le profil
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='security'>
        <Card>
          <CardHeader>
            <CardTitle>Sécurité du compte</CardTitle>
            <CardDescription>
              Le mot de passe actuel est requis pour un changement normal.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-6'>
            <form onSubmit={changePasswordRequest} className='flex max-w-xl flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='current-password'>Mot de passe actuel</Label>
                <Input
                  id='current-password'
                  name='currentPassword'
                  type='password'
                  autoComplete='current-password'
                  required
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='new-password'>Nouveau mot de passe</Label>
                <Input
                  id='new-password'
                  name='newPassword'
                  type='password'
                  autoComplete='new-password'
                  minLength={8}
                  required
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='confirm-password'>Confirmer le nouveau mot de passe</Label>
                <Input
                  id='confirm-password'
                  name='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  minLength={8}
                  required
                />
              </div>
              <Button type='submit' className='w-fit'>
                Modifier le mot de passe
              </Button>
            </form>
            <div className='border-t pt-4'>
              <p className='text-muted-foreground text-sm'>
                Un administrateur peut générer un code temporaire si vous avez perdu votre mot de
                passe.
              </p>
              <Button
                nativeButton={false}
                variant='link'
                render={
                  <Link href='/login/recover' aria-label='Utiliser un code de récupération' />
                }
              >
                Utiliser un code de récupération
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {profile.role === 'admin' && (
        <TabsContent value='admin' className='flex flex-col gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>Créer un compte</CardTitle>
              <CardDescription>
                Seul Ahmed, administrateur de la plateforme, peut créer des comptes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAccount} className='grid gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='new-user-name'>Nom</Label>
                  <Input id='new-user-name' name='fullName' required />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='new-user-email'>E-mail</Label>
                  <Input id='new-user-email' name='email' type='email' required />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='new-user-password'>Mot de passe initial</Label>
                  <Input
                    id='new-user-password'
                    name='password'
                    type='password'
                    minLength={8}
                    required
                  />
                </div>
                <div className='flex items-end'>
                  <Button type='submit'>Créer le compte</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comptes et récupération</CardTitle>
              <CardDescription>
                Le code est à usage unique et n’est stocké que sous forme hachée.
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='managed-account'>Compte à gérer</Label>
                <select
                  id='managed-account'
                  value={selectedAccount}
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  className='border-input bg-background h-9 rounded-md border px-3 text-sm'
                >
                  <option value=''>Sélectionner un compte</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.email} — {account.full_name ?? 'Sans nom'}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex flex-wrap items-end gap-3'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='recovery-timeout'>Validité (minutes)</Label>
                  <Input
                    id='recovery-timeout'
                    type='number'
                    min={5}
                    max={10080}
                    value={timeoutMinutes}
                    onChange={(event) => setTimeoutMinutes(event.target.value)}
                    className='w-32'
                  />
                </div>
                <Button variant='outline' onClick={generateRecoveryCode}>
                  Générer un code
                </Button>
              </div>
              {recoveryCode && (
                <div className='bg-muted flex flex-col gap-2 rounded-lg p-4'>
                  <p className='text-sm font-medium'>
                    Code temporaire à transmettre à l’utilisateur
                  </p>
                  <code className='bg-background rounded border p-3 text-sm break-all'>
                    {recoveryCode.token}
                  </code>
                  <p className='text-muted-foreground text-xs'>
                    Expire le {new Date(recoveryCode.expiresAt).toLocaleString('fr-FR')}. Ce code ne
                    sera pas récupérable ensuite.
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-fit'
                    onClick={() => navigator.clipboard.writeText(recoveryCode.token)}
                  >
                    Copier le code
                  </Button>
                </div>
              )}
              <form
                onSubmit={resetAccountPassword}
                className='flex flex-wrap items-end gap-3 border-t pt-4'
              >
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='admin-new-password'>Nouveau mot de passe direct</Label>
                  <Input
                    id='admin-new-password'
                    name='password'
                    type='password'
                    minLength={8}
                    required
                  />
                </div>
                <Button variant='destructive' type='submit'>
                  Réinitialiser sans ancien mot de passe
                </Button>
              </form>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='text-muted-foreground border-b text-left text-xs'>
                    <tr>
                      <th className='px-2 py-2'>Compte</th>
                      <th className='px-2 py-2'>Rôle</th>
                      <th className='px-2 py-2'>Dernière connexion</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td className='px-2 py-2'>{account.email}</td>
                        <td className='px-2 py-2'>{account.role}</td>
                        <td className='px-2 py-2'>
                          {account.lastSignInAt
                            ? new Date(account.lastSignInAt).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
