"use client";

import { Activity } from "@/lib/types";
import { formatDateTime, formatDate } from "@/lib/utils";
import { MessageSquare, Phone, Mail, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  activities: (Activity & { accounts?: { name: string } })[];
  showAccount?: boolean;
}

export function ActivityFeed({ activities, showAccount = true }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "Call": return <Phone className="w-3 h-3" />;
      case "Email": return <Mail className="w-3 h-3" />;
      case "Meeting": return <Calendar className="w-3 h-3" />;
      case "Site Visit": return <MapPin className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "Good": return "bg-green-500";
      case "Bad": return "bg-red-500";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.length > 0 ? (
          activities.map((activity, idx) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {idx !== activities.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-white",
                        getOutcomeColor(activity.outcome)
                      )}
                    >
                      {getIcon(activity.activity_type)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{activity.activity_type}</span>
                        {showAccount && activity.accounts && (
                          <>
                            {" with "}
                            <span className="font-medium text-blue-600">
                              {activity.accounts.name}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">{activity.summary}</p>
                      {activity.next_action && (
                        <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 uppercase">
                          Next: {activity.next_action}
                        </div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-slate-500">
                      <time dateTime={activity.date_time}>{formatDate(activity.date_time)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            No activities recorded yet.
          </div>
        )}
      </ul>
    </div>
  );
}
