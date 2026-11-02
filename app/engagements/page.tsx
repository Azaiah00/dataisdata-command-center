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
import { NewBadge, NewHighlight } from "@/components/engagements/Classification";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CLASSIFICATION_FIELDS,
  activeOptions,
  useFieldOptions,
  NEW_COLUMNS,
  PHASES,
  type ClassificationKey,
  classificationLine,
  displayType,
  displayValue,
  phaseOf,
  useClassificationColumns,
} from "@/lib/engagementClassification";

const ANY = "__any__";
const UNSET = "__unset__";

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { can } = useAccess();
  const showContractors = can("contractors");
  const [byEng, setByEng] = useState<Record<string, { id: string; full_name: string }[]>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "open">("all");
  const columnsReady = useClassificationColumns();
  const live = useFieldOptions();
  const [classFilter, setClassFilter] = useState<Partial<Record<ClassificationKey, string>>>({});
  const classFields = CLASSIFICATION_FIELDS.filter((f) => f.key === "engagement_type" || (columnsReady && NEW_COLUMNS.includes(f.key)));
  /** Compare on the display name so "Staff Aug" and "Staff Augmentation" filter together. */
  const classValue = (e: any, key: ClassificationKey): string => displayValue(key, e[key]) || "";

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
        Object.entries(classFilter).every(([k, want]) => {
          if (!want || want === ANY) return true;
          const have = classValue(e, k as ClassificationKey);
          return want === UNSET ? !have : have === want;
        })
      )
      .filter((e) =>
        !q
          ? true
          : [e.name, e.accounts?.name, e.engagement_type, displayType(e.engagement_type), e.service_practice, e.revenue_model, displayValue("service_practice", e.service_practice), e.engagement_status, ...(byEng[e.id] || []).map((c) => c.full_name)]
              .filter(Boolean)
              .some((v: string) => v.toLowerCase().includes(q))
      );
  }, [engagements, byEng, query, filter, classFilter]);

  /** Options for each filter: the standard list plus any other value already in the data. */
  const filterOptions = useMemo(() => {
    const out: Partial<Record<ClassificationKey, string[]>> = {};
    for (const f of classFields) {
      const listed = activeOptions(f.key, live).map((o) => o.value);
      const seen = new Set(listed);
      const extra = Array.from(new Set(engagements.map((e) => classValue(e, f.key)).filter((v) => v && !seen.has(v)))).sort();
      out[f.key] = [...listed, ...extra];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classFields derives from columnsReady
  }, [engagements, columnsReady, live]);

  const phaseCounts = useMemo(() => {
    const counts = Object.fromEntries(PHASES.map((p) => [p, 0])) as Record<(typeof PHASES)[number], number>;
    engagements.forEach((e) => counts[phaseOf(e.engagement_status)]++);
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phaseOf reads the live lists in `live`
  }, [engagements, live]);
  const activeClassFilters = Object.values(classFilter).filter((v) => v && v !== ANY).length;

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
            <span className="text-xs text-[#4f6178] truncate">{classificationLine(engagement)}</span>
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
      header: columnsReady ? (
        <span className="inline-flex items-center gap-1.5">
          Status <NewBadge />
        </span>
      ) : (
        "Status"
      ),
      accessorKey: "status",
      cell: (engagement: any) => (
        <div className="flex flex-col items-start gap-1">
          <Badge
            className={cn(
              "font-medium border-none text-[10px] h-5 px-2",
              getStatusColor(engagement.status)
            )}
            title="Delivery Status"
          >
            {engagement.status}
          </Badge>
          {columnsReady &&
            (engagement.engagement_status ? (
              <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(engagement.engagement_status))} title="Engagement Status">
                {engagement.engagement_status}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground" title="Engagement Status">Engagement status not set</span>
            ))}
        </div>
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

      {!loading && (
        <NewHighlight className="classification-block" tour="eng-filters">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1e2c40]">Filter by classification</span>
              <NewBadge />
            </div>
            {activeClassFilters > 0 && (
              <button type="button" className="filter-pill" onClick={() => setClassFilter({})}>
                Clear {activeClassFilters} filter{activeClassFilters === 1 ? "" : "s"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {classFields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-medium text-[#4f6178]">{f.label}</span>
                <Select value={classFilter[f.key] || ANY} onValueChange={(v) => setClassFilter((prev) => ({ ...prev, [f.key]: v }))}>
                  <SelectTrigger className="w-full" aria-label={`Filter by ${f.label}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All</SelectItem>
                    <SelectItem value={UNSET}>Not set</SelectItem>
                    {(filterOptions[f.key] || []).map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ))}
          </div>
          {columnsReady && (
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {PHASES.map((p) => (
                <span key={p} className="classification-chip">
                  {p}: <strong className="ml-1 tabular-nums">{phaseCounts[p]}</strong>
                </span>
              ))}
            </div>
          )}
        </NewHighlight>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div data-tour="eng-table">
        <DataTable
          columns={columns}
          data={visible}
          onRowClick={(engagement) => {
            window.location.href = `/engagements/${engagement.id}`;
          }}
        />
        </div>
      )}
    </div>
  );
}
