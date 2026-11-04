"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Can, useAccess } from "@/components/auth/AccessProvider";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { EditDangerZone } from "@/components/trash/EditDangerZone";
import { Building2, Briefcase, TrendingUp, Users, ChevronLeft, Pencil, Trash2, CheckCircle2, Paperclip, CalendarClock } from "lucide-react";
import type { Activity } from "@/lib/types";

type Loaded = Activity & {
  accounts?: { id: string; name: string } | null;
  engagements?: { id: string; name: string } | null;
  opportunities?: { id: string; name: string } | null;
  contacts: { id: string; full_name: string; title_role: string | null }[];
};

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAccess();
  const [activity, setActivity] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("activities")
      .select("*, accounts(id, name), engagements(id, name), opportunities(id, name)")
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      setActivity(null);
      setLoading(false);
      return;
    }
    const { data: links } = await supabase.from("activity_contacts").select("contacts(id, full_name, title_role)").eq("activity_id", id);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const one = (v: any) => (Array.isArray(v) ? v[0] : v);
    setActivity({
      ...data,
      accounts: one(data.accounts),
      engagements: one(data.engagements),
      opportunities: one(data.opportunities),
      contacts: ((links || []) as any[]).map((l) => one(l.contacts)).filter(Boolean),
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function markDone() {
    const { error } = await supabase.from("activities").update({ next_action_due: null }).eq("id", id);
    if (error) return toast.error(`Not updated: ${error.message}`);
    toast.success("Follow-up marked done");
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }
  if (!activity) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Activity not found</h2>
        <Link href="/activities" className="text-primary hover:underline mt-3 inline-block">
          Return to Activities
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)} aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="page-title">Edit Activity</h1>
        </div>
        <Card>
          <CardContent>
            <ActivityForm
              initial={{ ...activity, contact_ids: activity.contacts.map((c) => c.id) }}
              onDone={() => {
                setEditing(false);
                load();
              }}
            />
            <EditDangerZone
              entityType="activities"
              entityId={activity.id}
              entityLabel={activity.summary?.slice(0, 60) || `${activity.activity_type} activity`}
              redirectAfter="/activities"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = activity.next_action_due && activity.next_action_due < today;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/activities" aria-label="Back to Activities">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-[1_1_14rem] min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{activity.activity_type}</h1>
            <Badge className={cn("border-none", getStatusColor(activity.outcome))}>{activity.outcome} outcome</Badge>
          </div>
          <p className="page-subtitle">
            {formatDateTime(activity.date_time)}
            {activity.accounts ? ` · ${activity.accounts.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Can module="activities" action="edit">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-foreground whitespace-pre-wrap">{activity.summary || "No notes."}</p>
            {(activity.next_action || activity.next_action_due) && (
              <div className={cn("rounded-xl border p-4", overdue ? "border-amber-200 bg-amber-50/80" : "border-[#d3dce5] bg-[#f0f4f7]")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="stat-label flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" /> Next action
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">{activity.next_action || "Follow up"}</p>
                    <p className={cn("text-xs mt-0.5", overdue ? "text-amber-800 font-semibold" : "text-muted-foreground")}>
                      {activity.next_action_due ? `Due ${formatDate(activity.next_action_due)}${overdue ? " · overdue" : ""}` : "Done — no due date"}
                    </p>
                  </div>
                  {activity.next_action_due && can("activities", "edit") && (
                    <Button size="sm" variant="outline" onClick={markDone}>
                      <CheckCircle2 className="w-4 h-4" /> Mark done
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!!activity.attachments?.length && (
              <div>
                <p className="stat-label mb-2">Attachments</p>
                <div className="flex flex-col gap-1.5">
                  {activity.attachments.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 break-all">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" /> {decodeURIComponent(url.split("/").pop() || url)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked to</CardTitle>
              <CardDescription>Shows on each of these records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.accounts && (
                <Link href={`/accounts/${activity.accounts.id}`} className="list-row">
                  <span className="flex items-center gap-2 text-sm min-w-0">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{activity.accounts.name}</span>
                  </span>
                  <Badge variant="secondary">Account</Badge>
                </Link>
              )}
              {activity.engagements && (
                <Link href={`/engagements/${activity.engagements.id}`} className="list-row">
                  <span className="flex items-center gap-2 text-sm min-w-0">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{activity.engagements.name}</span>
                  </span>
                  <Badge variant="secondary">Engagement</Badge>
                </Link>
              )}
              {activity.opportunities && (
                <Link href={`/pipeline/${activity.opportunities.id}`} className="list-row">
                  <span className="flex items-center gap-2 text-sm min-w-0">
                    <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{activity.opportunities.name}</span>
                  </span>
                  <Badge variant="secondary">Opportunity</Badge>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> People ({activity.contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.contacts.length ? (
                activity.contacts.map((c) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="list-row">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="avatar-chip">{c.full_name.charAt(0)}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{c.full_name}</span>
                        <span className="block text-xs text-muted-foreground truncate">{c.title_role || "Contact"}</span>
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No one tagged. Use Edit to add the people who were there.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
