"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

interface PipelineChartProps {
  stages: PipelineStage[];
}

export function PipelineChart({ stages }: PipelineChartProps) {
  const activeStages = stages.filter(s => s.stage !== 'Awarded' && s.stage !== 'Lost');
  const totalValue = activeStages.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111827]">Pipeline by Stage</CardTitle>
            <CardDescription>Opportunity distribution across stages</CardDescription>
          </div>
          <Link href="/pipeline">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/10">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {activeStages.length === 0 ? (
            <div className="py-8 text-center text-[#6B7280]">No active opportunities</div>
          ) : (
            activeStages.map((stage) => {
              const percentage = totalValue > 0 ? (stage.value / totalValue) * 100 : 0;
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#111827]">{stage.stage}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-100 text-[#6B7280] border-none">
                        {stage.count}
                      </Badge>
                    </div>
                    <span className="font-medium text-primary">
                      {formatCompactCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <Separator className="my-4 bg-slate-100" />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6B7280]">Total Pipeline</span>
          <span className="text-lg font-bold text-[#111827]">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
