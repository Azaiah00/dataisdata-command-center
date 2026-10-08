"use client";

import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSummary } from "@/lib/finance/summary";
import type { ForecastOptions, ForecastResult } from "@/lib/finance/forecast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ForecastChart, CashLineChart } from "@/components/finance/FinanceCharts";
import { monthLabel } from "@/lib/finance/dates";
import { cn, formatCompactCurrency, formatCurrency, num } from "@/lib/utils";
import { Info } from "lucide-react";

export function ForecastTab({
  data,
  summary,
  forecast,
  options,
  setOptions,
}: {
  data: FinanceData;
  summary: FinanceSummary;
  forecast: ForecastResult;
  options: ForecastOptions;
  setOptions: (o: ForecastOptions) => void;
}) {
  const set = (patch: Partial<ForecastOptions>) => setOptions({ ...options, ...patch });
  const t = forecast.totals;
  const target = num(data.settings.annual_revenue_target);
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Scenario</CardTitle>
          <CardDescription>Change the assumptions and every number below — and the PDF — updates instantly. Nothing is saved to your data.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="space-y-2">
            <Label>Horizon</Label>
            <Select value={String(options.months)} onValueChange={(v) => set({ months: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 6, 12, 18, 24].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              Pipeline win factor <span className="text-primary font-semibold">{options.pipelineWinFactor.toFixed(2)}×</span>
            </Label>
            <Slider min={0} max={2} step={0.05} value={[options.pipelineWinFactor]} onValueChange={([v]) => set({ pipelineWinFactor: v })} disabled={!options.includePipeline} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={options.includePipeline} onCheckedChange={(v) => set({ includePipeline: v })} /> Include weighted pipeline
            </label>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              Bill-rate change <span className="text-primary font-semibold">{options.billRateChangePct > 0 ? "+" : ""}{options.billRateChangePct}%</span>
            </Label>
            <Slider min={-20} max={20} step={1} value={[options.billRateChangePct]} onValueChange={([v]) => set({ billRateChangePct: v })} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={options.assumeExtensions} onCheckedChange={(v) => set({ assumeExtensions: v })} /> Assume every placement is extended
            </label>
          </div>
          <div className="space-y-2">
            <Label>New placements from next month</Label>
            <div className="grid grid-cols-4 gap-2">
              <Input type="number" min="0" max="50" value={options.newPlacements} onChange={(e) => set({ newPlacements: Math.max(0, Math.round(num(e.target.value))) })} aria-label="Number of new placements" />
              <Input type="number" min="0" value={options.newPlacementBillRate} onChange={(e) => set({ newPlacementBillRate: num(e.target.value) })} aria-label="Bill rate" title="Bill $/hr" />
              <Input type="number" min="0" value={options.newPlacementPayRate} onChange={(e) => set({ newPlacementPayRate: num(e.target.value) })} aria-label="Pay rate" title="Pay $/hr" />
              <Input type="number" min="0" value={options.newPlacementHours} onChange={(e) => set({ newPlacementHours: num(e.target.value) })} aria-label="Hours per week" title="Hours/week" />
            </div>
            <p className="text-[11px] text-muted-foreground">Count · bill $/hr · pay $/hr · hrs/week</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Revenue", value: t.revenue, sub: `${formatCompactCurrency(t.pipelineRevenue)} from pipeline` },
          { label: "Direct cost", value: t.directCost },
          { label: "Gross profit", value: t.grossProfit, sub: t.revenue > 0 ? `${((t.grossProfit / t.revenue) * 100).toFixed(1)}% margin` : undefined },
          { label: "Overhead", value: t.overhead },
          { label: "Net profit", value: t.netProfit, sub: t.revenue > 0 ? `${((t.netProfit / t.revenue) * 100).toFixed(1)}% net` : undefined, tone: t.netProfit < 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 shadow-sm border border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <p className={cn("text-xl font-bold mt-1", k.tone && "text-red-600")}>{formatCompactCurrency(k.value)}</p>
            {k.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {target > 0 && options.months >= 12 && (
        <p className="text-sm text-muted-foreground">
          Next 12 months vs your {formatCurrency(target)} annual target:{" "}
          <strong className={forecast.months.slice(0, 12).reduce((s, m) => s + m.revenue, 0) >= target ? "text-primary" : "text-amber-600"}>
            {((forecast.months.slice(0, 12).reduce((s, m) => s + m.revenue, 0) / target) * 100).toFixed(0)}%
          </strong>
        </p>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Revenue, cost and profit</CardTitle>
          <CardDescription>Committed = active/pending placements + remaining fixed-fee contract value</CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastChart months={forecast.months} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Projected cash</CardTitle>
          <CardDescription>
            Starting from {summary.cashEstimate === null ? "$0 (set your opening balance in Settings)" : formatCurrency(summary.cashEstimate)}; agencies pay on terms, contractors are paid as they work.
            {forecast.lowestCash && ` Low point ${formatCurrency(forecast.lowestCash.value)} in ${monthLabel(forecast.lowestCash.key, "long")}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashLineChart months={forecast.months} />
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Month</th>
              <th className="text-right px-3 py-3">Placements</th>
              <th className="text-right px-3 py-3">Fixed-fee</th>
              <th className="text-right px-3 py-3">Pipeline</th>
              <th className="text-right px-3 py-3">Direct cost</th>
              <th className="text-right px-3 py-3">Overhead</th>
              <th className="text-right px-3 py-3">Net profit</th>
              <th className="text-right px-3 py-3">Cash in</th>
              <th className="text-right px-3 py-3">Cash (end)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {forecast.months.map((m) => (
              <tr key={m.key}>
                <td className="px-4 py-2.5 font-medium">{monthLabel(m.key, "long")}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(m.placementRevenue)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(m.advisoryRevenue)}</td>
                <td className="px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(m.pipelineRevenue)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(m.directCost)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(m.overhead)}</td>
                <td className={cn("px-3 py-2.5 text-right font-semibold", m.netProfit < 0 ? "text-red-600" : "text-primary")}>{formatCurrency(m.netProfit)}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(m.cashIn)}</td>
                <td className={cn("px-3 py-2.5 text-right font-semibold", m.cumulativeCash < 0 && "text-red-600")}>{formatCurrency(m.cumulativeCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
            {forecast.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
            <li>A forecast is an estimate, not a guarantee — refresh it as placements, contracts and the pipeline change.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
