import Link from 'next/link';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { ProjectsList } from '@/features/sbf/components/projects-list';

export const metadata = { title: 'Marchés' };

export default function MarchesPage() {
  return (
    <PageContainer
      pageTitle='Marchés'
      pageDescription='Appels d’offres, chiffrages et contrats'
      pageHeaderAction={
        <Link
          href='/dashboard/marches/nouveau'
          className={buttonVariants() + ' hidden md:inline-flex'}
        >
          <Icons.add /> Nouveau marché
        </Link>
      }
    >
      <ProjectsList />
    </PageContainer>
  );
}
