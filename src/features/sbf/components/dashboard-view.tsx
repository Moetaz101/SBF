'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { SBF_CONFIG } from '@/config/sbf';
import { useProjects } from '@/lib/sbf/api';
import { portfolioStats, santeDelai } from '@/lib/sbf/calc';
import { formatDTCompact, formatPct } from '@/lib/sbf/format';
import {
  carnetOffresSeries,
  carnetTrend,
  lostOffersTrend,
  pendingOffersTrend,
  pipelineByStatus,
  resultSeries,
  winRateSeries,
  winRateTrend
} from '@/lib/sbf/trends';
import { useToday } from '@/lib/sbf/use-today';
import { DashboardMap } from './dashboard-map';
import { KpiCard } from './kpi-card';
import { NewProjectButton } from './new-project-button';

const PERIODS = [
  { value: 3, label: '3 mois' },
  { value: 6, label: '6 mois' },
  { value: 12, label: '12 mois' },
  { value: 24, label: '24 mois' }
] as const;

/**
 * Recharts is large, and none of it is needed to paint the KPI cards or the
 * lists. Loading the chart widgets in their own chunk keeps the dashboard's
 * first paint and hydration light.
 */
const AreaSeriesChart = dynamic(
  () => import('./dashboard-charts').then((mod) => mod.AreaSeriesChart),
  { ssr: false, loading: () => <Skeleton className='h-64 w-full rounded-lg' /> }
);
const StatusDonut = dynamic(() => import('./dashboard-charts').then((mod) => mod.StatusDonut), {
  ssr: false,
  loading: () => <Skeleton className='h-80 rounded-xl' />
});
const TopProjects = dynamic(() => import('./dashboard-charts').then((mod) => mod.TopProjects), {
  ssr: false,
  loading: () => <Skeleton className='h-80 rounded-xl' />
});

export function DashboardView() {
  const { data: projects, isLoading, error } = useProjects();
  const today = useToday();
  const router = useRouter();
  const [period, setPeriod] = useState<number>(12);
  const [statusMetric, setStatusMetric] = useState<'count' | 'amount'>('count');

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorBox message={error.message} />;
  if (!projects?.length) return <EmptyDashboard />;

  const s = portfolioStats(projects, today);

  const trends = {
    carnet: carnetTrend(projects, today),
    offres: pendingOffersTrend(projects, today),
    perdues: lostOffersTrend(projects, today),
    taux: winRateTrend(projects, today)
  };

  const carnetData = carnetOffresSeries(projects, today, period);
  const winData = winRateSeries(projects, today, period);
  const resultData = resultSeries(projects, today, period);

  const statusData = pipelineByStatus(projects).filter((row) => row.count > 0);
  const statusTotal = statusData.reduce(
    (sum, row) => sum + (statusMetric === 'count' ? row.count : row.amount),
    0
  );

  const top5 = projects
    .filter((p) => (p.amount_ht ?? 0) > 0)
    .toSorted((a, b) => (b.amount_ht ?? 0) - (a.amount_ht ?? 0))
    .slice(0, 5)
    .map((p) => {
      const label = p.name.length > 24 ? `${p.name.slice(0, 24)}…` : p.name;
      return {
        id: p.id,
        name: label.replaceAll(' ', '\u00A0'),
        value: Number(((p.amount_ht ?? 0) / 1_000_000).toFixed(2)),
        status: p.status
      };
    });

  const santeOk = projects.filter((p) => santeDelai(p, today) === 'ok').length;

  const openStatus = (status: string) =>
    router.push(`/dashboard/marches?status=${encodeURIComponent(status)}`);

  return (
    <div className='flex flex-col gap-4'>
      <div className='bg-card flex flex-col gap-3 rounded-xl p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase'>
            Période
          </span>
          <NativeSelect
            value={String(period)}
            onChange={(e) => setPeriod(Number(e.target.value))}
            size='sm'
            aria-label='Période des graphiques'
          >
            {PERIODS.map((p) => (
              <NativeSelectOption key={p.value} value={String(p.value)}>
                {p.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <span className='text-muted-foreground hidden text-xs sm:inline'>
            Évolution du portefeuille
          </span>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link
            href='/dashboard/import'
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Icons.upload /> Importer
          </Link>
          <NewProjectButton triggerSize='sm' />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Carnet de commandes (HT)'
          value={formatDTCompact(s.montantActifs)}
          hint={`TTC ${formatDTCompact(s.montantActifsTTC)} · ${s.actifs.length} affaire(s) active(s)`}
          variant='indigo'
          icon={Icons.briefcase}
          trend={trends.carnet}
        />
        <KpiCard
          label='Offres en attente (HT)'
          value={formatDTCompact(s.montantOffres)}
          hint={`TTC ${formatDTCompact(s.montantOffresTTC)} · ${s.offres.length} offre(s)`}
          variant='amber'
          icon={Icons.hourglass}
          trend={trends.offres}
        />
        <KpiCard
          label='Offres perdues'
          value={formatDTCompact(s.montantPerdus)}
          hint={`TTC ${formatDTCompact(s.montantPerdusTTC)} · ${s.nbPerdus} non attribuée(s)`}
          tone={s.nbPerdus ? 'warn' : 'default'}
          variant='rose'
          icon={Icons.fileX}
          trend={trends.perdues}
        />
        <KpiCard
          label='Taux d’acceptation'
          value={formatPct(s.tauxReussite, 0)}
          hint={`Objectif ${SBF_CONFIG.objectifTauxReussite} % · ${s.nbGagnes}/${s.nbGagnes + s.nbPerdus} évalués`}
          tone={
            s.tauxReussite === null
              ? 'default'
              : s.tauxReussite >= SBF_CONFIG.objectifTauxReussite
                ? 'good'
                : 'warn'
          }
          variant='violet'
          icon={Icons.targetArrow}
          trend={trends.taux}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
        <ChartCard
          title='Carnet vs offres en attente'
          description={`Montants HT cumulés sur ${period} mois`}
        >
          <AreaSeriesChart
            data={carnetData}
            series={[
              {
                key: 'carnet',
                label: 'Carnet',
                color: 'var(--chart-info)',
                gradientId: 'fillCarnet'
              },
              {
                key: 'offres',
                label: 'Offres en attente',
                color: 'var(--chart-warning)',
                gradientId: 'fillOffres'
              }
            ]}
            yTickFormatter={(value) => formatDTCompact(value).replace(' DT', '')}
            tooltipFormatter={(value) => formatDTCompact(Number(value))}
          />
        </ChartCard>

        <ChartCard
          title='Taux d’acceptation'
          description={`Objectif ${SBF_CONFIG.objectifTauxReussite} % · ${s.nbGagnes} gagné(s) / ${s.nbGagnes + s.nbPerdus} évalué(s)`}
        >
          <AreaSeriesChart
            data={winData}
            series={[
              {
                key: 'taux',
                label: 'Taux d’acceptation',
                color: 'var(--chart-violet)',
                gradientId: 'fillTaux'
              }
            ]}
            yTickFormatter={(value) => `${value} %`}
            tooltipFormatter={(value) => formatPct(Number(value), 1)}
            target={{
              value: SBF_CONFIG.objectifTauxReussite,
              label: `Objectif ${SBF_CONFIG.objectifTauxReussite} %`
            }}
          />
        </ChartCard>

        <ChartCard
          title='Résultat réel cumulé'
          description='Facturé, coûts et résultat des marchés gagnés'
        >
          <AreaSeriesChart
            data={resultData}
            series={[
              {
                key: 'facture',
                label: 'Facturé',
                color: 'var(--chart-info)',
                gradientId: 'fillFacture'
              },
              {
                key: 'couts',
                label: 'Coûts',
                color: 'var(--chart-warning)',
                gradientId: 'fillCouts'
              },
              {
                key: 'resultat',
                label: 'Résultat',
                color: 'var(--chart-positive)',
                gradientId: 'fillResultat'
              }
            ]}
            yTickFormatter={(value) => formatDTCompact(value).replace(' DT', '')}
            tooltipFormatter={(value) => formatDTCompact(Number(value))}
          />
        </ChartCard>
      </div>

      <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
        <StatusDonut
          data={statusData}
          metric={statusMetric}
          onMetricChange={setStatusMetric}
          total={statusTotal}
          onSelect={openStatus}
        />

        <TopProjects
          data={top5}
          onSelect={(id) => router.push(`/dashboard/marches/${encodeURIComponent(id)}`)}
        />

        <DelayHealth ok={santeOk} attention={s.aSurveiller.length} late={s.enRetard.length} />
      </div>

      <DashboardMap projects={projects} />
    </div>
  );
}

function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className='text-muted-foreground text-xs'>{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DelayHealth({ ok, attention, late }: { ok: number; attention: number; late: number }) {
  const total = ok + attention + late;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Santé des délais</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex items-end justify-between gap-2'>
          <div>
            <span className='text-3xl font-semibold tabular-nums'>{late}</span>
            <span className='text-muted-foreground text-sm'> en retard</span>
          </div>
          <Link
            href='/dashboard/marches?status=En%20ex%C3%A9cution'
            className='text-muted-foreground text-xs hover:underline'
          >
            Voir les chantiers
          </Link>
        </div>
        <div className='bg-muted flex h-3 overflow-hidden rounded-full'>
          {total > 0 && (
            <>
              <div
                style={{
                  width: `${(ok / total) * 100}%`,
                  backgroundColor: 'var(--chart-positive)'
                }}
              />
              <div
                style={{
                  width: `${(attention / total) * 100}%`,
                  backgroundColor: 'var(--chart-warning)'
                }}
              />
              <div
                style={{
                  width: `${(late / total) * 100}%`,
                  backgroundColor: 'var(--chart-negative)'
                }}
              />
            </>
          )}
        </div>
        <div className='grid grid-cols-3 gap-2 text-center'>
          <div>
            <div className='text-lg font-semibold' style={{ color: 'var(--chart-positive)' }}>
              {ok}
            </div>
            <div className='text-muted-foreground text-[11px]'>Dans les délais</div>
          </div>
          <div>
            <div className='text-lg font-semibold' style={{ color: 'var(--chart-warning)' }}>
              {attention}
            </div>
            <div className='text-muted-foreground text-[11px]'>À surveiller</div>
          </div>
          <div>
            <div className='text-lg font-semibold' style={{ color: 'var(--chart-negative)' }}>
              {late}
            </div>
            <div className='text-muted-foreground text-[11px]'>En retard</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyDashboard() {
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-4 py-10 text-center'>
        <Icons.workspace className='text-muted-foreground size-10' />
        <div>
          <p className='font-medium'>Aucun marché pour le moment</p>
          <p className='text-muted-foreground text-sm'>
            Importez votre fichier existant ou créez votre premier marché.
          </p>
        </div>
        <div className='flex flex-wrap justify-center gap-2'>
          <Link href='/dashboard/import' className={buttonVariants({ variant: 'outline' })}>
            <Icons.upload /> Importer
          </Link>
          <NewProjectButton />
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorBox({ message }: { message: string }) {
  const tableMissing = /relation|does not exist|schema cache/i.test(message);
  return (
    <Card>
      <CardContent className='flex flex-col gap-2 py-6'>
        <p className='text-destructive font-medium'>Impossible de charger les données</p>
        <p className='text-muted-foreground text-sm'>
          {tableMissing
            ? "Les tables n'existent pas encore dans Supabase. Exécutez les fichiers supabase/migrations/*.sql dans le SQL Editor."
            : message}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-14 rounded-xl' />
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-40 rounded-2xl sm:h-44' />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className='h-80 rounded-xl' />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
        <Skeleton className='h-80 rounded-xl' />
        <Skeleton className='h-80 rounded-xl' />
        <Skeleton className='h-80 rounded-xl' />
      </div>
    </div>
  );
}
