'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Lightweight shadcn-style chart primitives.
 *
 * The config maps a data key to a label and a CSS color. Colors can be
 * theme variables (`var(--chart-positive)`) so charts follow the active theme
 * and dark mode automatically.
 */
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
    icon?: React.ComponentType;
  }
>;

type ChartContextValue = { config: ChartConfig };

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ReactNode;
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  const colorVars = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => Boolean(item.color))
      .map(([key, item]) => [`--color-${key}`, item.color as string])
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          'flex aspect-video justify-center text-xs',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
          '[&_.recharts-cartesian-grid_line]:stroke-border/60',
          '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
          '[&_.recharts-dot[stroke="#fff"]]:stroke-transparent',
          '[&_.recharts-layer]:outline-none',
          '[&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-border',
          '[&_.recharts-radial-bar-background-sector]:fill-muted',
          '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60',
          '[&_.recharts-reference-line_[stroke="#ccc"]]:stroke-border',
          '[&_.recharts-sector[stroke="#fff"]]:stroke-transparent',
          '[&_.recharts-sector]:outline-none',
          '[&_.recharts-surface]:outline-none',
          className
        )}
        style={{ ...colorVars, ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

type TooltipItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
};

type TooltipContentProps = React.ComponentProps<'div'> & {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (value: React.ReactNode, payload: ReadonlyArray<TooltipItem>) => React.ReactNode;
  formatter?: (
    value: unknown,
    name: string,
    item: TooltipItem,
    index: number,
    payload: ReadonlyArray<TooltipItem>
  ) => React.ReactNode;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  hideIndicator = false,
  indicator = 'dot',
  labelKey,
  labelFormatter,
  formatter
}: TooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const labelValue = labelKey
    ? (payload[0]?.payload?.[labelKey] as React.ReactNode | undefined)
    : label;

  return (
    <div
      className={cn(
        'border-border/60 bg-background/95 text-foreground grid min-w-32 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl backdrop-blur',
        className
      )}
    >
      {!hideLabel && labelValue !== undefined && labelValue !== null && (
        <div className='text-muted-foreground font-medium'>
          {labelFormatter ? labelFormatter(labelValue, payload) : labelValue}
        </div>
      )}
      <div className='grid gap-1'>
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const itemConfig = config[key] ?? config[String(item.name ?? '')];
          const itemLabel = itemConfig?.label ?? item.name ?? key;
          const color =
            item.color ??
            item.fill ??
            (item.payload?.fill as string | undefined) ??
            itemConfig?.color ??
            'var(--chart-neutral)';
          const value = formatter
            ? formatter(item.value ?? '', String(itemLabel), item, index, payload)
            : item.value;

          return (
            <div key={`${key}-${index}`} className='flex items-center gap-2'>
              {!hideIndicator && (
                <span
                  className={cn(
                    'shrink-0 rounded-[2px]',
                    indicator === 'dot' && 'size-2 rounded-full',
                    indicator === 'line' && 'h-0.5 w-3',
                    indicator === 'dashed' && 'h-0.5 w-3 border-t border-dashed bg-transparent'
                  )}
                  style={{
                    backgroundColor: indicator === 'dashed' ? undefined : color,
                    borderColor: color
                  }}
                />
              )}
              <span className='text-muted-foreground'>{itemLabel}</span>
              <span className='text-foreground ml-auto font-mono font-medium tabular-nums'>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type LegendItem = {
  value?: string | number;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};

type LegendContentProps = React.ComponentProps<'div'> & {
  payload?: ReadonlyArray<LegendItem>;
  verticalAlign?: 'top' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string;
};

function ChartLegendContent({
  className,
  payload,
  verticalAlign = 'bottom',
  hideIcon = false,
  nameKey
}: LegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className
      )}
    >
      {payload.map((item, index) => {
        const key = String(
          nameKey ? item.payload?.[nameKey] : (item.dataKey ?? item.value ?? index)
        );
        const itemConfig = config[key] ?? config[String(item.value ?? '')];
        return (
          <div key={`${key}-${index}`} className='flex items-center gap-1.5'>
            {!hideIcon && (
              <span
                className='size-2 shrink-0 rounded-[2px]'
                style={{
                  backgroundColor: item.color ?? itemConfig?.color ?? 'var(--chart-neutral)'
                }}
              />
            )}
            <span className='text-muted-foreground'>{itemConfig?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

const LegendContent = ChartLegendContent as unknown as React.ComponentType<
  React.ComponentProps<typeof RechartsPrimitive.Legend>
>;

function ChartTooltip({
  formatter,
  ...props
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  formatter?: TooltipContentProps['formatter'];
}) {
  return (
    <RechartsPrimitive.Tooltip {...props} content={<ChartTooltipContent formatter={formatter} />} />
  );
}

function ChartLegend(props: React.ComponentProps<typeof RechartsPrimitive.Legend>) {
  return <RechartsPrimitive.Legend content={<LegendContent />} {...props} />;
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  useChart
};
