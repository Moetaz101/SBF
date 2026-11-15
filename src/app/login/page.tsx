import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SbfLogo } from '@/components/sbf-logo';
import { LoginForm } from '@/features/sbf/components/login-form';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <main className='flex min-h-svh items-center justify-center p-4'>
      <div className='w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <SbfLogo size='lg' className='mx-auto mb-4' />
          <h1 className='text-2xl font-semibold'>SBF Pulse</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Marchés, chiffrage &amp; suivi de chantiers
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className='text-muted-foreground mt-6 text-center text-xs'>
          Pas de compte ? Demandez à l&apos;administrateur de vous en créer un.
        </p>
      </div>
    </main>
  );
}
