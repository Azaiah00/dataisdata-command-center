"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Can, useAccess } from "@/components/auth/AccessProvider";
import { ExpenseFormFields, expenseFormToPayload, isMissingExtendedColumn, NONE, type ExpenseFormState } from "@/components/finance/ExpenseForm";
import { CustomFieldValues } from "@/components/finance/CustomFields";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { RECURRENCES, type CustomField } from "@/lib/finance/types";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2, ExternalLink, Repeat } from "lucide-react";

type ExpenseFull = Expense & { vendor?: string | null; notes?: string | null; recurrence?: string | null; custom_fields?: Record<string, unknown> | null };

function toForm(e: ExpenseFull): ExpenseFormState {
  return {
    description: e.description,
    category: e.category,
    amount: String(e.amount),
    expense_date: e.expense_date,
    status: e.status,
    vendor: e.vendor || "",
    recurrence: e.recurrence || "none",
    engagement_id: e.engagement_id || NONE,
    account_id: e.account_id || NONE,
    contractor_id: e.contractor_id || NONE,
    receipt_urls: e.receipt_url ? [e.receipt_url] : [],
    notes: e.notes || "",
    custom_fields: e.custom_fields || {},
  };
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAccess();
  const [expense, setExpense] = useState<ExpenseFull | null>(null);
  const [form, setForm] = useState<ExpenseFormState | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fromTimesheet, setFromTimesheet] = useState(false);

  const fetchExpense = useCallback(async () => {
    const [{ data }, cf, hrs] = await Promise.all([
      supabase.from("expenses").select("*, accounts(name), engagements(name), contractors(full_name)").eq("id", id).single(),
      supabase.from("finance_custom_fields").select("*").eq("entity", "expense").eq("is_active", true).order("sort_order"),
      supabase.from("placement_hours").select("id", { count: "exact", head: true }).eq("expense_id", id),
    ]);
    if (data) {
      setExpense(data);
      setForm(toForm(data));
    } else setExpense(null);
    setFields(cf.error ? [] : ((cf.data || []) as CustomField[]));
    setFromTimesheet(!hrs.error && (hrs.count || 0) > 0);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  async function onSave() {
    if (!form) return;
    if (form.description.trim().length < 2) return toast.error("Description required");
    if (!(num(form.amount) > 0)) return toast.error("Amount must be greater than zero");
    setSaving(true);
    const extended = { ...expenseFormToPayload(form, true), updated_at: new Date().toISOString() };
    let { error } = await supabase.from("expenses").update(extended).eq("id", id);
    if (error && isMissingExtendedColumn(error.message)) ({ error } = await supabase.from("expenses").update({ ...expenseFormToPayload(form, false), updated_at: new Date().toISOString() }).eq("id", id));
    setSaving(false);
    if (error) return toast.error("Failed to save");
    toast.success("Expense updated");
    setIsEditing(false);
    await fetchExpense();
  }

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Expense deleted");
    router.push("/finance/expenses");
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  if (!expense || !form)
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Expense not found</h2>
        <Link href="/finance/expenses" className="text-primary hover:underline mt-4 inline-block">
          Back to Expenses
        </Link>
      </div>
    );

  const rec = RECURRENCES.find((r) => r.value === (expense.recurrence || "none"));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Link href="/finance/expenses" className="hover:text-primary">
          Expenses
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{expense.description}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-7 h-7 text-orange-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{expense.description}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(expense.status))}>{expense.status}</Badge>
                <span className="text-sm text-muted-foreground">{expense.category}</span>
                {rec && rec.value !== "none" && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> {rec.label}
                  </span>
                )}
                {fromTimesheet && <Badge className="border-none bg-primary/10 text-primary">From timesheet</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Can module="expenses" action="edit">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="w-4 h-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </Can>
            <Can module="expenses" action="delete">
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Expense?</DialogTitle>
                    <DialogDescription>
                      This cannot be undone.{fromTimesheet ? " The linked timesheet will show contractor pay as not recorded." : ""}
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

      {isEditing ? (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Edit Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ExpenseFormFields value={form} onChange={setForm} />
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm(toForm(expense));
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {[
                ["Amount", <span key="a" className="font-bold text-red-600 text-lg">{formatCurrency(expense.amount)}</span>],
                ["Date", formatDate(expense.expense_date)],
                ["Vendor", expense.vendor || "—"],
                [
                  "Account",
                  expense.account_id && can("accounts") ? (
                    <Link key="acc" href={`/accounts/${expense.account_id}`} className="hover:text-primary">
                      {expense.accounts?.name}
                    </Link>
                  ) : (
                    expense.accounts?.name || "—"
                  ),
                ],
                [
                  "Engagement",
                  expense.engagement_id && can("engagements") ? (
                    <Link key="eng" href={`/engagements/${expense.engagement_id}`} className="hover:text-primary">
                      {expense.engagements?.name}
                    </Link>
                  ) : (
                    expense.engagements?.name || "—"
                  ),
                ],
                [
                  "Contractor",
                  expense.contractor_id && can("contractors") ? (
                    <Link key="c" href={`/contractors/${expense.contractor_id}`} className="hover:text-primary">
                      {expense.contractors?.full_name}
                    </Link>
                  ) : (
                    expense.contractors?.full_name || "—"
                  ),
                ],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-muted-foreground">{k}</span>
                  <span className="font-semibold text-foreground text-sm text-right">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-6">
            {expense.receipt_url && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground">Receipt</CardTitle>
                </CardHeader>
                <CardContent>
                  <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" /> View receipt
                  </a>
                </CardContent>
              </Card>
            )}
            {expense.notes && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{expense.notes}</p>
                </CardContent>
              </Card>
            )}
            {fields.length > 0 && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-foreground">Additional details</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomFieldValues fields={fields} values={expense.custom_fields} base={{ amount: num(expense.amount) }} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
