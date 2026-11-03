import PageContainer from '@/components/layout/page-container';
import { PlanningOverview } from '@/features/sbf/components/planning-overview';

export const metadata = { title: 'Planning' };

export default function PlanningPage() {
  return (
    <PageContainer pageTitle='Planning' pageDescription='Calendrier d’exécution des chantiers'>
      <PlanningOverview />
    </PageContainer>
  );
}
