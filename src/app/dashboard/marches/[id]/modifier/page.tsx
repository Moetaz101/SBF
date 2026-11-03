import PageContainer from '@/components/layout/page-container';
import { EditProject } from '@/features/sbf/components/edit-project';

export const metadata = { title: 'Modifier le marché' };

export default async function ModifierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer pageTitle='Modifier le marché'>
      <EditProject id={decodeURIComponent(id)} />
    </PageContainer>
  );
}
