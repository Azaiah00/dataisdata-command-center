"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Building2, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { OUTCOME_TYPES } from "@/lib/constants";
import { cn, formatDateTime, formatDate } from "@/lib/utils";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          accounts (
            name
          ),
          engagements (
            name
          )
        `)
        .order("date_time", { ascending: false });

      if (error) {
        console.error("Error fetching activities:", error);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    }

    fetchActivities();
  }, []);

  const columns = [
    {
      header: "Type",
      accessorKey: "activity_type",
      cell: (activity: Activity) => (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">{activity.activity_type}</span>
        </div>
      ),
    },
    {
      header: "Date & Time",
      accessorKey: "date_time",
      cell: (activity: Activity) => (
        <span className="text-sm text-slate-600">{formatDateTime(activity.date_time)}</span>
      ),
    },
    {
      header: "Account / Context",
      accessorKey: "account_id",
      cell: (activity: any) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-slate-900 text-sm font-medium">
            <Building2 className="w-3 h-3" />
            {activity.accounts?.name || "No Account"}
          </div>
          {activity.engagements && (
            <span className="text-xs text-slate-500 ml-4">{activity.engagements.name}</span>
          )}
        </div>
      ),
    },
    {
      header: "Summary",
      accessorKey: "summary",
      cell: (activity: Activity) => (
        <p className="text-sm text-slate-600 line-clamp-1 max-w-xs">{activity.summary}</p>
      ),
    },
    {
      header: "Outcome",
      accessorKey: "outcome",
      cell: (activity: Activity) => {
        const colors: Record<string, string> = {
          Good: "text-green-600 bg-green-50",
          Neutral: "text-slate-600 bg-slate-50",
          Bad: "text-red-600 bg-red-50",
        };
        return (
          <Badge
            className={cn(
              "font-medium border-none",
              colors[activity.outcome] || "bg-slate-50"
            )}
          >
            {activity.outcome}
          </Badge>
        );
      },
    },
    {
      header: "Next Action",
      accessorKey: "next_action_due",
      cell: (activity: Activity) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-blue-600">
            {activity.next_action || "None"}
          </span>
          {activity.next_action_due && (
            <span className="text-[10px] text-slate-400">
              Due: {formatDate(activity.next_action_due)}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activities</h1>
          <p className="text-slate-500 mt-1">Timeline of meetings, calls, and communications.</p>
        </div>
        <Link href="/activities/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Log Activity
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={activities}
          onRowClick={(activity) => {
            window.location.href = `/activities/${activity.id}`;
          }}
        />
      )}
    </div>
  );
}
