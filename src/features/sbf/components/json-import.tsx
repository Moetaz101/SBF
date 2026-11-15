'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getSupabase } from '@/lib/supabase/client';
import { keys, uploadDocument } from '@/lib/sbf/api';
import { findProjectsArray, mapProject, type ImportedProject } from '@/lib/sbf/import';

type Log = { ok: boolean; text: string };

/**
 * Importe le fichier JSON du prototype (SBFPulse) :
 * - chaque projet devient une ligne de la table `projects` (l'id d'origine est conservé)
 * - chaque PDF en base64 est envoyé dans Supabase Storage
 * Ré-importer le même fichier met à jour les marchés existants (pas de doublons).
 */
export function JsonImportView() {
  const qc = useQueryClient();
  const [parsed, setParsed] = useState<ImportedProject[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setLogs([]);
    setDone(0);
    setFileName(file.name);
    try {
      const json = JSON.parse(await file.text());
      const raw = findProjectsArray(json);
      if (!raw.length) throw new Error('Aucun tableau de projets trouvé dans ce fichier.');
      setParsed(raw.map(mapProject));
    } catch (err) {
      setParsed(null);
      setLogs([{ ok: false, text: `Fichier illisible : ${(err as Error).message}` }]);
    }
  }

  async function run() {
    if (!parsed) return;
    setRunning(true);
    setLogs([]);
    const supabase = getSupabase();

    for (let i = 0; i < parsed.length; i++) {
      const { project, files } = parsed[i];
      try {
        const { data, error } = await supabase
          .from('projects')
          .upsert(project, { onConflict: 'id' })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        const id = (data as { id: string }).id;

        // Évite de ré-envoyer un PDF déjà importé (même nom)
        const existing = await supabase
          .from('project_documents')
          .select('name')
          .eq('project_id', id);
        const already = new Set((existing.data ?? []).map((d: { name: string }) => d.name));
        let uploaded = 0;
        for (const f of files) {
          if (already.has(f.name)) continue;
          await uploadDocument(id, f.blob, f.name);
          uploaded++;
        }
        setLogs((l) => [
          ...l,
          { ok: true, text: `${project.name}${uploaded ? ` — ${uploaded} document(s)` : ''}` }
        ]);
      } catch (err) {
        setLogs((l) => [...l, { ok: false, text: `${project.name} : ${(err as Error).message}` }]);
      }
      setDone(i + 1);
    }

    await qc.invalidateQueries({ queryKey: keys.projects });
    await qc.invalidateQueries({ queryKey: ['documents'] });
    setRunning(false);
  }

  const totalFiles = parsed?.reduce((n, p) => n + p.files.length, 0) ?? 0;
  const errors = logs.filter((l) => !l.ok).length;
  const finished = parsed && done === parsed.length && !running;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3'>
        <p className='text-muted-foreground text-sm'>
          Sélectionnez votre export <code>sbf_marches_chiffrage_….json</code>. Les PDF intégrés
          seront déplacés dans le stockage cloud. Vous pouvez ré-importer le même fichier sans créer
          de doublons.
        </p>
        <label
          className={buttonVariants({ variant: 'outline', size: 'lg' }) + ' w-fit cursor-pointer'}
        >
          <Icons.upload /> {fileName || 'Choisir un fichier JSON'}
          <input
            type='file'
            accept='application/json,.json'
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {parsed && (
        <div className='flex flex-col gap-3 rounded-lg border p-3'>
          <p className='text-sm'>
            <strong>{parsed.length}</strong> marché(s) et <strong>{totalFiles}</strong> document(s)
            détectés.
          </p>
          {(running || done > 0) && <Progress value={(done / parsed.length) * 100} />}
          <Button size='lg' onClick={run} disabled={running} className='w-fit'>
            {running ? `Import… ${done}/${parsed.length}` : 'Lancer l’import'}
          </Button>
        </div>
      )}

      {logs.length > 0 && (
        <div className='flex flex-col gap-3 rounded-lg border p-3'>
          <p className='text-sm font-medium'>
            {finished
              ? errors
                ? `Terminé avec ${errors} erreur(s)`
                : 'Import terminé ✅'
              : 'Journal'}
          </p>
          <ul className='flex max-h-80 flex-col gap-1 overflow-y-auto text-sm'>
            {logs.map((l, i) => (
              <li key={i} className={l.ok ? '' : 'text-destructive'}>
                {l.ok ? '✓' : '✗'} {l.text}
              </li>
            ))}
          </ul>
          {finished && (
            <Link href='/dashboard/marches' className={buttonVariants() + ' w-fit'}>
              Voir les marchés
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
