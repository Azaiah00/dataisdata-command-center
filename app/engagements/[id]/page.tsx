"use client";

import { Can } from "@/components/auth/AccessProvider";
import { EntityFinancePanel } from "@/components/finance/EntityFinancePanel";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Engagement, Contractor } from "@/lib/types";
import { ENGAGEMENT_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileAttachments } from "@/components/ui/FileAttachments";
import { Account } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
  HardHat,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { syncLinks, parseAmount } from "@/lib/links";
import { useAccess } from "@/components/auth/AccessProvider";
import { EngagementInnovationCard } from "@/components/shared/EngagementInnovationCard";
import { LinkedRecordsCard, contractorOptions, contactOptions, partnerOptions } from "@/components/shared/LinkedRecordsCard";
import { Users, Handshake, CalendarDays, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { EditDangerZone } from "@/components/trash/EditDangerZone";
import { ClassificationCard, ClassificationFields } from "@/components/engagements/Classification";
import { classificationPayload, displayType, useClassificationColumns } from "@/lib/engagementClassification";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  account_id: z.string().uuid("Please select an account."),
  engagement_type: z.string().optional(),
  service_practice: z.string().optional(),
  revenue_model: z.string().optional(),
  engagement_status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(ENGAGEMENT_STATUSES),
  scope_summary: z.string().optional(),
  attachments: z.array(z.string()),
  budget: z.string().optional(),
  contract_value: z.string().optional(),
  margin_pct: z.string().optional(),
});

export default function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [engagement, setEngagement] = useState<(Engagement & { accounts?: Account }) | null>(null);
  const [accounts, setAccounts] = useState<Pick<Account, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [linkedContractors, setLinkedContractors] = useState<Contractor[]>([]);
  const [allContractors, setAllContractors] = useState<Pick<Contractor, "id" | "full_name" | "title_role">[]>([]);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);
  const { can } = useAccess();
  const columnsReady = useClassificationColumns();
  const [linkedContacts, setLinkedContacts] = useState<{ id: string; full_name: string; title_role: string | null }[]>([]);
  const [linkedPartners, setLinkedPartners] = useState<{ id: string; name: string; partner_type: string | null }[]>([]);
  const [engActivities, setEngActivities] = useState<{ id: string; activity_type: string; date_time: string; summary: string | null; outcome: string }[]>([]);
  const [sourceOpp, setSourceOpp] = useState<{ id: string; name: string; estimated_value: number | null; stage: string } | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      account_id: "",
      engagement_type: "",
      service_practice: "",
      revenue_model: "",
      engagement_status: "",
      start_date: "",
      end_date: "",
      status: "Planned",
      scope_summary: "",
      attachments: [],
      budget: "",
      contract_value: "",
      margin_pct: "",
    },
  });

  async function fetchEngagement() {
    const { data, error } = await supabase
      .from("engagements")
      .select("*, accounts(id, name)")
      .eq("id", id)
      .single();

    if (error || !data) {
      setEngagement(null);
      setLoading(false);
      return;
    }
    setEngagement(data);

    // Fetch linked contractors
    const { data: cLinks } = await supabase
      .from("engagement_contractors")
      .select("contractors(*)")
      .eq("engagement_id", id);
    const contractors = (cLinks || []).map((l: any) => l.contractors).filter(Boolean);
    setLinkedContractors(contractors);
    setSelectedContractorIds(contractors.map((c: Contractor) => c.id));

    // Everything else tied to this engagement, so it all shows in one place.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const one = (v: any) => (Array.isArray(v) ? v[0] : v);
    const [conLinks, partLinks, acts, opp] = await Promise.all([
      supabase.from("engagement_contacts").select("contacts(id, full_name, title_role)").eq("engagement_id", id),
      supabase.from("engagement_partners").select("partners(id, name, partner_type)").eq("engagement_id", id),
      supabase.from("activities").select("id, activity_type, date_time, summary, outcome").eq("engagement_id", id).order("date_time", { ascending: false }),
      data.account_id
        ? supabase.from("opportunities").select("id, name, estimated_value, stage").eq("account_id", data.account_id).eq("name", data.name).limit(1)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setLinkedContacts(((conLinks.data || []) as any[]).map((r) => one(r.contacts)).filter(Boolean));
    setLinkedPartners(((partLinks.data || []) as any[]).map((r) => one(r.partners)).filter(Boolean));
    setEngActivities((acts.data || []) as any[]);
    setSourceOpp(((opp.data || []) as any[])[0] || null);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    form.reset({
      name: data.name,
      account_id: data.account_id,
      engagement_type: data.engagement_type ?? "",
      service_practice: data.service_practice ?? "",
      revenue_model: data.revenue_model ?? "",
      engagement_status: data.engagement_status ?? "",
      start_date: data.start_date ?? "",
      end_date: data.end_date ?? "",
      status: data.status,
      scope_summary: data.scope_summary ?? "",
      attachments: data.attachments ?? [],
      budget: data.budget != null ? String(data.budget) : "",
      contract_value: data.contract_value != null ? String(data.contract_value) : "",
      margin_pct: data.margin_pct != null ? String(data.margin_pct) : "",
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchEngagement();
  }, [id]);

  useEffect(() => {
    async function fetchLookups() {
      const [accRes, cRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("contractors").select("id, full_name, title_role").order("full_name"),
      ]);
      setAccounts(accRes.data || []);
      setAllContractors(cRes.data || []);
    }
    fetchLookups();
  }, []);

  async function onSave(values: z.infer<typeof formSchema>) {
    setSaving(true);
    const payload = {
      name: values.name,
      account_id: values.account_id,
      ...classificationPayload(values, columnsReady),
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      status: values.status,
      scope_summary: values.scope_summary || null,
      attachments: values.attachments?.length ? values.attachments : null,
      budget: parseAmount(values.budget),
      contract_value: parseAmount(values.contract_value),
      margin_pct: parseAmount(values.margin_pct),
      updated_at: new Date().toISOString(),
    };
    const previousAccountId = engagement?.account_id;
    const { error } = await supabase.from("engagements").update(payload).eq("id", id);
    if (error) {
      console.error("Error updating engagement:", error);
      toast.error(`Engagement not saved: ${error.message}`);
      setSaving(false);
      return;
    }

    // Moved to a different account: carry its activities, invoices, expenses and placements along.
    if (previousAccountId && previousAccountId !== values.account_id) {
      const moves = await Promise.all(
        ["activities", "invoices", "expenses", "placements"].map((t) =>
          supabase.from(t).update({ account_id: values.account_id }).eq("engagement_id", id).eq("account_id", previousAccountId)
        )
      );
      const failed = moves.find((m) => m.error);
      if (failed?.error) toast.error(`Engagement moved, but some linked records kept the old account: ${failed.error.message}`);
    }

    // Contractor assignments: only add/remove what changed (never wipe the list).
    const links = await syncLinks({
      table: "engagement_contractors",
      ownerColumn: "engagement_id",
      ownerId: id,
      otherColumn: "contractor_id",
      desiredIds: selectedContractorIds,
    });
    if (links.error) toast.error(`Engagement saved, but contractor links were not updated: ${links.error}`);
    else toast.success("Engagement saved");

    setSaving(false);
    setIsEditing(false);
    await fetchEngagement();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">Engagement not found.</p>
        <Link href="/engagements">
          <Button variant="outline">Back to Engagements</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-[#4f6178] uppercase tracking-wider">
        <Link href="/engagements" className="hover:text-blue-600 transition-colors">
          Engagements
        </Link>
        <span>/</span>
        <span className="text-[#1e2c40] truncate">{engagement.name}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#1e2c40]">{engagement.name}</h1>
                <span
                  className={cn(
                    "font-medium border-none text-xs px-2 py-1 rounded-md",
                    getStatusColor(engagement.status)
                  )}
                >
                  {engagement.status}
                </span>
                {engagement.engagement_status && (
                  <span
                    className={cn("font-medium border-none text-xs px-2 py-1 rounded-md", getStatusColor(engagement.engagement_status))}
                    title="Engagement Status"
                  >
                    {engagement.engagement_status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[#4f6178] text-sm">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <Link
                    href={`/accounts/${engagement.account_id}`}
                    className="hover:text-blue-600 font-medium"
                  >
                    {engagement.accounts?.name ?? "Unknown account"}
                  </Link>
                </div>
                {engagement.engagement_type && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{displayType(engagement.engagement_type)}</span>
                  </>
                )}
                {engagement.service_practice && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{engagement.service_practice}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Can module="engagements" action="edit">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-200"
                  data-tour="eng-edit"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </Can>
          </div>
        </div>
      </div>

      {isEditing && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Edit project</CardTitle>
            <CardDescription>Update engagement details and save.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ENGAGEMENT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <ClassificationFields control={form.control} columnsReady={columnsReady} />
                  <FormField
                    control={form.control}
                    name="contract_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Value ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margin_pct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned margin (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="scope_summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope Summary</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Scope..." className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attachments</FormLabel>
                      <FormControl>
                        <FileAttachments label="" value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Editable contractor assignments */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Assigned Contractors</label>
                  {selectedContractorIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedContractorIds.map((cId) => {
                        const c = allContractors.find((ac) => ac.id === cId);
                        return (
                          <Badge key={cId} variant="secondary" className="gap-1 px-2 py-1 bg-amber-50 text-amber-800 border-none">
                            <HardHat className="w-3 h-3" />
                            {c?.full_name || "Unknown"}
                            <button
                              type="button"
                              className="ml-1 hover:text-red-600"
                              onClick={() => setSelectedContractorIds((prev) => prev.filter((x) => x !== cId))}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <Select
                    onValueChange={(val) => {
                      if (!selectedContractorIds.includes(val)) {
                        setSelectedContractorIds((prev) => [...prev, val]);
                      }
                    }}
                    value=""
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add a contractor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allContractors
                        .filter((c) => !selectedContractorIds.includes(c.id))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name}{c.title_role ? ` — ${c.title_role}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#4f6178]">Select multiple contractors to assign to this engagement.</p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>

                {engagement && (
                  <EditDangerZone
                    entityType="engagements"
                    entityId={engagement.id}
                    entityLabel={form.watch("name") || engagement.name}
                    redirectAfter="/engagements"
                  />
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ClassificationCard engagement={engagement} columnsReady={columnsReady} />
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#1e2c40]">Contract</CardTitle>
              <CardDescription>Contract value, budget and planned margin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#4f6178]">Contract value</span>
                <span className="font-bold text-[#1e2c40]">
                  {engagement.contract_value != null ? (
                    formatCurrency(engagement.contract_value)
                  ) : (
                    <span className="text-amber-700 text-sm">Not entered</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#4f6178]">Budget</span>
                <span className="font-bold text-[#1e2c40]">
                  {engagement.budget != null ? formatCurrency(engagement.budget) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#4f6178]">Margin</span>
                <span className="font-bold text-[#1e2c40]">
                  {engagement.margin_pct != null ? `${engagement.margin_pct}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#1e2c40]">Timeline</CardTitle>
              <CardDescription>Start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#4f6178]">Start</span>
                <span className="font-bold text-[#1e2c40]">
                  {engagement.start_date ? formatDate(engagement.start_date) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#4f6178]">End</span>
                <span className="font-bold text-[#1e2c40]">
                  {engagement.end_date ? formatDate(engagement.end_date) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {can("contractors") && (
            <LinkedRecordsCard
              title="Contractors"
              description="Shows on each contractor's page with this engagement's value"
              icon={HardHat}
              table="engagement_contractors"
              ownerColumn="engagement_id"
              ownerId={engagement.id}
              otherColumn="contractor_id"
              hrefBase="/contractors"
              items={linkedContractors.map((c) => ({ id: c.id, label: c.full_name, sub: c.title_role || "Contractor" }))}
              loadOptions={contractorOptions}
              canEdit={can("engagements", "edit")}
              emptyText="No contractor linked yet — use Manage to add one."
              onChanged={fetchEngagement}
            />
          )}
          {can("contacts") && (
            <LinkedRecordsCard
              title="Client contacts"
              description="Stakeholders at the client for this engagement"
              icon={Users}
              table="engagement_contacts"
              ownerColumn="engagement_id"
              ownerId={engagement.id}
              otherColumn="contact_id"
              hrefBase="/contacts"
              items={linkedContacts.map((c) => ({ id: c.id, label: c.full_name, sub: c.title_role }))}
              loadOptions={() => contactOptions(engagement.account_id ? [engagement.account_id] : [])}
              canEdit={can("engagements", "edit")}
              emptyText="No client contacts added yet."
              onChanged={fetchEngagement}
            />
          )}
          {can("partners") && (
            <LinkedRecordsCard
              title="Partners"
              description="Teaming partners and vendors on this engagement"
              icon={Handshake}
              table="engagement_partners"
              ownerColumn="engagement_id"
              ownerId={engagement.id}
              otherColumn="partner_id"
              hrefBase="/partners"
              items={linkedPartners.map((p) => ({ id: p.id, label: p.name, sub: p.partner_type }))}
              loadOptions={partnerOptions}
              canEdit={can("engagements", "edit")}
              emptyText="No partners on this engagement."
              onChanged={fetchEngagement}
            />
          )}
          {can("activities") && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" /> Activities ({engActivities.length})
                  </CardTitle>
                  <CardDescription className="mt-1">Meetings, calls and visits logged on this engagement</CardDescription>
                </div>
                {can("activities", "create") && (
                  <Link href={`/activities/new?account_id=${engagement.account_id || ""}&engagement_id=${engagement.id}`}>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4" /> Log
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {engActivities.length ? (
                  engActivities.slice(0, 8).map((a) => (
                    <Link key={a.id} href={`/activities/${a.id}`} className="list-row">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{a.activity_type}</span>
                        <span className="block text-xs text-muted-foreground truncate">{a.summary || "No notes"}</span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.date_time)}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activities logged on this engagement yet.</p>
                )}
              </CardContent>
            </Card>
          )}
          {can("pipeline") && sourceOpp && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" /> From opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/pipeline/${sourceOpp.id}`} className="list-row">
                  <span className="text-sm font-medium text-foreground truncate">{sourceOpp.name}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{sourceOpp.estimated_value != null ? formatCurrency(sourceOpp.estimated_value) : "Not entered"}</span>
                    <Badge className={cn("border-none", getStatusColor(sourceOpp.stage))}>{sourceOpp.stage}</Badge>
                  </span>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isEditing && <EngagementInnovationCard engagementId={engagement.id} canEdit={can("engagements", "edit")} />}

      {!isEditing && <EntityFinancePanel scope={{ engagementId: engagement.id, contractValue: engagement.contract_value }} title="Billing, costs & placements" />}

      {!isEditing && engagement.scope_summary && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#3b4d64] whitespace-pre-wrap">{engagement.scope_summary}</p>
          </CardContent>
        </Card>
      )}

      {!isEditing && engagement.attachments && engagement.attachments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#1e2c40]">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {engagement.attachments.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {decodeURIComponent(url.split("/").pop() || "file")}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
