import { parseNumber } from './format';
import type { ProjectInput } from './types';

/** Correspondance champs JSON (prototype SBFPulse) → colonnes de la base */
const TEXT_FIELDS: Record<string, keyof ProjectInput> = {
  id: 'id',
  name: 'name',
  description: 'description',
  client: 'client',
  location: 'location',
  type: 'type',
  status: 'status',
  chefProjet: 'chef_projet',
  architecte: 'architecte',
  bet: 'bet',
  ingConseil: 'ing_conseil',
  bureauControle: 'bureau_controle',
  modalitePaiement: 'modalite_paiement',
  penaliteRetard: 'penalite_retard',
  notes: 'notes'
};

const NUMBER_FIELDS: Record<string, keyof ProjectInput> = {
  amountHt: 'amount_ht',
  amountTtc: 'amount_ttc',
  coefReglement: 'coef_reglement',
  margin: 'margin',
  avance: 'avance',
  retenueGarantie: 'retenue_garantie',
  dureeClient: 'duree_client',
  dureeSbf: 'duree_sbf',
  surfTerrain: 'surf_terrain',
  surfCouverte: 'surf_couverte',
  avancement: 'avancement',
  montantFacture: 'montant_facture',
  coutReel: 'cout_reel'
};

const DATE_FIELDS: Record<string, keyof ProjectInput> = {
  dateRemiseOffre: 'date_remise_offre',
  dateOS: 'date_os',
  dateOs: 'date_os'
};

export interface ImportedFile {
  name: string;
  blob: Blob;
}

export interface ImportedProject {
  project: ProjectInput;
  files: ImportedFile[];
}

function toDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); // 21/09/2026
  if (fr) return `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  return null;
}

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:[^;]+;base64,/.test(value.slice(0, 100));
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',', 2);
  const mime = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Trouve tous les fichiers base64 d'un objet (pdfData, documents[], …) */
function extractFiles(raw: Record<string, unknown>): { files: ImportedFile[]; used: Set<string> } {
  const files: ImportedFile[] = [];
  const used = new Set<string>();

  for (const [key, value] of Object.entries(raw)) {
    if (isDataUrl(value)) {
      // pdfData ↔ pdfName, fileData ↔ fileName …
      const nameKey = key.replace(/Data$/, 'Name');
      const name =
        typeof raw[nameKey] === 'string' && raw[nameKey] ? String(raw[nameKey]) : `${key}.pdf`;
      files.push({ name, blob: dataUrlToBlob(value) });
      used.add(key);
      if (nameKey !== key) used.add(nameKey);
    } else if (Array.isArray(value)) {
      const found = value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const obj = item as Record<string, unknown>;
        const dataKey = Object.keys(obj).find((k) => isDataUrl(obj[k]));
        if (!dataKey) return [];
        const name = String(obj.name ?? obj.pdfName ?? obj.fileName ?? `${key}.pdf`);
        return [{ name, blob: dataUrlToBlob(obj[dataKey] as string) }];
      });
      if (found.length) {
        files.push(...found);
        used.add(key);
      }
    }
  }
  return { files, used };
}

export function mapProject(raw: Record<string, unknown>): ImportedProject {
  const project: Record<string, unknown> = {
    status: 'En étude',
    avancement: 0,
    montant_facture: 0,
    cout_reel: 0
  };
  const extra: Record<string, unknown> = {};
  const { files, used } = extractFiles(raw);

  for (const [key, value] of Object.entries(raw)) {
    if (used.has(key)) continue;
    if (key in TEXT_FIELDS) {
      const s = value === null || value === undefined ? '' : String(value).trim();
      if (s) project[TEXT_FIELDS[key]] = s;
    } else if (key in NUMBER_FIELDS) {
      const n = parseNumber(value);
      if (n !== null) project[NUMBER_FIELDS[key]] = n;
    } else if (key in DATE_FIELDS) {
      project[DATE_FIELDS[key]] = toDate(value);
    } else if (value !== null && value !== undefined && value !== '') {
      extra[key] = value; // champ inconnu : conservé tel quel
    }
  }

  if (!project.name) project.name = String(raw.titre ?? raw.title ?? project.id ?? 'Sans nom');
  project.extra = extra;

  return { project: project as unknown as ProjectInput, files };
}

/** Accepte un tableau, ou un objet contenant un tableau `projects` / `marches` */
export function findProjectsArray(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    for (const key of ['projects', 'marches', 'marchés', 'data', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
    // Sinon : le premier tableau d'objets trouvé
    const firstArray = Object.values(obj).find(
      (v) => Array.isArray(v) && v.length && typeof v[0] === 'object'
    );
    if (firstArray) return firstArray as Record<string, unknown>[];
  }
  return [];
}
