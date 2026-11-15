import PageContainer from '@/components/layout/page-container';
import { PlanningOverview } from '@/features/sbf/components/planning-overview';

export const metadata = { title: 'Planning' };

export default function PlanningPage() {
  return (
    <PageContainer
      pageTitle='Planning'
      pageDescription='Planning hebdomadaire des remises d’offres'
    >
      <PlanningOverview />
    </PageContainer>
  );
}
