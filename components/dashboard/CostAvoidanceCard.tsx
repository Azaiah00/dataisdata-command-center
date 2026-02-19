"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface CostAvoidanceItem {
  id: string;
  name: string;
  annual_license_cost: number | null;
  estimated_savings: number | null;
  redundant_purchase_risk: boolean | null;
  existing_tool_owned: boolean | null;
}

interface CostAvoidanceCardProps {
  items: CostAvoidanceItem[];
}

export function CostAvoidanceCard({ items }: CostAvoidanceCardProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#111827]">Cost Avoidance Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-[#6B7280]">No flagged initiatives yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/engagements/${item.id}`} className="text-sm font-semibold text-[#111827] hover:text-blue-600">
                {item.name}
              </Link>
              <div className="flex items-center gap-1">
                {item.existing_tool_owned && <Badge className="bg-amber-100 text-amber-700 border-none">Owned Tool</Badge>}
                {item.redundant_purchase_risk && <Badge className="bg-red-100 text-red-700 border-none">Duplicate Risk</Badge>}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
              <div>License Cost: <span className="font-medium text-[#111827]">{formatCurrency(item.annual_license_cost)}</span></div>
              <div>Est. Savings: <span className="font-medium text-green-700">{formatCurrency(item.estimated_savings)}</span></div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
