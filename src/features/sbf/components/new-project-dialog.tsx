'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { applyMapping, autoMapColumns } from '@/lib/sbf/import-map';
import { parseImportFile } from '@/lib/sbf/import-parse';
import type { ProjectInput } from '@/lib/sbf/types';
import { ProjectForm } from './project-form';

type NewProjectDialogProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  showIcon?: boolean;
  /** When false, only the dialog is rendered (the caller owns the trigger). */
  hideTrigger?: boolean;
  /** Controlled mode: omit to let the dialog manage its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function NewProjectDialog({
  triggerLabel = 'Nouveau marché',
  triggerClassName,
  triggerVariant = 'default',
  triggerSize = 'default',
  showIcon = true,
  hideTrigger = false,
  open,
  onOpenChange
}: NewProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Partial<ProjectInput> | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const dirtyRef = useRef(false);
  const prefillInputRef = useRef<HTMLInputElement>(null);
  const actualOpen = open ?? internalOpen;

  function setActualOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function requestClose() {
    if (dirtyRef.current) {
      const confirmed = window.confirm(
        'Des modifications non enregistrées seront perdues. Fermer le formulaire ?'
      );
      if (!confirmed) return;
    }
    dirtyRef.current = false;
    setInitialValues(null);
    setFormKey((key) => key + 1);
    setActualOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      requestClose();
      return;
    }
    setActualOpen(true);
  }

  async function handlePrefill(file: File | undefined) {
    if (!file) return;
    setPrefilling(true);
    try {
      const table = await parseImportFile(file);
      const mappings = autoMapColumns(table.headers, table.rows);
      const mapped = applyMapping(table, mappings);
      const first = mapped.find((row) => row.errors.length === 0) ?? mapped[0];
      if (!first) throw new Error('Aucune ligne exploitable dans le fichier.');
      if (first.errors.length > 0) throw new Error(first.errors.join(' '));
      setInitialValues(first.values);
      setFormKey((key) => key + 1);
      toast.success(`Champs pré-remplis depuis ${table.fileName}. Vérifiez puis enregistrez.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de lire le fichier.');
    } finally {
      setPrefilling(false);
    }
  }

  function handleSaved(_project: unknown, another: boolean) {
    if (another) {
      setInitialValues(null);
      setFormKey((key) => key + 1);
      dirtyRef.current = false;
      toast.success('Marché créé. Un nouveau formulaire est prêt.');
      return;
    }
    dirtyRef.current = false;
    setInitialValues(null);
    setActualOpen(false);
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          onClick={() => setActualOpen(true)}
        >
          {showIcon && <Icons.add />}
          {triggerLabel}
        </Button>
      )}

      <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
        <DialogContent className='max-h-[94dvh] gap-0 overflow-hidden p-0 sm:max-w-4xl'>
          <DialogHeader className='border-b px-5 py-4 pr-14'>
            <DialogTitle>Nouveau marché</DialogTitle>
            <DialogDescription>
              Seul l’intitulé est obligatoire. Les sections avancées restent accessibles sans
              quitter la fenêtre.
            </DialogDescription>
            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => prefillInputRef.current?.click()}
                disabled={prefilling}
              >
                {prefilling ? <Icons.spinner className='animate-spin' /> : <Icons.upload />}
                Pré-remplir depuis un fichier
              </Button>
              <span className='text-muted-foreground text-xs'>
                CSV, Excel, TXT ou JSON · première ligne exploitable
              </span>
              <input
                ref={prefillInputRef}
                type='file'
                accept='.csv,.xlsx,.xls,.txt,.tsv,.json,application/json,text/csv'
                hidden
                onChange={(event) => {
                  void handlePrefill(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </DialogHeader>
          <div className='max-h-[calc(94dvh-7.5rem)] overflow-y-auto px-5 py-4'>
            <ProjectForm
              key={formKey}
              embedded
              initialValues={initialValues ?? undefined}
              onCancel={requestClose}
              onSaved={handleSaved}
              onDirtyChange={(dirty) => {
                dirtyRef.current = dirty;
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
