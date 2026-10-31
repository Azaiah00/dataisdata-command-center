"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KPICard } from "@/components/dashboard/KPICard";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EngagementHealth } from "@/components/dashboard/EngagementHealth";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { TopOpportunities } from "@/components/dashboard/TopOpportunities";
import { CashHistoryChart } from "@/components/finance/FinanceCharts";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatCompactCurrency, formatCurrency, num } from "@/lib/utils";
import { loadFinanceData } from "@/lib/finance/data";
import { computeSummary, type FinanceSummary } from "@/lib/finance/summary";
import { todayISO, addDaysISO } from "@/lib/finance/dates";
import { exportListPdf } from "@/lib/pdf/reports";
import { DollarSign, Target, Briefcase, Calendar, Plus, ArrowRight, Receipt, Wallet, Users, Rocket, Calculator, FileSignature } from "lucide-react";
import { ContractValueChart } from "@/components/dashboard/ContractValueChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface DashData {
  stats: {
    totalPipeline: number;
    weightedPipeline: number;
    activeEngagements: number;
    plannedEngagements: number;
    activitiesThisWeek: number;
    activitiesLastWeek: number;
    openOpportunities: number;
    atRiskEngagements: number;
    contractValue: number;
    contractMissing: number;
    engagementCount: number;
  };
  contractByYear: { label: string; value: number; count: number }[];
  activityWeeks: number[];
  pipelineSpark: number[];
  weightedSpark: number[];
  pipelineByStage: any[];
  engagementHealth: any[];
  recentActivities: any[];
  upcomingTasks: any[];
  topOpportunities: any[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user, canSee, can } = useAccess();
  const showPipeline = canSee("pipeline");
  const showEngagements = canSee("engagements");
  const showActivities = canSee("activities");
  const showFinance = canSee("finance_dashboard") || canSee("finance_tracker");
  const [loading, setLoading] = useState(true);
  const [fin, setFin] = useState<FinanceSummary | null>(null);
  const [data, setData] = useState<DashData>({
    stats: { totalPipeline: 0, weightedPipeline: 0, activeEngagements: 0, plannedEngagements: 0, activitiesThisWeek: 0, activitiesLastWeek: 0, openOpportunities: 0, atRiskEngagements: 0, contractValue: 0, contractMissing: 0, engagementCount: 0 },
    contractByYear: [],
    activityWeeks: [],
    pipelineSpark: [],
    weightedSpark: [],
    pipelineByStage: [],
    engagementHealth: [],
    recentActivities: [],
    upcomingTasks: [],
    topOpportunities: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const empty = Promise.resolve({ data: [] as any[] });
        const [oppsRes, engsRes, actsRes, finData] = await Promise.all([
          showPipeline ? supabase.from("opportunities").select("*, accounts(name)") : empty,
          showEngagements ? supabase.from("engagements").select("*") : empty,
          showActivities ? supabase.from("activities").select("*, accounts(name)").order("date_time", { ascending: false }) : empty,
          showFinance ? loadFinanceData().catch(() => null) : Promise.resolve(null),
        ]);

        const opportunities = oppsRes.data || [];
        const engagements = engsRes.data || [];
        const activities = actsRes.data || [];
        if (finData) setFin(computeSummary(finData));

        const open = opportunities.filter((o: any) => !["Awarded", "Lost"].includes(o.stage));
        const today = todayISO();
        const weekAgo = addDaysISO(today, -7);
        const twoWeeksAgo = addDaysISO(today, -14);
        const dayOf = (a: any) => String(a.date_time || "").slice(0, 10);

        setData({
          stats: {
            totalPipeline: open.reduce((s: number, op: any) => s + num(op.estimated_value), 0),
            weightedPipeline: open.reduce((s: number, op: any) => s + num(op.weighted_value), 0),
            activeEngagements: engagements.filter((e: any) => e.status === "In Progress").length,
            plannedEngagements: engagements.filter((e: any) => e.status === "Planned").length,
            atRiskEngagements: engagements.filter((e: any) => e.status === "On Hold").length,
            openOpportunities: open.length,
            activitiesThisWeek: activities.filter((a: any) => dayOf(a) > weekAgo).length,
            activitiesLastWeek: activities.filter((a: any) => dayOf(a) > twoWeeksAgo && dayOf(a) <= weekAgo).length,
            contractValue: engagements.reduce((t: number, e: any) => t + (e.contract_value == null ? 0 : num(e.contract_value)), 0),
            contractMissing: engagements.filter((e: any) => e.contract_value == null).length,
            engagementCount: engagements.length,
          },
          // Same engagement records the Engagements and Contractor pages show — grouped by start year.
          contractByYear: (() => {
            const by = new Map<string, { value: number; count: number }>();
            engagements.forEach((e: any) => {
              const y = String(e.start_date || "").slice(0, 4);
              if (!/^(19|20)\d\d$/.test(y) || e.contract_value == null) return;
              const cur = by.get(y) || { value: 0, count: 0 };
              by.set(y, { value: cur.value + num(e.contract_value), count: cur.count + 1 });
            });
            return Array.from(by, ([label, v]) => ({ label, ...v })).sort((a, b) => a.label.localeCompare(b.label));
          })(),
          activityWeeks: Array.from({ length: 8 }, (_, i) => {
            const end = addDaysISO(today, -7 * (7 - i));
            const start = addDaysISO(end, -7);
            return activities.filter((a: any) => dayOf(a) > start && dayOf(a) <= end).length;
          }),
          weightedSpark: PIPELINE_STAGES.filter((st) => st !== "Lost").map((stage) =>
            opportunities.filter((op: any) => op.stage === stage).reduce((t: number, op: any) => t + num(op.weighted_value), 0)
          ),
          pipelineSpark: PIPELINE_STAGES.filter((st) => st !== "Lost").map((stage) =>
            opportunities.filter((op: any) => op.stage === stage).reduce((t: number, op: any) => t + num(op.estimated_value), 0)
          ),
          pipelineByStage: PIPELINE_STAGES.map((stage) => {
            const stageOpps = opportunities.filter((op: any) => op.stage === stage);
            return { stage, count: stageOpps.length, value: stageOpps.reduce((sum: number, op: any) => sum + num(op.estimated_value), 0) };
          }),
          engagementHealth: ["Planned", "In Progress", "On Hold", "Complete"].map((status) => {
            const list = engagements.filter((e: any) => e.status === status);
            return { status, count: list.length, atRisk: status === "On Hold" ? list.length : 0 };
          }),
          topOpportunities: [...open].sort((a: any, b: any) => num(b.weighted_value) - num(a.weighted_value)).slice(0, 6),
          upcomingTasks: activities
            .filter((a: any) => a.next_action && a.next_action_due && a.next_action_due >= today)
            .sort((a: any, b: any) => String(a.next_action_due).localeCompare(String(b.next_action_due)))
            .slice(0, 5),
          recentActivities: activities.slice(0, 5),
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [showPipeline, showEngagements, showActivities, showFinance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="spinner" />
      </div>
    );
  }

  const s = data.stats;
  const actDelta = s.activitiesThisWeek - s.activitiesLastWeek;
  const firstName = user?.full_name.split(" ")[0] || "";
  const summaryBits = [
    showPipeline && `${s.openOpportunities} open opportunit${s.openOpportunities === 1 ? "y" : "ies"}`,
    showEngagements && `${s.activeEngagements} active engagement${s.activeEngagements === 1 ? "" : "s"}`,
    fin && fin.openInvoices.filter((i) => i.days_past_due > 0).length > 0 && `${fin.openInvoices.filter((i) => i.days_past_due > 0).length} past-due invoice${fin.openInvoices.filter((i) => i.days_past_due > 0).length === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];

  const kpis: React.ReactNode[] = [];
  if (showPipeline) {
    kpis.push(
      <KPICard key="tp" href="/pipeline" title="Open Pipeline" value={formatCompactCurrency(s.totalPipeline)} icon={DollarSign} description={`${s.openOpportunities} open opportunities`} spark={data.pipelineSpark} />,
      <KPICard key="wp" href="/pipeline" title="Weighted Pipeline" value={formatCompactCurrency(s.weightedPipeline)} icon={Target} description="Probability-adjusted value" spark={data.weightedSpark} />
    );
  }
  if (showEngagements)
    kpis.push(
      <KPICard
        key="cv"
        href="/engagements"
        title="Contract Value"
        value={formatCompactCurrency(s.contractValue)}
        change={s.contractMissing ? `${s.contractMissing} not entered` : "All entered"}
        changeType={s.contractMissing ? "negative" : "positive"}
        icon={FileSignature}
        description={`${s.engagementCount - s.contractMissing} of ${s.engagementCount} engagements have a value`}
        spark={data.contractByYear.map((p) => p.value)}
      />,
      <KPICard
        key="ae"
        href="/engagements"
        title="Active Engagements"
        value={String(s.activeEngagements)}
        change={s.atRiskEngagements ? `${s.atRiskEngagements} on hold` : "None on hold"}
        changeType={s.atRiskEngagements ? "negative" : "neutral"}
        icon={Briefcase}
        description={`${s.plannedEngagements} planned`}
      />
    );
  if (showActivities)
    kpis.push(
      <KPICard
        key="act"
        href="/activities"
        spark={data.activityWeeks}
        title="Activities This Week"
        value={String(s.activitiesThisWeek)}
        change={`${actDelta >= 0 ? "+" : ""}${actDelta} vs prior 7 days`}
        changeType={actDelta > 0 ? "positive" : actDelta < 0 ? "negative" : "neutral"}
        icon={Calendar}
        description="Meetings, calls, emails, site visits"
      />
    );
  if (fin) {
    kpis.push(
      <KPICard key="col" href="/finance" spark={fin.history.map((h) => h.collected)} title="Collected YTD" value={formatCompactCurrency(fin.collectedYTD)} icon={Wallet} description={`${formatCompactCurrency(fin.netYTD)} net profit`} changeType={fin.netYTD >= 0 ? "positive" : "negative"} />,
      <KPICard
        key="ar"
        title="Receivables"
        value={formatCompactCurrency(fin.arOutstanding)}
        icon={Receipt}
        change={fin.aging.d61_90 + fin.aging.d90_plus > 0 ? `${formatCompactCurrency(fin.aging.d61_90 + fin.aging.d90_plus)} 60+ days` : undefined}
        changeType="negative"
        description={fin.dso !== null ? `DSO ${Math.round(fin.dso)} days` : "Net of partial payments"}
      />
    );
  }

  async function exportPdf() {
    const rows: (string | number)[][] = [];
    if (showPipeline) {
      rows.push(["Open pipeline", formatCurrency(s.totalPipeline)], ["Weighted pipeline", formatCurrency(s.weightedPipeline)], ["Open opportunities", s.openOpportunities]);
      data.pipelineByStage.forEach((st) => rows.push([`  ${st.stage}`, `${st.count} · ${formatCurrency(st.value)}`]));
    }
    if (showEngagements) rows.push(["Active engagements", s.activeEngagements], ["Planned engagements", s.plannedEngagements], ["On hold", s.atRiskEngagements]);
    if (showActivities) rows.push(["Activities (last 7 days)", s.activitiesThisWeek], ["Upcoming follow-ups", data.upcomingTasks.length]);
    if (fin) rows.push(["Collected YTD", formatCurrency(fin.collectedYTD)], ["Net profit YTD", formatCurrency(fin.netYTD)], ["Receivables", formatCurrency(fin.arOutstanding)], ["Monthly run-rate", formatCurrency(fin.monthlyRunRateRevenue)]);
    await exportListPdf({
      title: "Executive Snapshot",
      subtitle: `Prepared for ${user?.full_name || "DataIsData"}`,
      preparedBy: user?.full_name,
      columns: ["Metric", "Value"],
      rows,
      alignRight: [1],
      filename: "DataIsData-Executive-Snapshot",
    });
  }

  return (
    <div className="space-y-8">
      <div className="hero-banner flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0 relative">
          <h1 className="page-title text-[1.9rem] leading-tight">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="page-subtitle max-w-2xl">{summaryBits.length ? `Your portfolio at a glance: ${summaryBits.join(", ")}.` : "Your portfolio at a glance."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can("activities", "create") && (
            <Link href="/activities/new">
              <Button>
                <Plus className="w-4 h-4" /> Log Activity
              </Button>
            </Link>
          )}
          {showPipeline && (
            <Link href="/pipeline">
              <Button variant="outline">
                View Pipeline <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <PdfButton onExport={exportPdf} size="default" label="Snapshot PDF" />
        </div>
      </div>

      <div className="pb-6">
        {kpis.length > 0 && (
          <div className={`rise-in kpi-grid grid grid-cols-1 sm:grid-cols-2 gap-5 ${kpis.length % 3 === 0 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>{kpis.slice(0, 8)}</div>
        )}

        {kpis.length === 0 && (
          <Card className="border-none shadow-md rounded-3xl">
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {canSee("innovation_portfolio") && (
                <Link href="/innovation" className="rounded-2xl border border-border p-5 hover:border-primary/40">
                  <Rocket className="w-6 h-6 text-primary mb-2" />
                  <p className="font-semibold">Innovation Portfolio</p>
                  <p className="text-sm text-muted-foreground">Programs, maturity and events</p>
                </Link>
              )}
              {canSee("accounts") && (
                <Link href="/accounts" className="rounded-2xl border border-border p-5 hover:border-primary/40">
                  <Users className="w-6 h-6 text-primary mb-2" />
                  <p className="font-semibold">Accounts</p>
                  <p className="text-sm text-muted-foreground">Agencies and organizations</p>
                </Link>
              )}
              {canSee("reports") && (
                <Link href="/reports" className="rounded-2xl border border-border p-5 hover:border-primary/40">
                  <Target className="w-6 h-6 text-primary mb-2" />
                  <p className="font-semibold">Reports</p>
                  <p className="text-sm text-muted-foreground">Executive summaries and PDFs</p>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
          <div className="xl:col-span-2 space-y-6">
            {showEngagements && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>Contract value over time</CardTitle>
                    <CardDescription>Engagement contract value by start year — same records as the Engagements and Contractor pages</CardDescription>
                  </div>
                  <Link href="/engagements">
                    <Button variant="outline" size="sm">
                      Engagements <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <ContractValueChart points={data.contractByYear} />
                </CardContent>
              </Card>
            )}
            {(showPipeline || showEngagements) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {showPipeline && <PipelineChart stages={data.pipelineByStage} />}
                  {showEngagements && <EngagementHealth healthData={data.engagementHealth} />}
                </div>
              </>
            )}

            {fin && (
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold">Cash flow</CardTitle>
                    <CardDescription>Collected vs expenses, last 12 months</CardDescription>
                  </div>
                  <Link href={canSee("finance_tracker") ? "/finance/tracker" : "/finance"}>
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                      {canSee("finance_tracker") ? (
                        <>
                          <Calculator className="w-4 h-4" /> Tracker
                        </>
                      ) : (
                        "Finance"
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <CashHistoryChart history={fin.history} height={240} />
                </CardContent>
              </Card>
            )}

            {showPipeline && (
              <>
                <TopOpportunities opportunities={data.topOpportunities} />
              </>
            )}
          </div>

          <div className="space-y-8 lg:self-start">
            {showActivities && (
              <>
                <ActivityFeed activities={data.recentActivities} />
                <UpcomingTasks tasks={data.upcomingTasks} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
