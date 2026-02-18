"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Opportunity, Engagement, Account } from "@/lib/types";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PIPELINE_STAGES } from "@/lib/constants";
import { subDays } from "date-fns";
import { Briefcase, TrendingUp, Clock } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPipeline: 0,
    weightedPipeline: 0,
    activeEngagements: 0,
    activitiesThisWeek: 0,
  });
  const [pipelineData, setPipelineData] = useState<{ stage: string; value: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [atRiskEngagements, setAtRiskEngagements] = useState<Engagement[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [oppsRes, engsRes, actsRes] = await Promise.all([
        supabase.from("opportunities").select("*"),
        supabase.from("engagements").select("*"),
        supabase.from("activities").select("*, accounts(name)").order("date_time", { ascending: false }).limit(5),
      ]);

      const opportunities = oppsRes.data || [];
      const engagements = engsRes.data || [];
      const activities = actsRes.data || [];

      // Calculate Stats
      const totalPipeline = opportunities.reduce((sum, op) => sum + (op.estimated_value || 0), 0);
      const weightedPipeline = opportunities.reduce((sum, op) => sum + (op.weighted_value || 0), 0);
      const activeEngagements = engagements.filter(e => e.status === "In Progress").length;
      
      // Count activities in last 7 days (mocking this for now with all if needed)
      const activitiesThisWeek = activities.length; 

      setStats({
        totalPipeline,
        weightedPipeline,
        activeEngagements,
        activitiesThisWeek,
      });

      // Prepare Chart Data
      const chartData = PIPELINE_STAGES.map(stage => ({
        stage,
        value: opportunities
          .filter(op => op.stage === stage)
          .reduce((sum, op) => sum + (op.estimated_value || 0), 0)
      }));
      setPipelineData(chartData);

      setRecentActivities(activities);
      setAtRiskEngagements(engagements.filter(e => e.status === "On Hold").slice(0, 3));
      
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Command Center</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening across DataIsData.</p>
      </div>

      <StatsCards {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Pipeline by Stage</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Current distribution of potential revenue.</p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipelineData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Recent Activity</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Latest team communications.</p>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={recentActivities} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">At Risk</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Projects currently on hold.</p>
            </div>
            <Briefcase className="w-5 h-5 text-red-400" />
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {atRiskEngagements.length > 0 ? (
                 atRiskEngagements.map(eng => (
                   <div key={eng.id} className="flex flex-col p-3 rounded-lg border border-red-100 bg-red-50/50">
                      <span className="text-sm font-bold text-slate-900">{eng.name}</span>
                      <span className="text-xs text-slate-500 mt-1">Last update: {new Date(eng.updated_at).toLocaleDateString()}</span>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-8 text-slate-400 text-sm italic">
                   All projects are on track.
                 </div>
               )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
