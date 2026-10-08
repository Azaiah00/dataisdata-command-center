"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseFormFields, expenseFormToPayload, isMissingExtendedColumn, NONE, type ExpenseFormState } from "@/components/finance/ExpenseForm";
import { todayISO } from "@/lib/finance/dates";
import { num } from "@/lib/utils";
import { toast } from "sonner";

function NewExpenseInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>({
    description: "",
    category: params.get("category") || "Other",
    amount: "",
    expense_date: todayISO(),
    status: "Pending",
    vendor: "",
    recurrence: "none",
    engagement_id: params.get("engagement_id") || NONE,
    account_id: params.get("account_id") || NONE,
    contractor_id: params.get("contractor_id") || NONE,
    receipt_urls: [],
    notes: "",
    custom_fields: {},
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.description.trim().length < 2) return toast.error("Description required");
    if (!(num(form.amount) > 0)) return toast.error("Amount must be greater than zero");
    if (!form.expense_date) return toast.error("Date required");
    setSubmitting(true);
    try {
      let { error } = await supabase.from("expenses").insert(expenseFormToPayload(form, true));
      if (error && isMissingExtendedColumn(error.message)) ({ error } = await supabase.from("expenses").insert(expenseFormToPayload(form, false)));
      if (error) throw new Error(error.message);
      toast.success("Expense recorded");
      router.push("/finance/expenses");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Link href="/finance/expenses" className="hover:text-primary">
          Expenses
        </Link>
        <span>/</span>
        <span className="text-foreground">New Expense</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Record Expense</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseFormFields value={form} onChange={setForm} />
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Expense"}
          </Button>
          <Link href="/finance/expenses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <NewExpenseInner />
    </Suspense>
  );
}
