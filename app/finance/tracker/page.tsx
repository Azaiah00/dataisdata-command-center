"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfButton } from "@/components/ui/PdfButton";
import { useFinance } from "@/components/finance/useFinance";
import { useAccess } from "@/components/auth/AccessProvider";
import { buildForecast, DEFAULT_FORECAST_OPTIONS, type ForecastOptions } from "@/lib/finance/forecast";
import { buildInsights } from "@/lib/finance/insights";
import { exportTrackerReportPdf, exportListPdf } from "@/lib/pdf/reports";
import { OverviewTab } from "@/components/finance/tracker/OverviewTab";
import { PlacementsTab } from "@/components/finance/tracker/PlacementsTab";
import { HoursTab } from "@/components/finance/tracker/HoursTab";
import { IncomeTab } from "@/components/finance/tracker/IncomeTab";
import { BudgetsTab } from "@/components/finance/tracker/BudgetsTab";
import { ForecastTab } from "@/components/finance/tracker/ForecastTab";
import { InsightsTab } from "@/components/finance/tracker/InsightsTab";
import { ToolsTab } from "@/components/finance/tracker/ToolsTab";
import { FieldsTab } from "@/components/finance/tracker/FieldsTab";
import { SettingsTab } from "@/components/finance/tracker/SettingsTab";
import { monthLabel } from "@/lib/finance/dates";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { DatabaseZap, LayoutDashboard, Users, Clock, HandCoins, PiggyBank, LineChart, Lightbulb, Wrench, ListPlus, Settings2 } from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "placements", label: "Placements", icon: Users },
  { key: "hours", label: "Hours & Billing", icon: Clock },
  { key: "income", label: "Other Income", icon: HandCoins },
  { key: "budgets", label: "Budgets", icon: PiggyBank },
  { key: "forecast", label: "Forecast", icon: LineChart },
  { key: "advice", label: "Advice", icon: Lightbulb },
  { key: "tools", label: "Calculators", icon: Wrench },
  { key: "fields", label: "Custom Fields", icon: ListPlus },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

function TrackerInner() {
  const { data, summary, loading, error, reload } = useFinance();
  const { realUser } = useAccess();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = params.get("tab") || "overview";
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";
  const [options, setOptions] = useState<ForecastOptions>(DEFAULT_FORECAST_OPTIONS);

  const forecast = useMemo(
    () => (data && summary ? buildForecast(data, options, summary.cashEstimate, summary.history.map((h) => h.collected)) : null),
    [data, summary, options]
  );
  const insights = useMemo(() => (data && summary ? buildInsights(data, summary, forecast) : []), [data, summary, forecast]);

  const goTo = (t: string) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!data || !summary || !forecast) return <p className="text-sm text-red-600">{error || "Could not load finance data."}</p>;

  async function exportForecastPdf() {
    if (!forecast) return;
    await exportListPdf({
      title: "Financial Forecast",
      subtitle: `${forecast.months.length} months · pipeline ${options.includePipeline ? `${options.pipelineWinFactor.toFixed(2)}x` : "excluded"} · bill rates ${options.billRateChangePct >= 0 ? "+" : ""}${options.billRateChangePct}%`,
      preparedBy: realUser?.full_name,
      landscape: true,
      kpis: [
        { label: "Revenue", value: formatCompactCurrency(forecast.totals.revenue) },
        { label: "Gross profit", value: formatCompactCurrency(forecast.totals.grossProfit) },
        { label: "Net profit", value: formatCompactCurrency(forecast.totals.netProfit), tone: forecast.totals.netProfit >= 0 ? "good" : "bad" },
        { label: "Lowest cash", value: forecast.lowestCash ? formatCompactCurrency(forecast.lowestCash.value) : "—", tone: forecast.lowestCash && forecast.lowestCash.value < 0 ? "bad" : "default" },
      ],
      columns: ["Month", "Placements", "Fixed-fee", "Pipeline", "Direct cost", "Overhead", "Net profit", "Cash in", "Cash (end)"],
      rows: forecast.months.map((m) => [
        monthLabel(m.key, "long"),
        formatCurrency(m.placementRevenue),
        formatCurrency(m.advisoryRevenue),
        formatCurrency(m.pipelineRevenue),
        formatCurrency(m.directCost),
        formatCurrency(m.overhead),
        formatCurrency(m.netProfit),
        formatCurrency(m.cashIn),
        formatCurrency(m.cumulativeCash),
      ]),
      alignRight: [1, 2, 3, 4, 5, 6, 7, 8],
      filename: "DataIsData-Forecast",
      notes: forecast.assumptions.map((a) => `• ${a}`),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Finance</p>
          <h1 className="text-2xl font-bold text-foreground">Finance Tracker</h1>
          <p className="text-muted-foreground">Placements, margin, billing, budgets, forecasts and advice — all calculated from live portal data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "forecast" && <PdfButton onExport={exportForecastPdf} label="Forecast PDF" />}
          {tab === "advice" && (
            <PdfButton
              label="Advice PDF"
              onExport={() =>
                exportTrackerReportPdf({ data, summary, forecast, insights, preparedBy: realUser?.full_name, sections: { overview: false, placements: false, forecast: false, ar: false, budgets: false } })
              }
            />
          )}
          <PdfButton variant="default" label="Full tracker report" onExport={() => exportTrackerReportPdf({ data, summary, forecast, insights, preparedBy: realUser?.full_name })} />
        </div>
      </div>

      {!data.trackerInstalled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
          <DatabaseZap className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Finance Tracker tables are not installed yet.</strong> Run <code className="bg-amber-100 px-1 rounded">supabase/2026-10-seats-permissions-finance-tracker.sql</code> in the
            Supabase SQL editor. Until then the tracker uses default settings and existing invoices, payments and expenses, and placements can&apos;t be saved.
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={goTo}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.key === "advice" && insights.filter((i) => i.severity === "critical").length > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{insights.filter((i) => i.severity === "critical").length}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-6">
          <OverviewTab data={data} summary={summary} insights={insights} goTo={goTo} />
        </TabsContent>
        <TabsContent value="placements" className="mt-6">
          <PlacementsTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <HoursTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="income" className="mt-6">
          <IncomeTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="budgets" className="mt-6">
          <BudgetsTab data={data} summary={summary} reload={reload} />
        </TabsContent>
        <TabsContent value="forecast" className="mt-6">
          <ForecastTab data={data} summary={summary} forecast={forecast} options={options} setOptions={setOptions} />
        </TabsContent>
        <TabsContent value="advice" className="mt-6">
          <InsightsTab insights={insights} />
        </TabsContent>
        <TabsContent value="tools" className="mt-6">
          <ToolsTab data={data} summary={summary} />
        </TabsContent>
        <TabsContent value="fields" className="mt-6">
          <FieldsTab data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab data={data} reload={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceTrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <TrackerInner />
    </Suspense>
  );
}
