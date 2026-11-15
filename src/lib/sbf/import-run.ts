import { getSupabase } from '@/lib/supabase/client';
import type { ImportResult, ImportRow } from './import-types';

const CHUNK_SIZE = 200;

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function withoutId(row: ImportRow['input']) {
  const { id, ...rest } = row;
  void id;
  return rest;
}

/**
 * Écrit les lignes par lots de 200. Si un lot échoue, on réessaie ligne par
 * ligne afin d'identifier précisément les lignes en erreur.
 */
export async function importProjects(
  rows: ImportRow[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const supabase = getSupabase();
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  const active = rows.filter((row) => !row.skipped);
  result.skipped = rows.length - active.length;
  const total = active.length;
  let done = 0;

  const updates = active.filter((row) => row.input.id);
  const inserts = active.filter((row) => !row.input.id);

  for (const chunk of chunks(updates, CHUNK_SIZE)) {
    try {
      const payload = chunk.map((row) => row.input);
      const { error } = await supabase.from('projects').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      result.updated += chunk.length;
    } catch {
      for (const row of chunk) {
        try {
          const { id, ...rest } = row.input;
          if (!id) throw new Error('Identifiant manquant.');
          const { error } = await supabase
            .from('projects')
            .update(rest)
            .eq('id', id)
            .select('id')
            .single();
          if (error) throw error;
          result.updated++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: row.rowNumber,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    done += chunk.length;
    onProgress?.(done, total);
  }

  for (const chunk of chunks(inserts, CHUNK_SIZE)) {
    try {
      const payload = chunk.map((row) => withoutId(row.input));
      const { error } = await supabase.from('projects').insert(payload);
      if (error) throw error;
      result.inserted += chunk.length;
    } catch {
      for (const row of chunk) {
        try {
          const { error } = await supabase
            .from('projects')
            .insert(withoutId(row.input))
            .select('id')
            .single();
          if (error) throw error;
          result.inserted++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: row.rowNumber,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    done += chunk.length;
    onProgress?.(done, total);
  }

  return result;
}
