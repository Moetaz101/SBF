'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/lib/sbf/api';
import { ErrorBox } from './dashboard-view';
import { ProjectForm } from './project-form';

export function EditProject({ id }: { id: string }) {
  const { data, isLoading, error } = useProject(id);
  if (isLoading) return <Skeleton className='h-96 rounded-xl' />;
  if (error) return <ErrorBox message={error.message} />;
  if (!data) return <p className='text-muted-foreground'>Marché introuvable.</p>;
  // key : réinitialise le formulaire si la fiche change (ex. modifiée par un collègue)
  return <ProjectForm key={data.updated_at} project={data} />;
}
