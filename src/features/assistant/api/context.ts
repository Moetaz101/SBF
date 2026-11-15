import {
  groupAmount,
  joursRestants,
  kpiChecks,
  margeReellePct,
  montantTTC,
  portfolioStats,
  santeDelai,
  tempsEcoulePct
} from '@/lib/sbf/calc';
import { planningStats } from '@/lib/sbf/planning';
import type { PlanningEntry, PlanningTask, Project } from '@/lib/sbf/types';
import { getSupabaseServer } from '@/lib/supabase/server';

const MAX_PROJECTS = 300;
const MAX_PLANNING_ENTRIES = 500;
const MAX_TASKS = 300;
const MAX_UPCOMING = 30;
const MAX_CLIENTS = 15;

function compactProject(project: Project, today: Date) {
  const finClientDans = joursRestants(project, today);
  const tempsEcoule = tempsEcoulePct(project, today);
  const margeReelle = margeReellePct(project);

  return {
    nom: project.name,
    code: project.code,
    client: project.client,
    ville: project.location,
    type: project.type,
    statut: project.status,
    mode_passation: project.passation_mode,
    chef_projet: project.chef_projet,
    montant_ht: project.amount_ht,
    montant_ttc: montantTTC(project),
    marge_prevue_pct: project.margin,
    marge_reelle_pct: margeReelle === null ? null : Number(margeReelle.toFixed(1)),
    avancement_pct: project.avancement,
    facture: project.montant_facture,
    cout_reel: project.cout_reel,
    resultat_reel: project.montant_facture - project.cout_reel,
    date_remise_offre: project.date_remise_offre,
    date_os: project.date_os,
    duree_client_mois: project.duree_client,
    duree_sbf_mois: project.duree_sbf,
    jours_restants_client: finClientDans,
    temps_ecoule_pct: tempsEcoule === null ? null : Number(tempsEcoule.toFixed(1)),
    sante_delai: santeDelai(project, today),
    notes: project.notes ? project.notes.slice(0, 600) : null
  };
}

function daysFromToday(isoDate: string | null, today: Date) {
  if (!isoDate) return null;
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Photographie compacte mais fidèle des données métier.
 * Elle est envoyée au modèle à chaque question : l'assistant ne répond donc
 * jamais « à l'aveugle », même si le client n'a pas encore chargé les données.
 */
export async function buildPlatformSnapshot() {
  const supabase = await getSupabaseServer();

  const [projectsResult, entriesResult, tasksResult] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, name, code, client, location, type, status, passation_mode, chef_projet, amount_ht, amount_ttc, margin, date_remise_offre, date_os, duree_client, duree_sbf, avancement, montant_facture, cout_reel, notes'
      )
      .order('updated_at', { ascending: false })
      .limit(MAX_PROJECTS),
    supabase
      .from('planning_entries')
      .select('id, project_id, code, category, name, client, start_date, end_date, decision')
      .order('start_date', { ascending: true })
      .limit(MAX_PLANNING_ENTRIES),
    supabase
      .from('planning_tasks')
      .select('id, project_id, title, start_date, end_date, progress, responsable')
      .order('start_date', { ascending: true })
      .limit(MAX_TASKS)
  ]);

  for (const result of [projectsResult, entriesResult, tasksResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const projects = (projectsResult.data ?? []) as Project[];
  const entries = (entriesResult.data ?? []) as PlanningEntry[];
  const tasks = (tasksResult.data ?? []) as PlanningTask[];
  const today = new Date();

  const stats = portfolioStats(projects, today);
  const entryStats = planningStats(entries);
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const projectCodes = new Map(projects.map((project) => [project.id, project.code]));
  const totalHt = projects.reduce((sum, project) => sum + (project.amount_ht ?? 0), 0);

  const withShare = (items: Array<{ name: string; value: number }>) =>
    items.map((item) => ({
      ...item,
      part_pct: totalHt ? Number(((item.value / totalHt) * 100).toFixed(1)) : null
    }));

  const upcomingDeadlines = projects
    .map((project) => ({
      nom: project.name,
      code: project.code,
      client: project.client,
      statut: project.status,
      date_remise_offre: project.date_remise_offre,
      jours_restants: daysFromToday(project.date_remise_offre, today),
      montant_ht: project.amount_ht
    }))
    .filter(
      (project) =>
        project.jours_restants !== null &&
        project.jours_restants >= -7 &&
        project.jours_restants <= 90
    )
    .toSorted((a, b) => (a.jours_restants ?? 0) - (b.jours_restants ?? 0))
    .slice(0, MAX_UPCOMING);

  const upcomingPlanning = entries
    .filter((entry) => entry.end_date >= today.toISOString().slice(0, 10))
    .slice(0, MAX_UPCOMING)
    .map((entry) => ({
      code: entry.code,
      nom: entry.name,
      client: entry.client,
      categorie: entry.category,
      debut: entry.start_date,
      fin: entry.end_date,
      decision: entry.decision,
      marche_lie: entry.project_id ? (projectNames.get(entry.project_id) ?? null) : null
    }));

  const openTasks = tasks
    .filter((task) => task.progress < 100)
    .slice(0, MAX_UPCOMING)
    .map((task) => ({
      titre: task.title,
      projet: projectNames.get(task.project_id) ?? null,
      code_projet: projectCodes.get(task.project_id) ?? null,
      debut: task.start_date,
      fin: task.end_date,
      avancement_pct: task.progress,
      responsable: task.responsable
    }));

  return {
    application: 'SBF Pulse',
    date_du_jour: today.toISOString().slice(0, 10),
    devise: 'DT (dinar tunisien)',
    avertissement:
      'Les montants sont en HT sauf mention TTC. Les listes sont limitées aux enregistrements les plus récents ou les plus pertinents.',
    limites: {
      projets_charges: projects.length,
      projets_max: MAX_PROJECTS,
      entrees_planning_chargees: entries.length,
      taches_chargees: tasks.length
    },
    synthese: {
      nombre_projets: stats.total,
      montant_total_ht: totalHt,
      projets_actifs: stats.actifs.length,
      offres_en_cours: stats.offres.length,
      marches_gagnes: stats.nbGagnes,
      offres_perdues: stats.nbPerdus,
      taux_reussite_pct: stats.tauxReussite === null ? null : Number(stats.tauxReussite.toFixed(1)),
      montant_actifs_ht: stats.montantActifs,
      montant_actifs_ttc: stats.montantActifsTTC,
      montant_offres_ht: stats.montantOffres,
      montant_offres_ttc: stats.montantOffresTTC,
      montant_perdus_ht: stats.montantPerdus,
      carnet_restant_a_realiser: stats.carnet,
      total_facture: stats.facture,
      total_couts_reels: stats.couts,
      resultat_reel: stats.resultat,
      projets_en_retard: stats.enRetard.length,
      projets_a_surveiller: stats.aSurveiller.length,
      projets_kpi_non_conformes: stats.kpiKo.length
    },
    planning: {
      ...entryStats,
      entrees_a_venir: upcomingPlanning
    },
    analyse: {
      total_montant_ht: totalHt,
      montant_ht_par_type: withShare(groupAmount(projects, (project) => project.type)),
      montant_ht_par_statut: withShare(groupAmount(projects, (project) => project.status)),
      montant_ht_par_client: withShare(
        groupAmount(projects, (project) => project.client).slice(0, MAX_CLIENTS)
      ),
      projets_en_retard: stats.enRetard.map((project) => ({
        nom: project.name,
        code: project.code,
        client: project.client,
        avancement_pct: project.avancement,
        jours_restants_client: joursRestants(project, today),
        montant_ht: project.amount_ht
      })),
      projets_a_surveiller: stats.aSurveiller.map((project) => ({
        nom: project.name,
        code: project.code,
        client: project.client,
        avancement_pct: project.avancement,
        temps_ecoule_pct: tempsEcoulePct(project, today),
        montant_ht: project.amount_ht
      })),
      kpi_non_conformes: stats.kpiKo.map((project) => ({
        nom: project.name,
        code: project.code,
        anomalies: kpiChecks(project, today)
          .filter((check) => check.ok === false)
          .map((check) => `${check.label} : ${check.detail}`)
      })),
      prochaines_remises_offre: upcomingDeadlines
    },
    projets: projects.map((project) => compactProject(project, today)),
    taches_ouvertes: openTasks
  };
}

export type PlatformSnapshot = Awaited<ReturnType<typeof buildPlatformSnapshot>>;

export function serializePlatformSnapshot(snapshot: PlatformSnapshot) {
  return JSON.stringify(snapshot);
}
