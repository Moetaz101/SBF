import { normalizeStatus, SBF_CONFIG, STATUTS, STATUTS_GAGNES } from '@/config/sbf';
import { parseNumber, toISODate } from './format';
import type { Project, ProjectInput } from './types';
import type {
  CellValue,
  ColumnMapping,
  ImportField,
  ImportFieldDef,
  ImportRow,
  MappedRow,
  ParsedTable,
  ResolveOptions,
  TableRow
} from './import-types';

/** Normalise un en-tête : sans accents, minuscules, ponctuation → espaces. */
export function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const FIELD_DEFS: ImportFieldDef[] = [
  {
    name: 'name',
    label: 'Intitulé du marché',
    kind: 'text',
    required: true,
    hint: 'Nom ou objet du marché',
    aliases: [
      'nom',
      'nom du marche',
      'designation',
      'libelle',
      'objet',
      'projet',
      'marche',
      'title',
      'name',
      'operation',
      'intitule'
    ]
  },
  {
    name: 'code',
    label: 'Code du marché',
    kind: 'text',
    hint: 'Référence / numéro',
    aliases: ['code', 'reference', 'ref', 'numero', 'n marche', 'n°', 'num']
  },
  {
    name: 'client',
    label: 'Client / Maître d’ouvrage',
    kind: 'text',
    aliases: [
      'client',
      'maitre d ouvrage',
      'maitre ouvrage',
      'mo',
      'donneur d ordre',
      'acheteur',
      'organisme',
      'societe'
    ]
  },
  {
    name: 'location',
    label: 'Lieu / Gouvernorat',
    kind: 'text',
    aliases: ['lieu', 'site', 'localisation', 'gouvernorat', 'ville', 'adresse', 'region']
  },
  {
    name: 'type',
    label: 'Type de travaux',
    kind: 'text',
    aliases: ['type', 'type de travaux', 'nature', 'categorie', 'specialite', 'domaine']
  },
  {
    name: 'status',
    label: 'Statut',
    kind: 'status',
    hint: 'En étude, Offre déposée, Adjugé, En exécution…',
    aliases: ['statut', 'etat', 'phase', 'etape', 'status', 'situation']
  },
  {
    name: 'passation_mode',
    label: 'Mode de passation',
    kind: 'text',
    aliases: ['mode de passation', 'passation', 'mode', 'procedure', 'type de passation']
  },
  {
    name: 'chef_projet',
    label: 'Chef de projet',
    kind: 'text',
    aliases: ['chef de projet', 'chef projet', 'responsable', 'conducteur', 'cp', 'project manager']
  },
  {
    name: 'architecte',
    label: 'Architecte',
    kind: 'text',
    aliases: ['architecte', 'archi', 'bureau d architecture']
  },
  {
    name: 'bet',
    label: 'BET',
    kind: 'text',
    aliases: ['bet', 'bureau d etudes', 'bureau etudes', 'etudes']
  },
  {
    name: 'ing_conseil',
    label: 'Ingénieur conseil',
    kind: 'text',
    aliases: ['ingenieur conseil', 'ing conseil', 'conseil', 'ingenieur']
  },
  {
    name: 'bureau_controle',
    label: 'Bureau de contrôle',
    kind: 'text',
    aliases: ['bureau de controle', 'bureau controle', 'controle', 'verificateur']
  },
  {
    name: 'amount_ht',
    label: 'Montant HT',
    kind: 'number',
    hint: 'Montant hors taxes en DT',
    aliases: [
      'montant ht',
      'montant hors taxe',
      'hors taxe',
      'ht',
      'montant',
      'budget',
      'estimation',
      'chiffrage',
      'montant marche'
    ]
  },
  {
    name: 'amount_ttc',
    label: 'Montant TTC',
    kind: 'number',
    hint: 'Montant toutes taxes comprises',
    aliases: ['montant ttc', 'ttc', 'montant toutes taxes', 'toutes taxes']
  },
  {
    name: 'coef_reglement',
    label: 'Coefficient de règlement',
    kind: 'number',
    aliases: ['coefficient de reglement', 'coefficient', 'coef', 'coef reglement']
  },
  {
    name: 'margin',
    label: 'Marge prévue (%)',
    kind: 'percent',
    aliases: ['marge prevue', 'marge', 'marge %', 'pourcentage marge', 'taux de marge']
  },
  {
    name: 'avance',
    label: 'Avance (%)',
    kind: 'percent',
    aliases: ['avance', 'acompte', 'avance %']
  },
  {
    name: 'retenue_garantie',
    label: 'Retenue de garantie (%)',
    kind: 'percent',
    aliases: ['retenue de garantie', 'retenue', 'garantie']
  },
  {
    name: 'caution_provisoire',
    label: 'Caution provisoire',
    kind: 'number',
    aliases: ['caution provisoire', 'caution prov', 'caution']
  },
  {
    name: 'caution_definitive',
    label: 'Caution définitive',
    kind: 'number',
    aliases: ['caution definitive', 'caution def']
  },
  {
    name: 'modalite_paiement',
    label: 'Modalité de paiement',
    kind: 'text',
    aliases: ['modalite de paiement', 'mode de paiement', 'paiement', 'reglement']
  },
  {
    name: 'penalite_retard',
    label: 'Pénalité de retard',
    kind: 'text',
    aliases: ['penalite de retard', 'penalite', 'retard', 'penalites']
  },
  {
    name: 'date_remise_offre',
    label: 'Date de remise de l’offre',
    kind: 'date',
    aliases: [
      'date de remise',
      'date remise',
      'remise offre',
      'date offre',
      'echeance',
      'date limite',
      'deadline'
    ]
  },
  {
    name: 'date_os',
    label: 'Date ordre de service (OS)',
    kind: 'date',
    aliases: ['date os', 'ordre de service', 'os', 'demarrage', 'date demarrage', 'date debut']
  },
  {
    name: 'duree_client',
    label: 'Délai client (mois)',
    kind: 'number',
    aliases: ['delai client', 'duree client', 'delai contractuel', 'duree', 'delai']
  },
  {
    name: 'duree_sbf',
    label: 'Objectif interne SBF (mois)',
    kind: 'number',
    aliases: ['objectif interne sbf', 'objectif sbf', 'delai sbf', 'duree sbf', 'objectif interne']
  },
  {
    name: 'surf_terrain',
    label: 'Surface terrain (m²)',
    kind: 'number',
    aliases: ['surface terrain', 'terrain', 'surf terrain', 'superficie terrain']
  },
  {
    name: 'surf_couverte',
    label: 'Surface couverte (m²)',
    kind: 'number',
    aliases: ['surface couverte', 'couverte', 'surf couverte', 'superficie couverte']
  },
  {
    name: 'avancement',
    label: 'Avancement physique (%)',
    kind: 'percent',
    aliases: [
      'avancement physique',
      'avancement',
      'progression',
      'pourcentage avancement',
      'avancement %'
    ]
  },
  {
    name: 'montant_facture',
    label: 'Décomptes facturés',
    kind: 'number',
    aliases: ['decomptes factures', 'montant facture', 'facture', 'facturation', 'decomptes']
  },
  {
    name: 'cout_reel',
    label: 'Coûts réels',
    kind: 'number',
    aliases: ['couts reels', 'cout reel', 'cout', 'couts', 'depenses', 'depense']
  },
  {
    name: 'description',
    label: 'Description',
    kind: 'text',
    aliases: ['description', 'detail', 'details', 'contenu']
  },
  {
    name: 'notes',
    label: 'Notes internes',
    kind: 'text',
    aliases: ['notes internes', 'notes', 'commentaire', 'remarque', 'observation']
  }
];

export const FIELD_DEFS_BY_NAME = Object.fromEntries(
  FIELD_DEFS.map((field) => [field.name, field])
) as Record<ImportField, ImportFieldDef>;

export const ALIAS_SET = new Set(
  FIELD_DEFS.flatMap((field) => [field.label, ...field.aliases].map(normalizeHeader)).filter(
    Boolean
  )
);

export function isEmptyCell(value: CellValue) {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

/** Accepte ISO, français (21/09/2026), Date JS et numéro de série Excel. */
export function parseImportDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toISODate(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(Math.round((value - 25569) * 86400000));
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (fr) {
    let year = Number(fr[3]);
    if (year < 100) year += 2000;
    return `${year}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : toISODate(d);
}

function isDateLike(value: CellValue) {
  return parseImportDate(value) !== null;
}

function isNumericLike(value: CellValue) {
  return typeof value === 'number' || parseNumber(value) !== null;
}

function tokenScore(header: string, alias: string) {
  const h = new Set(header.split(' ').filter(Boolean));
  const a = new Set(alias.split(' ').filter(Boolean));
  if (!h.size || !a.size) return 0;
  let inter = 0;
  for (const token of h) if (a.has(token)) inter++;
  if (!inter) return 0;
  const union = new Set([...h, ...a]).size;
  return 40 + (inter / union) * 40;
}

function valueBonus(field: ImportFieldDef, samples: CellValue[]) {
  const nonEmpty = samples.filter((value) => !isEmptyCell(value));
  if (!nonEmpty.length) return 0;
  const ratio = (fn: (value: CellValue) => boolean) => nonEmpty.filter(fn).length / nonEmpty.length;

  if (field.kind === 'date') return ratio(isDateLike) >= 0.5 ? 15 : 0;
  if (field.kind === 'number' || field.kind === 'percent') {
    return ratio(isNumericLike) >= 0.5 ? 12 : 0;
  }
  if (field.kind === 'status') {
    return ratio((value) => (STATUTS as readonly string[]).includes(normalizeStatus(String(value))))
      ? 20
      : 0;
  }
  return ratio((value) => typeof value === 'string' && parseNumber(value) === null) >= 0.5 ? 5 : 0;
}

/** Propose une correspondance colonne → champ, avec un score de confiance. */
export function autoMapColumns(headers: string[], rows: TableRow[]): ColumnMapping[] {
  const samplesByHeader = new Map<string, CellValue[]>();
  for (const header of headers) {
    const samples: CellValue[] = [];
    for (const row of rows) {
      const value = row[header];
      if (!isEmptyCell(value)) samples.push(value);
      if (samples.length >= 4) break;
    }
    samplesByHeader.set(header, samples);
  }

  const candidates: { field: ImportField; column: string; score: number }[] = [];

  for (const field of FIELD_DEFS) {
    const aliases = [field.label, ...field.aliases].map(normalizeHeader).filter(Boolean);
    for (const header of headers) {
      const normalized = normalizeHeader(header);
      if (!normalized || normalized.startsWith('colonne ')) continue;

      let best = 0;
      for (const alias of aliases) {
        if (normalized === alias) best = Math.max(best, 100);
        else if (alias.length >= 3 && (normalized.includes(alias) || alias.includes(normalized))) {
          best = Math.max(best, 82);
        } else {
          best = Math.max(best, tokenScore(normalized, alias));
        }
      }
      if (best === 0) continue;

      const bonus = valueBonus(field, samplesByHeader.get(header) ?? []);
      candidates.push({
        field: field.name,
        column: header,
        score: Math.min(120, best + bonus)
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const usedFields = new Set<ImportField>();
  const usedColumns = new Set<string>();
  const assigned = new Map<ImportField, { column: string; score: number }>();

  for (const candidate of candidates) {
    if (candidate.score < 45) continue;
    if (usedFields.has(candidate.field) || usedColumns.has(candidate.column)) continue;
    usedFields.add(candidate.field);
    usedColumns.add(candidate.column);
    assigned.set(candidate.field, { column: candidate.column, score: candidate.score });
  }

  return FIELD_DEFS.map((field) => {
    const match = assigned.get(field.name);
    return {
      field: field.name,
      column: match?.column ?? null,
      confidence: match ? (match.score >= 80 ? 'auto' : 'review') : 'ignored',
      score: match?.score ?? 0
    };
  });
}

function parseField(
  field: ImportFieldDef,
  raw: CellValue
): { value?: unknown; error?: string; warning?: string } {
  if (field.kind === 'number') {
    const value = parseNumber(raw);
    if (value === null) return { error: 'valeur numérique invalide' };
    if (value < 0) return { error: 'la valeur ne peut pas être négative' };
    return { value };
  }

  if (field.kind === 'percent') {
    const value = parseNumber(raw);
    if (value === null) return { error: 'valeur numérique invalide' };
    if (value < 0 || value > 100) return { error: 'la valeur doit être entre 0 et 100' };
    return { value };
  }

  if (field.kind === 'date') {
    const value = parseImportDate(raw);
    if (!value) return { error: 'date invalide' };
    return { value };
  }

  if (field.kind === 'status') {
    const rawStatus = String(raw).trim();
    const status = normalizeStatus(rawStatus);
    if (!(STATUTS as readonly string[]).includes(status)) {
      return {
        value: 'En étude',
        warning: `statut inconnu « ${rawStatus} », remplacé par « En étude »`
      };
    }
    return { value: status };
  }

  const value = String(raw).trim();
  return value ? { value } : {};
}

/** Transforme les lignes brutes en valeurs de champs, avec erreurs et avertissements. */
export function applyMapping(table: ParsedTable, mappings: ColumnMapping[]): MappedRow[] {
  const active = mappings.filter((mapping) => mapping.column);
  const mappedColumns = new Set(active.map((mapping) => mapping.column as string));
  const unknownHeaders = table.headers.filter((header) => !mappedColumns.has(header));

  return table.rows.map((row, index) => {
    const values: Partial<ProjectInput> = {};
    const present = new Set<ImportField>();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const mapping of active) {
      const column = mapping.column as string;
      const raw = row[column];
      if (isEmptyCell(raw)) continue;

      const field = FIELD_DEFS_BY_NAME[mapping.field];
      const parsed = parseField(field, raw);
      if (parsed.error) {
        errors.push(`${field.label} : ${parsed.error}`);
        continue;
      }
      if (parsed.value !== undefined) {
        (values as Record<string, unknown>)[mapping.field] = parsed.value;
        present.add(mapping.field);
      }
      if (parsed.warning) warnings.push(`${field.label} : ${parsed.warning}`);
    }

    if (!values.name) {
      if (values.code) {
        values.name = values.code;
        warnings.push('Intitulé manquant : le code du marché est utilisé.');
      } else {
        errors.push('Intitulé du marché manquant.');
      }
    }

    if (values.amount_ht === undefined && typeof values.amount_ttc === 'number') {
      values.amount_ht =
        Math.round((values.amount_ttc / (1 + SBF_CONFIG.tauxTva / 100)) * 100) / 100;
      warnings.push(`Montant HT déduit du TTC (TVA ${SBF_CONFIG.tauxTva} %).`);
    }

    if (values.status && STATUTS_GAGNES.includes(values.status) && !values.chef_projet) {
      warnings.push('Chef de projet manquant pour un marché gagné.');
    }

    const unknown: Record<string, CellValue> = {};
    for (const header of unknownHeaders) {
      const raw = row[header];
      if (isEmptyCell(raw)) continue;
      unknown[header] = raw instanceof Date ? raw.toISOString() : raw;
    }

    return { rowNumber: index + 2, values, present, unknown, errors, warnings };
  });
}

const EMPTY_INPUT: ProjectInput = {
  name: '',
  description: null,
  code: null,
  client: null,
  location: null,
  type: null,
  status: 'En étude',
  passation_mode: null,
  chef_projet: null,
  architecte: null,
  bet: null,
  ing_conseil: null,
  bureau_controle: null,
  amount_ht: null,
  amount_ttc: null,
  coef_reglement: null,
  margin: null,
  avance: null,
  retenue_garantie: null,
  caution_provisoire: null,
  caution_definitive: null,
  modalite_paiement: null,
  penalite_retard: null,
  date_remise_offre: null,
  date_os: null,
  duree_client: null,
  duree_sbf: null,
  surf_terrain: null,
  surf_couverte: null,
  avancement: 0,
  montant_facture: 0,
  cout_reel: 0,
  notes: null,
  extra: {}
};

function projectToInput(project: Project): ProjectInput {
  const { created_at, updated_at, ...rest } = project;
  void created_at;
  void updated_at;
  return rest;
}

function rowKey(values: Partial<ProjectInput>, rowNumber: number) {
  const code = values.code ? normalizeHeader(values.code) : '';
  if (code) return `code:${code}`;
  const name = values.name ? normalizeHeader(values.name) : '';
  if (!name) return `invalid:${rowNumber}`;
  return `name:${name}|${normalizeHeader(values.client ?? '')}|${values.date_remise_offre ?? ''}`;
}

export function validateInput(input: ProjectInput) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.name?.trim()) errors.push('Intitulé manquant.');

  const status = normalizeStatus(input.status);
  if (!(STATUTS as readonly string[]).includes(status)) {
    errors.push(`Statut inconnu : ${input.status}.`);
  }

  if (input.amount_ht !== null && input.amount_ht < 0) errors.push('Montant HT négatif.');
  if (input.amount_ttc !== null && input.amount_ttc < 0) errors.push('Montant TTC négatif.');
  if (input.margin !== null && (input.margin < 0 || input.margin > 100)) {
    errors.push('Marge hors 0–100 %.');
  }
  if (input.avance !== null && (input.avance < 0 || input.avance > 100)) {
    errors.push('Avance hors 0–100 %.');
  }
  if (
    input.retenue_garantie !== null &&
    (input.retenue_garantie < 0 || input.retenue_garantie > 100)
  ) {
    errors.push('Retenue de garantie hors 0–100 %.');
  }
  if (input.avancement < 0 || input.avancement > 100) {
    errors.push('Avancement hors 0–100 %.');
  }
  if (input.duree_client !== null && input.duree_client < 0) {
    errors.push('Délai client négatif.');
  }
  if (input.duree_sbf !== null && input.duree_sbf < 0) {
    errors.push('Objectif interne négatif.');
  }
  if (input.date_remise_offre && !parseImportDate(input.date_remise_offre)) {
    errors.push('Date de remise invalide.');
  }
  if (input.date_os && !parseImportDate(input.date_os)) {
    errors.push('Date OS invalide.');
  }
  if (STATUTS_GAGNES.includes(status) && !input.chef_projet) {
    warnings.push('Chef de projet manquant pour un marché gagné.');
  }

  return { errors, warnings };
}

/** Résout les doublons et produit les lignes finales prêtes pour Supabase. */
export function resolveRows(mapped: MappedRow[], options: ResolveOptions): ImportRow[] {
  const existingByCode = new Map<string, Project>();
  const existingByKey = new Map<string, Project>();

  for (const project of options.existing) {
    const code = project.code ? normalizeHeader(project.code) : '';
    if (code) existingByCode.set(code, project);
    existingByKey.set(
      rowKey(
        {
          name: project.name,
          client: project.client,
          date_remise_offre: project.date_remise_offre
        },
        0
      ),
      project
    );
  }

  const seen = new Map<string, number>();
  const importedAt = new Date().toISOString();

  return mapped.map((row) => {
    const key = rowKey(row.values, row.rowNumber);
    const code = row.values.code ? normalizeHeader(row.values.code) : '';
    const existing = (code ? existingByCode.get(code) : undefined) ?? existingByKey.get(key);
    const duplicateInFile = seen.has(key);
    if (!duplicateInFile) seen.set(key, row.rowNumber);

    let duplicate: ImportRow['duplicate'] = 'none';
    let duplicateOf: string | undefined;
    if (duplicateInFile) {
      duplicate = 'file';
      duplicateOf = `ligne ${seen.get(key)}`;
    } else if (existing) {
      duplicate = 'existing';
      duplicateOf = existing.name;
    }

    const errors = [...row.errors];
    const warnings = [...row.warnings];
    let skipped = false;

    let input: ProjectInput;
    if (existing && options.duplicateMode === 'update' && duplicate !== 'file') {
      input = {
        ...projectToInput(existing),
        ...row.values,
        id: existing.id,
        extra: {
          ...existing.extra,
          ...row.unknown,
          import: { batchId: options.batchId, fileName: options.fileName, importedAt }
        }
      };
    } else {
      input = {
        ...EMPTY_INPUT,
        ...row.values,
        extra: {
          ...row.unknown,
          import: { batchId: options.batchId, fileName: options.fileName, importedAt }
        }
      };
    }

    input.status = normalizeStatus(input.status);

    if (duplicate === 'file') {
      if (options.duplicateMode === 'skip' || options.duplicateMode === 'update') {
        skipped = true;
        warnings.push('Doublon dans le fichier : ligne ignorée.');
      } else {
        warnings.push('Doublon dans le fichier : un nouveau marché sera créé.');
      }
    } else if (duplicate === 'existing') {
      if (options.duplicateMode === 'skip') {
        skipped = true;
      } else if (options.duplicateMode === 'create') {
        warnings.push('Doublon existant : un nouveau marché sera créé.');
      }
    }

    const validation = validateInput(input);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);

    return {
      rowNumber: row.rowNumber,
      input,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      duplicate,
      duplicateOf,
      skipped
    };
  });
}
