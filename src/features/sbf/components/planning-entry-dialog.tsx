'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useSavePlanningEntry } from '@/lib/sbf/api';
import { formatDateFr } from '@/lib/sbf/format';
import {
  PLANNING_CATEGORIES,
  PLANNING_DECISIONS,
  PLANNING_MAX_DAYS,
  addDays,
  diffInDays,
  isPlanningCategory,
  maxEndDate,
  planningCodePreview,
  planningDurationDays
} from '@/lib/sbf/planning';
import type {
  PlanningEntry,
  PlanningEntryInput,
  Project,
  SubmissionDecision
} from '@/lib/sbf/types';

type PlanningEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entrée à modifier, ou `null` pour une création. */
  entry: PlanningEntry | null;
  projects: Project[];
  /** Date proposée par défaut pour une nouvelle entrée (ISO). */
  defaultDate: string;
  onSaved: (entry: PlanningEntry) => void;
};

export function PlanningEntryDialog({
  open,
  onOpenChange,
  entry,
  projects,
  defaultDate,
  onSaved
}: PlanningEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        {open && (
          <PlanningEntryForm
            key={entry?.id ?? `new-${defaultDate}`}
            entry={entry}
            projects={projects}
            defaultDate={defaultDate}
            onSaved={onSaved}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanningEntryForm({
  entry,
  projects,
  defaultDate,
  onSaved,
  onCancel
}: {
  entry: PlanningEntry | null;
  projects: Project[];
  defaultDate: string;
  onSaved: (entry: PlanningEntry) => void;
  onCancel: () => void;
}) {
  const save = useSavePlanningEntry();
  const isEdit = Boolean(entry);
  const initialStart = entry?.start_date ?? defaultDate;
  const initialEnd = entry?.end_date ?? addDays(initialStart, PLANNING_MAX_DAYS - 1);

  const [category, setCategory] = useState(entry?.category ?? '');
  const [projectId, setProjectId] = useState(entry?.project_id ?? '');
  const [name, setName] = useState(entry?.name ?? '');
  const [client, setClient] = useState(entry?.client ?? '');
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [decision, setDecision] = useState<SubmissionDecision>(entry?.decision ?? 'En attente');
  const [formError, setFormError] = useState<string | null>(null);

  const latestEnd = startDate ? maxEndDate(startDate) : '';
  const duration =
    startDate && endDate ? planningDurationDays({ start_date: startDate, end_date: endDate }) : 0;
  const selectedProject = projects.find((project) => project.id === projectId);
  const legacyCategory = entry && !isPlanningCategory(entry.category) ? entry.category : null;
  const codeWillChange = Boolean(
    entry &&
    (category !== entry.category || (startDate && Number(startDate.slice(0, 4)) !== entry.year))
  );

  function handleProjectChange(value: string) {
    setProjectId(value);
    const project = projects.find((item) => item.id === value);
    if (!project) return;
    // Pré-remplit uniquement les champs encore vides : l'utilisateur garde la main.
    setName((current) => (current.trim() ? current : project.name));
    setClient((current) => (current.trim() ? current : (project.client ?? '')));
  }

  function handleStartChange(value: string) {
    setStartDate(value);
    setFormError(null);
    if (!value || !endDate) return;
    const max = maxEndDate(value);
    if (endDate < value) setEndDate(value);
    else if (endDate > max) setEndDate(max);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!category) {
      setFormError('Sélectionnez une catégorie.');
      return;
    }
    if (!trimmedName) {
      setFormError('Le nom du projet ou de l’offre est obligatoire.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Les dates de début et de fin sont obligatoires.');
      return;
    }

    const difference = diffInDays(startDate, endDate);
    if (Number.isNaN(difference) || difference < 0) {
      setFormError('La date de fin doit être identique ou postérieure à la date de début.');
      return;
    }
    if (difference >= PLANNING_MAX_DAYS) {
      setFormError(`Une planification ne peut pas dépasser ${PLANNING_MAX_DAYS} jours.`);
      return;
    }

    const payload: PlanningEntryInput = {
      ...(entry ? { id: entry.id } : {}),
      project_id: projectId || null,
      category,
      name: trimmedName,
      client: client.trim() || null,
      start_date: startDate,
      end_date: endDate,
      decision
    };

    setFormError(null);
    save.mutate(payload, {
      onSuccess: (saved) => {
        toast.success(isEdit ? `${saved.code} mis à jour` : `${saved.code} ajouté au planning`);
        onSaved(saved);
      },
      onError: (error) => {
        setFormError(error.message);
        toast.error(error.message);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? `Modifier ${entry?.code}` : 'Ajouter une planification'}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'La durée d’une planification est limitée à une semaine. Changer la catégorie ou l’année de début réattribue le numéro du code.'
            : `Le code ${planningCodePreview(category, startDate)} sera attribué automatiquement à l’enregistrement.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className='flex flex-col gap-4' noValidate>
        <div className='grid gap-2'>
          <Label htmlFor='planning-category'>Catégorie</Label>
          <NativeSelect
            id='planning-category'
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setFormError(null);
            }}
            required
          >
            <NativeSelectOption value=''>Sélectionner une catégorie</NativeSelectOption>
            {PLANNING_CATEGORIES.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
            {legacyCategory && (
              <NativeSelectOption value={legacyCategory}>
                {legacyCategory} — catégorie existante
              </NativeSelectOption>
            )}
          </NativeSelect>
          {isEdit && (
            <p className='text-muted-foreground text-xs'>
              {codeWillChange
                ? `Nouvel identifiant recalculé pour la catégorie et l’année choisies (${entry?.code} → T/${category || 'CAT'}/NN/${startDate.slice(0, 4) || 'AAAA'}).`
                : `Identifiant conservé : ${entry?.code}.`}
            </p>
          )}
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='planning-project'>Marché lié (optionnel)</Label>
          <NativeSelect
            id='planning-project'
            value={projectId}
            onChange={(event) => handleProjectChange(event.target.value)}
          >
            <NativeSelectOption value=''>Aucun marché lié</NativeSelectOption>
            {projects.map((project) => (
              <NativeSelectOption key={project.id} value={project.id}>
                {project.code ? `${project.code} — ` : ''}
                {project.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {selectedProject?.client && (
            <p className='text-muted-foreground text-xs'>
              Client du marché : {selectedProject.client}
            </p>
          )}
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='planning-name'>Nom du projet / de l’offre</Label>
          <Input
            id='planning-name'
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFormError(null);
            }}
            placeholder='Nom du projet ou de l’offre'
            required
          />
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='planning-client'>Client</Label>
          <Input
            id='planning-client'
            value={client}
            onChange={(event) => setClient(event.target.value)}
            placeholder='Maître d’ouvrage'
          />
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='planning-start'>Début</Label>
            <Input
              id='planning-start'
              type='date'
              value={startDate}
              onChange={(event) => handleStartChange(event.target.value)}
              required
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='planning-end'>Fin</Label>
            <Input
              id='planning-end'
              type='date'
              value={endDate}
              min={startDate || undefined}
              max={latestEnd || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setFormError(null);
              }}
              required
            />
          </div>
        </div>

        <p className='text-muted-foreground text-xs'>
          {duration > 0
            ? `${duration} jour${duration > 1 ? 's' : ''} · fin au plus tard le ${formatDateFr(latestEnd)}`
            : `Une planification couvre ${PLANNING_MAX_DAYS} jours maximum.`}
        </p>

        <div className='grid gap-2'>
          <Label htmlFor='planning-decision'>Décision de participation</Label>
          <NativeSelect
            id='planning-decision'
            value={decision}
            onChange={(event) => setDecision(event.target.value as SubmissionDecision)}
          >
            {PLANNING_DECISIONS.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {formError && (
          <p
            role='alert'
            className='bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg p-2 text-sm'
          >
            <Icons.warning className='mt-0.5 size-4 shrink-0' />
            {formError}
          </p>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onCancel} disabled={save.isPending}>
            Annuler
          </Button>
          <LoadingButton
            type='submit'
            loading={save.isPending}
            loadingLabel='Enregistrement du planning…'
          >
            {isEdit ? 'Enregistrer' : 'Ajouter au planning'}
          </LoadingButton>
        </DialogFooter>
      </form>
    </>
  );
}
