"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDateRelative } from "@/lib/utils";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  next_action: string;
  next_action_due: string;
  accounts: { name: string } | null;
}

interface UpcomingTasksProps {
  tasks: Task[];
}

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111827]">Upcoming Tasks</CardTitle>
            <CardDescription>Next actions and follow-ups</CardDescription>
          </div>
          <Link href="/activities">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 hover:bg-primary/10">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-20" />
                <p className="text-[#6B7280] text-sm font-medium">No upcoming tasks</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100 hover:border-primary/20"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111827] leading-snug">
                      {task.next_action}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-[#6B7280] truncate">
                        {task.accounts?.name}
                      </span>
                      <span className="text-[#6B7280] text-[10px]">•</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-200 text-[#6B7280] font-normal">
                        {formatDateRelative(task.next_action_due)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
