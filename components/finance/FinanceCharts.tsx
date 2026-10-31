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
  revenue: "#2f7f8c",
  cost: "#c2610c",
  pipeline: "#8aa9c4",
  net: "#1e2c40",
  grid: "#dde5ec",
  axis: "#4f6178",
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

/** Shade a hex colour toward white (amt > 0) or black (amt < 0). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return `rgb(${ch.join(",")})`;
}

/**
 * Soft 3D "clay pill" bars, as in the reference: each bar is lit from the left
 * (lighter edge, darker right edge) with a glossy cap, plus a soft drop shadow.
 */
function ClayBarDefs({ ids }: { ids: Record<string, string> }) {
  return (
    <defs>
      {Object.entries(ids).map(([id, color]) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={shade(color, 0.32)} />
          <stop offset="38%" stopColor={shade(color, 0.12)} />
          <stop offset="100%" stopColor={shade(color, -0.18)} />
        </linearGradient>
      ))}
      <filter id="clayBarShadow" x="-30%" y="-10%" width="160%" height="130%">
        <feDropShadow dx="1.5" dy="3" stdDeviation="2.2" floodColor="#1e2c40" floodOpacity="0.28" />
      </filter>
    </defs>
  );
}
const CLAY = { revenue: "clayRevenue", cost: "clayCost", pipeline: "clayPipeline" };

const axisProps = {
  tick: { fontSize: 11, fill: CHART.axis },
  axisLine: false,
  tickLine: false,
} as const;

export function CashHistoryChart({ history, height = 280 }: { history: MonthPoint[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Cash collected versus expenses for the last 12 months">
      <ResponsiveContainer>
        <ComposedChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
          <ClayBarDefs ids={{ [CLAY.revenue]: CHART.revenue, [CLAY.cost]: CHART.cost }} />
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => monthLabel(k)} {...axisProps} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v)} width={64} {...axisProps} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(20,70,35,0.05)" }} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Bar dataKey="collected" name="Collected" fill={`url(#${CLAY.revenue})`} stroke="none" radius={[11, 11, 5, 5]} maxBarSize={22} filter="url(#clayBarShadow)" legendType="circle" />
          <Bar dataKey="expenses" name="Expenses" fill={`url(#${CLAY.cost})`} stroke="none" radius={[11, 11, 5, 5]} maxBarSize={22} filter="url(#clayBarShadow)" legendType="circle" />
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
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
          <ClayBarDefs ids={{ [CLAY.revenue]: CHART.revenue, [CLAY.cost]: CHART.cost, [CLAY.pipeline]: CHART.pipeline }} />
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => monthLabel(k)} {...axisProps} />
          <YAxis tickFormatter={(v) => formatCompactCurrency(v)} width={64} {...axisProps} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgba(20,70,35,0.05)" }} />
          <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke={CHART.axis} strokeOpacity={0.4} />
          <Bar dataKey="committed" name="Committed revenue" stackId="rev" fill={`url(#${CLAY.revenue})`} stroke="none" radius={[0, 0, 6, 6]} maxBarSize={26} filter="url(#clayBarShadow)" legendType="circle" />
          <Bar dataKey="pipeline" name="Weighted pipeline" stackId="rev" fill={`url(#${CLAY.pipeline})`} stroke="none" radius={[13, 13, 0, 0]} maxBarSize={26} filter="url(#clayBarShadow)" legendType="circle" />
          <Bar dataKey="cost" name="Total cost" fill={`url(#${CLAY.cost})`} stroke="none" radius={[7, 7, 3, 3]} maxBarSize={14} filter="url(#clayBarShadow)" legendType="circle" />
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
    { label: "Current", value: aging.current, color: "#2f7f8c" },
    { label: "1–30", value: aging.d1_30, color: "#a9b8e0" },
    { label: "31–60", value: aging.d31_60, color: "#d97706" },
    { label: "61–90", value: aging.d61_90, color: "#c2410c" },
    { label: "90+", value: aging.d90_plus, color: "#b91c1c" },
  ];
  const total = parts.reduce((t, p) => t + p.value, 0);
  return (
    <div className="space-y-3">
      <div className="clay-track flex h-3.5 w-full overflow-hidden rounded-full gap-[2px]">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div key={p.label} className="clay-segment" title={`${p.label}: ${formatCurrency(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} />
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
