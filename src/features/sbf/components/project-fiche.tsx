'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SBF_CONFIG } from '@/config/sbf';
import { useDeleteProject, useProject } from '@/lib/sbf/api';
import {
  dateFinClient,
  dateFinSbf,
  joursRestants,
  kpiChecks,
  margePrevueDT,
  margeReellePct,
  montantAvance,
  montantRetenue,
  montantTTC,
  resteARealiser,
  resultatReel,
  santeDelai,
  tempsEcoulePct
} from '@/lib/sbf/calc';
import {
  formatDT,
  formatDateFr,
  formatDateTimeFr,
  formatNumber,
  formatPct
} from '@/lib/sbf/format';
import { useToday } from '@/lib/sbf/use-today';
import { cn } from '@/lib/utils';
import { SanteBadge, StatusBadge } from './badges';
import { ErrorBox } from './dashboard-view';
import { DocumentsPanel } from './documents-panel';
import { Field, KpiCard } from './kpi-card';
import { PlanningPanel } from './planning-panel';

const u = SBF_CONFIG.uniteDelai;

export function ProjectFiche({ id }: { id: string }) {
  const { data: p, isLoading, error } = useProject(id);
  const router = useRouter();
  const del = useDeleteProject();
  const today = useToday();

  if (isLoading) return <Skeleton className='h-96 rounded-xl' />;
  if (error) return <ErrorBox message={error.message} />;
  if (!p)
    return (
      <div className='py-10 text-center'>
        <p className='font-medium'>Marché introuvable</p>
        <Link href='/dashboard/marches' className={cn(buttonVariants({ variant: 'link' }))}>
          Retour à la liste
        </Link>
      </div>
    );

  const sante = santeDelai(p, today);
  const temps = tempsEcoulePct(p, today);
  const jours = joursRestants(p, today);
  const resultat = resultatReel(p);
  const mr = margeReellePct(p);
  const checks = kpiChecks(p, today);
  const extras = Object.entries(p.extra ?? {});

  function onDelete() {
    if (!p) return;
    if (!confirm(`Supprimer définitivement « ${p.name} » et ses documents ?`)) return;
    del.mutate(p.id, {
      onSuccess: () => {
        toast.success('Marché supprimé');
        router.replace('/dashboard/marches');
      },
      onError: (err) => toast.error(err.message)
    });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p?.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* En-tête */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='mb-2 flex flex-wrap items-center gap-2'>
            <StatusBadge status={p.status} />
            <SanteBadge sante={sante} />
            {p.type && <span className='text-muted-foreground text-xs'>{p.type}</span>}
          </div>
          <h1 className='text-xl leading-tight font-semibold sm:text-2xl'>{p.name}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {[p.client, p.location].filter(Boolean).join(' · ')}
          </p>
          {p.description && <p className='mt-2 text-sm'>{p.description}</p>}
        </div>
        <div className='flex shrink-0 gap-2'>
          <Button variant='outline' size='lg' onClick={share} aria-label='Partager'>
            <Icons.share />
          </Button>
          <Link
            href={`/dashboard/marches/${encodeURIComponent(p.id)}/modifier`}
            className={cn(buttonVariants({ size: 'lg' }), 'flex-1 sm:flex-none')}
          >
            <Icons.edit /> Modifier
          </Link>
        </div>
      </div>

      {/* Chiffres clés */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Montant HT'
          value={formatDT(p.amount_ht)}
          hint={`TTC ${formatDT(montantTTC(p))}`}
        />
        <KpiCard
          label='Marge prévue'
          value={formatPct(p.margin)}
          hint={formatDT(margePrevueDT(p))}
          tone={
            p.margin === null ? 'default' : p.margin >= SBF_CONFIG.margeObjectif ? 'good' : 'warn'
          }
        />
        <KpiCard
          label='Résultat réel à date'
          value={formatDT(resultat)}
          hint={mr === null ? 'Aucun décompte saisi' : `Marge réelle ${formatPct(mr)}`}
          tone={resultat === null ? 'default' : resultat >= 0 ? 'good' : 'bad'}
        />
        <KpiCard
          label='Remise de l’offre'
          value={formatDateFr(p.date_remise_offre)}
          hint={p.date_os ? `OS le ${formatDateFr(p.date_os)}` : 'OS non notifié'}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* KPI */}
        <Card>
          <CardHeader>
            <CardTitle>Contrôle des KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2'>
              {checks.map((c) => (
                <li key={c.label} className='flex items-start gap-2'>
                  {c.ok === true ? (
                    <Icons.circleCheck className='mt-0.5 size-5 shrink-0 text-emerald-500' />
                  ) : c.ok === false ? (
                    <Icons.circleX className='mt-0.5 size-5 shrink-0 text-red-500' />
                  ) : (
                    <Icons.help className='text-muted-foreground mt-0.5 size-5 shrink-0' />
                  )}
                  <div>
                    <div className='text-sm font-medium'>{c.label}</div>
                    <div className='text-muted-foreground text-xs'>{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Délais */}
        <Card>
          <CardHeader>
            <CardTitle>Délais &amp; avancement</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1'>
              <div className='flex justify-between text-sm'>
                <span>Avancement physique</span>
                <span className='font-medium tabular-nums'>{formatPct(p.avancement, 0)}</span>
              </div>
              <Progress value={p.avancement ?? 0} />
            </div>
            {temps !== null && (
              <div className='flex flex-col gap-1'>
                <div className='flex justify-between text-sm'>
                  <span>Délai consommé</span>
                  <span className='font-medium tabular-nums'>{formatPct(temps, 0)}</span>
                </div>
                <Progress value={temps} />
              </div>
            )}
            <dl>
              <Field label='Ordre de service'>{formatDateFr(p.date_os)}</Field>
              <Field label='Délai client'>
                {p.duree_client ? `${formatNumber(p.duree_client)} ${u}` : '—'}
              </Field>
              <Field label='Objectif SBF'>
                {p.duree_sbf ? `${formatNumber(p.duree_sbf)} ${u}` : '—'}
              </Field>
              <Field label='Fin contractuelle'>{formatDateFr(dateFinClient(p))}</Field>
              <Field label='Fin objectif SBF'>{formatDateFr(dateFinSbf(p))}</Field>
              {jours !== null && p.status === 'En exécution' && (
                <Field label='Jours restants'>
                  <span className={jours < 0 ? 'text-red-600' : undefined}>
                    {jours < 0 ? `${-jours} j de dépassement` : `${jours} j`}
                  </span>
                </Field>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Finances */}
        <Card>
          <CardHeader>
            <CardTitle>Finances</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label='Montant HT'>{formatDT(p.amount_ht)}</Field>
              <Field label='Montant TTC'>{formatDT(montantTTC(p))}</Field>
              <Field label='Coefficient de règlement'>{formatNumber(p.coef_reglement)}</Field>
              <Field label='Marge prévue'>
                {formatPct(p.margin)} · {formatDT(margePrevueDT(p))}
              </Field>
              <Field label='Décomptes facturés'>{formatDT(p.montant_facture)}</Field>
              <Field label='Coûts réels'>{formatDT(p.cout_reel)}</Field>
              <Field label='Résultat réel'>
                <span className={resultat !== null && resultat < 0 ? 'text-red-600' : undefined}>
                  {formatDT(resultat)}
                </span>
              </Field>
              <Field label='Reste à réaliser'>{formatDT(resteARealiser(p))}</Field>
            </dl>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Conditions contractuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label='Avance'>
                {p.avance ? `${formatPct(p.avance)} · ${formatDT(montantAvance(p))}` : '—'}
              </Field>
              <Field label='Retenue de garantie'>
                {p.retenue_garantie
                  ? `${formatPct(p.retenue_garantie)} · ${formatDT(montantRetenue(p))}`
                  : '—'}
              </Field>
              <Field label='Paiement'>{p.modalite_paiement}</Field>
              <Field label='Pénalités de retard'>{p.penalite_retard}</Field>
              <Field label='Surface terrain'>
                {p.surf_terrain ? `${formatNumber(p.surf_terrain)} m²` : '—'}
              </Field>
              <Field label='Surface couverte'>
                {p.surf_couverte ? `${formatNumber(p.surf_couverte)} m²` : '—'}
              </Field>
            </dl>
          </CardContent>
        </Card>

        {/* Intervenants */}
        <Card>
          <CardHeader>
            <CardTitle>Intervenants</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label='Chef de projet'>{p.chef_projet}</Field>
              <Field label='Architecte'>{p.architecte}</Field>
              <Field label='BET'>{p.bet}</Field>
              <Field label='Ingénieur conseil'>{p.ing_conseil}</Field>
              <Field label='Bureau de contrôle'>{p.bureau_controle}</Field>
            </dl>
          </CardContent>
        </Card>

        <DocumentsPanel projectId={p.id} />
      </div>

      <PlanningPanel project={p} />

      {(p.notes || extras.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes &amp; autres informations</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            {p.notes && <p className='text-sm whitespace-pre-wrap'>{p.notes}</p>}
            {extras.length > 0 && (
              <dl>
                {extras.map(([k, v]) => (
                  <Field key={k} label={k}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </Field>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 pb-4 text-xs'>
        <span>
          Réf. {p.id} · créé le {formatDateFr(p.created_at)} · modifié{' '}
          {formatDateTimeFr(p.updated_at)}
        </span>
        <Button variant='destructive' size='sm' onClick={onDelete} disabled={del.isPending}>
          <Icons.trash /> Supprimer le marché
        </Button>
      </div>
    </div>
  );
}
