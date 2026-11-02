"use client";

import { useMemo, useState } from "react";
import { Tags } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { NewBadge, NewHighlight } from "@/components/engagements/Classification";
import { CLASSIFICATION_FIELDS, NEW_COLUMNS, PHASES, type ClassificationKey, displayValue, phaseOf } from "@/lib/engagementClassification";

export type ClassifiableEngagement = {
  engagement_type?: string | null;
  service_practice?: string | null;
  revenue_model?: string | null;
  engagement_status?: string | null;
  contract_value?: number | string | null;
  margin_pct?: number | string | null;
};

export type ClassificationRow = { label: string; count: number; value: number; avgMargin: number | null };

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

/** Count, contract value and average planned margin per value of one classification field, biggest value first. */
export function breakdown(engs: ClassifiableEngagement[], key: ClassificationKey): ClassificationRow[] {
  const map = new Map<string, { count: number; value: number; marginSum: number; marginN: number }>();
  for (const e of engs) {
    const raw = e[key] ?? null;
    const label = displayValue(key, raw) || "Not set";
    const row = map.get(label) || { count: 0, value: 0, marginSum: 0, marginN: 0 };
    row.count++;
    row.value += num(e.contract_value) ?? 0;
    const m = num(e.margin_pct);
    if (m != null && !Number.isNaN(m)) {
      row.marginSum += m;
      row.marginN++;
    }
    map.set(label, row);
  }
  return Array.from(map.entries())
    .map(([label, r]) => ({ label, count: r.count, value: r.value, avgMargin: r.marginN ? r.marginSum / r.marginN : null }))
    .sort((a, b) => (a.label === "Not set" ? 1 : b.label === "Not set" ? -1 : b.value - a.value || b.count - a.count));
}

export function phaseBreakdown(engs: ClassifiableEngagement[]) {
  return PHASES.map((p) => {
    const list = engs.filter((e) => phaseOf(e.engagement_status) === p);
    return { label: p, count: list.length, value: list.reduce((t, e) => t + (num(e.contract_value) ?? 0), 0) };
  });
}

/**
 * Reports card: engagements by Type, Service / Practice, Revenue Model and Engagement Status,
 * showing how many are in development, how many generate revenue, and which types earn the most.
 */
export function ClassificationReport({ engagements, columnsReady }: { engagements: ClassifiableEngagement[]; columnsReady: boolean | null }) {
  const fields = CLASSIFICATION_FIELDS.filter((f) => f.key === "engagement_type" || (columnsReady && NEW_COLUMNS.includes(f.key)));
  const [tab, setTab] = useState<ClassificationKey>("engagement_type");
  const rows = useMemo(() => breakdown(engagements, tab), [engagements, tab]);
  const phases = useMemo(() => phaseBreakdown(engagements), [engagements]);
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <NewHighlight className="rounded-[1.125rem]" tour="report-classification">
      <Card className="border-none shadow-sm print:shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1e2c40] flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            Engagements by Classification
            <NewBadge />
          </CardTitle>
          <CardDescription>Which engagement types, services and revenue models carry the most contract value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {columnsReady && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {phases.map((p) => (
                <div key={p.label} className="rounded-xl border border-slate-100 bg-white/70 p-3">
                  <p className="text-xs text-[#4f6178]">{p.label}</p>
                  <p className="text-xl font-bold text-[#1e2c40] tabular-nums">{p.count}</p>
                  <p className="text-xs text-[#4f6178] tabular-nums">{formatCurrency(p.value)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Group engagements by">
            {fields.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={tab === f.key}
                onClick={() => setTab(f.key)}
                className={cn("filter-pill", tab === f.key && "is-active")}
              >
                {f.label}
              </button>
            ))}
          </div>

          {rows.length ? (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium text-[#1e2c40]">
                      {r.label}
                      <span className="ml-2 text-xs font-normal text-[#4f6178]">
                        {r.count} engagement{r.count === 1 ? "" : "s"}
                        {r.avgMargin != null && ` · avg margin ${r.avgMargin.toFixed(1)}%`}
                      </span>
                    </span>
                    <span className="font-bold text-[#1e2c40] tabular-nums">{formatCurrency(r.value)}</span>
                  </div>
                  <div className="clay-track h-2 rounded-full overflow-hidden">
                    <div className="clay-segment h-full rounded-full bg-primary" style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">No engagements yet.</p>
          )}

          {columnsReady === false && (
            <p className="text-xs text-amber-800">Service, revenue model and status breakdowns appear once supabase/2026-11-engagement-classification.sql has been run.</p>
          )}
        </CardContent>
      </Card>
    </NewHighlight>
  );
}
