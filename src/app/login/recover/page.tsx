import type { Metadata } from 'next';
import Link from 'next/link';
import { SbfLogo } from '@/components/sbf-logo';
import { AccountRecoveryForm } from '@/features/sbf/components/account-recovery-form';

export const metadata: Metadata = { title: 'Récupération du compte' };

export default function AccountRecoveryPage() {
  return (
    <main className='flex min-h-svh items-center justify-center p-4'>
      <div className='w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <SbfLogo size='lg' className='mx-auto mb-4' />
          <h1 className='text-2xl font-semibold'>SBF Pulse</h1>
          <p className='text-muted-foreground mt-1 text-sm'>Récupération sécurisée du compte</p>
        </div>
        <AccountRecoveryForm />
        <p className='text-muted-foreground mt-6 text-center text-xs'>
          <Link href='/login' className='hover:underline'>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
