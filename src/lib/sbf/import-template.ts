import { FIELD_DEFS } from './import-map';
import type { ImportField } from './import-types';

const EXAMPLE: Partial<Record<ImportField, string>> = {
  name: 'LOT TERRASSEMENT (SOTUBI-SOTUCHOC)',
  code: 'T/VRD/31/2026',
  client: 'OMMP',
  location: 'Ben Arous / Radès',
  type: 'VRD & Infrastructure',
  status: 'En étude',
  passation_mode: 'Appel d’offres ouvert',
  chef_projet: 'Ahmed Ben Salah',
  architecte: 'Cabinet ABC',
  bet: 'BET Structures',
  ing_conseil: 'Ing. Conseil SARL',
  bureau_controle: 'Bureau de contrôle Tunis',
  amount_ht: '3570000',
  amount_ttc: '4248300',
  coef_reglement: '1,05',
  margin: '8',
  avance: '10',
  retenue_garantie: '5',
  caution_provisoire: '50000',
  caution_definitive: '150000',
  modalite_paiement: 'Décomptes mensuels 30j',
  penalite_retard: '1/1000 par jour max 5%',
  date_remise_offre: '2026-09-21',
  date_os: '2026-10-15',
  duree_client: '12',
  duree_sbf: '10',
  surf_terrain: '4200',
  surf_couverte: '1850',
  avancement: '35',
  montant_facture: '1200000',
  cout_reel: '980000',
  description: 'Terrassement, VRD et aménagement extérieur.',
  notes: 'Priorité stratégique.'
};

/** Génère un modèle CSV (UTF-8 BOM pour Excel) avec une ligne d'exemple. */
export async function buildCsvTemplate(): Promise<string> {
  const Papa = (await import('papaparse')).default;
  const headers = FIELD_DEFS.map((field) => field.label);
  const example = FIELD_DEFS.map((field) => EXAMPLE[field.name] ?? '');
  const csv = Papa.unparse([headers, example], { delimiter: ';' });
  return `\uFEFF${csv}`;
}
