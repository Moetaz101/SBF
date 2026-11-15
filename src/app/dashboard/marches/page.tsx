import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { MarchesHeaderActions } from '@/features/sbf/components/marches-header-actions';
import { NewProjectDialog } from '@/features/sbf/components/new-project-dialog';
import { ProjectsList } from '@/features/sbf/components/projects-list';

export const metadata = { title: 'Marchés' };

export default function MarchesPage() {
  return (
    <PageContainer
      pageTitle='Marchés'
      pageDescription='Appels d’offres, chiffrages et contrats'
      pageHeaderAction={
        <Suspense fallback={<NewProjectDialog triggerClassName='hidden md:inline-flex' />}>
          <MarchesHeaderActions />
        </Suspense>
      }
    >
      <Suspense fallback={<Skeleton className='h-24 rounded-xl' />}>
        <ProjectsList />
      </Suspense>
    </PageContainer>
  );
}
