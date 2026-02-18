"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { STAGE_COLORS } from "@/lib/constants";

interface PipelineChartProps {
  data: { stage: string; value: number }[];
}

export function PipelineChart({ data }: PipelineChartProps) {
  // Convert Tailwind classes to hex colors for Recharts if needed, 
  // but for now we'll just use a set of default hexes that match the theme
  const colors: Record<string, string> = {
    Lead: "#64748b",
    Discovery: "#3b82f6",
    Proposal: "#6366f1",
    Negotiation: "#a855f7",
    Awarded: "#22c55e",
    Lost: "#ef4444",
  };

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="stage" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "#64748b" }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip 
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            formatter={(value: number | undefined) => [value != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : '', 'Value']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.stage] || "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
