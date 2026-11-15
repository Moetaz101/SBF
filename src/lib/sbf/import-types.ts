import type { Project, ProjectInput } from './types';

export type CellValue = string | number | boolean | Date | null | undefined;
export type TableRow = Record<string, CellValue>;

export interface ParsedTable {
  fileName: string;
  sheetName: string | null;
  sheetNames: string[];
  headers: string[];
  rows: TableRow[];
  hasHeader: boolean;
  raw: CellValue[][];
}

export type ImportField = keyof ProjectInput;
export type FieldKind = 'text' | 'number' | 'percent' | 'date' | 'status';

export interface ImportFieldDef {
  name: ImportField;
  label: string;
  kind: FieldKind;
  aliases: string[];
  required?: boolean;
  hint?: string;
}

export type MappingConfidence = 'auto' | 'review' | 'ignored';

export interface ColumnMapping {
  field: ImportField;
  column: string | null;
  confidence: MappingConfidence;
  score: number;
}

export interface MappedRow {
  rowNumber: number;
  values: Partial<ProjectInput>;
  present: Set<ImportField>;
  unknown: Record<string, CellValue>;
  errors: string[];
  warnings: string[];
}

export type DuplicateMode = 'skip' | 'update' | 'create';

export interface ResolveOptions {
  duplicateMode: DuplicateMode;
  existing: Project[];
  batchId: string;
  fileName: string;
}

export interface ImportRow {
  rowNumber: number;
  input: ProjectInput;
  errors: string[];
  warnings: string[];
  duplicate: 'none' | 'file' | 'existing';
  duplicateOf?: string;
  skipped: boolean;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
}
