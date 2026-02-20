"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus, Building2, User, Calendar, ArrowUpRight, GripVertical } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, getStatusColor } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

// --- Components ---

function SortableOpportunityCard({ op, onClick }: { op: any; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: op.id,
    data: {
      type: "Opportunity",
      opportunity: op,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-none shadow-sm group relative",
          isDragging && "ring-2 ring-blue-500 shadow-lg"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col flex-1">
              <h4 className="font-bold text-[#111827] text-sm leading-snug group-hover:text-blue-600 transition-colors">
                {op.name}
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{op.accounts?.name}</span>
              </div>
            </div>
            <div 
              {...listeners} 
              className="p-1 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing text-slate-400"
            >
              <GripVertical className="w-4 h-4" />
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
    </div>
  );
}

// --- Main Page ---

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOp, setActiveOp] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchOpportunities = useCallback(async () => {
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
      toast.error("Failed to load opportunities");
    } else {
      setOpportunities(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const updateOpportunityStage = async (id: string, newStage: string) => {
    // Optimistic update
    setOpportunities((prev) =>
      prev.map((op) => (op.id === id ? { ...op, stage: newStage } : op))
    );

    const { error } = await supabase
      .from("opportunities")
      .update({ stage: newStage })
      .eq("id", id);

    if (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
      fetchOpportunities(); // Revert on error
    } else {
      toast.success(`Moved to ${newStage}`);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Opportunity") {
      setActiveOp(event.active.data.current.opportunity);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAnOpportunity = active.data.current?.type === "Opportunity";
    const isOverAnOpportunity = over.data.current?.type === "Opportunity";

    if (!isActiveAnOpportunity) return;

    // Dropping an opportunity over another opportunity (guard .current for strict TS)
    const activeOpData = active.data?.current?.opportunity;
    const overOpData = over.data?.current?.opportunity;
    if (isActiveAnOpportunity && isOverAnOpportunity && activeOpData && overOpData) {
      if (activeOpData.stage !== overOpData.stage) {
        setOpportunities((prev) => {
          const activeIndex = prev.findIndex((op) => op.id === activeId);
          const overIndex = prev.findIndex((op) => op.id === overId);
          const updated = [...prev];
          updated[activeIndex].stage = overOpData.stage;
          return arrayMove(updated, activeIndex, overIndex);
        });
      }
    }

    // Dropping an opportunity over a stage column
    const isOverAColumn = typeof overId === "string" && PIPELINE_STAGES.some((stage) => stage === overId);
    if (isActiveAnOpportunity && isOverAColumn && activeOpData) {
      const overStage = overId as string;
      if (activeOpData.stage !== overStage) {
        setOpportunities((prev) => {
          const activeIndex = prev.findIndex((op) => op.id === activeId);
          const updated = [...prev];
          updated[activeIndex].stage = overStage;
          return arrayMove(updated, activeIndex, activeIndex); // Just trigger re-render
        });
      }
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOp(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeOp = opportunities.find((op) => op.id === activeId);
    if (!activeOp) return;

    // Determine target stage
    let targetStage = activeOp.stage;
    if (typeof overId === "string" && PIPELINE_STAGES.some((stage) => stage === overId)) {
      targetStage = overId;
    } else {
      const overOp = opportunities.find((op) => op.id === overId);
      if (overOp) {
        targetStage = overOp.stage;
      }
    }

    if (activeOp.stage !== targetStage) {
      await updateOpportunityStage(activeId, targetStage);
    }
  };

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
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

                  <SortableContext
                    id={stage}
                    items={stageOps.map((op) => op.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div 
                      className={cn(
                        "bg-slate-100/40 p-2 rounded-xl flex-1 overflow-y-auto space-y-3 min-h-[200px] border border-slate-100 transition-colors",
                        "hover:bg-slate-100/60"
                      )}
                    >
                      {stageOps.map((op) => (
                        <SortableOpportunityCard
                          key={op.id}
                          op={op}
                          onClick={() => (window.location.href = `/pipeline/${op.id}`)}
                        />
                      ))}
                      {stageOps.length === 0 && (
                        <div className="py-12 text-center text-[#6B7280] text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl m-2">
                          No opportunities
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: "0.5",
                },
              },
            }),
          }}>
            {activeOp ? (
              <div className="w-80 opacity-90">
                <Card className="border-none shadow-xl ring-2 ring-blue-500">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col">
                      <h4 className="font-bold text-[#111827] text-sm leading-snug">
                        {activeOp.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="truncate">{activeOp.accounts?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1 text-[#111827] font-bold text-sm">
                        {formatCurrency(activeOp.estimated_value)}
                      </div>
                      <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {activeOp.probability_pct}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
