"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CustomFieldInputs } from "@/components/finance/CustomFields";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { addDaysISO, todayISO } from "@/lib/finance/dates";
import { DEFAULT_FINANCE_SETTINGS, type CustomField } from "@/lib/finance/types";
import { formatCurrency, num } from "@/lib/utils";

const NONE = "none";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.string().min(1, "Qty required").refine((v) => Number(v) > 0, "Qty must be more than 0"),
  unit_price: z.string().min(1, "Price required"),
});

const formSchema = z.object({
  account_id: z.string().uuid("Select an account"),
  engagement_id: z.string().optional(),
  issue_date: z.string().min(1, "Issue date required"),
  payment_terms_days: z.string().optional(),
  due_date: z.string().optional(),
  tax_amount: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

function NewInvoiceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [engagements, setEngagements] = useState<{ id: string; name: string; account_id: string | null }[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [custom, setCustom] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const today = todayISO();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: params.get("account_id") || "",
      engagement_id: params.get("engagement_id") || NONE,
      issue_date: today,
      payment_terms_days: String(DEFAULT_FINANCE_SETTINGS.default_payment_terms_days),
      due_date: addDaysISO(today, DEFAULT_FINANCE_SETTINGS.default_payment_terms_days),
      tax_amount: "0",
      notes: "",
      line_items: [{ description: "", quantity: "1", unit_price: "" }],
    },
  });

  const { fields: lines, append, remove } = useFieldArray({ control: form.control, name: "line_items" });

  useEffect(() => {
    async function fetchLookups() {
      const [accRes, engRes, settingsRes, cfRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("engagements").select("id, name, account_id").order("name"),
        supabase.from("finance_settings").select("default_payment_terms_days").eq("id", 1).maybeSingle(),
        supabase.from("finance_custom_fields").select("*").eq("entity", "invoice").eq("is_active", true).order("sort_order"),
      ]);
      setAccounts(accRes.data || []);
      setEngagements(engRes.data || []);
      if (!cfRes.error) setFields((cfRes.data || []) as CustomField[]);
      const terms = settingsRes.data?.default_payment_terms_days;
      if (terms != null && !form.formState.dirtyFields.payment_terms_days) {
        form.setValue("payment_terms_days", String(terms));
        form.setValue("due_date", addDaysISO(form.getValues("issue_date"), Number(terms)));
      }
      // Pre-fill account from an engagement link
      const engId = params.get("engagement_id");
      if (engId && !params.get("account_id")) {
        const eng = (engRes.data || []).find((e: { id: string }) => e.id === engId);
        if (eng?.account_id) form.setValue("account_id", eng.account_id);
      }
    }
    fetchLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedItems = form.watch("line_items");
  const watchedTax = form.watch("tax_amount");
  const watchedAccount = form.watch("account_id");
  const subtotal = watchedItems.reduce((sum, li) => sum + Math.round(num(li.quantity) * num(li.unit_price) * 100) / 100, 0);
  const tax = num(watchedTax);
  const total = subtotal + tax;
  const engagementOptions = watchedAccount ? engagements.filter((e) => e.account_id === watchedAccount) : engagements;

  function recalcDue(issue: string, terms: string) {
    if (issue && terms !== "") form.setValue("due_date", addDaysISO(issue, Math.max(0, Math.round(num(terms)))));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.due_date && values.due_date < values.issue_date) {
      toast.error("Due date can't be before the issue date");
      return;
    }
    setSubmitting(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number");
      if (numErr) throw numErr;
      const invoiceNumber = numData || `INV-${Date.now()}`;
      const subAmt = values.line_items.reduce((s, li) => s + Math.round(num(li.quantity) * num(li.unit_price) * 100) / 100, 0);
      const taxAmt = num(values.tax_amount);
      const engagementId = values.engagement_id && values.engagement_id !== NONE ? values.engagement_id : null;

      const base = {
        invoice_number: invoiceNumber,
        account_id: values.account_id,
        engagement_id: engagementId,
        issue_date: values.issue_date,
        due_date: values.due_date || null,
        status: "Draft",
        subtotal: subAmt,
        tax_amount: taxAmt,
        total: subAmt + taxAmt,
        notes: values.notes || null,
      };
      // Newer columns (terms / custom fields) are added by the October 2026 migration.
      let res = await supabase
        .from("invoices")
        .insert({ ...base, payment_terms_days: values.payment_terms_days === "" ? null : Math.round(num(values.payment_terms_days)), custom_fields: custom })
        .select("id")
        .single();
      if (res.error && /payment_terms_days|custom_fields/.test(res.error.message)) {
        res = await supabase.from("invoices").insert(base).select("id").single();
      }
      if (res.error) throw res.error;
      const inv = res.data;

      const rows = values.line_items.map((li) => ({
        invoice_id: inv.id,
        description: li.description,
        quantity: num(li.quantity),
        unit_price: num(li.unit_price),
      }));
      const { error: liErr } = await supabase.from("invoice_line_items").insert(rows);
      if (liErr) {
        await supabase.from("invoices").delete().eq("id", inv.id);
        throw liErr;
      }

      toast.success(`Invoice ${invoiceNumber} created`);
      router.push(`/finance/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Link href="/finance/invoices" className="hover:text-primary">
          Invoices
        </Link>
        <span>/</span>
        <span className="text-foreground">New Invoice</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">Create Invoice</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account *</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          const eng = engagements.find((e) => e.id === form.getValues("engagement_id"));
                          if (eng && eng.account_id !== v) form.setValue("engagement_id", NONE);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
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
                  name="engagement_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || NONE}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select engagement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>None</SelectItem>
                          {engagementOptions.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Links revenue to the engagement for profitability reports.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            recalcDue(e.target.value, form.getValues("payment_terms_days") || "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="payment_terms_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              recalcDue(form.getValues("issue_date"), e.target.value);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="PO number, contract reference, remittance instructions…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {fields.length > 0 && <CustomFieldInputs fields={fields} values={custom} onChange={setCustom} base={{ total, paid: 0, balance: total, days_outstanding: 0 }} />}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: "1", unit_price: "" })}>
                <Plus className="w-4 h-4 mr-1" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty / Hours</div>
                <div className="col-span-3">Unit Price</div>
                <div className="col-span-1"></div>
              </div>
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-6">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Service description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" aria-label="Quantity" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" aria-label="Unit price" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center pt-1">
                    {lines.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => remove(index)} aria-label="Remove line">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <FormField
                    control={form.control}
                    name="tax_amount"
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} className="text-right" aria-label="Tax amount" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Invoice"}
            </Button>
            <Link href="/finance/invoices">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <NewInvoiceInner />
    </Suspense>
  );
}
