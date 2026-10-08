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
import { DollarSign, Target, Briefcase, Calendar, Plus, ArrowRight, Receipt, Wallet, Users, Rocket, Calculator } from "lucide-react";
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
  };
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
    stats: { totalPipeline: 0, weightedPipeline: 0, activeEngagements: 0, plannedEngagements: 0, activitiesThisWeek: 0, activitiesLastWeek: 0, openOpportunities: 0, atRiskEngagements: 0 },
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
          },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
      <KPICard key="tp" title="Open Pipeline" value={formatCompactCurrency(s.totalPipeline)} icon={DollarSign} description={`${s.openOpportunities} open opportunities`} />,
      <KPICard key="wp" title="Weighted Pipeline" value={formatCompactCurrency(s.weightedPipeline)} icon={Target} description="Probability-adjusted value" />
    );
  }
  if (showEngagements)
    kpis.push(
      <KPICard
        key="ae"
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
      <KPICard key="col" title="Collected YTD" value={formatCompactCurrency(fin.collectedYTD)} icon={Wallet} description={`${formatCompactCurrency(fin.netYTD)} net profit`} changeType={fin.netYTD >= 0 ? "positive" : "negative"} />,
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
    <div className="space-y-8 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-green-bright blur-3xl" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/dataisdata-mark-silver.png" alt="" aria-hidden="true" className="hidden md:block absolute -right-10 -top-8 w-80 h-80 opacity-[0.12] pointer-events-none select-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Badge variant="active" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                DataIsData Command Center
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {greeting()}
                {firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="text-white/80 text-lg max-w-2xl">
                {summaryBits.length ? `Your portfolio at a glance: ${summaryBits.join(", ")}.` : "Your portfolio at a glance."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {can("activities", "create") && (
                <Link href="/activities/new">
                  <Button variant="brand" className="h-12 px-6 rounded-2xl">
                    <Plus className="w-5 h-5 mr-2" />
                    Log Activity
                  </Button>
                </Link>
              )}
              {showPipeline && (
                <Link href="/pipeline">
                  <Button variant="outline" className="h-12 px-6 rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white">
                    View Pipeline
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              )}
              <PdfButton onExport={exportPdf} size="default" className="h-12 px-5 rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white" label="Snapshot PDF" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-16 pb-6">
        {kpis.length > 0 && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${kpis.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{kpis.slice(0, 8)}</div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          <div className="lg:col-span-2 space-y-8">
            {(showPipeline || showEngagements) && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">{showPipeline ? "Pipeline Overview" : "Engagements"}</h2>
                  {showPipeline && (
                    <Link href="/pipeline" className="text-brand-green-bright font-semibold flex items-center hover:underline">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  )}
                </div>
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
                <div className="flex items-center justify-between pt-4">
                  <h2 className="text-2xl font-bold text-foreground">Top Opportunities</h2>
                  <Link href="/pipeline" className="text-brand-green-bright font-semibold flex items-center hover:underline">
                    Manage Pipeline <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <TopOpportunities opportunities={data.topOpportunities} />
              </>
            )}
          </div>

          <div className="space-y-8 lg:self-start">
            {showActivities && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
                  <Link href="/activities">
                    <Button variant="ghost" size="sm" className="text-brand-green-bright hover:bg-brand-green-bright/10">
                      View History
                    </Button>
                  </Link>
                </div>
                <ActivityFeed activities={data.recentActivities} />

                <div className="flex items-center justify-between pt-4">
                  <h2 className="text-2xl font-bold text-foreground">Upcoming Tasks</h2>
                  <Badge variant="secondary" className="bg-brand-green-bright/10 text-brand-green-bright border-none">
                    {data.upcomingTasks.length} Pending
                  </Badge>
                </div>
                <UpcomingTasks tasks={data.upcomingTasks} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
