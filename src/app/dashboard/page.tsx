import PageContainer from '@/components/layout/page-container';
import { DashboardView } from '@/features/sbf/components/dashboard-view';

export const metadata = { title: 'Tableau de bord' };

export default function DashboardPage() {
  return (
    <PageContainer
      pageTitle='Tableau de bord'
      pageDescription='Situation en direct des marchés SBF'
    >
      <DashboardView />
    </PageContainer>
  );
}
