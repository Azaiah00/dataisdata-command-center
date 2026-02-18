"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Opportunity, Engagement } from "@/lib/types";
import { KPICard } from "@/components/dashboard/KPICard";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EngagementHealth } from "@/components/dashboard/EngagementHealth";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { TopOpportunities } from "@/components/dashboard/TopOpportunities";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatCompactCurrency } from "@/lib/utils";
import { 
  DollarSign, 
  Target, 
  Briefcase, 
  Calendar,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: {
      totalPipeline: number;
      weightedPipeline: number;
      activeEngagements: number;
      activitiesThisWeek: number;
      openOpportunities: number;
      atRiskEngagements: number;
    };
    pipelineByStage: any[];
    engagementHealth: any[];
    recentActivities: any[];
    upcomingTasks: any[];
    topOpportunities: any[];
  }>({
    stats: {
      totalPipeline: 0,
      weightedPipeline: 0,
      activeEngagements: 0,
      activitiesThisWeek: 0,
      openOpportunities: 0,
      atRiskEngagements: 0,
    },
    pipelineByStage: [],
    engagementHealth: [],
    recentActivities: [],
    upcomingTasks: [],
    topOpportunities: [],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [oppsRes, engsRes, actsRes] = await Promise.all([
          supabase.from("opportunities").select("*, accounts(name)"),
          supabase.from("engagements").select("*"),
          supabase.from("activities").select("*, accounts(name)").order("date_time", { ascending: false }),
        ]);

        const opportunities = oppsRes.data || [];
        const engagements = engsRes.data || [];
        const activities = actsRes.data || [];

        // Stats calculations
        const totalPipeline = opportunities.reduce((sum, op) => sum + (op.estimated_value || 0), 0);
        const weightedPipeline = opportunities.reduce((sum, op) => sum + (op.weighted_value || 0), 0);
        const activeEngagements = engagements.filter(e => e.status === "In Progress").length;
        const atRiskEngagements = engagements.filter(e => e.status === "On Hold").length;
        const openOpportunities = opportunities.filter(o => !['Awarded', 'Lost'].includes(o.stage)).length;
        
        // Activities this week (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activitiesThisWeek = activities.filter(a => new Date(a.date_time) >= sevenDaysAgo).length;

        // Pipeline by stage
        const pipelineByStage = PIPELINE_STAGES.map(stage => {
          const stageOpps = opportunities.filter(op => op.stage === stage);
          return {
            stage,
            count: stageOpps.length,
            value: stageOpps.reduce((sum, op) => sum + (op.estimated_value || 0), 0)
          };
        });

        // Engagement Health
        const statuses = ["Planned", "In Progress", "On Hold", "Complete"];
        const engagementHealth = statuses.map(status => {
          const statusEngs = engagements.filter(e => e.status === status);
          return {
            status,
            count: statusEngs.length,
            atRisk: status === "On Hold" ? statusEngs.length : 0
          };
        });

        // Top Opportunities
        const topOpportunities = [...opportunities]
          .filter(o => !['Awarded', 'Lost'].includes(o.stage))
          .sort((a, b) => (b.weighted_value || 0) - (a.weighted_value || 0))
          .slice(0, 6);

        // Upcoming Tasks
        const upcomingTasks = activities
          .filter(a => a.next_action_due && new Date(a.next_action_due) >= new Date())
          .sort((a, b) => new Date(a.next_action_due!).getTime() - new Date(b.next_action_due!).getTime())
          .slice(0, 5);

        setData({
          stats: {
            totalPipeline,
            weightedPipeline,
            activeEngagements,
            activitiesThisWeek,
            openOpportunities,
            atRiskEngagements,
          },
          pipelineByStage,
          engagementHealth,
          recentActivities: activities.slice(0, 5),
          upcomingTasks,
          topOpportunities,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
          <p className="text-[#6B7280]">Welcome back, Tony. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700">
            <Calendar className="w-4 h-4 mr-2" />
            This Week
          </Button>
          <Link href="/activities/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Log Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Pipeline"
          value={formatCompactCurrency(data.stats.totalPipeline)}
          change="+12% from last month"
          changeType="positive"
          icon={DollarSign}
          description={`${data.stats.openOpportunities} open opportunities`}
        />
        <KPICard
          title="Weighted Pipeline"
          value={formatCompactCurrency(data.stats.weightedPipeline)}
          change="+8% from last month"
          changeType="positive"
          icon={Target}
          description="Probability-adjusted value"
        />
        <KPICard
          title="Active Engagements"
          value={data.stats.activeEngagements.toString()}
          change="On track"
          changeType="neutral"
          icon={Briefcase}
          description={`${data.stats.atRiskEngagements} at risk`}
        />
        <KPICard
          title="Activities This Week"
          value={data.stats.activitiesThisWeek.toString()}
          change="+5 from last week"
          changeType="positive"
          icon={Calendar}
          description="Meetings, calls, emails"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart stages={data.pipelineByStage} />
        <EngagementHealth healthData={data.engagementHealth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={data.recentActivities} />
        <UpcomingTasks tasks={data.upcomingTasks} />
      </div>

      <TopOpportunities opportunities={data.topOpportunities} />
    </div>
  );
}
