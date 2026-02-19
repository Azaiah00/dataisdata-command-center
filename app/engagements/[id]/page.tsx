"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Engagement } from "@/lib/types";
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
import {
  ChevronLeft,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  account_id: z.string().uuid("Please select an account."),
  engagement_type: z.string().optional(),
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
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      account_id: "",
      engagement_type: "",
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
    form.reset({
      name: data.name,
      account_id: data.account_id,
      engagement_type: data.engagement_type ?? "",
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
    async function fetchAccounts() {
      const { data } = await supabase.from("accounts").select("id, name").order("name");
      setAccounts(data || []);
    }
    fetchAccounts();
  }, []);

  async function onSave(values: z.infer<typeof formSchema>) {
    setSaving(true);
    const payload = {
      name: values.name,
      account_id: values.account_id,
      engagement_type: values.engagement_type || null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      status: values.status,
      scope_summary: values.scope_summary || null,
      attachments: values.attachments?.length ? values.attachments : null,
      budget: values.budget === "" || values.budget == null ? null : parseFloat(values.budget),
      contract_value: values.contract_value === "" || values.contract_value == null ? null : parseFloat(values.contract_value),
      margin_pct: values.margin_pct === "" || values.margin_pct == null ? null : parseFloat(values.margin_pct),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("engagements").update(payload).eq("id", id);
    setSaving(false);
    if (error) {
      console.error("Error updating engagement:", error);
      return;
    }
    setIsEditing(false);
    await fetchEngagement();
    router.refresh();
  }

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("engagements").delete().eq("id", id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    if (error) {
      console.error("Error deleting engagement:", error);
      return;
    }
    router.push("/engagements");
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
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/engagements" className="hover:text-blue-600 transition-colors">
          Engagements
        </Link>
        <span>/</span>
        <span className="text-[#111827] truncate">{engagement.name}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#111827]">{engagement.name}</h1>
                <span
                  className={cn(
                    "font-medium border-none text-xs px-2 py-1 rounded-md",
                    getStatusColor(engagement.status)
                  )}
                >
                  {engagement.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[#6B7280] text-sm">
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
                    <span>{engagement.engagement_type}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this project?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete &quot;{engagement.name}&quot;. Related activities will be unlinked. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={deleting}
                      onClick={onDelete}
                    >
                      {deleting ? "Deleting..." : "Delete project"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
        </div>
      </div>

      {isEditing && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Edit project</CardTitle>
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
                    name="engagement_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Advisory" {...field} />
                        </FormControl>
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
                        <FormLabel>Status</FormLabel>
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
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#111827]">Financials</CardTitle>
              <CardDescription>Budget and contract value</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#6B7280]">Contract value</span>
                <span className="font-bold text-[#111827]">
                  {engagement.contract_value != null
                    ? formatCurrency(engagement.contract_value)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#6B7280]">Budget</span>
                <span className="font-bold text-[#111827]">
                  {engagement.budget != null ? formatCurrency(engagement.budget) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#6B7280]">Margin</span>
                <span className="font-bold text-[#111827]">
                  {engagement.margin_pct != null ? `${engagement.margin_pct}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#111827]">Timeline</CardTitle>
              <CardDescription>Start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-[#6B7280]">Start</span>
                <span className="font-bold text-[#111827]">
                  {engagement.start_date ? formatDate(engagement.start_date) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#6B7280]">End</span>
                <span className="font-bold text-[#111827]">
                  {engagement.end_date ? formatDate(engagement.end_date) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isEditing && engagement.scope_summary && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap">{engagement.scope_summary}</p>
          </CardContent>
        </Card>
      )}

      {!isEditing && engagement.attachments && engagement.attachments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Attachments</CardTitle>
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
