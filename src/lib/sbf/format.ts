const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 3570000 → « 3 570 000 DT » */
export function formatDT(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${nf0.format(value)} DT`;
}

/** 3570000 → « 3,57 M DT » ; 45000 → « 45 k DT » */
export function formatDTCompact(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${nf2.format(value / 1_000_000)} M DT`;
  if (abs >= 10_000) return `${nf0.format(value / 1_000)} k DT`;
  return `${nf0.format(value)} DT`;
}

export function formatPct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)} %`;
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return nf2.format(value);
}

/** « 2026-09-21 » → « 21 sept. 2026 » */
export function formatDateFr(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISODate(value) : value;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

export function formatDateTimeFr(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

/** Parse « YYYY-MM-DD » en date locale (évite le décalage de fuseau). */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Accepte « 1 234,5 », « 1234.5 », « 10 % » … ; renvoie null si vide/invalide. */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value)
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace('%', '')
    .replace(/DT|TND/gi, '')
    .replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${nf0.format(bytes / 1024)} Ko`;
  return `${nf2.format(bytes / 1024 / 1024)} Mo`;
}
