"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatCompactCurrency, cn, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Building2,
  Users,
  Handshake,
  Target,
  BarChart3,
  Printer,
  Download,
} from "lucide-react";

interface PipelineByStage {
  stage: string;
  count: number;
  total_value: number;
}

interface EngagementsByStatus {
  status: string;
  count: number;
  total_budget: number;
}

interface TopAccount {
  id: string;
  name: string;
  engagement_count: number;
  total_value: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  // Summary KPIs
  const [totalPipeline, setTotalPipeline] = useState(0);
  const [totalWeighted, setTotalWeighted] = useState(0);
  const [totalEngagementValue, setTotalEngagementValue] = useState(0);
  const [activeEngagements, setActiveEngagements] = useState(0);

  // Counts
  const [counts, setCounts] = useState({ accounts: 0, contacts: 0, partners: 0, activities: 0 });

  // Breakdowns
  const [pipelineByStage, setPipelineByStage] = useState<PipelineByStage[]>([]);
  const [engagementsByStatus, setEngagementsByStatus] = useState<EngagementsByStatus[]>([]);
  const [topAccounts, setTopAccounts] = useState<TopAccount[]>([]);

  useEffect(() => {
    async function fetchReports() {
      // Fetch all opportunities for pipeline breakdown
      const { data: opps } = await supabase.from("opportunities").select("stage, estimated_value, weighted_value");
      if (opps) {
        const totalEst = opps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
        const totalW = opps.reduce((sum, o) => sum + (o.weighted_value || 0), 0);
        setTotalPipeline(totalEst);
        setTotalWeighted(totalW);

        // Group by stage
        const stageMap: Record<string, { count: number; total_value: number }> = {};
        const stageOrder = ["Lead", "Discovery", "Proposal", "Negotiation", "Awarded", "Lost"];
        stageOrder.forEach((s) => (stageMap[s] = { count: 0, total_value: 0 }));
        opps.forEach((o) => {
          if (!stageMap[o.stage]) stageMap[o.stage] = { count: 0, total_value: 0 };
          stageMap[o.stage].count++;
          stageMap[o.stage].total_value += o.estimated_value || 0;
        });
        setPipelineByStage(stageOrder.map((s) => ({ stage: s, ...stageMap[s] })));
      }

      // Fetch engagements for breakdown
      const { data: engs } = await supabase.from("engagements").select("status, contract_value, budget");
      if (engs) {
        const totalCV = engs.reduce((sum, e) => sum + (e.contract_value || 0), 0);
        setTotalEngagementValue(totalCV);
        setActiveEngagements(engs.filter((e) => e.status === "In Progress").length);

        const statusMap: Record<string, { count: number; total_budget: number }> = {};
        engs.forEach((e) => {
          if (!statusMap[e.status]) statusMap[e.status] = { count: 0, total_budget: 0 };
          statusMap[e.status].count++;
          statusMap[e.status].total_budget += e.contract_value || 0;
        });
        setEngagementsByStatus(Object.entries(statusMap).map(([status, v]) => ({ status, ...v })));
      }

      // Fetch accounts with engagement counts
      const { data: accs } = await supabase.from("accounts").select("id, name");
      const { data: engLinks } = await supabase.from("engagements").select("account_id, contract_value");
      if (accs && engLinks) {
        const accMap: Record<string, { name: string; count: number; total: number }> = {};
        accs.forEach((a) => (accMap[a.id] = { name: a.name, count: 0, total: 0 }));
        engLinks.forEach((e) => {
          if (accMap[e.account_id]) {
            accMap[e.account_id].count++;
            accMap[e.account_id].total += e.contract_value || 0;
          }
        });
        const sorted = Object.entries(accMap)
          .map(([id, v]) => ({ id, name: v.name, engagement_count: v.count, total_value: v.total }))
          .sort((a, b) => b.total_value - a.total_value)
          .slice(0, 5);
        setTopAccounts(sorted);
      }

      // Entity counts
      const tables = ["accounts", "contacts", "partners", "activities"] as const;
      const countResults: Record<string, number> = {};
      await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase.from(t).select("id", { count: "exact", head: true });
          countResults[t] = count ?? 0;
        })
      );
      setCounts(countResults as typeof counts);

      setLoading(false);
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  function handlePrint() {
    window.print();
  }

  const stageColors: Record<string, string> = {
    Lead: "bg-slate-500",
    Discovery: "bg-blue-500",
    Proposal: "bg-indigo-500",
    Negotiation: "bg-purple-500",
    Awarded: "bg-green-500",
    Lost: "bg-red-500",
  };

  const maxPipelineValue = Math.max(...pipelineByStage.map((s) => s.total_value), 1);

  const reportDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Print-only branded header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">DataIsData</h1>
            <p className="text-sm text-[#6B7280] mt-1">Command Center &mdash; Performance Report</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#111827]">{reportDate}</p>
            <p className="text-xs text-[#6B7280]">Generated by DataIsData CRM</p>
          </div>
        </div>
      </div>

      {/* Screen header with action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Reports & Analytics</h1>
          <p className="text-[#6B7280]">Overview of your CRM performance and metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="border-gray-200">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Total Pipeline</p>
                <p className="text-2xl font-bold text-[#111827]">{formatCompactCurrency(totalPipeline)}</p>
                <p className="text-xs text-[#6B7280] mt-1">Weighted: {formatCompactCurrency(totalWeighted)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#E8F1FB]">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Engagement Revenue</p>
                <p className="text-2xl font-bold text-[#111827]">{formatCompactCurrency(totalEngagementValue)}</p>
                <p className="text-xs text-[#6B7280] mt-1">{activeEngagements} active engagements</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Accounts</p>
                <p className="text-2xl font-bold text-[#111827]">{counts.accounts}</p>
                <p className="text-xs text-[#6B7280] mt-1">{counts.contacts} contacts</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Partners</p>
                <p className="text-2xl font-bold text-[#111827]">{counts.partners}</p>
                <p className="text-xs text-[#6B7280] mt-1">{counts.activities} activities logged</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <Handshake className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelineByStage.map((item) => (
              <div key={item.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", stageColors[item.stage] || "bg-gray-400")} />
                    <span className="font-medium text-[#111827]">{item.stage}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-gray-100 text-gray-500">
                      {item.count}
                    </Badge>
                  </div>
                  <span className="font-bold text-[#111827]">{formatCurrency(item.total_value)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", stageColors[item.stage] || "bg-gray-400")}
                    style={{ width: `${Math.max((item.total_value / maxPipelineValue) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
            {pipelineByStage.every((s) => s.count === 0) && (
              <p className="text-sm text-gray-400 italic text-center py-4">No pipeline data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Engagements by Status */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Engagements by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {engagementsByStatus.length > 0 ? (
              <div className="space-y-3">
                {engagementsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-[10px] h-5 px-2 border-none", getStatusColor(item.status))}>
                        {item.status}
                      </Badge>
                      <span className="text-sm text-[#6B7280]">{item.count} engagement{item.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="font-bold text-[#111827]">{formatCurrency(item.total_budget)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-4">No engagements yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Accounts by Revenue */}
      <Card className="border-none shadow-sm print:shadow-none print:border print:border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 print:text-blue-600" />
            Top Accounts by Engagement Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topAccounts.length > 0 ? (
            <div className="space-y-3">
              {topAccounts.map((acc, idx) => (
                <div key={acc.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <span className="text-lg font-bold text-gray-300 w-6 text-center">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#111827] text-sm truncate">{acc.name}</p>
                    <p className="text-xs text-[#6B7280]">{acc.engagement_count} engagement{acc.engagement_count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="font-bold text-green-600 text-sm">{formatCurrency(acc.total_value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-8">No account data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Print-only branded footer */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6B7280]">Confidential &mdash; For internal use only</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#111827]">DataIsData</p>
            <p className="text-xs text-[#6B7280]">Command Center &bull; dataisdata.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
