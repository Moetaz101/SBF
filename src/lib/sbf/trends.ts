import {
  SBF_CONFIG,
  STATUTS,
  STATUTS_ACTIFS,
  STATUTS_EN_COURS_OFFRE,
  STATUTS_GAGNES,
  STATUTS_PERDUS
} from '@/config/sbf';
import { parseISODate } from './format';
import type { Project } from './types';

export const TREND_MONTHS = 8;

export type MonthBucket = {
  start: Date;
  end: Date;
  /** ISO month key, e.g. 2026-11 */
  month: string;
  /** Short French label, e.g. nov. */
  label: string;
};

export function monthBuckets(today: Date, count = TREND_MONTHS): MonthBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      start,
      end,
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleDateString('fr-FR', { month: 'short' })
    };
  });
}

function defaultDate(p: Project) {
  return p.date_remise_offre ?? p.date_os ?? p.created_at;
}

function beforeOrOn(value: string | null | undefined, end: Date) {
  const d = parseISODate(value);
  return d ? d <= end : false;
}

function cumulativeSeries(
  projects: Project[],
  today: Date,
  filter: (p: Project) => boolean,
  valueOf: (p: Project) => number,
  dateOf: (p: Project) => string | null | undefined = defaultDate,
  months = TREND_MONTHS
) {
  return monthBuckets(today, months).map(({ end }) =>
    projects.reduce((sum, p) => {
      if (!filter(p)) return sum;
      if (!beforeOrOn(dateOf(p), end)) return sum;
      return sum + valueOf(p);
    }, 0)
  );
}

/** Montant HT cumulé du carnet de commandes (affaires actives). */
export function carnetTrend(projects: Project[], today: Date, months = TREND_MONTHS) {
  return cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_ACTIFS.includes(p.status),
    (p) => p.amount_ht ?? 0,
    (p) => p.date_os ?? p.date_remise_offre ?? p.created_at,
    months
  );
}

/** Montant HT cumulé des offres en attente. */
export function pendingOffersTrend(projects: Project[], today: Date, months = TREND_MONTHS) {
  return cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_EN_COURS_OFFRE.includes(p.status),
    (p) => p.amount_ht ?? 0,
    defaultDate,
    months
  );
}

/** Montant HT cumulé des offres perdues. */
export function lostOffersTrend(projects: Project[], today: Date, months = TREND_MONTHS) {
  return cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_PERDUS.includes(p.status),
    (p) => p.amount_ht ?? 0,
    defaultDate,
    months
  );
}

/** Résultat réel cumulé (facturé − coûts) des affaires gagnées. */
export function resultTrend(projects: Project[], today: Date, months = TREND_MONTHS) {
  return cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_GAGNES.includes(p.status),
    (p) => (p.montant_facture ?? 0) - (p.cout_reel ?? 0),
    (p) => p.date_os ?? p.date_remise_offre ?? p.created_at,
    months
  );
}

/** Nombre cumulé de chantiers actuellement en retard. */
export function lateSitesTrend(
  projects: Project[],
  today: Date,
  lateIds: Set<string>,
  months = TREND_MONTHS
) {
  return cumulativeSeries(
    projects,
    today,
    (p) => lateIds.has(p.id),
    () => 1,
    (p) => p.date_os ?? p.date_remise_offre ?? p.created_at,
    months
  );
}

/** Nombre cumulé de marchés avec au moins un KPI non respecté. */
export function kpiFailuresTrend(
  projects: Project[],
  today: Date,
  failedIds: Set<string>,
  months = TREND_MONTHS
) {
  return cumulativeSeries(
    projects,
    today,
    (p) => failedIds.has(p.id),
    () => 1,
    (p) => p.date_os ?? p.date_remise_offre ?? p.created_at,
    months
  );
}

/** Taux d'acceptation cumulé sur les marchés évalués. */
export function winRateTrend(projects: Project[], today: Date, months = TREND_MONTHS) {
  const won = cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_GAGNES.includes(p.status),
    () => 1,
    defaultDate,
    months
  );
  const lost = cumulativeSeries(
    projects,
    today,
    (p) => STATUTS_PERDUS.includes(p.status),
    () => 1,
    defaultDate,
    months
  );

  return won.map((w, i) => {
    const total = w + lost[i];
    return total ? (w / total) * 100 : 0;
  });
}

/** Série prête pour l'area chart « carnet vs offres ». */
export function carnetOffresSeries(projects: Project[], today: Date, months = 12) {
  const carnet = carnetTrend(projects, today, months);
  const offres = pendingOffersTrend(projects, today, months);
  return monthBuckets(today, months).map(({ label }, i) => ({
    month: label,
    carnet: carnet[i] ?? 0,
    offres: offres[i] ?? 0
  }));
}

/** Série prête pour l'area chart du taux d'acceptation. */
export function winRateSeries(projects: Project[], today: Date, months = 12) {
  const taux = winRateTrend(projects, today, months);
  return monthBuckets(today, months).map(({ label }, i) => ({
    month: label,
    taux: taux[i] ?? 0,
    objectif: SBF_CONFIG.objectifTauxReussite
  }));
}

/** Série prête pour l'area chart « facturé / coûts / résultat ». */
export function resultSeries(projects: Project[], today: Date, months = 12) {
  return monthBuckets(today, months).map(({ end, label }) => {
    const gagnes = projects.filter(
      (p) => STATUTS_GAGNES.includes(p.status) && beforeOrOn(defaultDate(p), end)
    );
    const facture = gagnes.reduce((sum, p) => sum + (p.montant_facture ?? 0), 0);
    const couts = gagnes.reduce((sum, p) => sum + (p.cout_reel ?? 0), 0);
    return { month: label, facture, couts, resultat: facture - couts };
  });
}

/** Répartition par statut, en nombre et en montant HT. */
export function pipelineByStatus(projects: Project[]) {
  return STATUTS.map((status) => {
    const rows = projects.filter((p) => p.status === status);
    return {
      status,
      count: rows.length,
      amount: rows.reduce((sum, p) => sum + (p.amount_ht ?? 0), 0)
    };
  });
}

/** Offres dont la date de remise tombe dans les prochains jours. */
export function upcomingOffers(projects: Project[], today: Date, days = 30) {
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return projects
    .filter((p) => STATUTS_EN_COURS_OFFRE.includes(p.status) && p.date_remise_offre)
    .map((p) => ({ project: p, deadline: parseISODate(p.date_remise_offre) }))
    .filter(
      (row): row is { project: Project; deadline: Date } =>
        row.deadline !== null && row.deadline >= today && row.deadline <= limit
    )
    .toSorted((a, b) => a.deadline.getTime() - b.deadline.getTime());
}
