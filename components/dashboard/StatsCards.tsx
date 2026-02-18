"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Briefcase, CalendarDays, GitBranch } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatsCardsProps {
  totalPipeline: number;
  weightedPipeline: number;
  activeEngagements: number;
  activitiesThisWeek: number;
}

export function StatsCards({
  totalPipeline,
  weightedPipeline,
  activeEngagements,
  activitiesThisWeek,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Pipeline Value",
      value: formatCurrency(totalPipeline),
      icon: DollarSign,
      description: "Total potential revenue",
      color: "text-blue-600",
    },
    {
      title: "Weighted Forecast",
      value: formatCurrency(weightedPipeline),
      icon: GitBranch,
      description: "Probablity adjusted",
      color: "text-green-600",
    },
    {
      title: "Active Engagements",
      value: activeEngagements.toString(),
      icon: Briefcase,
      description: "Current service delivery",
      color: "text-amber-600",
    },
    {
      title: "Activities (7d)",
      value: activitiesThisWeek.toString(),
      icon: CalendarDays,
      description: "Communications this week",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {stat.title}
            </CardTitle>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <p className="text-[10px] text-slate-500 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
