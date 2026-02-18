"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Opportunity, Account } from "@/lib/types";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus, Building2, User, DollarSign, Calendar } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunities() {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          accounts (
            name
          ),
          contacts (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching opportunities:", error);
      } else {
        setOpportunities(data || []);
      }
      setLoading(false);
    }

    fetchOpportunities();
  }, []);

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities.filter((op) => op.stage === stage);
  };

  const calculateStageTotal = (stage: string) => {
    return getOpportunitiesByStage(stage).reduce(
      (sum, op) => sum + (op.estimated_value || 0),
      0
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pipeline</h1>
          <p className="text-slate-500 mt-1">Track potential work and weighted revenue forecasts.</p>
        </div>
        <Link href="/pipeline/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Opportunity
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start">
          {PIPELINE_STAGES.map((stage) => {
            const stageOps = getOpportunitiesByStage(stage);
            const totalValue = calculateStageTotal(stage);
            
            return (
              <div key={stage} className="flex-shrink-0 w-80 flex flex-col max-h-full">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", STAGE_COLORS[stage])} />
                    <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                      {stage}
                    </h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {stageOps.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                <div className="bg-slate-100/50 p-2 rounded-lg flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                  {stageOps.map((op) => (
                    <Card
                      key={op.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-none shadow-sm"
                      onClick={() => (window.location.href = `/pipeline/${op.id}`)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">
                            {op.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <Building2 className="w-3 h-3" />
                            {op.accounts?.name}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1 text-slate-900 font-bold text-sm">
                            {formatCurrency(op.estimated_value)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border">
                            {op.probability_pct}%
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {op.expected_start ? new Date(op.expected_start).toLocaleDateString() : "TBD"}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {op.contacts?.full_name?.split(" ")[0] || "No POC"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageOps.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
