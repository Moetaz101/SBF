import PageContainer from '@/components/layout/page-container';
import { ImportView } from '@/features/sbf/components/import-view';

export const metadata = { title: 'Importer' };

export default function ImportPage() {
  return (
    <PageContainer
      pageTitle='Importer les données'
      pageDescription='Reprise du fichier JSON du prototype SBFPulse'
    >
      <ImportView />
    </PageContainer>
  );
}
