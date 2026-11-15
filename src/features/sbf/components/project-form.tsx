'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SBF_CONFIG, STATUTS, STATUTS_GAGNES, TYPES_TRAVAUX } from '@/config/sbf';
import { useSaveProject } from '@/lib/sbf/api';
import { parseISODate, parseNumber } from '@/lib/sbf/format';
import type { Project, ProjectInput } from '@/lib/sbf/types';

type FieldDef = {
  name: keyof ProjectInput;
  label: string;
  kind?: 'text' | 'number' | 'date' | 'textarea';
  suffix?: string;
  placeholder?: string;
  required?: boolean;
  full?: boolean;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Identification',
    fields: [
      {
        name: 'name',
        label: 'Intitulé du marché',
        required: true,
        full: true,
        placeholder: 'LOT TERRASSEMENT (SOTUBI-SOTUCHOC)'
      },
      { name: 'code', label: 'Code du marché', placeholder: 'T/VRD/31/2026' },
      { name: 'description', label: 'Description', kind: 'textarea', full: true }
    ]
  },
  {
    title: 'Client & site',
    fields: [
      { name: 'client', label: 'Client / Maître d’ouvrage', placeholder: 'OMMP, Saïda…' },
      { name: 'location', label: 'Lieu / Gouvernorat', placeholder: 'Ben Arous / Radès' },
      {
        name: 'passation_mode',
        label: 'Mode de passation',
        placeholder: 'Appel d’offres ouvert'
      },
      { name: 'surf_terrain', label: 'Surface terrain', kind: 'number', suffix: 'm²' },
      { name: 'surf_couverte', label: 'Surface couverte', kind: 'number', suffix: 'm²' }
    ]
  },
  {
    title: 'Montants',
    fields: [
      { name: 'amount_ht', label: 'Montant HT', kind: 'number', suffix: 'DT' },
      {
        name: 'amount_ttc',
        label: `Montant TTC (vide = HT + ${SBF_CONFIG.tauxTva} %)`,
        kind: 'number',
        suffix: 'DT'
      },
      {
        name: 'coef_reglement',
        label: 'Coefficient de règlement',
        kind: 'number',
        placeholder: '1,05'
      }
    ]
  },
  {
    title: 'Dates & délais',
    fields: [
      { name: 'date_remise_offre', label: 'Date de remise de l’offre', kind: 'date' },
      { name: 'date_os', label: 'Date ordre de service (OS)', kind: 'date' },
      {
        name: 'duree_client',
        label: 'Délai client',
        kind: 'number',
        suffix: SBF_CONFIG.uniteDelai
      },
      {
        name: 'duree_sbf',
        label: 'Objectif interne SBF',
        kind: 'number',
        suffix: SBF_CONFIG.uniteDelai
      }
    ]
  },
  {
    title: 'Conditions contractuelles',
    fields: [
      { name: 'avance', label: 'Avance', kind: 'number', suffix: '%' },
      { name: 'retenue_garantie', label: 'Retenue de garantie', kind: 'number', suffix: '%' },
      {
        name: 'modalite_paiement',
        label: 'Modalité de paiement',
        placeholder: 'Décomptes mensuels 30j'
      },
      {
        name: 'penalite_retard',
        label: 'Pénalité de retard',
        placeholder: '1/1000 par jour max 5%'
      }
    ]
  },
  {
    title: 'Intervenants',
    fields: [
      { name: 'chef_projet', label: 'Chef de projet' },
      { name: 'architecte', label: 'Architecte' },
      { name: 'bet', label: 'BET' },
      { name: 'ing_conseil', label: 'Ingénieur conseil' },
      { name: 'bureau_controle', label: 'Bureau de contrôle' }
    ]
  }
];

const NUMBER_DEFAULT_ZERO = new Set<keyof ProjectInput>();

const PERCENT_FIELDS = new Set<keyof ProjectInput>(['avance', 'retenue_garantie', 'avancement']);

const POSITIVE_FIELDS = new Set<keyof ProjectInput>([
  'amount_ht',
  'amount_ttc',
  'coef_reglement',
  'duree_client',
  'duree_sbf',
  'surf_terrain',
  'surf_couverte'
]);

function defaultValue(
  project: Project | undefined,
  initialValues: Partial<ProjectInput> | undefined,
  name: keyof ProjectInput
) {
  const v = initialValues?.[name] ?? project?.[name as keyof Project];
  if (v === null || v === undefined) return '';
  return String(v);
}

function buildInput(
  form: FormData,
  project: Project | undefined,
  initialValues: Partial<ProjectInput> | undefined
) {
  const errors: Record<string, string> = {};
  const input: Record<string, unknown> = {
    id: project?.id,
    status: String(form.get('status') || 'En étude'),
    type: String(form.get('type') || '') || null,
    extra: project?.extra ?? initialValues?.extra ?? {}
  };

  for (const section of SECTIONS) {
    for (const f of section.fields) {
      const raw = String(form.get(f.name) ?? '').trim();

      if (f.kind === 'number') {
        const n = parseNumber(raw);
        if (raw && n === null) errors[f.name] = 'Valeur numérique invalide.';
        input[f.name] = n ?? (NUMBER_DEFAULT_ZERO.has(f.name) ? 0 : null);
      } else if (f.kind === 'date') {
        if (raw && !parseISODate(raw)) errors[f.name] = 'Date invalide.';
        input[f.name] = raw || null;
      } else {
        input[f.name] = raw || null;
      }
    }
  }

  if (!input.name) errors.name = 'L’intitulé du marché est obligatoire.';

  for (const field of PERCENT_FIELDS) {
    const value = input[field];
    if (typeof value === 'number' && (value < 0 || value > 100)) {
      errors[field] = 'La valeur doit être comprise entre 0 et 100.';
    }
  }

  for (const field of POSITIVE_FIELDS) {
    const value = input[field];
    if (typeof value === 'number' && value < 0) {
      errors[field] = 'La valeur ne peut pas être négative.';
    }
  }

  // Le chef de projet est obligatoire dès qu'un marché est gagné (PRD).
  if (STATUTS_GAGNES.includes(String(input.status)) && !input.chef_projet) {
    errors.chef_projet = 'Obligatoire pour un marché adjugé, en exécution ou terminé.';
  }

  return { input: input as ProjectInput, errors };
}

function FieldGrid({
  section,
  project,
  initialValues,
  errors
}: {
  section: { title: string; fields: FieldDef[] };
  project?: Project;
  initialValues?: Partial<ProjectInput>;
  errors: Record<string, string>;
}) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {section.fields.map((f) => {
        const error = errors[f.name];
        return (
          <div
            key={f.name}
            className={f.full ? 'flex flex-col gap-2 sm:col-span-2' : 'flex flex-col gap-2'}
          >
            <Label htmlFor={f.name}>
              {f.label}
              {f.required && <span className='text-destructive'> *</span>}
            </Label>
            {f.kind === 'textarea' ? (
              <Textarea
                id={f.name}
                name={f.name}
                defaultValue={defaultValue(project, initialValues, f.name)}
                rows={3}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${f.name}-error` : undefined}
              />
            ) : (
              <div className='relative'>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.kind === 'date' ? 'date' : 'text'}
                  inputMode={f.kind === 'number' ? 'decimal' : undefined}
                  required={f.required}
                  placeholder={f.placeholder}
                  defaultValue={defaultValue(project, initialValues, f.name)}
                  className={f.suffix ? 'h-10 pr-14' : 'h-10'}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${f.name}-error` : undefined}
                  autoComplete='off'
                />
                {f.suffix && (
                  <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs'>
                    {f.suffix}
                  </span>
                )}
              </div>
            )}
            {error && (
              <p id={`${f.name}-error`} className='text-destructive text-xs'>
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProjectForm({
  project,
  initialValues,
  embedded = false,
  onCancel,
  onSaved,
  onDirtyChange
}: {
  project?: Project;
  initialValues?: Partial<ProjectInput>;
  embedded?: boolean;
  onCancel?: () => void;
  onSaved?: (project: Project, another: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const save = useSaveProject();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  function markDirty() {
    if (dirty) return;
    setDirty(true);
    onDirtyChange?.(true);
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    if (dirty && !window.confirm('Des modifications non enregistrées seront perdues. Quitter ?')) {
      return;
    }
    router.back();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const action = String(form.get('__action') ?? 'save');
    const { input, errors: nextErrors } = buildInput(form, project, initialValues);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      document.getElementById(first)?.focus();
      toast.error(nextErrors[first]);
      return;
    }

    setErrors({});
    save.mutate(input, {
      onSuccess: (saved) => {
        setDirty(false);
        onDirtyChange?.(false);
        toast.success(project ? 'Marché mis à jour' : 'Marché créé');
        if (onSaved) {
          onSaved(saved, action === 'another');
          if (action === 'another') formEl.reset();
        } else {
          router.push(`/dashboard/marches/${encodeURIComponent(saved.id)}`);
        }
      },
      onError: (err) => toast.error(`Erreur : ${err.message}`)
    });
  }

  const typeOptions = [...TYPES_TRAVAUX] as string[];
  const currentType = initialValues?.type ?? project?.type;
  if (currentType && !typeOptions.includes(currentType)) typeOptions.unshift(currentType);
  const statusOptions = [...STATUTS] as string[];
  const currentStatus = initialValues?.status ?? project?.status;
  if (currentStatus && !statusOptions.includes(currentStatus)) statusOptions.unshift(currentStatus);

  const statusCard = (
    <div className='grid gap-4 sm:grid-cols-2'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='status'>Étape</Label>
        <NativeSelect
          id='status'
          name='status'
          defaultValue={currentStatus ?? 'En étude'}
          className='w-full'
        >
          {statusOptions.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {s}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='type'>Type de travaux</Label>
        <NativeSelect id='type' name='type' defaultValue={currentType ?? ''} className='w-full'>
          <NativeSelectOption value=''>—</NativeSelectOption>
          {typeOptions.map((t) => (
            <NativeSelectOption key={t} value={t}>
              {t}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );

  return (
    <form
      onSubmit={onSubmit}
      onInput={markDirty}
      onChange={markDirty}
      className={cn('flex flex-col gap-4', !embedded && 'pb-24 md:pb-4')}
      noValidate
    >
      {embedded ? (
        <section className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <span className='bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-semibold'>
              1
            </span>
            <h3 className='text-sm font-semibold'>Statut & type</h3>
          </div>
          {statusCard}
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Statut</CardTitle>
          </CardHeader>
          <CardContent>{statusCard}</CardContent>
        </Card>
      )}

      {SECTIONS.map((section, index) => {
        const fields = (
          <FieldGrid
            section={section}
            project={project}
            initialValues={initialValues}
            errors={errors}
          />
        );

        if (!embedded) {
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>{fields}</CardContent>
            </Card>
          );
        }

        if (index === 0) {
          return (
            <section key={section.title} className='flex flex-col gap-3'>
              <div className='flex items-center gap-2'>
                <span className='bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-semibold'>
                  2
                </span>
                <h3 className='text-sm font-semibold'>{section.title}</h3>
              </div>
              {fields}
            </section>
          );
        }

        return (
          <details
            key={section.title}
            className='group rounded-xl border bg-card/50 open:bg-card'
            open={index === 1}
          >
            <summary className='flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden'>
              <span className='flex items-center gap-2'>
                <span className='text-muted-foreground w-5 text-xs tabular-nums'>{index + 2}.</span>
                {section.title}
              </span>
              <Icons.chevronDown className='text-muted-foreground size-4 transition-transform group-open:rotate-180' />
            </summary>
            <div className='border-t px-3 py-4'>{fields}</div>
          </details>
        );
      })}

      <div
        className={cn(
          'flex flex-wrap gap-2',
          embedded
            ? 'sticky bottom-0 z-10 -mx-5 border-t bg-background/95 px-5 py-3 backdrop-blur'
            : 'bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t p-3 backdrop-blur md:static md:justify-end md:border-0 md:bg-transparent md:p-0'
        )}
      >
        <Button
          type='button'
          variant='outline'
          size='lg'
          className='flex-1 md:flex-none'
          onClick={handleCancel}
          disabled={save.isPending}
        >
          Annuler
        </Button>
        {embedded && (
          <Button
            type='submit'
            name='__action'
            value='another'
            variant='outline'
            size='lg'
            className='w-full sm:w-auto sm:flex-1 md:flex-none'
            disabled={save.isPending}
          >
            <Icons.add /> Enregistrer et créer un autre
          </Button>
        )}
        <Button
          type='submit'
          name='__action'
          value='save'
          size='lg'
          className='flex-1 md:flex-none'
          disabled={save.isPending}
        >
          {save.isPending ? 'Enregistrement…' : project ? 'Enregistrer' : 'Créer le marché'}
        </Button>
      </div>
    </form>
  );
}
