"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Engagement } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Building2, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

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
        console.error("Error fetching engagements:", error?.message || error);
      } else {
        setEngagements(data || []);
      }
      setLoading(false);
    }

    fetchEngagements();
  }, []);

  const columns = [
    {
      header: "Engagement",
      accessorKey: "name",
      cell: (engagement: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111827] text-sm truncate">{engagement.name}</span>
            <span className="text-xs text-[#6B7280]">{engagement.engagement_type}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account_id",
      cell: (engagement: any) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <Building2 className="w-3.5 h-3.5" />
          {engagement.accounts?.name || "No Account"}
        </div>
      ),
    },
    {
      header: "Dates",
      accessorKey: "start_date",
      cell: (engagement: Engagement) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(engagement.start_date)} - {formatDate(engagement.end_date)}
        </div>
      ),
    },
    {
      header: "Value",
      accessorKey: "contract_value",
      cell: (engagement: Engagement) => (
        <span className="text-sm font-bold text-[#111827]">
          {formatCurrency(engagement.contract_value)}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (engagement: Engagement) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            getStatusColor(engagement.status)
          )}
        >
          {engagement.status}
        </Badge>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (engagement: Engagement) => (
        <div className="flex justify-end">
          <Link href={`/engagements/${engagement.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-white hover:bg-primary">
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
          <h1 className="text-2xl font-bold text-[#111827]">Engagements</h1>
          <p className="text-[#6B7280]">Track active projects and service delivery.</p>
        </div>
        <Link href="/engagements/new">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Engagement
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
