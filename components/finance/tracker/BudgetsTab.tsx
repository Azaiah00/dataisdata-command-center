"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSummary } from "@/lib/finance/summary";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { exportListPdf } from "@/lib/pdf/reports";
import { addMonths, monthKey, parseDate, startOfMonth } from "@/lib/finance/dates";
import { cn, formatCurrency, num } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

export function BudgetsTab({ data, summary, reload }: { data: FinanceData; summary: FinanceSummary; reload: () => Promise<void> }) {
  const { can, realUser } = useAccess();
  const editable = can("finance_tracker", "edit");
  const [extra, setExtra] = useState<string[]>([]);
  const categories = useMemo(() => {
    const set = new Set<string>([...EXPENSE_CATEGORIES, ...data.budgets.map((b) => b.category), ...data.expenses.map((e) => e.category), ...extra]);
    return Array.from(set);
  }, [data, extra]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d: Record<string, string> = {};
    data.budgets.forEach((b) => (d[b.category] = String(b.monthly_amount)));
    setDrafts(d);
  }, [data.budgets]);

  // Average monthly actual over the last 3 complete months, per category
  const avg3 = useMemo(() => {
    const today = parseDate(summary.today)!;
    const keys = [1, 2, 3].map((i) => monthKey(addMonths(startOfMonth(today), -i)));
    const out: Record<string, number> = {};
    data.expenses.forEach((e) => {
      const d = parseDate(e.expense_date);
      if (d && keys.includes(monthKey(d))) out[e.category] = (out[e.category] || 0) + num(e.amount) / 3;
    });
    return out;
  }, [data.expenses, summary.today]);

  const thisMonth = useMemo(() => {
    const out: Record<string, number> = {};
    const mk = summary.today.slice(0, 7);
    data.expenses.filter((e) => e.expense_date.startsWith(mk)).forEach((e) => (out[e.category] = (out[e.category] || 0) + num(e.amount)));
    return out;
  }, [data.expenses, summary.today]);

  const dirty = categories.some((c) => (drafts[c] ?? "") !== (data.budgets.find((b) => b.category === c) ? String(data.budgets.find((b) => b.category === c)!.monthly_amount) : ""));

  async function saveAll() {
    setSaving(true);
    try {
      for (const c of categories) {
        const existing = data.budgets.find((b) => b.category === c);
        const raw = drafts[c];
        if ((raw === undefined || raw === "") && existing) {
          const { error } = await supabase.from("finance_budgets").delete().eq("id", existing.id);
          if (error) throw new Error(error.message);
        } else if (raw !== undefined && raw !== "") {
          const amount = Math.max(0, num(raw));
          if (existing && num(existing.monthly_amount) === amount) continue;
          const { error } = await supabase
            .from("finance_budgets")
            .upsert({ category: c, monthly_amount: amount, updated_at: new Date().toISOString() }, { onConflict: "category" });
          if (error) throw new Error(error.message);
        }
      }
      toast.success("Budgets saved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save budgets");
    } finally {
      setSaving(false);
    }
  }

  const totalBudget = categories.reduce((t, c) => t + num(drafts[c]), 0);
  const totalActual = categories.reduce((t, c) => t + (thisMonth[c] || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Set a monthly budget per expense category. Actuals come straight from Expenses (including contractor pay recorded from timesheets). Leave blank for no budget.
        </p>
        <div className="flex gap-2">
          <PdfButton
            onExport={() =>
              exportListPdf({
                title: "Budget vs Actual",
                subtitle: `Month of ${summary.today.slice(0, 7)}`,
                preparedBy: realUser?.full_name,
                kpis: [
                  { label: "Monthly budget", value: formatCurrency(totalBudget) },
                  { label: "Spent this month", value: formatCurrency(totalActual), tone: totalBudget > 0 && totalActual > totalBudget ? "bad" : "default" },
                ],
                columns: ["Category", "Monthly budget", "This month", "Used", "3-month avg"],
                rows: categories.map((c) => [
                  c,
                  drafts[c] ? formatCurrency(num(drafts[c])) : "—",
                  formatCurrency(thisMonth[c] || 0),
                  num(drafts[c]) > 0 ? `${(((thisMonth[c] || 0) / num(drafts[c])) * 100).toFixed(0)}%` : "—",
                  formatCurrency(avg3[c] || 0),
                ]),
                alignRight: [1, 2, 3, 4],
                filename: "DataIsData-Budget-vs-Actual",
              })
            }
          />
          {editable && (
            <Button size="sm" onClick={saveAll} disabled={!dirty || saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save budgets"}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm divide-y divide-border">
        {categories.map((c) => {
          const budget = num(drafts[c]);
          const actual = thisMonth[c] || 0;
          const pct = budget > 0 ? (actual / budget) * 100 : 0;
          return (
            <div key={c} className="grid grid-cols-1 md:grid-cols-[12rem_10rem_1fr_8rem] gap-3 items-center px-4 py-3">
              <p className="font-medium">{c}</p>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={drafts[c] ?? ""}
                  disabled={!editable}
                  placeholder="No budget"
                  onChange={(e) => setDrafts({ ...drafts, [c]: e.target.value })}
                  className="h-8"
                  aria-label={`${c} monthly budget`}
                />
                {editable && drafts[c] && (
                  <Button size="icon-sm" variant="ghost" onClick={() => setDrafts({ ...drafts, [c]: "" })} aria-label={`Clear ${c} budget`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", pct > 100 ? "bg-red-500" : pct > 85 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(actual)} this month{budget > 0 ? ` · ${pct.toFixed(0)}% of budget` : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground md:text-right">3-mo avg {formatCurrency(avg3[c] || 0)}</p>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/60 font-semibold text-sm">
          <span>Total</span>
          <span>
            {formatCurrency(totalActual)} of {formatCurrency(totalBudget)}
          </span>
        </div>
      </div>

      {editable && (
        <div className="flex gap-2 max-w-md">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Add a category (e.g. Insurance)" />
          <Button
            variant="outline"
            onClick={() => {
              const c = newCat.trim();
              if (!c) return;
              if (categories.some((x) => x.toLowerCase() === c.toLowerCase())) return toast.error("That category already exists");
              setDrafts({ ...drafts, [c]: "0" });
              setExtra([...extra, c]);
              setNewCat("");
            }}
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}
