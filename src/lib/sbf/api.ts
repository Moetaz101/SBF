'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type {
  PlanningTask,
  PlanningTaskInput,
  Project,
  ProjectDocument,
  ProjectInput
} from './types';

export const DOCUMENTS_BUCKET = 'documents';

export const keys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: ['tasks'] as const,
  documents: (projectId: string) => ['documents', projectId] as const
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ------------------------------------------------------------------ */
/* Marchés                                                             */
/* ------------------------------------------------------------------ */

export function useProjects() {
  return useQuery({
    queryKey: keys.projects,
    queryFn: async () =>
      unwrap<Project[]>(
        await getSupabase().from('projects').select('*').order('updated_at', { ascending: false })
      )
  });
}

export function useProject(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.project(id),
    queryFn: async () =>
      unwrap<Project | null>(
        await getSupabase().from('projects').select('*').eq('id', id).maybeSingle()
      ),
    // Affiche instantanément la version déjà chargée dans la liste
    initialData: () => qc.getQueryData<Project[]>(keys.projects)?.find((p) => p.id === id)
  });
}

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const { id, ...rest } = input;
      const query = id
        ? getSupabase().from('projects').update(rest).eq('id', id).select().single()
        : getSupabase().from('projects').insert(rest).select().single();
      return unwrap<Project>(await query);
    },
    onSuccess: (project) => {
      qc.setQueryData(keys.project(project.id), project);
      qc.invalidateQueries({ queryKey: keys.projects });
    }
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabase();
      // Supprime d'abord les PDF du stockage
      const docs = unwrap<{ storage_path: string }[]>(
        await supabase.from('project_documents').select('storage_path').eq('project_id', id)
      );
      if (docs.length) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove(docs.map((d) => d.storage_path));
      }
      unwrap(await supabase.from('projects').delete().eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects })
  });
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export function useTasks() {
  return useQuery({
    queryKey: keys.tasks,
    queryFn: async () =>
      unwrap<PlanningTask[]>(
        await getSupabase()
          .from('planning_tasks')
          .select('*')
          .order('start_date', { ascending: true })
      )
  });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanningTaskInput) => {
      const { id, ...rest } = input;
      const query = id
        ? getSupabase().from('planning_tasks').update(rest).eq('id', id).select().single()
        : getSupabase().from('planning_tasks').insert(rest).select().single();
      return unwrap<PlanningTask>(await query);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.tasks })
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await getSupabase().from('planning_tasks').delete().eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.tasks })
  });
}

/* ------------------------------------------------------------------ */
/* Documents PDF                                                       */
/* ------------------------------------------------------------------ */

export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: keys.documents(projectId),
    queryFn: async () =>
      unwrap<ProjectDocument[]>(
        await getSupabase()
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      )
  });
}

/** Nom de fichier sûr pour le stockage (sans accents ni espaces) */
function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export async function uploadDocument(projectId: string, file: Blob, name: string) {
  const supabase = getSupabase();
  const path = `${safeFileName(projectId)}/${Date.now()}-${safeFileName(name)}`;
  const up = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    contentType: file.type || 'application/pdf',
    upsert: false
  });
  if (up.error) throw new Error(up.error.message);

  const row = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || 'application/pdf'
    })
    .select()
    .single();
  if (row.error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    throw new Error(row.error.message);
  }
  return row.data as ProjectDocument;
}

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadDocument(projectId, file, file.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documents(projectId) })
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      const supabase = getSupabase();
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
      unwrap(await supabase.from('project_documents').delete().eq('id', doc.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documents(projectId) })
  });
}

/** Lien temporaire (1 h) pour ouvrir un PDF privé */
export async function getDocumentUrl(doc: ProjectDocument) {
  const { data, error } = await getSupabase()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ------------------------------------------------------------------ */
/* Synchronisation temps réel                                          */
/* ------------------------------------------------------------------ */

/**
 * Écoute les modifications de la base : dès qu'un utilisateur change
 * une donnée, tous les appareils connectés se mettent à jour.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel('sbf-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        qc.invalidateQueries({ queryKey: keys.projects });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_tasks' }, () => {
        qc.invalidateQueries({ queryKey: keys.tasks });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_documents' }, () => {
        qc.invalidateQueries({ queryKey: ['documents'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
