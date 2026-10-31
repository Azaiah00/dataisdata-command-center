"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- rows are Supabase join results */

import { Can } from "@/components/auth/AccessProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Engagement } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Building2, Calendar, ArrowUpRight, HardHat, AlertCircle, Search } from "lucide-react";
import { loadEngagementContractors } from "@/lib/contractorLinks";
import { useAccess } from "@/components/auth/AccessProvider";
import { PageHeader, StatTile } from "@/components/ui/page";
import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { can } = useAccess();
  const showContractors = can("contractors");
  const [byEng, setByEng] = useState<Record<string, { id: string; full_name: string }[]>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "open">("all");

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
    if (showContractors) loadEngagementContractors().then(setByEng);
  }, [showContractors]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return engagements
      .filter((e) => (filter === "missing" ? e.contract_value == null : filter === "open" ? e.status !== "Complete" : true))
      .filter((e) =>
        !q
          ? true
          : [e.name, e.accounts?.name, e.engagement_type, ...(byEng[e.id] || []).map((c) => c.full_name)]
              .filter(Boolean)
              .some((v: string) => v.toLowerCase().includes(q))
      );
  }, [engagements, byEng, query, filter]);

  const totals = useMemo(
    () => ({
      value: engagements.reduce((t, e) => t + (e.contract_value == null ? 0 : Number(e.contract_value)), 0),
      missing: engagements.filter((e) => e.contract_value == null).length,
      open: engagements.filter((e) => e.status !== "Complete").length,
      unlinked: showContractors ? engagements.filter((e) => !(byEng[e.id] || []).length).length : 0,
    }),
    [engagements, byEng, showContractors]
  );

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
            <span className="font-bold text-[#1e2c40] text-sm truncate">{engagement.name}</span>
            <span className="text-xs text-[#4f6178]">{engagement.engagement_type}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account_id",
      cell: (engagement: any) => (
        <div className="flex items-center gap-1.5 text-[#4f6178] text-xs">
          <Building2 className="w-3.5 h-3.5" />
          {engagement.accounts?.name || "No Account"}
        </div>
      ),
    },
    ...(showContractors
      ? [
          {
            header: "Contractor",
            accessorKey: "contractors",
            cell: (engagement: any) => {
              const list = byEng[engagement.id] || [];
              return list.length ? (
                <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {list.map((c) => (
                    <Link key={c.id} href={`/contractors/${c.id}`} className="text-xs text-foreground hover:text-primary inline-flex items-center gap-1">
                      <HardHat className="w-3 h-3 text-muted-foreground" /> {c.full_name}
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Not linked</span>
              );
            },
          },
        ]
      : []),
    {
      header: "Dates",
      accessorKey: "start_date",
      cell: (engagement: Engagement) => (
        <div className="flex items-center gap-1.5 text-[#4f6178] text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(engagement.start_date)} - {formatDate(engagement.end_date)}
        </div>
      ),
    },
    {
      header: "Value",
      accessorKey: "contract_value",
      cell: (engagement: Engagement) => (
        engagement.contract_value != null ? (
          <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(engagement.contract_value)}</span>
        ) : (
          <span className="text-xs font-medium text-amber-700 inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Not entered
          </span>
        )
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4f6178] hover:text-white hover:bg-primary">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagements"
        description="Active projects and service delivery, with the contractors and contract value on each."
        actions={
          <Can module="engagements" action="create">
            <Link href="/engagements/new">
              <Button>
                <Plus className="w-4 h-4" /> New Engagement
              </Button>
            </Link>
          </Can>
        }
      />

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Engagements" value={String(engagements.length)} hint={`${totals.open} not complete`} />
          <StatTile label="Total contract value" value={formatCurrency(totals.value)} hint={`${engagements.length - totals.missing} with a value`} />
          <StatTile label="Values not entered" value={String(totals.missing)} hint="Click to filter below" tone={totals.missing ? "warn" : "good"} onClick={() => setFilter("missing")} />
          {showContractors && <StatTile label="No contractor linked" value={String(totals.unlinked)} hint="Engagements without a contractor" />}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search engagement, agency or contractor" aria-label="Search engagements" className="search-field" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            ["all", "All"],
            ["open", "Not complete"],
            ["missing", "Missing value"],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={cn("filter-pill", filter === k && "is-active")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={visible}
          onRowClick={(engagement) => {
            window.location.href = `/engagements/${engagement.id}`;
          }}
        />
      )}
    </div>
  );
}
