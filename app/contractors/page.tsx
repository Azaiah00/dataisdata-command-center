"use client";

import { Can, useAccess } from "@/components/auth/AccessProvider";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Contractor } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Mail, ArrowUpRight, Pencil, Search, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { loadContractorRollups, type ContractorRollup } from "@/lib/contractorLinks";
import { PageHeader, StatTile } from "@/components/ui/page";

type Row = Contractor & { r: ContractorRollup | null };

export default function ContractorsPage() {
  const { can } = useAccess();
  const showValues = can("engagements");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [rollups, setRollups] = useState<Record<string, ContractorRollup>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "Active" | "Inactive">("all");

  useEffect(() => {
    async function fetchContractors() {
      const [{ data, error }, r] = await Promise.all([
        supabase.from("contractors").select("*").order("full_name"),
        showValues ? loadContractorRollups() : Promise.resolve({} as Record<string, ContractorRollup>),
      ]);
      if (error) console.error("Error fetching contractors:", error);
      setContractors(data ?? []);
      setRollups(r);
      setLoading(false);
    }
    fetchContractors();
  }, [showValues]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contractors
      .map((c) => ({ ...c, r: rollups[c.id] || null }))
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) =>
        !q
          ? true
          : [c.full_name, c.title_role, c.email, ...(c.r?.agencies.map((a) => a.name) || []), ...(c.r?.engagements.map((e) => e.name) || [])]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
      );
  }, [contractors, rollups, query, status]);

  const totals = useMemo(() => {
    const all = Object.values(rollups);
    return {
      value: all.reduce((t, r) => t + r.totalValue, 0),
      missing: all.reduce((t, r) => t + r.missingValue, 0),
      active: contractors.filter((c) => c.status === "Active").length,
      placed: contractors.filter((c) => (rollups[c.id]?.engagements.length || 0) > 0).length,
    };
  }, [rollups, contractors]);

  const columns = [
    {
      header: "Contractor",
      accessorKey: "full_name",
      cell: (c: Row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="avatar-chip">{c.full_name.charAt(0)}</div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-sm truncate">{c.full_name}</span>
            <span className="text-xs text-muted-foreground truncate">{c.title_role || "—"}</span>
          </div>
        </div>
      ),
    },
    ...(showValues
      ? [
          {
            header: "Agencies",
            accessorKey: "agencies",
            cell: (c: Row) =>
              c.r?.agencies.length ? (
                <div className="text-xs text-muted-foreground max-w-[16rem] truncate" title={c.r.agencies.map((a) => a.name).join(", ")}>
                  {c.r.agencies.map((a) => a.name).join(", ")}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
          {
            header: "Engagements",
            accessorKey: "engagements",
            cell: (c: Row) => (
              <span className="text-sm text-foreground tabular-nums">
                {c.r?.engagements.length || 0}
                {c.r && c.r.activeCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({c.r.activeCount} open)</span>}
              </span>
            ),
          },
          {
            header: "Contract value",
            accessorKey: "value",
            cell: (c: Row) =>
              !c.r || !c.r.engagements.length ? (
                <span className="text-xs text-muted-foreground">No engagements</span>
              ) : (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground tabular-nums">{c.r.withValue ? formatCurrency(c.r.totalValue) : "Not entered"}</span>
                  {c.r.missingValue > 0 && (
                    <span className="text-[11px] text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {c.r.missingValue} of {c.r.engagements.length} missing a value
                    </span>
                  )}
                </div>
              ),
          },
        ]
      : []),
    {
      header: "Email",
      accessorKey: "email",
      cell: (c: Row) => (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Mail className="w-3.5 h-3.5" />
          {c.email || "N/A"}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (c: Row) => (
        <Badge variant="outline" className={cn("status-pill", c.status === "Active" ? "status-good" : "status-muted")}>
          {c.status}
        </Badge>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (c: Row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Can module="contractors" action="edit">
            <Link href={`/contractors/${c.id}/edit`} aria-label={`Edit ${c.full_name}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Can>
          <Link href={`/contractors/${c.id}`} aria-label={`Open ${c.full_name}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
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
        title="Contractors"
        description="Everyone placed at client accounts, with the engagements and contract values they are linked to."
        actions={
          <Can module="contractors" action="create">
            <Link href="/contractors/new">
              <Button>
                <Plus className="w-4 h-4" /> New Contractor
              </Button>
            </Link>
          </Can>
        }
      />

      {showValues && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Contractors" value={String(contractors.length)} hint={`${totals.active} active`} />
          <StatTile label="Placed on engagements" value={String(totals.placed)} hint={`${contractors.length - totals.placed} not linked yet`} />
          <StatTile label="Total contract value" value={formatCurrency(totals.value)} hint="Across linked engagements" />
          <StatTile
            label="Values not entered"
            value={String(totals.missing)}
            hint={totals.missing ? "Engagements with a blank value" : "Every engagement has a value"}
            tone={totals.missing ? "warn" : "good"}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, role, agency or engagement"
            aria-label="Search contractors"
            className="search-field"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "Active", "Inactive"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={cn("filter-pill", status === s && "is-active")}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(c) => {
            window.location.href = `/contractors/${c.id}`;
          }}
        />
      )}
    </div>
  );
}
