/**
 * Réglages métier SBF — modifiez ces valeurs selon vos objectifs internes.
 */
export const SBF_CONFIG = {
  /** Nom affiché dans l'application */
  appName: 'SBF Pulse',

  /** Objectif interne de taux d'acceptation / win rate (%) */
  objectifTauxReussite: 30,

  /** Taux de TVA utilisé quand le montant TTC n'est pas saisi */
  tauxTva: 19,

  /** Unité des délais (dureeClient / dureeSbf) */
  uniteDelai: 'mois' as const,

  /** Tolérance (points de %) entre avancement physique et temps écoulé avant alerte */
  toleranceAvancement: 10,

  /** Délai d'inactivité (minutes) avant verrouillage de l'application par PIN */
  autoLockMinutes: 10
};

/** Étapes d'un marché, de l'étude jusqu'à la clôture (vocabulaire PRD) */
export const STATUTS = [
  'En étude',
  'Offre déposée',
  'Adjugé',
  'En exécution',
  'Offre non attribuée',
  'Terminé',
  'Abandonné'
] as const;

/** Statuts considérés comme « gagnés » pour le taux de réussite */
export const STATUTS_GAGNES = ['Adjugé', 'En exécution', 'Terminé'];

/** Statuts considérés comme « actifs » (carnet de commandes) */
export const STATUTS_ACTIFS = ['Adjugé', 'En exécution'];

/** Offres en attente de réponse (pipeline) */
export const STATUTS_EN_COURS_OFFRE = ['En étude', 'Offre déposée'];

/** Offres non attribuées (perdues) */
export const STATUTS_PERDUS = ['Offre non attribuée'];

/** Types de travaux (vocabulaire PRD) */
export const TYPES_TRAVAUX = [
  'Bâtiment',
  'VRD & Infrastructure',
  'Hydraulique & Portuaire',
  'Industriel',
  'Structures',
  'Autre'
] as const;

/** Modes de passation courants */
export const PASSATION_MODES = [
  'Appel d’offres ouvert',
  'Appel d’offres restreint',
  'Consultation',
  'Gré à gré',
  'Autre'
] as const;

/**
 * Correspondance des anciens statuts (prototype SBFPulse) vers le vocabulaire PRD.
 * Utilisée à l'import JSON et pour les données historiques.
 */
export const LEGACY_STATUS_MAP: Record<string, string> = {
  'Offre remise': 'Offre déposée',
  Attribué: 'Adjugé',
  Perdu: 'Offre non attribuée'
};

export function normalizeStatus(value: string | null | undefined): string {
  if (!value) return 'En étude';
  return LEGACY_STATUS_MAP[value] ?? value;
}
