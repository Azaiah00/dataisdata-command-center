"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { CreditCard, Pencil, Trash2, ExternalLink } from "lucide-react";

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function fetchExpense() {
    const { data } = await supabase
      .from("expenses")
      .select("*, accounts(name), engagements(name), contractors(full_name)")
      .eq("id", id)
      .single();
    if (data) {
      setExpense(data);
      setEditStatus(data.status);
      setEditCategory(data.category);
      setEditAmount(String(data.amount));
    }
    setLoading(false);
  }

  useEffect(() => { fetchExpense(); }, [id]);

  async function onSave() {
    setSaving(true);
    const { error } = await supabase.from("expenses").update({
      status: editStatus,
      category: editCategory,
      amount: parseFloat(editAmount) || 0,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Expense updated");
    setIsEditing(false);
    await fetchExpense();
  }

  async function onDelete() {
    setDeleting(true);
    await supabase.from("expenses").delete().eq("id", id);
    toast.success("Expense deleted");
    router.push("/finance/expenses");
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!expense) return <div className="text-center py-20"><h2 className="text-2xl font-bold">Expense not found</h2><Link href="/finance/expenses" className="text-blue-600 hover:underline mt-4 inline-block">Back to Expenses</Link></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/finance/expenses" className="hover:text-blue-600">Expenses</Link>
        <span>/</span>
        <span className="text-[#111827]">{expense.description}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
              <CreditCard className="w-7 h-7 text-orange-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">{expense.description}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(expense.status))}>{expense.status}</Badge>
                <span className="text-sm text-[#6B7280]">{expense.category}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Pencil className="w-4 h-4 mr-2" />{isEditing ? "Cancel" : "Edit"}
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Delete Expense?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" disabled={deleting} onClick={onDelete}>{deleting ? "Deleting..." : "Delete"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {isEditing && (
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle>Edit Expense</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount ($)</label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Amount</span>
              <span className="font-bold text-red-600 text-lg">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Date</span>
              <span className="font-bold text-[#111827]">{formatDate(expense.expense_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Account</span>
              <span className="font-bold text-[#111827]">{expense.accounts?.name || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Engagement</span>
              <span className="font-bold text-[#111827]">{expense.engagements?.name || "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#6B7280]">Contractor</span>
              <span className="font-bold text-[#111827]">{expense.contractors?.full_name || "—"}</span>
            </div>
          </CardContent>
        </Card>
        {expense.receipt_url && (
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Receipt</CardTitle></CardHeader>
            <CardContent>
              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> View receipt
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
