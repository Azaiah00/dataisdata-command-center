"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus, Building2, User, Calendar, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, getStatusColor } from "@/lib/utils";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Pipeline</h1>
          <p className="text-[#6B7280]">Track potential work and weighted revenue forecasts.</p>
        </div>
        <Link href="/pipeline/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                    <h3 className="font-bold text-[#6B7280] uppercase text-[10px] tracking-widest">
                      {stage}
                    </h3>
                    <span className="text-[10px] font-bold text-[#6B7280] bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {stageOps.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#111827]">
                    {formatCurrency(totalValue)}
                  </span>
                </div>

                <div className="bg-slate-100/40 p-2 rounded-xl flex-1 overflow-y-auto space-y-3 min-h-[200px] border border-slate-100">
                  {stageOps.map((op) => (
                    <Card
                      key={op.id}
                      className="cursor-pointer hover:shadow-md transition-all border-none shadow-sm group"
                      onClick={() => (window.location.href = `/pipeline/${op.id}`)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-[#111827] text-sm leading-snug group-hover:text-blue-600 transition-colors">
                            {op.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="truncate">{op.accounts?.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-1 text-[#111827] font-bold text-sm">
                            {formatCurrency(op.estimated_value)}
                          </div>
                          <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {op.probability_pct}%
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {op.expected_start ? new Date(op.expected_start).toLocaleDateString() : "TBD"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[80px]">
                              {op.contacts?.full_name?.split(" ")[0] || "No POC"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageOps.length === 0 && (
                    <div className="py-12 text-center text-[#6B7280] text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl m-2">
                      No opportunities
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
