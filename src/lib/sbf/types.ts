/** Ligne de la table `projects` (un marché / appel d'offres) */
export interface Project {
  id: string;
  name: string;
  description: string | null;

  /** Code du marché (ex. T/VRD/31/2026) */
  code: string | null;

  client: string | null;
  location: string | null;
  type: string | null;
  status: string;
  /** Mode de passation (appel d'offres ouvert, consultation…) */
  passation_mode: string | null;

  chef_projet: string | null;
  architecte: string | null;
  bet: string | null;
  ing_conseil: string | null;
  bureau_controle: string | null;

  amount_ht: number | null;
  amount_ttc: number | null;
  coef_reglement: number | null;
  margin: number | null;

  avance: number | null;
  retenue_garantie: number | null;
  caution_provisoire: number | null;
  caution_definitive: number | null;
  modalite_paiement: string | null;
  penalite_retard: string | null;

  date_remise_offre: string | null;
  date_os: string | null;
  duree_client: number | null;
  duree_sbf: number | null;

  surf_terrain: number | null;
  surf_couverte: number | null;

  avancement: number;
  montant_facture: number;
  cout_reel: number;
  notes: string | null;

  extra: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'> & { id?: string };

/** Ligne de la table `planning_tasks` */
export interface PlanningTask {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress: number;
  responsable: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanningTaskInput = Omit<PlanningTask, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

/** Décision sur une remise d'offre */
export type SubmissionDecision = 'En attente' | 'Oui' | 'Non';

/** Ligne d'un planning hebdomadaire de remise d'offre. */
export interface PlanningEntry {
  id: string;
  project_id: string | null;
  code: string;
  category: string;
  entry_number: number;
  year: number;
  name: string;
  client: string | null;
  start_date: string;
  end_date: string;
  decision: SubmissionDecision;
  created_at: string;
  updated_at: string;
}

/**
 * `code`, `entry_number` et `year` sont calculés par la base :
 * le client n'envoie que les données métier.
 */
export type PlanningEntryInput = Omit<
  PlanningEntry,
  'id' | 'code' | 'entry_number' | 'year' | 'created_at' | 'updated_at'
> & {
  id?: string;
};

/** Ligne de la table `project_documents` */
export interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}
