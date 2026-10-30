"use client";

import { Can, useAccess } from "@/components/auth/AccessProvider";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Contact, Activity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Mail, Phone, Building2, ChevronLeft, CalendarDays, MessageSquare, TrendingUp, Briefcase } from "lucide-react";
import Link from "next/link";

type AccountRef = { id: string; name: string };
type OppRef = { id: string; name: string; stage: string; estimated_value: number | null; account_id: string | null };
type EngRef = { id: string; name: string; status: string; contract_value: number | null; accounts?: { name: string } | null };
type ActivityRow = Activity & { tagged: boolean; account_name?: string | null };

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAccess();
  const [contact, setContact] = useState<Contact | null>(null);
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [opportunities, setOpportunities] = useState<OppRef[]>([]);
  const [engagements, setEngagements] = useState<EngRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContactData() {
      const { data } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setContact(data);

      // Every account this contact belongs to: primary account + account_contacts links.
      const { data: links } = await supabase.from("account_contacts").select("account_id").eq("contact_id", id);
      const accountIds = Array.from(new Set([...(data.account_id ? [data.account_id] : []), ...(links || []).map((l: { account_id: string }) => l.account_id)]));
      const accRes = accountIds.length ? await supabase.from("accounts").select("id, name").in("id", accountIds) : { data: [] as AccountRef[] };
      const accs = ((accRes.data || []) as AccountRef[]).sort((a, b) => (a.id === data.account_id ? -1 : b.id === data.account_id ? 1 : a.name.localeCompare(b.name)));
      setAccounts(accs);
      const accName = Object.fromEntries(accs.map((a) => [a.id, a.name]));

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const [tagged, atAccounts, opps, engLinks] = await Promise.all([
        can("activities") ? supabase.from("activity_contacts").select("activities(*)").eq("contact_id", id) : Promise.resolve({ data: [] as any[] }),
        can("activities") && accountIds.length
          ? supabase.from("activities").select("*").in("account_id", accountIds).order("date_time", { ascending: false }).limit(25)
          : Promise.resolve({ data: [] as any[] }),
        can("pipeline") ? supabase.from("opportunities").select("id, name, stage, estimated_value, account_id").eq("primary_contact_id", id) : Promise.resolve({ data: [] as any[] }),
        can("engagements") ? supabase.from("engagement_contacts").select("engagements(id, name, status, contract_value, accounts(name))").eq("contact_id", id) : Promise.resolve({ data: [] as any[] }),
      ]);

      const taggedList = ((tagged.data || []) as any[]).map((r) => (Array.isArray(r.activities) ? r.activities[0] : r.activities)).filter(Boolean) as Activity[];
      const taggedIds = new Set(taggedList.map((a) => a.id));
      const merged: ActivityRow[] = [
        ...taggedList.map((a) => ({ ...a, tagged: true, account_name: accName[a.account_id] })),
        ...((atAccounts.data || []) as Activity[]).filter((a) => !taggedIds.has(a.id)).map((a) => ({ ...a, tagged: false, account_name: accName[a.account_id] })),
      ].sort((a, b) => (b.date_time || "").localeCompare(a.date_time || ""));
      setActivities(merged);
      setOpportunities((opps.data || []) as OppRef[]);
      setEngagements(
        ((engLinks.data || []) as any[])
          .map((r) => (Array.isArray(r.engagements) ? r.engagements[0] : r.engagements))
          .filter(Boolean)
          .map((e) => ({ ...e, accounts: Array.isArray(e.accounts) ? e.accounts[0] : e.accounts }))
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */
      setLoading(false);
    }

    fetchContactData();
  }, [id, can]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Contact not found</h2>
        <Link href="/contacts" className="text-primary hover:underline mt-3 inline-block">
          Return to Contacts
        </Link>
      </div>
    );
  }

  const primary = accounts[0];
  const healthColors: Record<string, string> = {
    Strong: "bg-[#dcf2e4] text-[#23774a]",
    Warm: "bg-[#fbf0d9] text-[#8a5a12]",
    Cold: "bg-[#e6ebf3] text-[#3d4e70]",
  };
  const logActivityHref = `/activities/new?account_id=${primary?.id || ""}&contact_id=${id}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-[1_1_14rem] min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="page-title">{contact.full_name}</h1>
            <Badge className={cn("border-none", healthColors[contact.relationship_health])}>{contact.relationship_health} relationship</Badge>
          </div>
          <p className="page-subtitle">
            {[contact.title_role, primary ? `at ${primary.name}` : null].filter(Boolean).join(" ") || "No role or account yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Can module="contacts" action="edit">
            <Link href={`/contacts/${id}/edit`}>
              <Button variant="outline">Edit Contact</Button>
            </Link>
          </Can>
          <Can module="activities" action="create">
            <Link href={logActivityHref}>
              <Button>Log Activity</Button>
            </Link>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-sm text-foreground hover:text-primary break-all">
                    {contact.email}
                  </a>
                ) : (
                  <span className="text-sm">No email</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-sm text-foreground hover:text-primary">
                    {contact.phone}
                  </a>
                ) : (
                  <span className="text-sm">No phone</span>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <span className="stat-label block mb-2">Influence</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn("w-2.5 h-2.5 rounded-full", i < (contact.influence_level || 0) ? "bg-[#4b5f86]" : "bg-[#dfe4ec]")} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">{contact.influence_level ?? 0}/5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Can module="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Accounts</CardTitle>
                <CardDescription>{accounts.length ? "First one is the primary account" : "Not linked to an account yet"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {accounts.map((a, i) => (
                  <Link key={a.id} href={`/accounts/${a.id}`} className="list-row">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </span>
                    {i === 0 && <Badge>Primary</Badge>}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </Can>

          <Card>
            <CardHeader>
              <CardTitle>Strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="stat-label block mb-1">Next step</span>
                <p className="text-sm text-foreground">{contact.next_step || "No next step defined."}</p>
              </div>
              <div>
                <span className="stat-label block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contact.tags?.length ? contact.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>) : <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Can module="pipeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" /> Opportunities ({opportunities.length})
                </CardTitle>
                <CardDescription>Where this person is the primary contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {opportunities.length ? (
                  opportunities.map((o) => (
                    <Link key={o.id} href={`/pipeline/${o.id}`} className="list-row">
                      <span className="text-sm font-medium text-foreground truncate">{o.name}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold tabular-nums">{o.estimated_value != null ? formatCurrency(o.estimated_value) : "Not entered"}</span>
                        <Badge className={cn("border-none", getStatusColor(o.stage))}>{o.stage}</Badge>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not the primary contact on any opportunity.</p>
                )}
              </CardContent>
            </Card>
          </Can>

          <Can module="engagements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" /> Engagements ({engagements.length})
                </CardTitle>
                <CardDescription>Engagements this person is a stakeholder on</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {engagements.length ? (
                  engagements.map((e) => (
                    <Link key={e.id} href={`/engagements/${e.id}`} className="list-row">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">{e.name}</span>
                        <span className="block text-xs text-muted-foreground truncate">{e.accounts?.name || "No account"}</span>
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold tabular-nums">{e.contract_value != null ? formatCurrency(e.contract_value) : "Not entered"}</span>
                        <Badge className={cn("border-none", getStatusColor(e.status))}>{e.status}</Badge>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not added to any engagement yet. Add them from an engagement&apos;s page.</p>
                )}
              </CardContent>
            </Card>
          </Can>

          <Can module="activities" action="view">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>Activities this person was on, plus other activity at their accounts</CardDescription>
                </div>
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {activities.length > 0 ? (
                    activities.map((activity, idx) => (
                      <Link key={activity.id} href={`/activities/${activity.id}`} className="relative pl-8 block group">
                        {idx !== activities.length - 1 && <div className="absolute left-[11px] top-7 -bottom-5 w-[2px] bg-[#e6eaf1]" />}
                        <div className={cn("absolute left-0 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white", activity.tagged ? "border-[#4b5f86]" : "border-[#c3ccdb]")}>
                          <MessageSquare className={cn("w-3 h-3", activity.tagged ? "text-[#4b5f86]" : "text-[#8b95a7]")} />
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary">
                            {activity.activity_type}
                            {!activity.tagged && activity.account_name && <span className="ml-2 text-xs font-normal text-muted-foreground">at {activity.account_name}</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(activity.date_time)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.summary}</p>
                        {activity.next_action && (
                          <div className="mt-2 px-3 py-2 bg-[#f3f5f9] rounded-lg text-xs border border-[#e6eaf1]">
                            <span className="font-semibold text-primary mr-2">Next:</span>
                            {activity.next_action}
                          </div>
                        )}
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">No activity recorded yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Can>
        </div>
      </div>
    </div>
  );
}
