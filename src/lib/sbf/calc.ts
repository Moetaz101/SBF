import { SBF_CONFIG, STATUTS_ACTIFS, STATUTS_EN_COURS_OFFRE, STATUTS_GAGNES } from '@/config/sbf';
import { parseISODate } from './format';
import type { Project } from './types';

const DAY = 24 * 60 * 60 * 1000;

function addMonths(date: Date, months: number) {
  const whole = Math.trunc(months);
  const d = new Date(date);
  d.setMonth(d.getMonth() + whole);
  const fraction = months - whole;
  if (fraction) d.setDate(d.getDate() + Math.round(fraction * 30));
  return d;
}

/** Montant TTC : saisi, sinon HT × (1 + TVA) */
export function montantTTC(p: Project) {
  if (p.amount_ttc) return p.amount_ttc;
  if (p.amount_ht) return p.amount_ht * (1 + SBF_CONFIG.tauxTva / 100);
  return null;
}

/** Marge prévue en DT = HT × marge % */
export function margePrevueDT(p: Project) {
  if (!p.amount_ht || p.margin === null || p.margin === undefined) return null;
  return (p.amount_ht * p.margin) / 100;
}

export function montantAvance(p: Project) {
  const ttc = montantTTC(p);
  if (!ttc || !p.avance) return null;
  return (ttc * p.avance) / 100;
}

export function montantRetenue(p: Project) {
  const ttc = montantTTC(p);
  if (!ttc || !p.retenue_garantie) return null;
  return (ttc * p.retenue_garantie) / 100;
}

/** Résultat réel à date = facturé − coûts réels */
export function resultatReel(p: Project) {
  if (!p.montant_facture && !p.cout_reel) return null;
  return (p.montant_facture ?? 0) - (p.cout_reel ?? 0);
}

/** Marge réelle % = (facturé − coûts) / facturé */
export function margeReellePct(p: Project) {
  if (!p.montant_facture) return null;
  return ((p.montant_facture - (p.cout_reel ?? 0)) / p.montant_facture) * 100;
}

/** Reste à réaliser (carnet de commandes) = HT × (1 − avancement) */
export function resteARealiser(p: Project) {
  if (!p.amount_ht) return 0;
  return p.amount_ht * (1 - (p.avancement ?? 0) / 100);
}

export function dateFinClient(p: Project) {
  const os = parseISODate(p.date_os);
  if (!os || !p.duree_client) return null;
  return addMonths(os, p.duree_client);
}

export function dateFinSbf(p: Project) {
  const os = parseISODate(p.date_os);
  if (!os || !p.duree_sbf) return null;
  return addMonths(os, p.duree_sbf);
}

/** % du délai contractuel déjà consommé */
export function tempsEcoulePct(p: Project, today = new Date()) {
  const os = parseISODate(p.date_os);
  const fin = dateFinClient(p);
  if (!os || !fin) return null;
  const total = fin.getTime() - os.getTime();
  if (total <= 0) return null;
  const pct = ((today.getTime() - os.getTime()) / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function joursRestants(p: Project, today = new Date()) {
  const fin = dateFinClient(p);
  if (!fin) return null;
  return Math.ceil((fin.getTime() - today.getTime()) / DAY);
}

export type Sante = 'ok' | 'attention' | 'retard' | 'na';

/** État d'avancement d'un marché en exécution */
export function santeDelai(p: Project, today = new Date()): Sante {
  if (p.status !== 'En exécution') return 'na';
  const fin = dateFinClient(p);
  if (fin && today > fin && (p.avancement ?? 0) < 100) return 'retard';
  const temps = tempsEcoulePct(p, today);
  if (temps === null) return 'na';
  if (temps - (p.avancement ?? 0) > SBF_CONFIG.toleranceAvancement) return 'attention';
  return 'ok';
}

export interface KpiCheck {
  label: string;
  ok: boolean | null; // null = donnée manquante
  detail: string;
}

/** Contrôle des KPI internes d'un marché */
export function kpiChecks(p: Project, today = new Date()): KpiCheck[] {
  const checks: KpiCheck[] = [];

  checks.push({
    label: `Marge prévue ≥ ${SBF_CONFIG.margeObjectif} %`,
    ok: p.margin === null ? null : p.margin >= SBF_CONFIG.margeObjectif,
    detail: p.margin === null ? 'Marge non renseignée' : `Marge prévue : ${p.margin} %`
  });

  checks.push({
    label: 'Objectif SBF ≤ délai client',
    ok: p.duree_sbf && p.duree_client ? p.duree_sbf <= p.duree_client : null,
    detail:
      p.duree_sbf && p.duree_client
        ? `${p.duree_sbf} vs ${p.duree_client} ${SBF_CONFIG.uniteDelai}`
        : 'Délais non renseignés'
  });

  if (p.status === 'En exécution') {
    const sante = santeDelai(p, today);
    const temps = tempsEcoulePct(p, today);
    checks.push({
      label: 'Avancement conforme au planning',
      ok: sante === 'na' ? null : sante === 'ok',
      detail:
        temps === null
          ? 'Date OS ou délai manquant'
          : `Avancement ${Math.round(p.avancement ?? 0)} % pour ${Math.round(temps)} % du délai écoulé`
    });

    const mr = margeReellePct(p);
    checks.push({
      label: 'Marge réelle ≥ marge prévue',
      ok: mr === null || p.margin === null ? null : mr >= p.margin,
      detail:
        mr === null
          ? 'Aucun décompte saisi'
          : `Marge réelle : ${mr.toFixed(1)} % (prévue ${p.margin ?? '—'} %)`
    });
  }

  return checks;
}

const sum = (list: Project[], fn: (p: Project) => number | null) =>
  list.reduce((acc, p) => acc + (fn(p) ?? 0), 0);

/** Indicateurs globaux du tableau de bord */
export function portfolioStats(projects: Project[], today = new Date()) {
  const actifs = projects.filter((p) => STATUTS_ACTIFS.includes(p.status));
  const offres = projects.filter((p) => STATUTS_EN_COURS_OFFRE.includes(p.status));
  const gagnes = projects.filter((p) => STATUTS_GAGNES.includes(p.status));
  const perdus = projects.filter((p) => p.status === 'Perdu');

  const montantActifs = sum(actifs, (p) => p.amount_ht);
  const margePrevue = sum(actifs, margePrevueDT);
  const facture = sum(projects, (p) => p.montant_facture);
  const couts = sum(projects, (p) => p.cout_reel);

  const enRetard = projects.filter((p) => santeDelai(p, today) === 'retard');
  const aSurveiller = projects.filter((p) => santeDelai(p, today) === 'attention');
  const kpiKo = projects.filter((p) => kpiChecks(p, today).some((c) => c.ok === false));

  const decides = gagnes.length + perdus.length;

  return {
    total: projects.length,
    actifs,
    offres,
    montantActifs,
    montantOffres: sum(offres, (p) => p.amount_ht),
    carnet: sum(actifs, resteARealiser),
    margePrevue,
    margeMoyenne: montantActifs ? (margePrevue / montantActifs) * 100 : null,
    facture,
    couts,
    resultat: facture - couts,
    tauxReussite: decides ? (gagnes.length / decides) * 100 : null,
    nbGagnes: gagnes.length,
    nbPerdus: perdus.length,
    enRetard,
    aSurveiller,
    kpiKo
  };
}

/** Regroupe un montant HT par clé (type, client…) */
export function groupAmount(projects: Project[], key: (p: Project) => string | null) {
  const map = new Map<string, number>();
  for (const p of projects) {
    const k = key(p) || 'Non renseigné';
    map.set(k, (map.get(k) ?? 0) + (p.amount_ht ?? 0));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .toSorted((a, b) => b.value - a.value);
}
