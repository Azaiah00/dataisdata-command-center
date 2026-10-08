"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CashHistoryChart, AgingBar } from "@/components/finance/FinanceCharts";
import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSummary } from "@/lib/finance/summary";
import type { Insight } from "@/lib/finance/insights";
import { cn, formatCompactCurrency, formatCurrency, formatDate } from "@/lib/utils";
import { InsightCard } from "./InsightsTab";
import { CheckCircle2, Circle, Target, Users, Wallet, Receipt, TrendingUp, Landmark, PiggyBank, Timer } from "lucide-react";

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: React.ElementType; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-border/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-primary shrink-0" />
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-foreground")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function OverviewTab({
  data,
  summary,
  insights,
  goTo,
}: {
  data: FinanceData;
  summary: FinanceSummary;
  insights: Insight[];
  goTo: (tab: string) => void;
}) {
  const s = data.settings;
  const steps = [
    { done: data.settings.opening_cash_as_of !== null || data.settings.annual_revenue_target > 0, label: "Set your targets, opening cash and assumptions", tab: "settings" },
    { done: data.placements.length > 0, label: "Add each active consultant as a placement (bill rate, pay rate, burden, hours)", tab: "placements" },
    { done: data.hours.length > 0, label: "Log hours each pay period, then invoice them in one click", tab: "hours" },
    { done: data.payments.length > 0, label: "Record agency payments against invoices as they arrive", tab: null, href: "/finance/payments" },
    { done: data.expenses.some((e) => e.recurrence && e.recurrence !== "none"), label: "Enter recurring overhead (insurance, software, payroll service) once as recurring expenses", tab: null, href: "/finance/expenses/new" },
    { done: data.budgets.length > 0, label: "Set monthly budgets per expense category", tab: "budgets" },
    { done: data.customFields.length > 0, label: "Add any fields you track today in spreadsheets (e.g. PO #, contract vehicle, MSP fee %)", tab: "fields" },
  ];
  const doneCount = steps.filter((x) => x.done).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Collected YTD" value={formatCompactCurrency(summary.collectedYTD)} sub={`${formatCompactCurrency(summary.invoicedYTD)} invoiced`} icon={Wallet} />
        <Stat
          label="Net profit YTD"
          value={formatCompactCurrency(summary.netYTD)}
          sub={summary.netMarginYTD !== null ? `${summary.netMarginYTD.toFixed(1)}% margin (target ${s.target_net_margin_pct}%)` : `Target ${s.target_net_margin_pct}% net margin`}
          icon={TrendingUp}
          tone={summary.netYTD < 0 ? "bad" : undefined}
        />
        <Stat
          label="Receivables"
          value={formatCompactCurrency(summary.arOutstanding)}
          sub={summary.dso !== null ? `DSO ${Math.round(summary.dso)} days · terms ${s.default_payment_terms_days}` : `${summary.openInvoices.length} open invoices`}
          icon={Receipt}
          tone={summary.aging.d61_90 + summary.aging.d90_plus > 0 ? "warn" : undefined}
        />
        <Stat
          label="Monthly run-rate"
          value={formatCompactCurrency(summary.monthlyRunRateRevenue)}
          sub={`${summary.activePlacements} active · ${summary.blendedMarginPct !== null ? `${summary.blendedMarginPct.toFixed(1)}% margin` : "no placements yet"}`}
          icon={Users}
        />
        <Stat
          label="Cash estimate"
          value={summary.cashEstimate === null ? "Not set" : formatCompactCurrency(summary.cashEstimate)}
          sub={s.opening_cash_as_of ? `Rolled forward from ${formatDate(s.opening_cash_as_of)}` : "Add opening balance in Settings"}
          icon={Landmark}
          tone={summary.cashEstimate !== null && summary.cashEstimate < 0 ? "bad" : undefined}
        />
        <Stat
          label="Runway"
          value={summary.runwayMonths === null ? (summary.cashEstimate === null ? "—" : "Cash-positive") : `${summary.runwayMonths.toFixed(1)} mo`}
          sub={`Minimum ${s.min_cash_runway_months} months`}
          icon={Timer}
          tone={summary.runwayMonths !== null && summary.runwayMonths < s.min_cash_runway_months ? "bad" : undefined}
        />
        <Stat label="Tax set-aside" value={formatCompactCurrency(summary.taxReserveSuggested)} sub={`${s.tax_reserve_pct}% of YTD net — confirm with CPA`} icon={PiggyBank} />
        <Stat label="Unbilled time" value={formatCompactCurrency(summary.unbilledValue)} sub={`${summary.unbilledHours.toLocaleString()} hours not invoiced`} icon={Receipt} tone={summary.unbilledValue > 0 ? "warn" : undefined} />
      </div>

      {summary.revenueTarget > 0 && summary.targetProgressPct !== null && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Revenue target {formatCurrency(summary.revenueTarget)}
              </p>
              <p className="text-sm text-muted-foreground">
                {summary.targetProgressPct.toFixed(summary.targetProgressPct < 10 ? 1 : 0)}% collected · {summary.targetPacePct?.toFixed(0)}% of year elapsed
              </p>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, summary.targetProgressPct)}%` }} />
              {summary.targetPacePct !== null && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500" style={{ left: `${summary.targetPacePct}%` }} title="Where you should be today" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Cash history</CardTitle>
            <CardDescription>Collected vs expenses, last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CashHistoryChart history={summary.history} />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top priorities</CardTitle>
            <CardDescription>From the advice engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.slice(0, 3).map((i) => (
              <InsightCard key={i.id} insight={i} compact />
            ))}
            <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => goTo("advice")}>
              See all {insights.length} recommendations →
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Receivables aging</CardTitle>
            <CardDescription>{formatCurrency(summary.arOutstanding)} outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <AgingBar aging={summary.aging} />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by agency</CardTitle>
            <CardDescription>
              {data.payments.length ? "Trailing 12 months of cash collected" : "Active placement run-rate (no payments recorded yet)"} — watch concentration above {s.concentration_warning_pct}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.revenueByAccount.length ? (
              summary.revenueByAccount.slice(0, 6).map((r) => (
                <div key={r.account_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <Link href={`/accounts/${r.account_id}`} className="font-medium hover:text-primary truncate pr-2">
                      {r.name}
                    </Link>
                    <span className="font-semibold">
                      {formatCompactCurrency(r.amount)} <span className="text-muted-foreground font-normal">· {r.share.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", r.share >= s.concentration_warning_pct ? "bg-amber-500" : "bg-primary")} style={{ width: `${r.share}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No revenue yet — add placements or record payments.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">How DataIsData should run this tracker</CardTitle>
          <CardDescription>
            Built around how DataIsData actually earns: staff-augmentation placements at Virginia agencies plus fixed-fee advisory work. {doneCount} of {steps.length} set up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {steps.map((st, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                {st.done ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
                <span className={cn("flex-1", st.done && "text-muted-foreground")}>{st.label}</span>
                {!st.done &&
                  (st.tab ? (
                    <button type="button" className="text-xs font-semibold text-primary hover:underline whitespace-nowrap" onClick={() => goTo(st.tab!)}>
                      Set up
                    </button>
                  ) : (
                    <Link href={st.href!} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                      Set up
                    </Link>
                  ))}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Weekly rhythm: log hours → invoice → follow up on anything past due. Monthly: review margin by placement, budgets and the forecast. Quarterly: confirm tax set-aside with your CPA.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
