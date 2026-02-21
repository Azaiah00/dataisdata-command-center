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
  ArrowRight,
  Users,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-green-bright blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Badge variant="active" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                DataIsData Command Center
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Welcome back, Tony
              </h1>
              <p className="text-white/80 text-lg max-w-2xl">
                Your business portfolio at a glance. You have {data.stats.openOpportunities} open opportunities and {data.stats.activeEngagements} active engagements.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/activities/new">
                <Button variant="brand" className="h-12 px-6 rounded-2xl">
                  <Plus className="w-5 h-5 mr-2" />
                  Log Activity
                </Button>
              </Link>
              <Link href="/pipeline">
                <Button variant="outline" className="h-12 px-6 rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white">
                  View Pipeline
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-16">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          {/* Left Column - 2/3 width on desktop */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Pipeline Overview</h2>
              <Link href="/pipeline" className="text-brand-green-bright font-semibold flex items-center hover:underline">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PipelineChart stages={data.pipelineByStage} />
              <EngagementHealth healthData={data.engagementHealth} />
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <h2 className="text-2xl font-bold text-foreground">Top Opportunities</h2>
              <Link href="/pipeline" className="text-brand-green-bright font-semibold flex items-center hover:underline">
                Manage Pipeline <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <TopOpportunities opportunities={data.topOpportunities} />
          </div>

          {/* Right Column - 1/3 width on desktop */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
              <Button variant="ghost" size="sm" className="text-brand-green-bright hover:bg-brand-green-bright/10">
                View History
              </Button>
            </div>
            <ActivityFeed activities={data.recentActivities} />
            
            <div className="flex items-center justify-between pt-4">
              <h2 className="text-2xl font-bold text-foreground">Upcoming Tasks</h2>
              <Badge variant="secondary" className="bg-brand-green-bright/10 text-brand-green-bright border-none">
                {data.upcomingTasks.length} Pending
              </Badge>
            </div>
            <UpcomingTasks tasks={data.upcomingTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
