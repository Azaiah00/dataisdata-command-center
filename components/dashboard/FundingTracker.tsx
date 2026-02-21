"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateRelative } from "@/lib/utils";

interface FundingItem {
  id: string;
  name: string;
  funding_source: string | null;
  funding_stage: string | null;
  grant_deadline: string | null;
  grant_probability_pct: number | null;
}

interface FundingTrackerProps {
  items: FundingItem[];
}

export function FundingTracker({ items }: FundingTrackerProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#111827]">Grant and Funding Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-[#6B7280]">No funding-linked initiatives yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/engagements/${item.id}`} className="text-sm font-semibold text-[#111827] hover:text-primary">
                {item.name}
              </Link>
              <Badge variant="outline" className="border-slate-200 text-xs">{item.funding_stage || "Unstaged"}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6B7280]">
              <span>Source: <strong className="text-[#111827]">{item.funding_source || "N/A"}</strong></span>
              <span>Deadline: <strong className="text-[#111827]">{formatDateRelative(item.grant_deadline)}</strong></span>
              <span>Probability: <strong className="text-[#111827]">{item.grant_probability_pct ?? 0}%</strong></span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
