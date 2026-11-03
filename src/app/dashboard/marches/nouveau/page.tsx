import PageContainer from '@/components/layout/page-container';
import { ProjectForm } from '@/features/sbf/components/project-form';

export const metadata = { title: 'Nouveau marché' };

export default function NouveauMarchePage() {
  return (
    <PageContainer
      pageTitle='Nouveau marché'
      pageDescription='Seul l’intitulé est obligatoire, le reste peut être complété plus tard.'
    >
      <ProjectForm />
    </PageContainer>
  );
}
