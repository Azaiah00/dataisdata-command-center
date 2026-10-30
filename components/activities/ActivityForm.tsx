"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { ACTIVITY_TYPES, OUTCOME_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileAttachments } from "@/components/ui/FileAttachments";
import { MultiPicker, type PickerOption } from "@/components/ui/multi-picker";
import { syncLinks } from "@/lib/links";
import { useAccess } from "@/components/auth/AccessProvider";

const NONE = "none";

const formSchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  date_time: z.string().min(1, "Date and time are required."),
  account_id: z.string().uuid("Please select an account."),
  engagement_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  summary: z.string().min(5, "Summary must be at least 5 characters."),
  outcome: z.enum(OUTCOME_TYPES),
  next_action: z.string().optional(),
  next_action_due: z.string().optional(),
  attachments: z.array(z.string()),
  contact_ids: z.array(z.string()),
});
type Values = z.infer<typeof formSchema>;

/** "2026-10-30T14:05" in the viewer's own time zone (datetime-local needs local time, not UTC). */
export function toLocalInput(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface ActivityInitial {
  id?: string;
  activity_type?: (typeof ACTIVITY_TYPES)[number];
  date_time?: string | null;
  account_id?: string | null;
  engagement_id?: string | null;
  opportunity_id?: string | null;
  summary?: string | null;
  outcome?: (typeof OUTCOME_TYPES)[number];
  next_action?: string | null;
  next_action_due?: string | null;
  attachments?: string[] | null;
  contact_ids?: string[];
}

export function ActivityForm({ initial, onDone }: { initial: ActivityInitial; onDone: (id: string) => void }) {
  const router = useRouter();
  const { can } = useAccess();
  const editing = !!initial.id;
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [engagements, setEngagements] = useState<{ id: string; name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<PickerOption[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_type: initial.activity_type || "Meeting",
      date_time: toLocalInput(initial.date_time),
      account_id: initial.account_id || "",
      engagement_id: initial.engagement_id || NONE,
      opportunity_id: initial.opportunity_id || NONE,
      summary: initial.summary || "",
      outcome: initial.outcome || "Neutral",
      next_action: initial.next_action || "",
      next_action_due: initial.next_action_due || "",
      attachments: initial.attachments || [],
      contact_ids: initial.contact_ids || [],
    },
  });

  const selectedAccountId = form.watch("account_id");
  const prevAccount = useRef(initial.account_id || "");

  useEffect(() => {
    supabase
      .from("accounts")
      .select("id, name")
      .order("name")
      .then(({ data }) => setAccounts(data || []));
  }, []);

  useEffect(() => {
    // Picking a different account clears engagement/opportunity that belonged to the old one.
    if (selectedAccountId !== prevAccount.current) {
      form.setValue("engagement_id", NONE);
      form.setValue("opportunity_id", NONE);
      prevAccount.current = selectedAccountId;
    }
    if (!selectedAccountId) {
      setEngagements([]);
      setOpportunities([]);
      setContacts([]);
      return;
    }
    (async () => {
      const [engRes, oppRes, oppRelRes, conLinks, conDirect] = await Promise.all([
        supabase.from("engagements").select("id, name").eq("account_id", selectedAccountId).order("name"),
        supabase.from("opportunities").select("id, name").eq("account_id", selectedAccountId),
        supabase.from("opportunities").select("id, name").contains("related_account_ids", [selectedAccountId]),
        supabase.from("account_contacts").select("contacts(id, full_name, title_role)").eq("account_id", selectedAccountId),
        supabase.from("contacts").select("id, full_name, title_role").eq("account_id", selectedAccountId),
      ]);
      setEngagements(engRes.data || []);
      const opps = new Map<string, { id: string; name: string }>();
      [...(oppRes.data || []), ...(oppRelRes.error ? [] : oppRelRes.data || [])].forEach((o) => opps.set(o.id, o));
      setOpportunities(Array.from(opps.values()).sort((a, b) => a.name.localeCompare(b.name)));
      const cons = new Map<string, PickerOption>();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      [...((conLinks.data || []) as any[]).map((r) => (Array.isArray(r.contacts) ? r.contacts[0] : r.contacts)), ...((conDirect.data || []) as any[])]
        .filter(Boolean)
        .forEach((c: any) => cons.set(c.id, { id: c.id, label: c.full_name, hint: c.title_role || undefined }));
      /* eslint-enable @typescript-eslint/no-explicit-any */
      // Keep already-tagged people visible even if they're no longer on this account.
      const picked = form.getValues("contact_ids").filter((id) => !cons.has(id));
      if (picked.length) {
        const { data } = await supabase.from("contacts").select("id, full_name, title_role").in("id", picked);
        (data || []).forEach((c) => cons.set(c.id, { id: c.id, label: c.full_name, hint: c.title_role || undefined }));
      }
      setContacts(Array.from(cons.values()).sort((a, b) => a.label.localeCompare(b.label)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  async function onSubmit(values: Values) {
    setSaving(true);
    const local = new Date(values.date_time);
    const payload = {
      activity_type: values.activity_type,
      date_time: isNaN(local.getTime()) ? values.date_time : local.toISOString(),
      account_id: values.account_id,
      engagement_id: values.engagement_id && values.engagement_id !== NONE ? values.engagement_id : null,
      opportunity_id: values.opportunity_id && values.opportunity_id !== NONE ? values.opportunity_id : null,
      summary: values.summary,
      outcome: values.outcome,
      next_action: values.next_action || null,
      next_action_due: values.next_action_due || null,
      attachments: values.attachments?.length ? values.attachments : null,
    };
    const res = editing
      ? await supabase.from("activities").update(payload).eq("id", initial.id!).select("id").single()
      : await supabase.from("activities").insert([payload]).select("id").single();
    if (res.error || !res.data) {
      setSaving(false);
      toast.error(`Activity not saved: ${res.error?.message || "no record returned"}`);
      return;
    }
    const id = res.data.id as string;
    const links = await syncLinks({ table: "activity_contacts", ownerColumn: "activity_id", ownerId: id, otherColumn: "contact_id", desiredIds: values.contact_ids });
    setSaving(false);
    if (links.error) toast.error(`Activity saved, but the people on it were not updated: ${links.error}`);
    else toast.success(editing ? "Activity updated" : "Activity logged");
    onDone(id);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="activity_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
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
            name="date_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date &amp; Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
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
            name="outcome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outcome</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OUTCOME_TYPES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {can("engagements") && (
            <FormField
              control={form.control}
              name="engagement_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engagement (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || NONE} disabled={!selectedAccountId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedAccountId ? "Select engagement" : "Select an account first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {engagements.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {can("pipeline") && (
            <FormField
              control={form.control}
              name="opportunity_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || NONE} disabled={!selectedAccountId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedAccountId ? "Select opportunity" : "Select an account first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {opportunities.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {can("contacts") && (
          <FormField
            control={form.control}
            name="contact_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>People on this activity</FormLabel>
                <MultiPicker
                  options={contacts}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={selectedAccountId ? "Add a contact…" : "Select an account first"}
                  emptyText={selectedAccountId ? "No more contacts at this account" : "Select an account first"}
                />
                <FormDescription>They&apos;ll see this activity on their contact page.</FormDescription>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary / Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="What happened during this activity?" className="min-h-[120px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="next_action"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Action</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Send proposal draft" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="next_action_due"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Action Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>Clear the date once it&apos;s done to stop the follow-up reminder.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Log Activity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
