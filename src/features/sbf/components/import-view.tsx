'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { keys, useProjects } from '@/lib/sbf/api';
import { formatDateFr, formatDTCompact, toISODate } from '@/lib/sbf/format';
import {
  applyMapping,
  autoMapColumns,
  FIELD_DEFS_BY_NAME,
  resolveRows
} from '@/lib/sbf/import-map';
import { parseImportFile, parsePastedText, tableWithHeader } from '@/lib/sbf/import-parse';
import { importProjects } from '@/lib/sbf/import-run';
import { buildCsvTemplate } from '@/lib/sbf/import-template';
import type {
  CellValue,
  ColumnMapping,
  DuplicateMode,
  ImportField,
  ImportResult,
  ImportRow,
  MappingConfidence,
  ParsedTable,
  TableRow
} from '@/lib/sbf/import-types';
import { StatusBadge } from './badges';
import { JsonImportView } from './json-import';

type Step = 'file' | 'map' | 'review' | 'done';

type ReviewStats = {
  blocking: ImportRow[];
  skipped: ImportRow[];
  duplicates: ImportRow[];
  toImport: ImportRow[];
  warnings: number;
};

const STEPS: { key: Exclude<Step, 'done'>; label: string }[] = [
  { key: 'file', label: 'Fichier' },
  { key: 'map', label: 'Correspondance' },
  { key: 'review', label: 'Vérification' }
];

async function downloadTemplate() {
  try {
    downloadTextFile(
      await buildCsvTemplate(),
      'modele-import-marches.csv',
      'text/csv;charset=utf-8'
    );
  } catch {
    toast.error('Impossible de générer le modèle CSV.');
  }
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function ImportView() {
  const queryClient = useQueryClient();
  const { data: existingProjects, isLoading: existingLoading } = useProjects();
  const [step, setStep] = useState<Step>('file');
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('skip');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pasted, setPasted] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [batchId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `batch-${Date.now()}`
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mappedRows = useMemo(() => (table ? applyMapping(table, mappings) : []), [table, mappings]);

  const resolvedRows = useMemo(
    () =>
      resolveRows(mappedRows, {
        duplicateMode,
        existing: existingProjects ?? [],
        batchId,
        fileName: table?.fileName ?? 'import'
      }),
    [mappedRows, duplicateMode, existingProjects, batchId, table?.fileName]
  );

  const stats = useMemo<ReviewStats>(() => {
    const blocking = resolvedRows.filter((row) => !row.skipped && row.errors.length > 0);
    const skipped = resolvedRows.filter((row) => row.skipped);
    const duplicates = resolvedRows.filter((row) => row.duplicate !== 'none');
    const toImport = resolvedRows.filter(
      (row) => !row.skipped && (skipInvalid ? row.errors.length === 0 : true)
    );
    const warnings = resolvedRows.reduce((count, row) => count + row.warnings.length, 0);
    return { blocking, skipped, duplicates, toImport, warnings };
  }, [resolvedRows, skipInvalid]);

  function loadTable(next: ParsedTable) {
    setTable(next);
    setSheetName(next.sheetName);
    setMappings(autoMapColumns(next.headers, next.rows));
    setParseError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    setStep('map');
  }

  async function handleFile(next: File | undefined) {
    if (!next) return;
    setFile(next);
    setParsing(true);
    setParseError(null);
    try {
      loadTable(await parseImportFile(next));
    } catch (error) {
      setTable(null);
      setParseError(error instanceof Error ? error.message : String(error));
    } finally {
      setParsing(false);
    }
  }

  async function handleSheet(next: string) {
    if (!file || !next) return;
    setParsing(true);
    setParseError(null);
    try {
      loadTable(await parseImportFile(file, next));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    } finally {
      setParsing(false);
    }
  }

  function handleHeaderToggle() {
    if (!table) return;
    const next = tableWithHeader(table, !table.hasHeader);
    setTable(next);
    setMappings(autoMapColumns(next.headers, next.rows));
  }

  async function handlePaste() {
    setParsing(true);
    setParseError(null);
    try {
      loadTable(await parsePastedText(pasted));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : String(error));
    } finally {
      setParsing(false);
    }
  }

  function handleMappingChange(field: ImportField, column: string) {
    setMappings((current) =>
      current.map((mapping) =>
        mapping.field === field
          ? {
              ...mapping,
              column: column || null,
              confidence: column ? 'review' : 'ignored',
              score: column ? 100 : 0
            }
          : mapping
      )
    );
  }

  async function handleImport() {
    if (!stats.toImport.length) return;
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: stats.toImport.length });
    try {
      const nextResult = await importProjects(stats.toImport, (done, total) =>
        setProgress({ done, total })
      );
      if (skipInvalid) {
        const invalidSkipped = resolvedRows.filter(
          (row) => !row.skipped && row.errors.length > 0
        ).length;
        nextResult.skipped += invalidSkipped;
      }
      setResult(nextResult);
      setStep('done');
      await queryClient.invalidateQueries({ queryKey: keys.projects });
      toast.success(`${nextResult.inserted + nextResult.updated} marché(s) importé(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Échec de l’import.');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setStep('file');
    setTable(null);
    setMappings([]);
    setFile(null);
    setSheetName(null);
    setDuplicateMode('skip');
    setSkipInvalid(true);
    setParsing(false);
    setParseError(null);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setResult(null);
    setPasted('');
    setDragOver(false);
  }

  function handleDownloadErrors() {
    if (!result?.errors.length) return;
    const csv = [
      'Ligne,Erreur',
      ...result.errors.map((error) => `${error.row},${csvEscape(error.message)}`)
    ].join('\n');
    downloadTextFile(`\uFEFF${csv}`, 'erreurs-import-marches.csv', 'text/csv;charset=utf-8');
  }

  return (
    <div className='flex flex-col gap-4'>
      <Stepper step={step} />

      {step === 'file' && (
        <FileStep
          parsing={parsing}
          parseError={parseError}
          dragOver={dragOver}
          pasted={pasted}
          onFile={handleFile}
          onPaste={handlePaste}
          onPastedChange={setPasted}
          onDragOverChange={setDragOver}
          onTemplate={downloadTemplate}
          fileInputRef={fileInputRef}
        />
      )}

      {step === 'map' && table && (
        <MappingStep
          table={table}
          mappings={mappings}
          sheetName={sheetName}
          parsing={parsing}
          parseError={parseError}
          onMappingChange={handleMappingChange}
          onHeaderToggle={handleHeaderToggle}
          onSheetChange={handleSheet}
          onBack={handleReset}
          onContinue={() => setStep('review')}
        />
      )}

      {step === 'review' && table && (
        <ReviewStep
          rows={resolvedRows}
          stats={stats}
          duplicateMode={duplicateMode}
          onDuplicateModeChange={setDuplicateMode}
          skipInvalid={skipInvalid}
          onSkipInvalidChange={setSkipInvalid}
          existingLoading={existingLoading}
          importing={importing}
          progress={progress}
          onBack={() => setStep('map')}
          onImport={handleImport}
        />
      )}

      {step === 'done' && result && (
        <DoneStep result={result} onReset={handleReset} onDownloadErrors={handleDownloadErrors} />
      )}

      <details className='bg-card/50 rounded-xl border'>
        <summary className='cursor-pointer px-4 py-3 text-sm font-medium'>
          Import JSON du prototype (avec documents PDF)
        </summary>
        <div className='border-t p-4'>
          <JsonImportView />
        </div>
      </details>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const activeIndex = step === 'done' ? STEPS.length : STEPS.findIndex((item) => item.key === step);

  return (
    <ol className='flex flex-wrap items-center gap-2 text-xs'>
      {STEPS.map((item, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={item.key} className='flex items-center gap-2'>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                complete && 'border-transparent bg-[var(--chart-positive)] text-white',
                active && 'border-primary bg-primary text-primary-foreground',
                !complete && !active && 'text-muted-foreground'
              )}
            >
              {complete ? <Icons.check className='size-3.5' /> : index + 1}
            </span>
            <span
              className={cn('font-medium', active ? 'text-foreground' : 'text-muted-foreground')}
            >
              {item.label}
            </span>
            {index < STEPS.length - 1 && <span className='bg-border h-px w-6' />}
          </li>
        );
      })}
    </ol>
  );
}

function FileStep({
  parsing,
  parseError,
  dragOver,
  pasted,
  onFile,
  onPaste,
  onPastedChange,
  onDragOverChange,
  onTemplate,
  fileInputRef
}: {
  parsing: boolean;
  parseError: string | null;
  dragOver: boolean;
  pasted: string;
  onFile: (file: File | undefined) => void;
  onPaste: () => void;
  onPastedChange: (value: string) => void;
  onDragOverChange: (value: boolean) => void;
  onTemplate: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-2'>
        <div>
          <CardTitle>Importer des marchés</CardTitle>
          <p className='text-muted-foreground text-xs'>
            CSV, Excel, TXT ou JSON. Les colonnes sont détectées et associées automatiquement.
          </p>
        </div>
        <Button type='button' variant='outline' size='sm' onClick={onTemplate}>
          <Icons.download /> Modèle CSV
        </Button>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        <div
          role='button'
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            fileInputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDragOverChange(true);
          }}
          onDragLeave={() => onDragOverChange(false)}
          onDrop={(event) => {
            event.preventDefault();
            onDragOverChange(false);
            onFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
            parsing && 'pointer-events-none opacity-60'
          )}
        >
          {parsing ? (
            <>
              <Icons.spinner className='text-muted-foreground size-8 animate-spin' />
              <span className='font-medium'>Analyse du fichier…</span>
            </>
          ) : (
            <>
              <Icons.upload className='text-muted-foreground size-8' />
              <span className='font-medium'>Glissez un fichier ici ou cliquez pour choisir</span>
              <span className='text-muted-foreground text-xs'>CSV · XLSX · XLS · TXT · JSON</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv,.xlsx,.xls,.txt,.tsv,.json,application/json,text/csv'
            hidden
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>

        {parseError && (
          <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm'>
            {parseError}
          </div>
        )}

        <details className='rounded-lg border p-3'>
          <summary className='cursor-pointer text-sm font-medium'>Ou coller des données</summary>
          <div className='mt-3 flex flex-col gap-2'>
            <Textarea
              value={pasted}
              onChange={(event) => onPastedChange(event.target.value)}
              rows={6}
              placeholder='Collez ici un tableau CSV ou TSV…'
            />
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='w-fit'
              onClick={onPaste}
              disabled={!pasted.trim() || parsing}
            >
              <Icons.check /> Analyser le texte
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function MappingStep({
  table,
  mappings,
  sheetName,
  parsing,
  parseError,
  onMappingChange,
  onHeaderToggle,
  onSheetChange,
  onBack,
  onContinue
}: {
  table: ParsedTable;
  mappings: ColumnMapping[];
  sheetName: string | null;
  parsing: boolean;
  parseError: string | null;
  onMappingChange: (field: ImportField, column: string) => void;
  onHeaderToggle: () => void;
  onSheetChange: (sheet: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const mappedColumns = mappings
    .filter((mapping) => mapping.column)
    .map((mapping) => ({
      column: mapping.column as string,
      label: FIELD_DEFS_BY_NAME[mapping.field].label
    }));
  const mappedMappings = mappings.filter((mapping) => mapping.column);
  const ignoredMappings = mappings.filter((mapping) => !mapping.column);
  const unmapped = table.headers.filter(
    (header) => !mappings.some((mapping) => mapping.column === header)
  );
  const hasName = mappings.some((mapping) => mapping.field === 'name' && mapping.column);
  const hasCode = mappings.some((mapping) => mapping.field === 'code' && mapping.column);

  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-2'>
          <div className='min-w-0'>
            <CardTitle className='truncate'>{table.fileName}</CardTitle>
            <p className='text-muted-foreground text-xs'>
              {table.rows.length} ligne(s) · {table.headers.length} colonne(s)
              {table.sheetName ? ` · feuille ${table.sheetName}` : ''}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {table.sheetNames.length > 1 && (
              <NativeSelect
                value={sheetName ?? table.sheetName ?? ''}
                onChange={(event) => onSheetChange(event.target.value)}
                size='sm'
                aria-label='Feuille Excel'
                disabled={parsing}
              >
                {table.sheetNames.map((sheet) => (
                  <NativeSelectOption key={sheet} value={sheet}>
                    {sheet}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            <Button type='button' variant='outline' size='sm' onClick={onBack}>
              <Icons.refresh /> Changer de fichier
            </Button>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <label htmlFor='import-has-header' className='flex items-center gap-2 text-sm'>
            <input
              id='import-has-header'
              type='checkbox'
              className='accent-primary size-4'
              checked={table.hasHeader}
              onChange={onHeaderToggle}
            />
            La première ligne contient les en-têtes
          </label>

          {parsing && (
            <p className='text-muted-foreground flex items-center gap-2 text-sm'>
              <Icons.spinner className='size-4 animate-spin' /> Analyse de la feuille…
            </p>
          )}

          {parseError && (
            <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm'>
              {parseError}
            </div>
          )}

          {!hasName && !hasCode && (
            <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300'>
              Mappez au moins « Intitulé du marché » ou « Code du marché » pour identifier les
              lignes.
            </div>
          )}

          <div className='grid gap-2'>
            {mappedMappings.map((mapping) => (
              <MappingRow
                key={mapping.field}
                mapping={mapping}
                headers={table.headers}
                rows={table.rows}
                onMappingChange={onMappingChange}
              />
            ))}
          </div>

          {ignoredMappings.length > 0 && (
            <details className='rounded-lg border'>
              <summary className='cursor-pointer px-3 py-2 text-sm font-medium'>
                Champs non mappés ({ignoredMappings.length})
              </summary>
              <div className='grid gap-2 border-t p-3'>
                {ignoredMappings.map((mapping) => (
                  <MappingRow
                    key={mapping.field}
                    mapping={mapping}
                    headers={table.headers}
                    rows={table.rows}
                    onMappingChange={onMappingChange}
                  />
                ))}
              </div>
            </details>
          )}

          {unmapped.length > 0 && (
            <p className='text-muted-foreground text-xs'>
              Colonnes non mappées, conservées dans les données brutes : {unmapped.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu des premières lignes</CardTitle>
        </CardHeader>
        <CardContent className='min-w-0'>
          {mappedColumns.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Aucune colonne mappée pour le moment.</p>
          ) : (
            <div className='overflow-x-auto rounded-lg border'>
              <table className='w-full min-w-[640px] text-xs'>
                <thead className='bg-muted/50 text-muted-foreground text-left'>
                  <tr>
                    <th className='px-2 py-2'>Ligne</th>
                    {mappedColumns.map((column) => (
                      <th key={column.column} className='px-2 py-2'>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {table.rows.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className='text-muted-foreground px-2 py-2 tabular-nums'>{index + 2}</td>
                      {mappedColumns.map((column) => (
                        <td
                          key={column.column}
                          className='max-w-48 truncate px-2 py-2'
                          title={formatCell(row[column.column])}
                        >
                          {formatCell(row[column.column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button type='button' variant='outline' onClick={onBack}>
          <Icons.arrowLeft /> Fichier
        </Button>
        <Button type='button' onClick={onContinue}>
          Vérifier les données <Icons.arrowRight />
        </Button>
      </div>
    </div>
  );
}

function MappingRow({
  mapping,
  headers,
  rows,
  onMappingChange
}: {
  mapping: ColumnMapping;
  headers: string[];
  rows: TableRow[];
  onMappingChange: (field: ImportField, column: string) => void;
}) {
  const field = FIELD_DEFS_BY_NAME[mapping.field];
  const sample = firstSample(rows, mapping.column);

  return (
    <div className='grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] sm:items-center'>
      <div className='min-w-0'>
        <div className='text-sm font-medium'>
          {field.label}
          {field.required && <span className='text-destructive'> *</span>}
        </div>
        <div className='text-muted-foreground truncate text-xs'>
          {field.hint ?? `Champ ${field.kind}`}
        </div>
      </div>
      <NativeSelect
        value={mapping.column ?? ''}
        onChange={(event) => onMappingChange(mapping.field, event.target.value)}
        className='w-full'
        aria-label={`Colonne pour ${field.label}`}
      >
        <NativeSelectOption value=''>— Ignorer —</NativeSelectOption>
        {headers.map((header) => (
          <NativeSelectOption key={header} value={header}>
            {header}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className='flex items-center justify-between gap-2 sm:justify-end'>
        {sample && (
          <span className='text-muted-foreground max-w-40 truncate text-xs' title={sample}>
            {sample}
          </span>
        )}
        <MappingBadge confidence={mapping.confidence} />
      </div>
    </div>
  );
}

function ReviewStep({
  rows,
  stats,
  duplicateMode,
  onDuplicateModeChange,
  skipInvalid,
  onSkipInvalidChange,
  existingLoading,
  importing,
  progress,
  onBack,
  onImport
}: {
  rows: ImportRow[];
  stats: ReviewStats;
  duplicateMode: DuplicateMode;
  onDuplicateModeChange: (mode: DuplicateMode) => void;
  skipInvalid: boolean;
  onSkipInvalidChange: (value: boolean) => void;
  existingLoading: boolean;
  importing: boolean;
  progress: { done: number; total: number };
  onBack: () => void;
  onImport: () => void;
}) {
  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        <SummaryCard label='Lignes' value={rows.length} />
        <SummaryCard label='Prêtes' value={stats.toImport.length} tone='good' />
        <SummaryCard label='Doublons' value={stats.duplicates.length} tone='warn' />
        <SummaryCard label='Erreurs' value={stats.blocking.length} tone='bad' />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Options d’import</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='duplicate-mode'>Doublons</Label>
            <NativeSelect
              id='duplicate-mode'
              value={duplicateMode}
              onChange={(event) => onDuplicateModeChange(event.target.value as DuplicateMode)}
              className='w-full'
            >
              <NativeSelectOption value='skip'>
                Ignorer les doublons (recommandé)
              </NativeSelectOption>
              <NativeSelectOption value='update' disabled={existingLoading}>
                Mettre à jour les marchés existants
              </NativeSelectOption>
              <NativeSelectOption value='create'>Créer quand même</NativeSelectOption>
            </NativeSelect>
            {existingLoading && (
              <span className='text-muted-foreground text-xs'>
                Chargement des marchés existants…
              </span>
            )}
          </div>
          <label
            htmlFor='import-skip-invalid'
            aria-label='Ignorer les lignes invalides'
            className='flex items-start gap-2 rounded-lg border p-3 text-sm'
          >
            <input
              id='import-skip-invalid'
              type='checkbox'
              className='accent-primary mt-0.5 size-4'
              checked={skipInvalid}
              onChange={(event) => onSkipInvalidChange(event.target.checked)}
            />
            <span>
              <span className='font-medium'>Ignorer les lignes invalides</span>
              <span className='text-muted-foreground block text-xs'>
                Les lignes en erreur ne seront pas importées.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {!skipInvalid && stats.blocking.length > 0 && (
        <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm'>
          {stats.blocking.length} ligne(s) contiennent des erreurs. Corrigez-les ou activez l’option
          « Ignorer les lignes invalides ».
        </div>
      )}

      {stats.toImport.length === 0 && (
        <div className='rounded-lg border px-3 py-2 text-sm'>
          Aucune ligne ne sera importée. Vérifiez la correspondance des colonnes.
        </div>
      )}

      <Card>
        <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2'>
          <CardTitle>Vérification</CardTitle>
          <span className='text-muted-foreground text-xs'>{stats.warnings} avertissement(s)</span>
        </CardHeader>
        <CardContent className='min-w-0'>
          <div className='max-h-96 overflow-auto rounded-lg border'>
            <table className='w-full min-w-[760px] text-xs'>
              <thead className='bg-muted/50 text-muted-foreground sticky top-0 text-left'>
                <tr>
                  <th className='px-2 py-2'>Ligne</th>
                  <th className='px-2 py-2'>Intitulé</th>
                  <th className='px-2 py-2'>Client</th>
                  <th className='px-2 py-2'>Statut</th>
                  <th className='px-2 py-2'>Montant HT</th>
                  <th className='px-2 py-2'>Remise</th>
                  <th className='px-2 py-2'>Contrôles</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {rows.slice(0, 100).map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      row.skipped && 'opacity-60',
                      !row.skipped && row.errors.length > 0 && 'bg-destructive/5'
                    )}
                  >
                    <td className='text-muted-foreground px-2 py-2 tabular-nums'>
                      {row.rowNumber}
                    </td>
                    <td className='max-w-64 truncate px-2 py-2 font-medium' title={row.input.name}>
                      {row.input.name || '—'}
                    </td>
                    <td className='max-w-40 truncate px-2 py-2'>{row.input.client ?? '—'}</td>
                    <td className='px-2 py-2'>
                      <StatusBadge status={row.input.status} />
                    </td>
                    <td className='px-2 py-2 tabular-nums'>
                      {formatDTCompact(row.input.amount_ht)}
                    </td>
                    <td className='px-2 py-2'>{formatDateFr(row.input.date_remise_offre)}</td>
                    <td className='px-2 py-2'>
                      <div className='flex flex-wrap gap-1'>
                        {row.skipped && (
                          <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5'>
                            Ignoré
                          </span>
                        )}
                        {row.duplicate !== 'none' && (
                          <span
                            className='rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300'
                            title={row.duplicateOf}
                          >
                            Doublon
                          </span>
                        )}
                        {row.errors.map((error) => (
                          <span
                            key={error}
                            className='bg-destructive/10 text-destructive rounded-full px-2 py-0.5'
                          >
                            {error}
                          </span>
                        ))}
                        {row.warnings.map((warning) => (
                          <span
                            key={warning}
                            className='rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300'
                          >
                            {warning}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <p className='text-muted-foreground mt-2 text-xs'>
              Aperçu limité aux 100 premières lignes. Toutes les lignes seront traitées.
            </p>
          )}
        </CardContent>
      </Card>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button type='button' variant='outline' onClick={onBack} disabled={importing}>
          <Icons.arrowLeft /> Correspondance
        </Button>
        <div className='flex flex-wrap items-center gap-2'>
          {importing && (
            <span className='text-muted-foreground text-xs tabular-nums'>
              {progress.done}/{progress.total}
            </span>
          )}
          <LoadingButton
            type='button'
            onClick={onImport}
            loading={importing}
            loadingLabel='Import en cours…'
            disabled={stats.toImport.length === 0 || (!skipInvalid && stats.blocking.length > 0)}
          >
            <Icons.upload /> Importer {stats.toImport.length} marché(s)
          </LoadingButton>
        </div>
      </div>

      {importing && <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />}
    </div>
  );
}

function DoneStep({
  result,
  onReset,
  onDownloadErrors
}: {
  result: ImportResult;
  onReset: () => void;
  onDownloadErrors: () => void;
}) {
  return (
    <div className='flex flex-col gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Import terminé</CardTitle>
          <p className='text-muted-foreground text-xs'>
            Les données sont disponibles immédiatement dans les marchés et le tableau de bord.
          </p>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            <SummaryCard label='Créés' value={result.inserted} tone='good' />
            <SummaryCard label='Mis à jour' value={result.updated} tone='info' />
            <SummaryCard label='Ignorés' value={result.skipped} tone='muted' />
            <SummaryCard label='Échecs' value={result.failed} tone='bad' />
          </div>

          {result.errors.length > 0 && (
            <div className='rounded-lg border'>
              <div className='flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2'>
                <p className='text-sm font-medium'>Erreurs ({result.errors.length})</p>
                <Button type='button' size='sm' variant='outline' onClick={onDownloadErrors}>
                  <Icons.download /> CSV
                </Button>
              </div>
              <ul className='max-h-64 divide-y overflow-y-auto text-sm'>
                {result.errors.map((error, index) => (
                  <li key={`${error.row}-${index}`} className='flex flex-wrap gap-x-2 px-3 py-1.5'>
                    <span className='text-muted-foreground tabular-nums'>Ligne {error.row}</span>
                    <span className='text-destructive'>{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className='flex flex-wrap gap-2'>
            <Button type='button' onClick={onReset}>
              <Icons.upload /> Importer un autre fichier
            </Button>
            <Link href='/dashboard/marches' className={buttonVariants({ variant: 'outline' })}>
              <Icons.table /> Voir les marchés
            </Link>
            <Link href='/dashboard' className={buttonVariants({ variant: 'ghost' })}>
              Tableau de bord
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default'
}: {
  label: string;
  value: number;
  tone?: 'default' | 'good' | 'info' | 'warn' | 'bad' | 'muted';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-[var(--chart-positive)]'
      : tone === 'info'
        ? 'text-[var(--chart-info)]'
        : tone === 'warn'
          ? 'text-[var(--chart-warning)]'
          : tone === 'bad'
            ? 'text-destructive'
            : tone === 'muted'
              ? 'text-muted-foreground'
              : 'text-foreground';

  return (
    <div className='rounded-lg border p-3'>
      <div className={cn('text-2xl font-semibold tabular-nums', toneClass)}>{value}</div>
      <div className='text-muted-foreground text-xs'>{label}</div>
    </div>
  );
}

function MappingBadge({ confidence }: { confidence: MappingConfidence }) {
  if (confidence === 'auto') {
    return (
      <span className='rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300'>
        Auto
      </span>
    );
  }
  if (confidence === 'review') {
    return (
      <span className='rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300'>
        À vérifier
      </span>
    );
  }
  return (
    <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]'>
      Ignoré
    </span>
  );
}

function firstSample(rows: TableRow[], column: string | null) {
  if (!column) return '';
  for (const row of rows) {
    const value = row[column];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return formatCell(value);
    }
  }
  return '';
}

function formatCell(value: CellValue) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return toISODate(value);
  return String(value);
}
