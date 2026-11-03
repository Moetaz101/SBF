/**
 * Réglages métier SBF — modifiez ces valeurs selon vos objectifs internes.
 */
export const SBF_CONFIG = {
  /** Nom affiché dans l'application */
  appName: 'SBF Pulse',

  /** Marge prévue minimale (%) en dessous de laquelle un marché est signalé */
  margeObjectif: 8,

  /** Taux de TVA utilisé quand le montant TTC n'est pas saisi */
  tauxTva: 19,

  /** Unité des délais (dureeClient / dureeSbf) */
  uniteDelai: 'mois' as const,

  /** Tolérance (points de %) entre avancement physique et temps écoulé avant alerte */
  toleranceAvancement: 10
};

/** Étapes d'un marché, de l'étude jusqu'à la clôture */
export const STATUTS = [
  'En étude',
  'Offre remise',
  'Attribué',
  'En exécution',
  'Terminé',
  'Perdu',
  'Abandonné'
] as const;

/** Statuts considérés comme « gagnés » pour le taux de réussite */
export const STATUTS_GAGNES = ['Attribué', 'En exécution', 'Terminé'];

/** Statuts considérés comme « actifs » (contrats en cours) */
export const STATUTS_ACTIFS = ['Attribué', 'En exécution'];

/** Offres en attente de réponse */
export const STATUTS_EN_COURS_OFFRE = ['En étude', 'Offre remise'];

export const TYPES_TRAVAUX = [
  'Terrassement',
  'VRD & Infrastructure',
  'Hydraulique & Portuaire',
  'Bâtiment',
  'Génie civil',
  'Autre'
] as const;
