import type { Metadata } from 'next';
import PageContainer from '@/components/layout/page-container';
import { SettingsPanel } from '@/features/sbf/components/settings-panel';

export const metadata: Metadata = { title: 'Paramètres' };

export default function SettingsPage() {
  return (
    <PageContainer pageTitle='Paramètres' pageDescription='Profil, sécurité et gestion des comptes'>
      <SettingsPanel />
    </PageContainer>
  );
}
