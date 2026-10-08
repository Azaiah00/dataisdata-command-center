"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import { monthLabel } from "@/lib/finance/dates";
import type { MonthPoint } from "@/lib/finance/summary";
import type { ForecastMonth } from "@/lib/finance/forecast";

/** Validated categorical palette (light + dark pass): revenue / costs / pipeline; net uses ink. */
export const CHART = {
  revenue: "#05893e",
  cost: "#c2610c",
  pipeline: "#4f6fd1",
  net: "#193b22",
  grid: "#e7ece8",
  axis: "#6b776d",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-lg text-xs space-y-1 min-w-[11rem]">
      <p className="font-semibold text-foreground">{monthLabel(label, "long")}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-foreground">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const axisProps = {
  tick: { fontSize: 11, fill: CHART.axis },
  axisLine: false,
  tickLine: false,
} as const;

export function CashHistoryChart({ history, height = 280 }: { history: MonthPoint[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Cash collected versus expenses for the last 12 months">
      <ResponsiveContainer>
        <ComposedChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => monthLabel(k)} {...axisProps} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v)} width={64} {...axisProps} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(20,70,35,0.05)" }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Bar dataKey="collected" name="Collected" fill={CHART.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expenses" name="Expenses" fill={CHART.cost} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Line dataKey="net" name="Net" stroke={CHART.net} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ months, height = 300 }: { months: ForecastMonth[]; height?: number }) {
  const data = months.map((m) => ({
    key: m.key,
    committed: Math.round(m.placementRevenue + m.advisoryRevenue),
    pipeline: Math.round(m.pipelineRevenue),
    cost: Math.round(m.directCost + m.overhead),
    net: Math.round(m.netProfit),
  }));
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Revenue, cost and net profit forecast by month">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => monthLabel(k)} {...axisProps} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v)} width={64} {...axisProps} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(20,70,35,0.05)" }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Bar dataKey="committed" name="Committed revenue" stackId="rev" fill={CHART.revenue} maxBarSize={26} />
          <Bar dataKey="pipeline" name="Weighted pipeline" stackId="rev" fill={CHART.pipeline} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="cost" name="Total cost" fill={CHART.cost} radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Line dataKey="net" name="Net profit" stroke={CHART.net} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashLineChart({ months, height = 220 }: { months: ForecastMonth[]; height?: number }) {
  const data = months.map((m) => ({ key: m.key, cash: Math.round(m.cumulativeCash) }));
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Projected cash balance by month">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => monthLabel(k)} {...axisProps} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v)} width={64} {...axisProps} />
          <Tooltip content={<MoneyTooltip />} />
          <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
          <Line dataKey="cash" name="Projected cash" stroke={CHART.revenue} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal stacked bar for AR aging buckets. */
export function AgingBar({ aging }: { aging: { current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number } }) {
  const parts = [
    { label: "Current", value: aging.current, color: "#05893e" },
    { label: "1–30", value: aging.d1_30, color: "#a3a35a" },
    { label: "31–60", value: aging.d31_60, color: "#d97706" },
    { label: "61–90", value: aging.d61_90, color: "#c2410c" },
    { label: "90+", value: aging.d90_plus, color: "#b91c1c" },
  ];
  const total = parts.reduce((t, p) => t + p.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted gap-[2px]">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div key={p.label} title={`${p.label}: ${formatCurrency(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
            ))}
      </div>
      <div className="grid grid-cols-5 gap-2 text-xs">
        {parts.map((p) => (
          <div key={p.label}>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
              {p.label}
              {p.label !== "Current" ? " days" : ""}
            </p>
            <p className="font-semibold text-foreground mt-0.5">{formatCompactCurrency(p.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
