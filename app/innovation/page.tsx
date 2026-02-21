"use client";

import { useEffect, useMemo, useState } from "react";
import { Rocket, Briefcase, ShieldCheck, Landmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { KPICard } from "@/components/dashboard/KPICard";
import { InnovationHeatMap } from "@/components/dashboard/InnovationHeatMap";
import { CostAvoidanceCard } from "@/components/dashboard/CostAvoidanceCard";
import { FundingTracker } from "@/components/dashboard/FundingTracker";
import { INNOVATION_THEMES } from "@/lib/constants";
import { formatCompactCurrency } from "@/lib/utils";

type EngagementRow = {
  id: string;
  name: string;
  innovation_theme: string | null;
  lifecycle_stage: string | null;
  budget: number | null;
  estimated_savings: number | null;
  funding_source: string | null;
  funding_stage: string | null;
  grant_deadline: string | null;
  grant_probability_pct: number | null;
  existing_tool_owned: boolean | null;
  redundant_purchase_risk: boolean | null;
  annual_license_cost: number | null;
};

export default function InnovationPortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<EngagementRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("engagements")
        .select("id, name, innovation_theme, lifecycle_stage, budget, estimated_savings, funding_source, funding_stage, grant_deadline, grant_probability_pct, existing_tool_owned, redundant_purchase_risk, annual_license_cost");
      if (error) console.error("Error loading innovation data:", error);
      setEngagements((data as EngagementRow[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totals = useMemo(() => {
    return engagements.reduce(
      (acc, engagement) => {
        acc.spend += engagement.innovation_theme ? engagement.budget || 0 : 0;
        acc.active += engagement.lifecycle_stage ? 1 : 0;
        acc.savings += engagement.estimated_savings || 0;
        acc.funding += engagement.funding_source ? engagement.budget || 0 : 0;
        return acc;
      },
      { spend: 0, active: 0, savings: 0, funding: 0 }
    );
  }, [engagements]);

  const heatMapData = useMemo(() => {
    return INNOVATION_THEMES.map((theme) => {
      const rows = engagements.filter((e) => e.innovation_theme === theme);
      const spend = rows.reduce((sum, row) => sum + (row.budget || 0), 0);
      return { theme, count: rows.length, spend };
    });
  }, [engagements]);

  const costAvoidanceItems = useMemo(() => {
    return engagements.filter((e) => e.redundant_purchase_risk || e.existing_tool_owned);
  }, [engagements]);

  const fundingItems = useMemo(() => {
    return engagements.filter((e) => !!e.funding_source);
  }, [engagements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Innovation Portfolio</h1>
        <p className="text-[#6B7280]">Executive view of innovation, funding, and cost avoidance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Innovation Spend" value={formatCompactCurrency(totals.spend)} icon={Rocket} />
        <KPICard title="Active Initiatives" value={totals.active.toString()} icon={Briefcase} />
        <KPICard title="Estimated Cost Avoidance" value={formatCompactCurrency(totals.savings)} icon={ShieldCheck} />
        <KPICard title="External Funding Leveraged" value={formatCompactCurrency(totals.funding)} icon={Landmark} />
      </div>

      <InnovationHeatMap data={heatMapData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostAvoidanceCard items={costAvoidanceItems} />
        <FundingTracker items={fundingItems} />
      </div>
    </div>
  );
}
