import { parseNumber } from './format';
import { findProjectsArray } from './import';
import { ALIAS_SET, isEmptyCell, normalizeHeader, parseImportDate } from './import-map';
import type { CellValue, ParsedTable, TableRow } from './import-types';

function firstNonEmptyRow(matrix: CellValue[][]) {
  return matrix.findIndex((row) => row.some((cell) => !isEmptyCell(cell)));
}

function detectHeader(matrix: CellValue[][]) {
  const firstIndex = firstNonEmptyRow(matrix);
  if (firstIndex < 0) return false;

  const first = matrix[firstIndex].filter((cell) => !isEmptyCell(cell));
  if (!first.length) return false;

  const aliasHits = first.filter((cell) => ALIAS_SET.has(normalizeHeader(String(cell)))).length;
  if (aliasHits >= 1) return true;

  const secondIndex = matrix.findIndex(
    (row, index) => index > firstIndex && row.some((cell) => !isEmptyCell(cell))
  );
  if (secondIndex < 0) return false;

  const second = matrix[secondIndex].filter((cell) => !isEmptyCell(cell));
  const firstText = first.filter(
    (cell) =>
      typeof cell === 'string' && parseNumber(cell) === null && parseImportDate(cell) === null
  ).length;
  const secondNumericOrDate = second.filter(
    (cell) =>
      typeof cell === 'number' || parseNumber(cell) !== null || parseImportDate(cell) !== null
  ).length;

  return firstText / first.length >= 0.6 && secondNumericOrDate > 0;
}

function normalizeHeaders(row: CellValue[]) {
  const used = new Map<string, number>();
  return row.map((cell, index) => {
    const base = String(cell ?? '').trim() || `Colonne ${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function genericHeaders(matrix: CellValue[][]) {
  const width = Math.max(...matrix.map((row) => row.length), 1);
  return Array.from({ length: width }, (_, index) => `Colonne ${index + 1}`);
}

/**
 * Construit une table à partir d'une matrice. `forceHeader` permet à l'UI de
 * corriger la détection automatique sans reparser le fichier.
 */
export function tableFromMatrix(
  matrix: CellValue[][],
  fileName: string,
  sheetName: string | null = null,
  sheetNames: string[] = [],
  forceHeader?: boolean
): ParsedTable {
  const cleaned = matrix.map((row) => row.map((cell) => (cell === undefined ? null : cell)));
  const firstIndex = Math.max(0, firstNonEmptyRow(cleaned));
  const hasHeader = forceHeader ?? detectHeader(cleaned);
  const headerRow = hasHeader ? cleaned[firstIndex] : [];
  const headers = hasHeader ? normalizeHeaders(headerRow) : genericHeaders(cleaned);
  const dataRows = hasHeader ? cleaned.slice(firstIndex + 1) : cleaned.slice(firstIndex);

  const rows: TableRow[] = dataRows
    .filter((row) => row.some((cell) => !isEmptyCell(cell)))
    .map((row) => {
      const output: TableRow = {};
      headers.forEach((header, index) => {
        output[header] = row[index] ?? null;
      });
      return output;
    });

  return { fileName, sheetName, sheetNames, headers, rows, hasHeader, raw: cleaned };
}

/** Reconstruit la table avec ou sans ligne d'en-tête. */
export function tableWithHeader(table: ParsedTable, hasHeader: boolean) {
  return tableFromMatrix(table.raw, table.fileName, table.sheetName, table.sheetNames, hasHeader);
}

/** Décode un buffer en UTF-8, avec repli Windows-1252 pour les vieux exports Excel. */
export function decodeBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('\uFFFD')) return utf8;
  try {
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return utf8;
  }
}

async function parseDelimitedText(text: string, fileName: string): Promise<ParsedTable> {
  const Papa = (await import('papaparse')).default;
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false
  });

  if (result.errors.length && result.data.length === 0) {
    throw new Error(result.errors[0]?.message ?? 'Fichier illisible.');
  }

  return tableFromMatrix(result.data, fileName);
}

async function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  sheetName?: string
): Promise<ParsedTable> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) throw new Error('Le classeur ne contient aucune feuille.');

  const selected = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = workbook.Sheets[selected];
  if (!sheet) throw new Error(`Feuille « ${selected} » introuvable.`);

  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false
  });

  return tableFromMatrix(matrix, fileName, selected, sheetNames);
}

function tableFromJson(json: unknown, fileName: string): ParsedTable {
  if (Array.isArray(json) && json.every((item) => Array.isArray(item))) {
    return tableFromMatrix(json as CellValue[][], fileName);
  }

  const rawRows = findProjectsArray(json);
  if (!rawRows.length) {
    throw new Error('Aucun tableau de marchés trouvé dans ce fichier JSON.');
  }

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rawRows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }

  const rows: TableRow[] = rawRows.map((row) => {
    const output: TableRow = {};
    for (const header of headers) {
      const value = row[header];
      if (value === null || value === undefined) output[header] = null;
      else if (value instanceof Date) output[header] = value;
      else if (typeof value === 'object') output[header] = JSON.stringify(value);
      else output[header] = value as CellValue;
    }
    return output;
  });

  const raw: CellValue[][] = [headers, ...rows.map((row) => headers.map((header) => row[header]))];

  return {
    fileName,
    sheetName: null,
    sheetNames: [],
    headers,
    rows,
    hasHeader: true,
    raw
  };
}

/** Analyse un fichier CSV, TXT, TSV, XLS, XLSX ou JSON. */
export async function parseImportFile(file: File, sheetName?: string): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  const extension = name.split('.').pop() ?? '';

  if (extension === 'json' || file.type === 'application/json') {
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new Error('Le fichier JSON est invalide.');
    }
    return tableFromJson(json, file.name);
  }

  if (extension === 'xlsx' || extension === 'xls' || /spreadsheet|ms-excel/.test(file.type)) {
    return parseExcelBuffer(await file.arrayBuffer(), file.name, sheetName);
  }

  if (
    ['csv', 'txt', 'tsv'].includes(extension) ||
    file.type.startsWith('text/') ||
    file.type === ''
  ) {
    return parseDelimitedText(decodeBuffer(await file.arrayBuffer()), file.name);
  }

  throw new Error('Format non pris en charge. Utilisez CSV, XLSX, XLS, TXT ou JSON.');
}

/** Analyse du texte collé (CSV/TSV). */
export async function parsePastedText(
  text: string,
  fileName = 'Données collées'
): Promise<ParsedTable> {
  if (!text.trim()) throw new Error('Collez des données avant de lancer l’analyse.');
  return parseDelimitedText(text, fileName);
}
