"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface HealthData {
  status: string;
  count: number;
  atRisk: number;
}

interface EngagementHealthProps {
  healthData: HealthData[];
}

export function EngagementHealth({ healthData }: EngagementHealthProps) {
  const atRisk = healthData.reduce((sum, h) => sum + h.atRisk, 0);

  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111827]">Engagement Health</CardTitle>
            <CardDescription>Status overview of all engagements</CardDescription>
          </div>
          <Link href="/engagements">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/10">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {healthData.map((item) => (
            <div key={item.status} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#6B7280]">{item.status}</span>
                {item.atRisk > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1 px-1.5 bg-red-100 text-red-700 border-none">
                    {item.atRisk} at risk
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-[#111827]">{item.count}</p>
            </div>
          ))}
        </div>
        
        {atRisk > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 truncate">
                {atRisk} engagement{atRisk > 1 ? 's' : ''} at risk
              </p>
            </div>
            <Link href="/engagements?status=at-risk">
              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 h-8 px-2">
                Review
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
