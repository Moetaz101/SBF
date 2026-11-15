import { formatDateFr, parseISODate, toISODate } from './format';
import type { PlanningEntry } from './types';

const DAY_MS = 86_400_000;

/** Une planification de remise d'offre couvre 7 jours maximum (bornes incluses). */
export const PLANNING_MAX_DAYS = 7;

/** Catégories proposées dans le formulaire. Le code stocké reste compact. */
export const PLANNING_CATEGORIES = [
  { value: 'VRD', label: 'VRD — Voirie et réseaux divers' },
  { value: 'BAT', label: 'BAT — Bâtiment' },
  { value: 'HYD', label: 'HYD — Hydraulique' },
  { value: 'IND', label: 'IND — Industriel' },
  { value: 'STR', label: 'STR — Structures' },
  { value: 'AUT', label: 'AUT — Autre' }
] as const;

export const PLANNING_CATEGORY_VALUES = PLANNING_CATEGORIES.map((category) => category.value);

export const PLANNING_DECISIONS = ['En attente', 'Oui', 'Non'] as const;
export type PlanningDecision = (typeof PLANNING_DECISIONS)[number];

export type PlanningCodeParts = {
  prefix: string;
  category: string;
  number: string;
  year: string;
};

export type PlanningFilters = {
  /** Recherche libre sur le code, le projet ou le client. */
  query: string;
  prefix: string;
  category: string;
  number: string;
  year: string;
};

export const EMPTY_PLANNING_FILTERS: PlanningFilters = {
  query: '',
  prefix: '',
  category: '',
  number: '',
  year: ''
};

/** Minuscules + suppression des accents, pour une recherche tolérante. */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Découpe un identifiant `T/CAT/NN/AAAA` en segments filtrables. */
export function splitPlanningCode(code: string): PlanningCodeParts {
  const parts = code.split('/');
  return {
    prefix: parts[0] ?? '',
    category: parts[1] ?? '',
    number: parts[2] ?? '',
    year: parts[3] ?? ''
  };
}

export function isPlanningCategory(value: string) {
  return (PLANNING_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function categoryLabel(value: string) {
  return PLANNING_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

/** Ajoute des jours à une date ISO en restant en date locale (DST-safe). */
export function addDays(isoDate: string, days: number) {
  const date = parseISODate(isoDate);
  if (!date) return isoDate;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Lundi de la semaine contenant `date`, au format ISO. */
export function mondayOf(date: Date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay() || 7;
  local.setDate(local.getDate() - day + 1);
  return toISODate(local);
}

/** Lundi de la semaine contenant une date ISO. */
export function weekStart(isoDate: string) {
  const date = parseISODate(isoDate);
  return date ? mondayOf(date) : isoDate;
}

/** Nombre de jours calendaires entre deux dates ISO (négatif si fin < début). */
export function diffInDays(startISO: string, endISO: string) {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end) return Number.NaN;
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUTC - startUTC) / DAY_MS);
}

/** Durée inclusive en jours (1 pour une planification sur une seule journée). */
export function planningDurationDays(entry: Pick<PlanningEntry, 'start_date' | 'end_date'>) {
  const difference = diffInDays(entry.start_date, entry.end_date);
  return Number.isNaN(difference) ? 0 : difference + 1;
}

/** Dernière date autorisée pour une planification qui commence à `startISO`. */
export function maxEndDate(startISO: string) {
  return addDays(startISO, PLANNING_MAX_DAYS - 1);
}

export function isDateWithinOneWeek(startISO: string, endISO: string) {
  const difference = diffInDays(startISO, endISO);
  return !Number.isNaN(difference) && difference >= 0 && difference < PLANNING_MAX_DAYS;
}

export function planningEntryCoversDay(entry: PlanningEntry, isoDate: string) {
  return entry.start_date <= isoDate && entry.end_date >= isoDate;
}

/** Sept dates ISO du lundi au dimanche. */
export function weekDaysOf(weekStartISO: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStartISO, index));
}

/** Numéro de semaine ISO 8601. */
export function isoWeekNumber(isoDate: string) {
  const date = parseISODate(isoDate);
  if (!date) return null;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

export function formatWeekdayShort(isoDate: string) {
  const date = parseISODate(isoDate);
  return date ? weekdayFormatter.format(date) : '';
}

/** Présentation compacte de la période réellement couverte par les entrées. */
export function planningPeriodLabel(entries: PlanningEntry[]) {
  if (!entries.length) return '—';
  const start = entries.reduce(
    (earliest, entry) => (entry.start_date < earliest ? entry.start_date : earliest),
    entries[0].start_date
  );
  const end = entries.reduce(
    (latest, entry) => (entry.end_date > latest ? entry.end_date : latest),
    entries[0].end_date
  );
  return start === end ? formatDateFr(start) : `${formatDateFr(start)} → ${formatDateFr(end)}`;
}

/** Aperçu du code qui sera attribué par la base. */
export function planningCodePreview(category: string, startISO: string) {
  const year = /^\d{4}/.test(startISO) ? startISO.slice(0, 4) : 'AAAA';
  return `T/${category || 'CAT'}/NN/${year}`;
}

export function hasActivePlanningFilters(filters: PlanningFilters) {
  return Object.values(filters).some((value) => value.trim() !== '');
}

export function filterPlanningEntries(entries: PlanningEntry[], filters: PlanningFilters) {
  const query = normalizeText(filters.query.trim());

  return entries.filter((entry) => {
    const code = splitPlanningCode(entry.code);
    if (filters.prefix && code.prefix !== filters.prefix) return false;
    if (filters.category && code.category !== filters.category) return false;
    if (filters.number && code.number !== filters.number) return false;
    if (filters.year && code.year !== filters.year) return false;
    if (!query) return true;

    const haystack = normalizeText(
      [
        entry.code,
        entry.name,
        entry.client ?? '',
        entry.category,
        categoryLabel(entry.category)
      ].join(' ')
    );
    return haystack.includes(query);
  });
}

function compareNumericStrings(a: string, b: string) {
  const first = Number.parseInt(a, 10);
  const second = Number.parseInt(b, 10);
  if (Number.isNaN(first) || Number.isNaN(second)) return a.localeCompare(b, 'fr');
  return first - second;
}

/** Valeurs réellement présentes dans les identifiants, pour les listes déroulantes. */
export function planningFilterOptions(entries: PlanningEntry[]) {
  const parts = entries.map((entry) => splitPlanningCode(entry.code));

  const prefixes = [...new Set(parts.map((part) => part.prefix).filter(Boolean))].toSorted((a, b) =>
    a.localeCompare(b, 'fr')
  );

  const presentCategories = new Set(parts.map((part) => part.category).filter(Boolean));
  const knownOrder = new Map<string, number>(
    PLANNING_CATEGORIES.map((category, index) => [category.value, index])
  );
  const categories = [...presentCategories].toSorted((a, b) => {
    const first = knownOrder.get(a);
    const second = knownOrder.get(b);
    if (first !== undefined && second !== undefined) return first - second;
    if (first !== undefined) return -1;
    if (second !== undefined) return 1;
    return a.localeCompare(b, 'fr');
  });

  const numbers = [...new Set(parts.map((part) => part.number).filter(Boolean))].toSorted(
    compareNumericStrings
  );
  const years = [...new Set(parts.map((part) => part.year).filter(Boolean))].toSorted((a, b) =>
    compareNumericStrings(b, a)
  );

  return { prefixes, categories, numbers, years };
}

export function planningStats(entries: PlanningEntry[]) {
  return {
    total: entries.length,
    pending: entries.filter((entry) => entry.decision === 'En attente').length,
    accepted: entries.filter((entry) => entry.decision === 'Oui').length,
    declined: entries.filter((entry) => entry.decision === 'Non').length
  };
}

/**
 * CSV prêt pour Excel FR : séparateur `;`, guillemets systématiques,
 * fins de ligne CRLF. Le BOM UTF-8 est ajouté au moment du téléchargement.
 */
export function buildPlanningCsv(
  entries: PlanningEntry[],
  marketLabel: (entry: PlanningEntry) => string
) {
  const header = [
    'Code',
    'Catégorie',
    'Projet / offre',
    'Marché lié',
    'Client',
    'Début',
    'Fin',
    'Décision'
  ];
  const rows = entries.map((entry) => [
    entry.code,
    entry.category,
    entry.name,
    marketLabel(entry),
    entry.client ?? '',
    entry.start_date,
    entry.end_date,
    entry.decision
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n');
}
