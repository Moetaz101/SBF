import { formatDateFr } from '@/lib/sbf/format';
import { planningPeriodLabel, planningStats } from '@/lib/sbf/planning';
import type { PlanningEntry } from '@/lib/sbf/types';

type PlanningReportProps = {
  entries: PlanningEntry[];
  todayISO: string;
  marketLabel: (entry: PlanningEntry) => string;
};

/** Rapport imprimable (Ctrl+P → Enregistrer au format PDF). */
export function PlanningReport({ entries, todayISO, marketLabel }: PlanningReportProps) {
  const stats = planningStats(entries);

  return (
    <div className='hidden bg-white p-8 text-black print:block'>
      <div className='mb-6 flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4'>
        <div>
          <p className='text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase'>
            SBF Pulse
          </p>
          <h1 className='mt-1 text-2xl font-bold'>Planning des remises d’offres</h1>
          <p className='mt-1 text-sm text-slate-600'>
            Période couverte : {planningPeriodLabel(entries)}
          </p>
        </div>
        <div className='text-right text-sm text-slate-600'>
          <p className='font-semibold text-slate-900'>Rapport planning</p>
          <p>
            {stats.total} élément{stats.total > 1 ? 's' : ''} · édité le {formatDateFr(todayISO)}
          </p>
          <p className='text-xs'>
            {stats.pending} en attente · {stats.accepted} retenue{stats.accepted > 1 ? 's' : ''} ·{' '}
            {stats.declined} refusée{stats.declined > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className='py-8 text-center text-sm text-slate-500'>Aucune planification à imprimer.</p>
      ) : (
        <table className='w-full border-collapse text-left text-[11px]'>
          <thead>
            <tr className='border-b-2 border-slate-900 bg-slate-100'>
              <th className='px-2 py-2 font-semibold'>Code</th>
              <th className='px-2 py-2 font-semibold'>Projet / offre</th>
              <th className='px-2 py-2 font-semibold'>Marché lié</th>
              <th className='px-2 py-2 font-semibold'>Client</th>
              <th className='px-2 py-2 font-semibold'>Début</th>
              <th className='px-2 py-2 font-semibold'>Fin</th>
              <th className='px-2 py-2 font-semibold'>Décision</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className='border-b border-slate-300 align-top'>
                <td className='px-2 py-2 font-mono font-semibold whitespace-nowrap'>
                  {entry.code}
                </td>
                <td className='px-2 py-2'>{entry.name}</td>
                <td className='px-2 py-2'>{marketLabel(entry)}</td>
                <td className='px-2 py-2'>{entry.client || '—'}</td>
                <td className='px-2 py-2 whitespace-nowrap'>{formatDateFr(entry.start_date)}</td>
                <td className='px-2 py-2 whitespace-nowrap'>{formatDateFr(entry.end_date)}</td>
                <td className='px-2 py-2 whitespace-nowrap'>{entry.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className='mt-6 border-t border-slate-300 pt-3 text-xs text-slate-500'>
        Document généré depuis SBF Pulse · Une planification couvre 7 jours maximum · Les codes
        T/CATÉGORIE/NUMÉRO/ANNÉE sont attribués automatiquement.
      </p>
    </div>
  );
}
