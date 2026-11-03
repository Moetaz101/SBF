'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { SBF_CONFIG, STATUTS, TYPES_TRAVAUX } from '@/config/sbf';
import { useSaveProject } from '@/lib/sbf/api';
import { parseNumber } from '@/lib/sbf/format';
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
      { name: 'description', label: 'Description', kind: 'textarea', full: true }
    ]
  },
  {
    title: 'Client & site',
    fields: [
      { name: 'client', label: 'Client / Maître d’ouvrage', placeholder: 'OMMP, Saïda…' },
      { name: 'location', label: 'Lieu', placeholder: 'Ben Arous / Radès' },
      { name: 'surf_terrain', label: 'Surface terrain', kind: 'number', suffix: 'm²' },
      { name: 'surf_couverte', label: 'Surface couverte', kind: 'number', suffix: 'm²' }
    ]
  },
  {
    title: 'Montants & marge',
    fields: [
      { name: 'amount_ht', label: 'Montant HT', kind: 'number', suffix: 'DT' },
      {
        name: 'amount_ttc',
        label: `Montant TTC (vide = HT + ${SBF_CONFIG.tauxTva} %)`,
        kind: 'number',
        suffix: 'DT'
      },
      { name: 'margin', label: 'Marge prévue', kind: 'number', suffix: '%' },
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
    title: 'Suivi d’exécution',
    fields: [
      { name: 'avancement', label: 'Avancement physique', kind: 'number', suffix: '%' },
      {
        name: 'montant_facture',
        label: 'Décomptes facturés (cumul HT)',
        kind: 'number',
        suffix: 'DT'
      },
      { name: 'cout_reel', label: 'Coûts réels (cumul)', kind: 'number', suffix: 'DT' }
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
  },
  {
    title: 'Notes',
    fields: [{ name: 'notes', label: 'Notes internes', kind: 'textarea', full: true }]
  }
];

const NUMBER_DEFAULT_ZERO = new Set(['avancement', 'montant_facture', 'cout_reel']);

function defaultValue(project: Project | undefined, name: keyof ProjectInput) {
  const v = project?.[name as keyof Project];
  if (v === null || v === undefined) return '';
  return String(v);
}

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const save = useSaveProject();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: Record<string, unknown> = {
      id: project?.id,
      status: String(form.get('status') || 'En étude'),
      type: String(form.get('type') || '') || null,
      extra: project?.extra ?? {}
    };

    for (const section of SECTIONS) {
      for (const f of section.fields) {
        const raw = String(form.get(f.name) ?? '').trim();
        if (f.kind === 'number') {
          const n = parseNumber(raw);
          input[f.name] = n ?? (NUMBER_DEFAULT_ZERO.has(f.name) ? 0 : null);
        } else {
          input[f.name] = raw || null;
        }
      }
    }

    const avancement = input.avancement as number;
    if (avancement < 0 || avancement > 100) {
      toast.error('L’avancement doit être entre 0 et 100 %.');
      return;
    }

    save.mutate(input as ProjectInput, {
      onSuccess: (saved) => {
        toast.success(project ? 'Marché mis à jour' : 'Marché créé');
        router.push(`/dashboard/marches/${encodeURIComponent(saved.id)}`);
      },
      onError: (err) => toast.error(`Erreur : ${err.message}`)
    });
  }

  const typeOptions = [...TYPES_TRAVAUX] as string[];
  if (project?.type && !typeOptions.includes(project.type)) typeOptions.unshift(project.type);
  const statusOptions = [...STATUTS] as string[];
  if (project?.status && !statusOptions.includes(project.status))
    statusOptions.unshift(project.status);

  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-4 pb-24 md:pb-4'>
      <Card>
        <CardHeader>
          <CardTitle>Statut</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='status'>Étape</Label>
            <NativeSelect
              id='status'
              name='status'
              defaultValue={project?.status ?? 'En étude'}
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
            <NativeSelect
              id='type'
              name='type'
              defaultValue={project?.type ?? ''}
              className='w-full'
            >
              <NativeSelectOption value=''>—</NativeSelectOption>
              {typeOptions.map((t) => (
                <NativeSelectOption key={t} value={t}>
                  {t}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            {section.fields.map((f) => (
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
                    defaultValue={defaultValue(project, f.name)}
                    rows={3}
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
                      defaultValue={defaultValue(project, f.name)}
                      className={f.suffix ? 'h-10 pr-14' : 'h-10'}
                    />
                    {f.suffix && (
                      <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs'>
                        {f.suffix}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className='bg-background/95 fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t p-3 backdrop-blur md:static md:justify-end md:border-0 md:bg-transparent md:p-0'>
        <Button
          type='button'
          variant='outline'
          size='lg'
          className='flex-1 md:flex-none'
          onClick={() => router.back()}
        >
          Annuler
        </Button>
        <Button type='submit' size='lg' className='flex-1 md:flex-none' disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
