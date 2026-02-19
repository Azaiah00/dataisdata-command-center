"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { PAYMENT_METHODS } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const formSchema = z.object({
  invoice_id: z.string().uuid("Select an invoice"),
  amount: z.string().min(1, "Amount required"),
  payment_date: z.string().min(1, "Date required"),
  payment_method: z.string().min(1),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

interface InvoiceOption {
  id: string;
  invoice_number: string;
  total: number;
  accounts: { name: string } | null;
  // Computed balance
  balance?: number;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoice = searchParams.get("invoice_id") || "";

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_id: preselectedInvoice,
      amount: "",
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Check",
      reference_number: "",
      notes: "",
    },
  });

  useEffect(() => {
    async function fetchInvoices() {
      // Fetch unpaid/partially paid invoices
      const { data: invs } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, accounts(name)")
        .in("status", ["Draft", "Sent", "Overdue"])
        .order("invoice_number");

      if (!invs) { setInvoices([]); return; }

      // Fetch all payments to compute balances
      const { data: pays } = await supabase.from("payments").select("invoice_id, amount");
      const paidMap: Record<string, number> = {};
      (pays || []).forEach((p: any) => {
        paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + (p.amount || 0);
      });

      const withBalance = invs.map((inv: any) => ({
        ...inv,
        balance: inv.total - (paidMap[inv.id] || 0),
      }));
      setInvoices(withBalance);
    }
    fetchInvoices();
  }, []);

  const selectedInvoice = invoices.find((i) => i.id === form.watch("invoice_id"));

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        invoice_id: values.invoice_id,
        amount: parseFloat(values.amount) || 0,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        reference_number: values.reference_number || null,
        notes: values.notes || null,
      });
      if (error) throw error;

      // Check if invoice is fully paid and auto-update status
      const amt = parseFloat(values.amount) || 0;
      if (selectedInvoice && amt >= (selectedInvoice.balance || 0)) {
        await supabase.from("invoices").update({ status: "Paid", updated_at: new Date().toISOString() }).eq("id", values.invoice_id);
      }

      toast.success("Payment recorded");
      router.push(`/finance/invoices/${values.invoice_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/finance/payments" className="hover:text-blue-600">Payments</Link>
        <span>/</span>
        <span className="text-[#111827]">Record Payment</span>
      </div>

      <h1 className="text-2xl font-bold text-[#111827]">Record Payment</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="invoice_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {invoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {inv.accounts?.name} — Balance: {formatCurrency(inv.balance || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedInvoice && (
                    <FormDescription>
                      Balance due: <strong className="text-red-600">{formatCurrency(selectedInvoice.balance || 0)}</strong>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="payment_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="payment_method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reference_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference #</FormLabel>
                    <FormControl><Input placeholder="Check #, Transaction ID..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Optional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? "Recording..." : "Record Payment"}
            </Button>
            <Link href="/finance/payments"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
