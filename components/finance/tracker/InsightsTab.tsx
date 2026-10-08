"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Insight, InsightSeverity } from "@/lib/finance/insights";
import { cn } from "@/lib/utils";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";

const META: Record<InsightSeverity, { icon: React.ElementType; tone: string; label: string; bar: string }> = {
  critical: { icon: AlertOctagon, tone: "text-red-600 bg-red-50", label: "Act now", bar: "bg-red-500" },
  warning: { icon: AlertTriangle, tone: "text-amber-600 bg-amber-50", label: "Attention", bar: "bg-amber-500" },
  info: { icon: Info, tone: "text-primary bg-primary/10", label: "Opportunity", bar: "bg-primary" },
  positive: { icon: CheckCircle2, tone: "text-brand-green-bright bg-brand-green-bright/10", label: "Going well", bar: "bg-brand-green-bright" },
};

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const m = META[insight.severity];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-4 pl-5">
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", m.bar)} />
      <div className="flex items-start gap-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.tone)}>
          <m.icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {m.label} · {insight.category}
          </p>
          <p className="font-semibold text-foreground leading-snug mt-0.5">{insight.title}</p>
          {!compact && <p className="text-sm text-muted-foreground mt-1">{insight.detail}</p>}
          {insight.action && (
            <Link href={insight.action.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              {insight.action.label} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsTab({ insights }: { insights: Insight[] }) {
  const [filter, setFilter] = useState<InsightSeverity | "all">("all");
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: insights.length };
    insights.forEach((i) => (c[i.severity] = (c[i.severity] || 0) + 1));
    return c;
  }, [insights]);
  const shown = filter === "all" ? insights : insights.filter((i) => i.severity === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "warning", "info", "positive"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filter === k ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40"
            )}
          >
            {k === "all" ? "All" : META[k].label} ({counts[k] || 0})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {shown.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </div>
      {!shown.length && <p className="text-sm text-muted-foreground">Nothing in this category right now.</p>}
      <p className="text-xs text-muted-foreground">
        Recommendations are generated from live portal data and update automatically. They are operating guidance, not tax, legal or investment advice — confirm
        tax rates, filing dates and contract terms with your CPA or attorney.
      </p>
    </div>
  );
}
