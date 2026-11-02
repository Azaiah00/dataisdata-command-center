"use client";

import { Can, useAccess } from "@/components/auth/AccessProvider";
import { LinkedRecordsCard, partnerOptions } from "@/components/shared/LinkedRecordsCard";
import { Handshake, CalendarDays, Plus } from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Opportunity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { TrendingUp, Building2, User, Calendar, DollarSign, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ENGAGEMENT_TYPE_OPTIONS, displayType } from "@/lib/engagementClassification";
import { securityTerm } from "@/lib/terms";

/**
 * Classification for an engagement created from an awarded opportunity.
 * If the service line is itself an engagement type (e.g. "Advisory") it stays the type, as before;
 * otherwise it becomes the Service / Practice. Engagement Status starts at "Awarded".
 * The new columns are only sent once the database has them.
 */
async function convertedClassification(serviceLine: string | null) {
  const { error } = await supabase.from("engagements").select("service_practice, engagement_status").limit(1);
  const ready = !error;
  const isType = !!serviceLine && ENGAGEMENT_TYPE_OPTIONS.some((o) => o.value === displayType(serviceLine));
  if (!ready) return { engagement_type: serviceLine || "Advisory" };
  return {
    engagement_type: isType ? serviceLine : null,
    service_practice: isType ? null : serviceLine || null,
    engagement_status: "Awarded",
  };
}

export default function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<(Opportunity & { accounts?: { name: string }; contacts?: { full_name: string } }) | null>(null);
  const [relatedAccounts, setRelatedAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkedEngagement, setLinkedEngagement] = useState<{ id: string; name: string } | null>(null);
  const [converting, setConverting] = useState(false);
  const { can } = useAccess();
  const [partners, setPartners] = useState<{ id: string; name: string; partner_type: string | null }[]>([]);
  const [oppActivities, setOppActivities] = useState<{ id: string; activity_type: string; date_time: string; summary: string | null }[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchOpportunity() {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, accounts(name), contacts(full_name)")
        .eq("id", id)
        .single();
      if (error || !data) {
        setOpportunity(null);
        setRelatedAccounts([]);
      } else {
        setOpportunity(data);
        if (data.stage === "Awarded" && data.account_id) {
          const { data: eng } = await supabase.from("engagements").select("id, name").eq("account_id", data.account_id).eq("name", data.name).limit(1);
          setLinkedEngagement(eng && eng[0] ? eng[0] : null);
        }

        if (data.related_account_ids && data.related_account_ids.length > 0) {
          const { data: related, error: relatedError } = await supabase
            .from("accounts")
            .select("id, name")
            .in("id", data.related_account_ids);

          if (!relatedError && related) {
            setRelatedAccounts(related as { id: string; name: string }[]);
          } else {
            setRelatedAccounts([]);
          }
        } else {
          setRelatedAccounts([]);
        }
      }
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const [pl, acts] = await Promise.all([
        supabase.from("opportunity_partners").select("partners(id, name, partner_type)").eq("opportunity_id", id),
        supabase.from("activities").select("id, activity_type, date_time, summary").eq("opportunity_id", id).order("date_time", { ascending: false }),
      ]);
      setPartners(((pl.data || []) as any[]).map((r) => (Array.isArray(r.partners) ? r.partners[0] : r.partners)).filter(Boolean));
      setOppActivities((acts.data || []) as any[]);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      setLoading(false);
    }
    fetchOpportunity();
  }, [id, reloadKey]);

  /** Awarded work becomes an engagement so delivery, billing and finance pick it up. */
  async function convertToEngagement() {
    if (!opportunity) return;
    setConverting(true);
    const { data, error } = await supabase
      .from("engagements")
      .insert({
        name: opportunity.name,
        account_id: opportunity.account_id,
        // Type, service and pricing are separate fields: the opportunity's service line is what
        // DataIsData delivers, so it becomes the Service / Practice (type is set on the engagement).
        ...(await convertedClassification(opportunity.service_line)),
        status: "Planned",
        start_date: opportunity.expected_start || null,
        end_date: opportunity.expected_end || null,
        contract_value: opportunity.estimated_value ?? null,
        scope_summary: [opportunity.notes, opportunity.funding_source ? `Funding: ${opportunity.funding_source}` : null].filter(Boolean).join("\n\n") || null,
      })
      .select("id, name")
      .single();
    setConverting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Carry the people over so the new engagement starts connected.
    const carry = await Promise.all([
      opportunity.primary_contact_id ? supabase.from("engagement_contacts").insert({ engagement_id: data.id, contact_id: opportunity.primary_contact_id }) : Promise.resolve({ error: null }),
      partners.length ? supabase.from("engagement_partners").insert(partners.map((p) => ({ engagement_id: data.id, partner_id: p.id }))) : Promise.resolve({ error: null }),
    ]);
    const carryErr = carry.find((c) => c.error)?.error;
    if (carryErr) toast.error(`Engagement created, but contacts/partners were not copied: ${carryErr.message}`);
    toast.success("Engagement created from the awarded opportunity");
    router.push(`/engagements/${data.id}`);
  }

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    if (error) {
      toast.error("Failed to delete opportunity");
      return;
    }
    toast.success("Opportunity deleted");
    router.push("/pipeline");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Opportunity not found</h2>
        <Link href="/pipeline" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#4f6178] uppercase tracking-wider">
        <Link href="/pipeline" className="hover:text-primary transition-colors">
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-[#1e2c40] truncate">{opportunity.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#1e2c40]">{opportunity.name}</h1>
                <Badge
                  className={cn(
                    "font-medium border-none text-[10px] h-5 px-2",
                    getStatusColor(opportunity.stage)
                  )}
                >
                  {opportunity.stage}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#4f6178]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <Link
                    href={`/accounts/${opportunity.account_id}`}
                    className="hover:text-primary font-medium"
                  >
                    {opportunity.accounts?.name ?? "Unknown account"}
                  </Link>
                </div>
                {relatedAccounts.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[#4f6178]">
                    <span className="text-slate-300">•</span>
                    <span>Also linked to</span>
                    <div className="flex flex-wrap gap-1">
                      {relatedAccounts.map((acc) => (
                        <Link
                          key={acc.id}
                          href={`/accounts/${acc.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {acc.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {opportunity.service_line && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>{securityTerm(opportunity.service_line)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {opportunity.stage === "Awarded" &&
              (linkedEngagement ? (
                <Link href={`/engagements/${linkedEngagement.id}`}>
                  <Button variant="outline" size="sm">
                    View engagement
                  </Button>
                </Link>
              ) : (
                <Can module="engagements" action="create">
                  <Button size="sm" onClick={convertToEngagement} disabled={converting}>
                    {converting ? "Creating…" : "Convert to engagement"}
                  </Button>
                </Can>
              ))}
            <Can module="pipeline" action="edit">
              <Link href={`/pipeline/${id}/edit`}>
                <Button variant="outline" size="sm" className="border-slate-200">
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              </Link>
            </Can>
            <Can module="pipeline" action="delete">
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this opportunity?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete &quot;{opportunity.name}&quot;. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" disabled={deleting} onClick={onDelete}>
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Can>
          </div>
        </div>
      </div>

      {/* Value & probability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#4f6178]">Estimated value</span>
              <span className="font-bold text-[#1e2c40]">
                {opportunity.estimated_value != null ? formatCurrency(opportunity.estimated_value) : <span className="text-amber-700 text-sm">Not entered</span>}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#4f6178]">Weighted value</span>
              <span className="font-bold text-emerald-600">
                {opportunity.weighted_value != null
                  ? formatCurrency(opportunity.weighted_value)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#4f6178]">Probability</span>
              <span className="font-bold text-[#1e2c40]">
                {opportunity.probability_pct != null ? `${opportunity.probability_pct}%` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Dates & contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#4f6178]">Expected start</span>
              <span className="font-bold text-[#1e2c40]">
                {opportunity.expected_start ? formatDate(opportunity.expected_start) : "TBD"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#4f6178]">Expected end</span>
              <span className="font-bold text-[#1e2c40]">
                {opportunity.expected_end ? formatDate(opportunity.expected_end) : "TBD"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#4f6178]">Primary contact</span>
              <span className="font-bold text-[#1e2c40]">
                {opportunity.contacts?.full_name ? (
                  <Link href={`/contacts/${opportunity.primary_contact_id}`} className="hover:text-primary">
                    {opportunity.contacts.full_name}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#4f6178]">Funding source</span>
              <span className="font-bold text-[#1e2c40]">{opportunity.funding_source || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next step */}
      {(opportunity.next_step || opportunity.next_step_due) && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Next step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunity.next_step && (
              <p className="text-sm text-[#3b4d64]">{opportunity.next_step}</p>
            )}
            {opportunity.next_step_due && (
              <p className="text-xs text-[#4f6178]">
                Due: {formatDate(opportunity.next_step_due)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {opportunity.notes && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#3b4d64] whitespace-pre-wrap">{opportunity.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {opportunity.attachments && opportunity.attachments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {opportunity.attachments.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {decodeURIComponent(url.split("/").pop() || "file")}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {can("partners") && (
          <LinkedRecordsCard
            title="Partners"
            description="Teaming partners on this pursuit — they see it on their partner page"
            icon={Handshake}
            table="opportunity_partners"
            ownerColumn="opportunity_id"
            ownerId={opportunity.id}
            otherColumn="partner_id"
            hrefBase="/partners"
            items={partners.map((p) => ({ id: p.id, label: p.name, sub: p.partner_type }))}
            loadOptions={partnerOptions}
            canEdit={can("pipeline", "edit")}
            emptyText="No partners on this opportunity."
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        )}
        {can("activities") && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" /> Activities ({oppActivities.length})
                </CardTitle>
                <CardDescription className="mt-1">Touchpoints logged on this opportunity</CardDescription>
              </div>
              {can("activities", "create") && (
                <Link href={`/activities/new?account_id=${opportunity.account_id || ""}&opportunity_id=${opportunity.id}${opportunity.primary_contact_id ? `&contact_id=${opportunity.primary_contact_id}` : ""}`}>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" /> Log
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {oppActivities.length ? (
                oppActivities.slice(0, 8).map((a) => (
                  <Link key={a.id} href={`/activities/${a.id}`} className="list-row">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{a.activity_type}</span>
                      <span className="block text-xs text-muted-foreground truncate">{a.summary || "No notes"}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.date_time)}</span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activities logged on this opportunity yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
