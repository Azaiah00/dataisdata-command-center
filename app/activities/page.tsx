"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Building2, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, formatDate, getStatusColor } from "@/lib/utils";

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
      header: "Activity",
      accessorKey: "activity_type",
      cell: (activity: Activity) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111827] text-sm truncate">{activity.activity_type}</span>
            <span className="text-xs text-[#6B7280]">{formatDate(activity.date_time)}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Account / Context",
      accessorKey: "account_id",
      cell: (activity: any) => (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[#111827] text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="truncate">{activity.accounts?.name || "No Account"}</span>
          </div>
          {activity.engagements && (
            <span className="text-[10px] text-[#6B7280] truncate mt-0.5 ml-5">
              Project: {activity.engagements.name}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Summary",
      accessorKey: "summary",
      cell: (activity: Activity) => (
        <p className="text-xs text-[#6B7280] line-clamp-1 max-w-xs leading-relaxed">{activity.summary}</p>
      ),
    },
    {
      header: "Outcome",
      accessorKey: "outcome",
      cell: (activity: Activity) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            getStatusColor(activity.outcome)
          )}
        >
          {activity.outcome}
        </Badge>
      ),
    },
    {
      header: "Next Action",
      accessorKey: "next_action",
      cell: (activity: Activity) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-blue-600 truncate max-w-[120px]">
            {activity.next_action || "None"}
          </span>
          {activity.next_action_due && (
            <span className="text-[10px] text-[#6B7280] mt-0.5">
              Due: {formatDate(activity.next_action_due)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (activity: Activity) => (
        <div className="flex justify-end">
          <Link href={`/activities/${activity.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-blue-600 hover:bg-blue-50">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Activities</h1>
          <p className="text-[#6B7280]">Timeline of meetings, calls, and communications.</p>
        </div>
        <Link href="/activities/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
