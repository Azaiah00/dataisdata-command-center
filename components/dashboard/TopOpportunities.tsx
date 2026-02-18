"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCompactCurrency, getStatusColor } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  estimated_value: number;
  probability_pct: number;
  accounts: { name: string } | null;
}

interface TopOpportunitiesProps {
  opportunities: Opportunity[];
}

export function TopOpportunities({ opportunities }: TopOpportunitiesProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111827]">Top Opportunities</CardTitle>
            <CardDescription>Highest value opportunities in pipeline</CardDescription>
          </div>
          <Link href="/pipeline">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[#6B7280]">No active opportunities</div>
          ) : (
            opportunities.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#111827] text-sm truncate group-hover:text-blue-700 transition-colors">
                    {opp.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[#6B7280] truncate">{opp.accounts?.name}</span>
                    <span className="text-[#6B7280] text-[10px]">•</span>
                    <Badge className={cn("text-[10px] h-4 px-1.5 font-medium border-none", getStatusColor(opp.stage))}>
                      {opp.stage}
                    </Badge>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-bold text-[#111827] text-sm">
                    {formatCompactCurrency(opp.estimated_value)}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {opp.probability_pct}% probability
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
