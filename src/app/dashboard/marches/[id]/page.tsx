import PageContainer from '@/components/layout/page-container';
import { ProjectFiche } from '@/features/sbf/components/project-fiche';

export const metadata = { title: 'Fiche marché' };

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <ProjectFiche id={decodeURIComponent(id)} />
    </PageContainer>
  );
}
