"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/components/auth/AccessProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { placementMetrics } from "@/lib/finance/calc";
import type { Placement } from "@/lib/finance/types";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { Plus, Receipt, CreditCard, Users, Calculator } from "lucide-react";

type Scope = { engagementId: string; contractValue?: number | null } | { accountId: string } | { contractorId: string };

interface Loaded {
  invoices: { id: string; invoice_number: string; total: number; status: string; issue_date: string; due_date: string | null }[];
  paid: Record<string, number>;
  expenses: { id: string; description: string; amount: number; expense_date: string; category: string }[];
  placements: Placement[];
}

/**
 * Finance view of one engagement, account or contractor. Lives on the CRM
 * detail pages so money and relationships are always seen together.
 */
export function EntityFinancePanel({ scope, title = "Financials" }: { scope: Scope; title?: string }) {
  const { can } = useAccess();
  const [data, setData] = useState<Loaded | null>(null);
  const showInvoices = can("invoices");
  const showExpenses = can("expenses");
  const showPlacements = can("finance_tracker");
  const key = JSON.stringify(scope);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const s = JSON.parse(key) as any;
      const col = s.engagementId ? "engagement_id" : s.accountId ? "account_id" : "contractor_id";
      const val = s.engagementId || s.accountId || s.contractorId;
      const empty = Promise.resolve({ data: [] as any[], error: null });
      const [inv, exp, pl] = await Promise.all([
        showInvoices && col !== "contractor_id" ? supabase.from("invoices").select("id, invoice_number, total, status, issue_date, due_date").eq(col, val).order("issue_date", { ascending: false }) : empty,
        showExpenses ? supabase.from("expenses").select("id, description, amount, expense_date, category").eq(col, val).order("expense_date", { ascending: false }) : empty,
        showPlacements ? supabase.from("placements").select("*, contractors(id, full_name), accounts(id, name), engagements(id, name)").eq(col, val) : empty,
      ]);
      const invoices = (inv.data || []) as Loaded["invoices"];
      const paid: Record<string, number> = {};
      if (invoices.length) {
        const pays = await supabase.from("payments").select("invoice_id, amount").in("invoice_id", invoices.map((i) => i.id));
        (pays.data || []).forEach((p: any) => (paid[p.invoice_id] = (paid[p.invoice_id] || 0) + num(p.amount)));
      }
      const placements = (pl.error ? [] : pl.data || []).map((p: any) => ({
        ...p,
        contractors: Array.isArray(p.contractors) ? p.contractors[0] : p.contractors,
        accounts: Array.isArray(p.accounts) ? p.accounts[0] : p.accounts,
        engagements: Array.isArray(p.engagements) ? p.engagements[0] : p.engagements,
        custom_fields: p.custom_fields || {},
      })) as Placement[];
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (!cancelled) setData({ invoices, paid, expenses: (exp.data || []) as Loaded["expenses"], placements });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, showInvoices, showExpenses, showPlacements]);

  if (!showInvoices && !showExpenses && !showPlacements) return null;
  if (!data) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading financials…</CardContent>
      </Card>
    );
  }

  const live = data.invoices.filter((i) => i.status !== "Cancelled");
  const invoiced = live.reduce((t, i) => t + num(i.total), 0);
  const collected = live.reduce((t, i) => t + (data.paid[i.id] || 0), 0);
  const outstanding = live.filter((i) => ["Sent", "Overdue"].includes(i.status)).reduce((t, i) => t + Math.max(0, num(i.total) - (data.paid[i.id] || 0)), 0);
  const spent = data.expenses.reduce((t, e) => t + num(e.amount), 0);
  const contractValue = "engagementId" in scope ? num(scope.contractValue) : 0;
  const activePl = data.placements.filter((p) => p.status === "Active");
  const monthlyGP = activePl.reduce((t, p) => t + placementMetrics(p).monthly_profit, 0);

  const query = "engagementId" in scope ? `engagement_id=${scope.engagementId}` : "accountId" in scope ? `account_id=${scope.accountId}` : `contractor_id=${scope.contractorId}`;
  const isContractor = "contractorId" in scope;

  const stats: { label: string; value: string; tone?: string }[] = [];
  if (showInvoices && !isContractor) {
    if (contractValue > 0) stats.push({ label: "Contract value", value: formatCurrency(contractValue) });
    stats.push({ label: "Invoiced", value: formatCurrency(invoiced) });
    stats.push({ label: "Collected", value: formatCurrency(collected), tone: "text-primary" });
    stats.push({ label: "Outstanding", value: formatCurrency(outstanding), tone: outstanding > 0 ? "text-amber-600" : undefined });
    if (contractValue > 0) stats.push({ label: "Left to bill", value: formatCurrency(Math.max(0, contractValue - invoiced)) });
  }
  if (showExpenses) stats.push({ label: isContractor ? "Paid / expensed" : "Expenses", value: formatCurrency(spent) });
  if (showInvoices && showExpenses && !isContractor) stats.push({ label: "Cash profit", value: formatCurrency(collected - spent), tone: collected - spent >= 0 ? "text-primary" : "text-red-600" });
  if (showPlacements) stats.push({ label: "Active placements", value: `${activePl.length}${activePl.length ? ` · ${formatCurrency(monthlyGP)}/mo GP` : ""}` });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <CardDescription>Live from Finance — invoices, payments, expenses and placements</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {showInvoices && !isContractor && can("invoices", "create") && (
            <Link href={`/finance/invoices/new?${query}`}>
              <Button size="sm" variant="outline">
                <Receipt className="w-4 h-4" /> Invoice
              </Button>
            </Link>
          )}
          {can("expenses", "create") && (
            <Link href={`/finance/expenses/new?${query}`}>
              <Button size="sm" variant="outline">
                <CreditCard className="w-4 h-4" /> Expense
              </Button>
            </Link>
          )}
          {showPlacements && (
            <Link href="/finance/tracker?tab=placements">
              <Button size="sm" variant="outline">
                <Calculator className="w-4 h-4" /> Tracker
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className={cn("text-base font-bold mt-0.5", s.tone)}>{s.value}</p>
            </div>
          ))}
        </div>

        {showPlacements && data.placements.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Placements
            </p>
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.placements.map((p) => {
                const m = placementMetrics(p);
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{isContractor ? p.accounts?.name || p.role_title : p.contractors?.full_name || "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.role_title} · {p.start_date ? formatDate(p.start_date) : "—"} → {p.end_date ? formatDate(p.end_date) : "open"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span>
                        {formatCurrency(m.bill_rate)} bill · {formatCurrency(m.pay_rate)} pay
                      </span>
                      <span className={cn("font-semibold", m.spread < 0 ? "text-red-600" : "text-primary")}>{m.margin_pct.toFixed(1)}%</span>
                      <Badge className={cn("border-none", getStatusColor(p.status === "Active" ? "active" : p.status === "Ended" ? "complete" : "pending"))}>{p.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showInvoices && !isContractor && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Invoices</p>
            {data.invoices.length ? (
              <div className="divide-y divide-border rounded-xl border border-border">
                {data.invoices.slice(0, 8).map((i) => (
                  <Link key={i.id} href={`/finance/invoices/${i.id}`} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40">
                    <span className="font-medium">
                      {i.invoice_number} <span className="text-xs text-muted-foreground">· {formatDate(i.issue_date)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(i.total)}</span>
                      <Badge className={cn("border-none", getStatusColor(i.status))}>{i.status}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                No invoices yet.
                {can("invoices", "create") && (
                  <Link href={`/finance/invoices/new?${query}`} className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Create the first one
                  </Link>
                )}
              </p>
            )}
          </div>
        )}

        {showExpenses && data.expenses.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent expenses</p>
            <div className="divide-y divide-border rounded-xl border border-border">
              {data.expenses.slice(0, 5).map((e) => (
                <Link key={e.id} href={`/finance/expenses/${e.id}`} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40">
                  <span className="truncate pr-3">
                    {e.description} <span className="text-xs text-muted-foreground">· {e.category}</span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{formatCurrency(e.amount)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
