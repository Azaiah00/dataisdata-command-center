"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import { INCOME_CATEGORIES, type IncomeEntry } from "@/lib/finance/types";
import { fieldFormat, formatByType, resolveRecordFields } from "@/lib/finance/calc";
import { todayISO } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomFieldInputs } from "@/components/finance/CustomFields";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { exportListPdf } from "@/lib/pdf/reports";
import { formatCurrency, formatDate, num } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const NONE = "__none";

export function IncomeTab({ data, reload }: { data: FinanceData; reload: () => Promise<void> }) {
  const { can, realUser } = useAccess();
  const fields = data.customFields.filter((f) => f.entity === "income" && f.is_active);
  const [editing, setEditing] = useState<Partial<IncomeEntry> | null>(null);
  const [saving, setSaving] = useState(false);
  const total = data.income.reduce((t, i) => t + num(i.amount), 0);

  async function save() {
    if (!editing) return;
    if (!editing.source?.trim()) return toast.error("Source is required");
    if (!(num(editing.amount) > 0)) return toast.error("Amount must be greater than zero");
    setSaving(true);
    const payload = {
      income_date: editing.income_date || todayISO(),
      source: editing.source.trim(),
      category: editing.category || "Other Income",
      amount: num(editing.amount),
      account_id: editing.account_id || null,
      engagement_id: editing.engagement_id || null,
      notes: editing.notes?.trim() || null,
      custom_fields: editing.custom_fields || {},
      updated_at: new Date().toISOString(),
    };
    const res = editing.id ? await supabase.from("income_entries").update(payload).eq("id", editing.id) : await supabase.from("income_entries").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing.id ? "Income updated" : "Income recorded");
    setEditing(null);
    await reload();
  }

  async function remove(i: IncomeEntry) {
    if (!confirm(`Delete ${formatCurrency(i.amount)} from ${i.source}?`)) return;
    const { error } = await supabase.from("income_entries").delete().eq("id", i.id);
    if (error) return toast.error(error.message);
    toast.success("Income deleted");
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Money in that isn&apos;t an invoice payment — grants, reimbursements, referral fees, interest or owner contributions. It counts as revenue in the dashboard, P&amp;L, cash estimate and forecasts.
        </p>
        <div className="flex gap-2">
          <PdfButton
            onExport={() =>
              exportListPdf({
                title: "Other Income",
                preparedBy: realUser?.full_name,
                kpis: [{ label: "Total other income", value: formatCurrency(total) }],
                columns: ["Date", "Source", "Category", "Account", "Amount", ...fields.filter((f) => f.show_in_reports).map((f) => f.label)],
                rows: data.income.map((i) => {
                  const vars = resolveRecordFields({ amount: num(i.amount) }, fields, i.custom_fields);
                  return [
                    formatDate(i.income_date),
                    i.source,
                    i.category,
                    i.accounts?.name || "—",
                    formatCurrency(i.amount),
                    ...fields.filter((f) => f.show_in_reports).map((f) => formatByType(["number", "currency", "percent", "formula"].includes(f.field_type) ? vars[f.field_key] : i.custom_fields?.[f.field_key], fieldFormat(f))),
                  ];
                }),
                alignRight: [4],
                filename: "DataIsData-Other-Income",
              })
            }
          />
          {can("finance_tracker", "create") && (
            <Button size="sm" onClick={() => setEditing({ income_date: todayISO(), category: "Other Income", custom_fields: {} })}>
              <Plus className="w-4 h-4" /> Add income
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-3 py-3">Source</th>
              <th className="text-left px-3 py-3">Category</th>
              <th className="text-left px-3 py-3">Account</th>
              <th className="text-right px-3 py-3">Amount</th>
              {fields.map((f) => (
                <th key={f.id} className="text-right px-3 py-3">
                  {f.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.income.map((i) => {
              const vars = resolveRecordFields({ amount: num(i.amount) }, fields, i.custom_fields);
              return (
                <tr key={i.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(i.income_date)}</td>
                  <td className="px-3 py-3 font-semibold">
                    {i.source}
                    {i.notes && <span className="block text-xs font-normal text-muted-foreground">{i.notes}</span>}
                  </td>
                  <td className="px-3 py-3">{i.category}</td>
                  <td className="px-3 py-3">{i.accounts?.name || "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold text-primary">{formatCurrency(i.amount)}</td>
                  {fields.map((f) => (
                    <td key={f.id} className="px-3 py-3 text-right">
                      {formatByType(["number", "currency", "percent", "formula"].includes(f.field_type) ? vars[f.field_key] : i.custom_fields?.[f.field_key], fieldFormat(f))}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {can("finance_tracker", "edit") && (
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(i)} aria-label="Edit income">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {can("finance_tracker", "delete") && (
                      <Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => remove(i)} aria-label="Delete income">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!data.income.length && (
              <tr>
                <td colSpan={6 + fields.length} className="px-4 py-12 text-center text-muted-foreground">
                  No other income recorded.
                </td>
              </tr>
            )}
          </tbody>
          {data.income.length > 0 && (
            <tfoot className="bg-secondary/60 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={4}>
                  Total
                </td>
                <td className="px-3 py-3 text-right">{formatCurrency(total)}</td>
                <td colSpan={1 + fields.length} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit income" : "Add income"}</DialogTitle>
            <DialogDescription>Invoice payments are recorded under Payments — use this for everything else.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inc-source">Source *</Label>
                <Input id="inc-source" value={editing.source || ""} onChange={(e) => setEditing({ ...editing, source: e.target.value })} placeholder="e.g. VA SBSD grant" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-amount">Amount ($) *</Label>
                <Input id="inc-amount" type="number" step="0.01" min="0" value={editing.amount ?? ""} onChange={(e) => setEditing({ ...editing, amount: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-date">Date</Label>
                <Input id="inc-date" type="date" value={editing.income_date || ""} onChange={(e) => setEditing({ ...editing, income_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editing.category || "Other Income"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Account</Label>
                <Select value={editing.account_id || NONE} onValueChange={(v) => setEditing({ ...editing, account_id: v === NONE ? null : v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {data.accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inc-notes">Notes</Label>
                <Textarea id="inc-notes" rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              {fields.length > 0 && (
                <div className="sm:col-span-2">
                  <CustomFieldInputs fields={fields} values={editing.custom_fields || {}} onChange={(v) => setEditing({ ...editing, custom_fields: v })} base={{ amount: num(editing.amount) }} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
