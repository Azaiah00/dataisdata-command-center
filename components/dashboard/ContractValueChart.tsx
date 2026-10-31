"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

/** Pill colours from the reference's weekly bars, light to deep: mist, aqua, sea, deep teal, steel, slate teal, indigo. */
const PILLS = ["#d6e6ee", "#8fd0dc", "#6fbcb8", "#2e7487", "#7fa8d4", "#4a96a2", "#5a5aa8"];

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return `rgb(${ch.join(",")})`;
}

/** Contract value by engagement start year, drawn as soft 3D clay pills like the reference's "Listening Overview". */
export function ContractValueChart({ points, height = 260 }: { points: { label: string; value: number; count: number }[]; height?: number }) {
  if (!points.length) return <p className="text-sm text-muted-foreground py-10 text-center">No engagements with a start date and value yet.</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
          <defs>
            {PILLS.map((c, i) => (
              <linearGradient key={c} id={`cvPill${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={shade(c, 0.3)} />
                <stop offset="40%" stopColor={shade(c, 0.08)} />
                <stop offset="100%" stopColor={shade(c, -0.16)} />
              </linearGradient>
            ))}
            <filter id="cvPillShadow" x="-40%" y="-10%" width="180%" height="130%">
              <feDropShadow dx="2" dy="3" stdDeviation="2.4" floodColor="#1e2c40" floodOpacity="0.3" />
            </filter>
          </defs>
          <CartesianGrid stroke="rgba(30,44,64,0.08)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#4f6178", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#4f6178", fontSize: 12 }} tickFormatter={(v) => formatCompactCurrency(v)} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.35)", radius: 14 } as never}
            contentStyle={{ borderRadius: 12, border: "1px solid #d3dce5", boxShadow: "0 12px 30px -16px rgba(24,32,47,.4)", fontSize: 12 }}
            formatter={(v, _n, item) => [`${formatCurrency(Number(v))} · ${(item?.payload as { count: number })?.count ?? 0} engagements`, "Contract value"]}
          />
          <Bar dataKey="value" radius={[14, 14, 14, 14]} maxBarSize={30} filter="url(#cvPillShadow)" stroke="rgba(255,255,255,0.55)" strokeWidth={1}>
            {points.map((p, i) => (
              <Cell key={p.label} fill={`url(#cvPill${i % PILLS.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
