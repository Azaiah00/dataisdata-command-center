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
import { FileAttachments } from "@/components/ui/FileAttachments";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";

const formSchema = z.object({
  description: z.string().min(2, "Description required"),
  category: z.string().min(1),
  amount: z.string().min(1, "Amount required"),
  expense_date: z.string().min(1, "Date required"),
  status: z.string(),
  engagement_id: z.string().optional(),
  account_id: z.string().optional(),
  contractor_id: z.string().optional(),
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewExpensePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [engagements, setEngagements] = useState<{ id: string; name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; full_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      category: "Other",
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
      status: "Pending",
      engagement_id: "",
      account_id: "",
      contractor_id: "",
      receipt_url: "",
      notes: "",
    },
  });

  useEffect(() => {
    async function fetchLookups() {
      const [accRes, engRes, cRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("engagements").select("id, name").order("name"),
        supabase.from("contractors").select("id, full_name").order("full_name"),
      ]);
      setAccounts(accRes.data || []);
      setEngagements(engRes.data || []);
      setContractors(cRes.data || []);
    }
    fetchLookups();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        description: values.description,
        category: values.category,
        amount: parseFloat(values.amount) || 0,
        expense_date: values.expense_date,
        status: values.status,
        engagement_id: values.engagement_id || null,
        account_id: values.account_id || null,
        contractor_id: values.contractor_id || null,
        receipt_url: receiptUrls[0] || null,
      });
      if (error) throw error;
      toast.success("Expense recorded");
      router.push("/finance/expenses");
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/finance/expenses" className="hover:text-blue-600">Expenses</Link>
        <span>/</span>
        <span className="text-[#111827]">New Expense</span>
      </div>

      <h1 className="text-2xl font-bold text-[#111827]">Record Expense</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle>Expense Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl><Input placeholder="What was this expense for?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expense_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {EXPENSE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="account_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="engagement_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {engagements.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="contractor_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              {/* Receipt upload */}
              <FileAttachments label="Receipt" value={receiptUrls} onChange={setReceiptUrls} />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? "Saving..." : "Save Expense"}
            </Button>
            <Link href="/finance/expenses"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
