'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { formatDTCompact } from '@/lib/sbf/format';
import { STATUS_CHART_COLORS } from './badges';

export type AreaSeries = {
  key: string;
  label: string;
  color: string;
  gradientId: string;
};

export function AreaSeriesChart({
  data,
  series,
  yTickFormatter,
  tooltipFormatter,
  target,
  height = 'h-64'
}: {
  data: Record<string, string | number>[];
  series: AreaSeries[];
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: unknown) => string;
  target?: { value: number; label: string };
  height?: string;
}) {
  const config: ChartConfig = Object.fromEntries(
    series.map((item) => [item.key, { label: item.label, color: item.color }])
  );

  return (
    <ChartContainer config={config} className={cn('aspect-auto w-full', height)}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((item) => (
            <linearGradient key={item.gradientId} id={item.gradientId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor={`var(--color-${item.key})`} stopOpacity={0.35} />
              <stop offset='95%' stopColor={`var(--color-${item.key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray='3 3' />
        <XAxis dataKey='month' tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={yTickFormatter}
          fontSize={11}
        />
        <ChartTooltip
          formatter={tooltipFormatter ? (value) => tooltipFormatter(value) : undefined}
        />
        {target && (
          <ReferenceLine
            y={target.value}
            stroke='var(--chart-negative)'
            strokeDasharray='4 4'
            label={{
              value: target.label,
              position: 'insideTopRight',
              fill: 'var(--muted-foreground)',
              fontSize: 11
            }}
          />
        )}
        {series.map((item) => (
          <Area
            key={item.key}
            type='monotone'
            dataKey={item.key}
            stroke={`var(--color-${item.key})`}
            fill={`url(#${item.gradientId})`}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

export function StatusDonut({
  data,
  metric,
  onMetricChange,
  total,
  onSelect
}: {
  data: { status: string; count: number; amount: number }[];
  metric: 'count' | 'amount';
  onMetricChange: (metric: 'count' | 'amount') => void;
  total: number;
  onSelect: (status: string) => void;
}) {
  const chartData = data.map((row) => ({
    status: row.status,
    value: metric === 'count' ? row.count : row.amount
  }));

  return (
    <Card>
      <CardHeader className='flex flex-row items-start justify-between gap-3'>
        <CardTitle>Répartition par statut</CardTitle>
        <div className='bg-muted inline-flex rounded-lg p-0.5'>
          <button
            type='button'
            onClick={() => onMetricChange('count')}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              metric === 'count'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Nombre
          </button>
          <button
            type='button'
            onClick={() => onMetricChange('amount')}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              metric === 'amount'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Montant
          </button>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        <div className='relative h-52'>
          <ChartContainer config={{}} className='h-full w-full'>
            <PieChart>
              <Pie
                data={chartData}
                dataKey='value'
                nameKey='status'
                innerRadius={58}
                outerRadius={84}
                paddingAngle={2}
                stroke='none'
              >
                {chartData.map((row) => (
                  <Cell
                    key={row.status}
                    fill={STATUS_CHART_COLORS[row.status] ?? 'var(--chart-neutral)'}
                  />
                ))}
              </Pie>
              <ChartTooltip
                formatter={(value) =>
                  metric === 'count' ? `${Number(value)} marché(s)` : formatDTCompact(Number(value))
                }
              />
            </PieChart>
          </ChartContainer>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <span className='text-2xl font-semibold tabular-nums'>
              {metric === 'count' ? total : formatDTCompact(total)}
            </span>
            <span className='text-muted-foreground text-xs'>
              {metric === 'count' ? 'marchés' : 'HT total'}
            </span>
          </div>
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {data.map((row) => (
            <button
              key={row.status}
              type='button'
              onClick={() => onSelect(row.status)}
              className='hover:bg-muted flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs'
            >
              <span
                className='size-2 rounded-full'
                style={{
                  backgroundColor: STATUS_CHART_COLORS[row.status] ?? 'var(--chart-neutral)'
                }}
              />
              {row.status} · {metric === 'count' ? row.count : formatDTCompact(row.amount)}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopProjects({
  data,
  onSelect
}: {
  data: { id: string; name: string; value: number; status: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 marchés (M DT HT)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length ? (
          <ChartContainer
            config={{ value: { label: 'Montant HT', color: 'var(--chart-info)' } }}
            className='h-64 w-full'
          >
            <BarChart
              data={data}
              layout='vertical'
              margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray='3 3' horizontal={false} />
              <XAxis
                type='number'
                tickFormatter={(value) => `${value} M`}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type='category'
                dataKey='name'
                width={150}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip formatter={(value) => `${Number(value).toFixed(2)} M DT`} />
              <Bar dataKey='value' radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {data.map((row) => (
                  <Cell
                    key={row.id}
                    fill={STATUS_CHART_COLORS[row.status] ?? 'var(--chart-info)'}
                    className='cursor-pointer'
                    onClick={() => onSelect(row.id)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className='text-muted-foreground text-sm'>Aucun montant renseigné.</p>
        )}
      </CardContent>
    </Card>
  );
}
