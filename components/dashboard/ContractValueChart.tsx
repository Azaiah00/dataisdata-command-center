"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

/** Large slate area chart (reference "growth over time" panel) — contract value by engagement start year. */
export function ContractValueChart({ points, height = 260 }: { points: { label: string; value: number; count: number }[]; height?: number }) {
  if (!points.length) return <p className="text-sm text-muted-foreground py-10 text-center">No engagements with a start date and value yet.</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f7f8c" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#2f7f8c" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dde5ec" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#4f6178", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#4f6178", fontSize: 12 }} tickFormatter={(v) => formatCompactCurrency(v)} />
          <Tooltip
            cursor={{ stroke: "#a9b8e0", strokeDasharray: "4 4" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #d3dce5", boxShadow: "0 12px 30px -16px rgba(24,32,47,.4)", fontSize: 12 }}
            formatter={(v, _n, item) => [`${formatCurrency(Number(v))} · ${(item?.payload as { count: number })?.count ?? 0} engagements`, "Contract value"]}
          />
          <Area type="monotone" dataKey="value" stroke="#2f7f8c" strokeWidth={2.25} fill="url(#cvFill)" dot={{ r: 3.5, fill: "#fff", stroke: "#2f7f8c", strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
