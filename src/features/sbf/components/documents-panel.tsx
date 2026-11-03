'use client';

import { useRef } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDocumentUrl, useDeleteDocument, useDocuments, useUploadDocument } from '@/lib/sbf/api';
import { formatBytes, formatDateFr } from '@/lib/sbf/format';
import type { ProjectDocument } from '@/lib/sbf/types';

/** Ouvre un PDF privé via un lien signé temporaire */
async function openDocument(doc: ProjectDocument) {
  // Ouvre l'onglet tout de suite (sinon bloqué sur iPhone), puis charge le lien signé
  const win = window.open('', '_blank');
  try {
    const url = await getDocumentUrl(doc);
    (win ?? window).location.assign(url);
  } catch (err) {
    win?.close();
    toast.error((err as Error).message);
  }
}

/** PDF du marché (offre, CPS, BPU, plans…) stockés dans Supabase Storage */
export function DocumentsPanel({ projectId }: { projectId: string }) {
  const { data: docs, isLoading } = useDocuments(projectId);
  const upload = useUploadDocument(projectId);
  const del = useDeleteDocument(projectId);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
        toast.success(`${file.name} ajouté`);
      } catch (err) {
        toast.error(`${file.name} : ${(err as Error).message}`);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Documents</CardTitle>
        <Button
          variant='outline'
          size='sm'
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Icons.upload /> {upload.isPending ? 'Envoi…' : 'Ajouter'}
        </Button>
        <input
          ref={inputRef}
          type='file'
          accept='application/pdf,image/*,.doc,.docx,.xls,.xlsx'
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className='text-muted-foreground text-sm'>Chargement…</p>
        ) : !docs?.length ? (
          <p className='text-muted-foreground text-sm'>Aucun document.</p>
        ) : (
          <ul className='divide-y'>
            {docs.map((d) => (
              <li key={d.id} className='flex items-center gap-3 py-2'>
                <Icons.fileTypePdf className='text-red-500 size-6 shrink-0' />
                <button
                  type='button'
                  onClick={() => openDocument(d)}
                  className='min-w-0 flex-1 text-left'
                >
                  <div className='truncate text-sm font-medium hover:underline'>{d.name}</div>
                  <div className='text-muted-foreground text-xs'>
                    {formatBytes(d.size_bytes)} · {formatDateFr(d.created_at)}
                  </div>
                </button>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={`Supprimer ${d.name}`}
                  onClick={() => {
                    if (confirm(`Supprimer « ${d.name} » ?`)) del.mutate(d);
                  }}
                >
                  <Icons.trash />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
