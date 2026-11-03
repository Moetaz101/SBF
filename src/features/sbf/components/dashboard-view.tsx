'use client';

import Link from 'next/link';
import { Icons } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SBF_CONFIG } from '@/config/sbf';
import { useProjects } from '@/lib/sbf/api';
import { groupAmount, kpiChecks, portfolioStats, santeDelai } from '@/lib/sbf/calc';
import { formatDTCompact, formatDateTimeFr, formatPct } from '@/lib/sbf/format';
import type { Project } from '@/lib/sbf/types';
import { useToday } from '@/lib/sbf/use-today';
import { SanteBadge, StatusBadge } from './badges';
import { KpiCard } from './kpi-card';

export function DashboardView() {
  const { data: projects, isLoading, error } = useProjects();
  const today = useToday();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorBox message={error.message} />;
  if (!projects?.length) return <EmptyDashboard />;

  const s = portfolioStats(projects, today);
  const alertes = projects
    .map((p) => ({
      p,
      sante: santeDelai(p, today),
      ko: kpiChecks(p, today).filter((c) => c.ok === false)
    }))
    .filter((x) => x.sante === 'retard' || x.sante === 'attention' || x.ko.length > 0)
    .slice(0, 8);

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Contrats en cours (HT)'
          value={formatDTCompact(s.montantActifs)}
          hint={`${s.actifs.length} marché${s.actifs.length > 1 ? 's' : ''}`}
        />
        <KpiCard
          label='Reste à réaliser'
          value={formatDTCompact(s.carnet)}
          hint='Carnet de commandes'
        />
        <KpiCard
          label='Marge prévue'
          value={formatDTCompact(s.margePrevue)}
          hint={`Moyenne ${formatPct(s.margeMoyenne)} · objectif ${SBF_CONFIG.margeObjectif} %`}
          tone={
            s.margeMoyenne === null
              ? 'default'
              : s.margeMoyenne >= SBF_CONFIG.margeObjectif
                ? 'good'
                : 'warn'
          }
        />
        <KpiCard
          label='Résultat réel à date'
          value={formatDTCompact(s.resultat)}
          hint={`Facturé ${formatDTCompact(s.facture)} · coûts ${formatDTCompact(s.couts)}`}
          tone={s.facture || s.couts ? (s.resultat >= 0 ? 'good' : 'bad') : 'default'}
        />
        <KpiCard
          label='Offres en attente'
          value={formatDTCompact(s.montantOffres)}
          hint={`${s.offres.length} offre${s.offres.length > 1 ? 's' : ''} en étude / remise`}
        />
        <KpiCard
          label='Taux de réussite'
          value={formatPct(s.tauxReussite, 0)}
          hint={`${s.nbGagnes} gagné${s.nbGagnes > 1 ? 's' : ''} · ${s.nbPerdus} perdu${s.nbPerdus > 1 ? 's' : ''}`}
        />
        <KpiCard
          label='Chantiers en retard'
          value={s.enRetard.length}
          hint={`${s.aSurveiller.length} à surveiller`}
          tone={s.enRetard.length ? 'bad' : s.aSurveiller.length ? 'warn' : 'good'}
        />
        <KpiCard
          label='KPI non respectés'
          value={s.kpiKo.length}
          hint={`sur ${s.total} marché${s.total > 1 ? 's' : ''}`}
          tone={s.kpiKo.length ? 'warn' : 'good'}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Points d&apos;attention</CardTitle>
          </CardHeader>
          <CardContent>
            {alertes.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                Aucune alerte. Tous les KPI sont respectés 👍
              </p>
            ) : (
              <ul className='divide-y'>
                {alertes.map(({ p, sante, ko }) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/marches/${encodeURIComponent(p.id)}`}
                      className='hover:bg-muted/50 -mx-2 flex flex-col gap-1 rounded-md px-2 py-2.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate text-sm font-medium'>{p.name}</span>
                        <SanteBadge sante={sante} />
                      </div>
                      {ko.length > 0 && (
                        <span className='text-muted-foreground text-xs'>
                          {ko.map((c) => c.label).join(' · ')}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières mises à jour</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='divide-y'>
              {projects.slice(0, 6).map((p) => (
                <ProjectRow key={p.id} p={p} />
              ))}
            </ul>
          </CardContent>
        </Card>

        <AmountBars
          title='Montant HT par type de travaux'
          data={groupAmount(projects, (p) => p.type)}
        />
        <AmountBars
          title='Montant HT par client'
          data={groupAmount(projects, (p) => p.client).slice(0, 8)}
        />
      </div>
    </div>
  );
}

function ProjectRow({ p }: { p: Project }) {
  return (
    <li>
      <Link
        href={`/dashboard/marches/${encodeURIComponent(p.id)}`}
        className='hover:bg-muted/50 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5'
      >
        <div className='min-w-0'>
          <div className='truncate text-sm font-medium'>{p.name}</div>
          <div className='text-muted-foreground truncate text-xs'>
            {p.client ?? '—'} · modifié {formatDateTimeFr(p.updated_at)}
          </div>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1'>
          <span className='text-sm font-medium tabular-nums'>{formatDTCompact(p.amount_ht)}</span>
          <StatusBadge status={p.status} />
        </div>
      </Link>
    </li>
  );
}

function AmountBars({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {data.map((d) => (
          <div key={d.name} className='flex flex-col gap-1'>
            <div className='flex justify-between gap-2 text-sm'>
              <span className='truncate'>{d.name}</span>
              <span className='font-medium tabular-nums'>{formatDTCompact(d.value)}</span>
            </div>
            <div className='bg-muted h-2 overflow-hidden rounded-full'>
              <div
                className='bg-primary h-full rounded-full'
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
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
            Importez votre fichier JSON existant ou créez votre premier marché.
          </p>
        </div>
        <div className='flex flex-wrap justify-center gap-2'>
          <Link href='/dashboard/import' className={buttonVariants({ variant: 'outline' })}>
            <Icons.upload /> Importer le JSON
          </Link>
          <Link href='/dashboard/marches/nouveau' className={buttonVariants()}>
            <Icons.add /> Nouveau marché
          </Link>
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
            ? "Les tables n'existent pas encore dans Supabase. Exécutez le fichier supabase/migrations/0001_sbf_pulse.sql dans le SQL Editor."
            : message}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className='h-24 rounded-xl' />
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <Skeleton className='h-64 rounded-xl' />
        <Skeleton className='h-64 rounded-xl' />
      </div>
    </div>
  );
}
