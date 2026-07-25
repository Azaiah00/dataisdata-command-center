"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import Link from "next/link";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.string().min(1),
  unit_price: z.string().min(1),
});

const formSchema = z.object({
  account_id: z.string().uuid("Select an account"),
  engagement_id: z.string().optional(),
  issue_date: z.string().min(1, "Issue date required"),
  due_date: z.string().optional(),
  tax_amount: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

export default function NewInvoicePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [engagements, setEngagements] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_id: "",
      engagement_id: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      tax_amount: "0",
      notes: "",
      line_items: [{ description: "", quantity: "1", unit_price: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "line_items" });

  useEffect(() => {
    async function fetchLookups() {
      const [accRes, engRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("engagements").select("id, name").order("name"),
      ]);
      setAccounts(accRes.data || []);
      setEngagements(engRes.data || []);
    }
    fetchLookups();
  }, []);

  // Compute subtotal from line items
  const watchedItems = form.watch("line_items");
  const watchedTax = form.watch("tax_amount");
  const subtotal = watchedItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantity) || 0;
    const price = parseFloat(li.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const tax = parseFloat(watchedTax || "0") || 0;
  const total = subtotal + tax;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      // Get next invoice number from the helper function
      const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number");
      if (numErr) throw numErr;
      const invoiceNumber = numData || `INV-${Date.now()}`;

      const subAmt = values.line_items.reduce((s, li) => {
        return s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);
      }, 0);
      const taxAmt = parseFloat(values.tax_amount || "0") || 0;

      // Insert invoice
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          account_id: values.account_id,
          engagement_id: values.engagement_id || null,
          issue_date: values.issue_date,
          due_date: values.due_date || null,
          status: "Draft",
          subtotal: subAmt,
          tax_amount: taxAmt,
          total: subAmt + taxAmt,
          notes: values.notes || null,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      // Insert line items
      const rows = values.line_items.map((li) => ({
        invoice_id: inv.id,
        description: li.description,
        quantity: parseFloat(li.quantity) || 1,
        unit_price: parseFloat(li.unit_price) || 0,
      }));
      const { error: liErr } = await supabase.from("invoice_line_items").insert(rows);
      if (liErr) throw liErr;

      toast.success(`Invoice ${invoiceNumber} created`);
      router.push(`/finance/invoices/${inv.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/finance/invoices" className="hover:text-blue-600">Invoices</Link>
        <span>/</span>
        <span className="text-[#111827]">New Invoice</span>
      </div>

      <h1 className="text-2xl font-bold text-[#111827]">Create Invoice</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="account_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="engagement_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select engagement" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {engagements.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="issue_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Payment terms, notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: "1", unit_price: "" })}>
                <Plus className="w-4 h-4 mr-1" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit Price</div>
                <div className="col-span-1"></div>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-6">
                    <FormField control={form.control} name={`line_items.${index}.description`} render={({ field }) => (
                      <FormItem><FormControl><Input placeholder="Service description" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <FormField control={form.control} name={`line_items.${index}.quantity`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="col-span-3">
                    <FormField control={form.control} name={`line_items.${index}.unit_price`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => remove(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span className="font-bold text-[#111827]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6B7280]">Tax</span>
                  <FormField control={form.control} name="tax_amount" render={({ field }) => (
                    <FormItem className="w-32"><FormControl><Input type="number" step="0.01" min="0" {...field} className="text-right" /></FormControl></FormItem>
                  )} />
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                  <span className="text-[#111827]">Total</span>
                  <span className="text-emerald-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? "Creating..." : "Create Invoice"}
            </Button>
            <Link href="/finance/invoices">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
