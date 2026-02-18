"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Engagement } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Building2, Calendar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ENGAGEMENT_STATUSES } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEngagements() {
      const { data, error } = await supabase
        .from("engagements")
        .select(`
          *,
          accounts (
            name
          )
        `)
        .order("start_date", { ascending: false });

      if (error) {
        console.error("Error fetching engagements:", error?.message || error, error?.code, error?.details);
      } else {
        setEngagements(data || []);
      }
      setLoading(false);
    }

    fetchEngagements();
  }, []);

  const columns = [
    {
      header: "Engagement Name",
      accessorKey: "name",
      cell: (engagement: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{engagement.name}</span>
          <span className="text-xs text-slate-500">{engagement.engagement_type}</span>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account_id",
      cell: (engagement: any) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <Building2 className="w-3 h-3" />
          {engagement.accounts?.name || "No Account"}
        </div>
      ),
    },
    {
      header: "Dates",
      accessorKey: "start_date",
      cell: (engagement: Engagement) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <Calendar className="w-3 h-3" />
          {formatDate(engagement.start_date)} - {formatDate(engagement.end_date)}
        </div>
      ),
    },
    {
      header: "Value",
      accessorKey: "contract_value",
      cell: (engagement: Engagement) => (
        <span className="text-sm font-medium text-slate-900">
          {formatCurrency(engagement.contract_value)}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (engagement: Engagement) => {
        const colors: Record<string, string> = {
          Planned: "text-blue-600 bg-blue-50",
          "In Progress": "text-amber-600 bg-amber-50",
          "On Hold": "text-slate-600 bg-slate-50",
          Complete: "text-green-600 bg-green-50",
        };
        return (
          <Badge
            className={cn(
              "font-medium border-none",
              colors[engagement.status] || "bg-slate-50"
            )}
          >
            {engagement.status}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Engagements</h1>
          <p className="text-slate-500 mt-1">Track active projects and service delivery.</p>
        </div>
        <Link href="/engagements/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Engagement
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
          data={engagements}
          onRowClick={(engagement) => {
            window.location.href = `/engagements/${engagement.id}`;
          }}
        />
      )}
    </div>
  );
}
