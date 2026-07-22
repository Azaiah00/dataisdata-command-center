"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDateRelative } from "@/lib/utils";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface ActivityFeedProps {
  activities: any[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "meeting":
        return <Users className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "site visit":
        return <MapPin className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#0a0a0a]">Recent Activities</CardTitle>
            <CardDescription>Latest interactions and updates</CardDescription>
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
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-[#737373]">No recent activities</div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      activity.outcome === "Good" && "bg-neutral-200 text-neutral-900",
                      activity.outcome === "Neutral" && "bg-neutral-100 text-neutral-600",
                      activity.outcome === "Bad" && "bg-red-100 text-red-600"
                    )}
                  >
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0a0a0a] text-sm">
                        {activity.activity_type}
                      </span>
                      <span className="text-[#737373] text-xs">•</span>
                      <span className="text-xs text-[#737373]">
                        {formatDateRelative(activity.date_time)}
                      </span>
                    </div>
                    <p className="text-sm text-[#0a0a0a] font-medium truncate mt-0.5">
                      {activity.accounts?.name || "No Account"}
                    </p>
                    <p className="text-xs text-[#737373] line-clamp-2 mt-1 leading-relaxed">
                      {activity.summary}
                    </p>
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
