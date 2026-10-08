"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
import { exportPnlPdf } from "@/lib/pdf/reports";
import { fiscalYearStart, parseDate, startOfMonth, toISODate, todayISO, addMonths } from "@/lib/finance/dates";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

type DateRange = "month" | "last_month" | "quarter" | "fiscal_year" | "year" | "all" | "custom";

const LABELS: Record<DateRange, string> = {
  month: "This Month",
  last_month: "Last Month",
  quarter: "This Quarter",
  fiscal_year: "This Fiscal Year",
  year: "This Calendar Year",
  all: "All Time",
  custom: "Custom Range",
};

interface PnLData {
  totalInvoiced: number;
  totalCollected: number;
  otherIncome: number;
  expensesByCategory: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
  engagementProfitability: { id: string; name: string; revenue: number; expenses: number; profit: number }[];
}

export default function ProfitAndLossPage() {
  const { realUser, can } = useAccess();
  const [range, setRange] = useState<DateRange>("fiscal_year");
  const [custom, setCustom] = useState({ start: toISODate(startOfMonth(new Date())), end: todayISO() });
  const [fyMonth, setFyMonth] = useState(1);
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("finance_settings")
      .select("fiscal_year_start_month")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data: s }) => s?.fiscal_year_start_month && setFyMonth(s.fiscal_year_start_month));
  }, []);

  function bounds(): { start: string; end: string } {
    const today = parseDate(todayISO())!;
    const end = todayISO();
    switch (range) {
      case "month":
        return { start: toISODate(startOfMonth(today)), end };
      case "last_month": {
        const s = addMonths(startOfMonth(today), -1);
        return { start: toISODate(s), end: toISODate(new Date(s.getFullYear(), s.getMonth() + 1, 0)) };
      }
      case "quarter":
        return { start: toISODate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)), end };
      case "fiscal_year":
        return { start: toISODate(fiscalYearStart(today, fyMonth)), end };
      case "year":
        return { start: `${today.getFullYear()}-01-01`, end };
      case "custom":
        return custom;
      default:
        return { start: "2000-01-01", end };
    }
  }
  const { start, end } = bounds();

  useEffect(() => {
    let cancelled = false;
    async function fetchPnL() {
      if (start > end) return;
      setLoading(true);
      const [invRes, payRes, expRes, incRes, engRes] = await Promise.all([
        supabase.from("invoices").select("id, total, status, engagement_id").gte("issue_date", start).lte("issue_date", end),
        supabase.from("payments").select("amount, invoice_id, invoices(engagement_id)").gte("payment_date", start).lte("payment_date", end),
        supabase.from("expenses").select("amount, category, engagement_id").gte("expense_date", start).lte("expense_date", end),
        supabase.from("income_entries").select("amount, engagement_id").gte("income_date", start).lte("income_date", end),
        supabase.from("engagements").select("id, name"),
      ]);
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const invoices = (invRes.data || []).filter((i: any) => i.status !== "Cancelled");
      const payments = payRes.data || [];
      const expenses = expRes.data || [];
      const income = incRes.error ? [] : incRes.data || [];

      const totalInvoiced = invoices.reduce((s: number, i: any) => s + num(i.total), 0);
      const totalCollected = payments.reduce((s: number, p: any) => s + num(p.amount), 0);
      const otherIncome = income.reduce((s: number, i: any) => s + num(i.amount), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + num(e.amount), 0);

      const catMap: Record<string, number> = {};
      expenses.forEach((e: any) => (catMap[e.category] = (catMap[e.category] || 0) + num(e.amount)));
      const expensesByCategory = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      // Engagement profitability on a cash basis: each payment is attributed to its invoice's engagement.
      const engMap: Record<string, { name: string; revenue: number; expenses: number }> = {};
      (engRes.data || []).forEach((e: any) => (engMap[e.id] = { name: e.name, revenue: 0, expenses: 0 }));
      payments.forEach((p: any) => {
        const inv = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices;
        const engId = inv?.engagement_id;
        if (engId && engMap[engId]) engMap[engId].revenue += num(p.amount);
      });
      income.forEach((i: any) => {
        if (i.engagement_id && engMap[i.engagement_id]) engMap[i.engagement_id].revenue += num(i.amount);
      });
      expenses.forEach((e: any) => {
        if (e.engagement_id && engMap[e.engagement_id]) engMap[e.engagement_id].expenses += num(e.amount);
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const engagementProfitability = Object.entries(engMap)
        .filter(([, v]) => v.revenue > 0 || v.expenses > 0)
        .map(([id, v]) => ({ id, name: v.name, revenue: v.revenue, expenses: v.expenses, profit: v.revenue - v.expenses }))
        .sort((a, b) => b.profit - a.profit);

      if (cancelled) return;
      setData({
        totalInvoiced,
        totalCollected,
        otherIncome,
        expensesByCategory,
        totalExpenses,
        netProfit: totalCollected + otherIncome - totalExpenses,
        engagementProfitability,
      });
      setLoading(false);
    }
    fetchPnL();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const rangeLabel = `${LABELS[range]} (${formatDate(start)} – ${formatDate(end)})`;
  const revenue = data ? data.totalCollected + data.otherIncome : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-muted-foreground">Cash-basis revenue, expenses and profitability by engagement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LABELS) as DateRange[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {range === "custom" && (
            <>
              <Input type="date" className="w-40" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} aria-label="Start date" />
              <Input type="date" className="w-40" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} aria-label="End date" />
            </>
          )}
          <PdfButton
            variant="default"
            disabled={!data || loading}
            onExport={async () => {
              if (!data) return;
              await exportPnlPdf({ ...data, engagements: data.engagementProfitability, rangeLabel, preparedBy: realUser?.full_name });
            }}
          />
        </div>
      </div>
      {start > end && <p className="text-sm text-red-600">Start date must be before end date.</p>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data ? (
        <>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Revenue</CardTitle>
              <CardDescription>{rangeLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">Invoiced in period (for reference)</span>
                <span className="font-bold text-foreground">{formatCurrency(data.totalInvoiced)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">Collected from invoices</span>
                <span className="font-bold text-foreground">{formatCurrency(data.totalCollected)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">
                  Other income{" "}
                  {can("finance_tracker") && (
                    <Link href="/finance/tracker?tab=income" className="text-primary text-xs hover:underline">
                      manage
                    </Link>
                  )}
                </span>
                <span className="font-bold text-foreground">{formatCurrency(data.otherIncome)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-bold text-foreground">Total revenue (cash in)</span>
                <span className="font-bold text-primary text-lg">{formatCurrency(revenue)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.expensesByCategory.map((cat) => (
                <div key={cat.category} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-muted-foreground">{cat.category}</span>
                  <span className="font-bold text-foreground">{formatCurrency(cat.total)}</span>
                </div>
              ))}
              {!data.expensesByCategory.length && <p className="text-sm text-muted-foreground">No expenses in this period.</p>}
              <div className="flex justify-between py-2 border-t border-slate-200">
                <span className="text-sm font-bold text-foreground">Total Expenses</span>
                <span className="font-bold text-red-600 text-lg">{formatCurrency(data.totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("border-none shadow-sm", data.netProfit >= 0 ? "bg-green-50/50" : "bg-red-50/50")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {data.netProfit >= 0 ? <TrendingUp className="w-8 h-8 text-green-600" /> : <TrendingDown className="w-8 h-8 text-red-600" />}
                  <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Net Profit / Loss</p>
                    <p className="text-sm text-muted-foreground">{LABELS[range]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-3xl font-bold", data.netProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(data.netProfit)}</p>
                  {revenue > 0 && <p className="text-sm text-muted-foreground">{((data.netProfit / revenue) * 100).toFixed(1)}% margin</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {data.engagementProfitability.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Profitability by Engagement</CardTitle>
                <CardDescription>Payments received on each engagement&apos;s invoices vs expenses linked to it</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase">Engagement</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Revenue</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Expenses</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Profit</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.engagementProfitability.map((eng) => (
                      <tr key={eng.id} className="border-b border-slate-50">
                        <td className="py-3 font-medium">
                          {can("engagements") ? (
                            <Link href={`/engagements/${eng.id}`} className="hover:text-primary">
                              {eng.name}
                            </Link>
                          ) : (
                            eng.name
                          )}
                        </td>
                        <td className="py-3 text-right text-primary font-bold">{formatCurrency(eng.revenue)}</td>
                        <td className="py-3 text-right text-red-600">{formatCurrency(eng.expenses)}</td>
                        <td className={cn("py-3 text-right font-bold", eng.profit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(eng.profit)}</td>
                        <td className="py-3 text-right text-muted-foreground">{eng.revenue > 0 ? `${((eng.profit / eng.revenue) * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
