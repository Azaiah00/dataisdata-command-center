"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { PdfButton } from "@/components/ui/PdfButton";
import { CashHistoryChart, AgingBar } from "@/components/finance/FinanceCharts";
import { useFinance } from "@/components/finance/useFinance";
import { useAccess } from "@/components/auth/AccessProvider";
import { cn, formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";
import { exportListPdf } from "@/lib/pdf/reports";
import { monthLabel } from "@/lib/finance/dates";
import { DollarSign, Receipt, CreditCard, TrendingUp, AlertTriangle, Calculator, ArrowRight, Users, PiggyBank } from "lucide-react";

export default function FinanceDashboardPage() {
  const { data, summary, loading, error } = useFinance();
  const { can, realUser } = useAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!data || !summary) {
    return <p className="text-sm text-red-600">{error || "Could not load finance data."}</p>;
  }

  // Expense breakdown, fiscal year to date
  const catMap: Record<string, number> = {};
  data.expenses.filter((e) => e.expense_date >= summary.fyStart && e.expense_date <= summary.today).forEach((e) => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const expenseByCategory = Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const maxExpense = Math.max(...expenseByCategory.map((e) => e.total), 1);

  const invById = new Map(data.invoices.map((i) => [i.id, i]));
  const recentPayments = [...data.payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 6);

  async function exportPdf() {
    if (!summary || !data) return;
    await exportListPdf({
      title: "Finance Summary",
      subtitle: `Fiscal year from ${formatDate(summary.fyStart)} · as of ${formatDate(summary.today)}`,
      preparedBy: realUser?.full_name,
      kpis: [
        { label: "Collected YTD", value: formatCompactCurrency(summary.collectedYTD) },
        { label: "Expenses YTD", value: formatCompactCurrency(summary.expensesYTD) },
        { label: "Net profit YTD", value: formatCompactCurrency(summary.netYTD), tone: summary.netYTD >= 0 ? "good" : "bad" },
        { label: "Receivables", value: formatCompactCurrency(summary.arOutstanding), tone: summary.aging.d61_90 + summary.aging.d90_plus > 0 ? "warn" : "default" },
      ],
      columns: ["Month", "Collected", "Invoiced", "Expenses", "Net"],
      rows: summary.history.map((h) => [monthLabel(h.key, "long"), formatCurrency(h.collected), formatCurrency(h.invoiced), formatCurrency(h.expenses), formatCurrency(h.net)]),
      foot: [
        [
          "12-month total",
          formatCurrency(summary.history.reduce((t, h) => t + h.collected, 0)),
          formatCurrency(summary.history.reduce((t, h) => t + h.invoiced, 0)),
          formatCurrency(summary.history.reduce((t, h) => t + h.expenses, 0)),
          formatCurrency(summary.history.reduce((t, h) => t + h.net, 0)),
        ],
      ],
      alignRight: [1, 2, 3, 4],
      filename: "DataIsData-Finance-Summary",
      notes: ["Cash basis. Collected includes invoice payments and other income."],
    });
  }

  const overdue = summary.openInvoices.filter((i) => i.days_past_due > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-muted-foreground">Revenue, receivables, expenses and cash — fiscal year to date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfButton onExport={exportPdf} />
          {can("finance_tracker") && (
            <Link href="/finance/tracker">
              <Button>
                <Calculator className="w-4 h-4" /> Open Finance Tracker
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Some data could not be loaded: {error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Collected YTD" value={formatCurrency(summary.collectedYTD)} icon={DollarSign} description={`${formatCurrency(summary.collectedMTD)} this month`} />
        <KPICard
          title="Outstanding AR"
          value={formatCurrency(summary.arOutstanding)}
          icon={Receipt}
          description={summary.dso !== null ? `DSO ${Math.round(summary.dso)} days` : "Net of partial payments"}
          change={overdue.length ? `${overdue.length} past due` : undefined}
          changeType={overdue.length ? "negative" : "neutral"}
        />
        <KPICard title="Expenses YTD" value={formatCurrency(summary.expensesYTD)} icon={CreditCard} description={`${formatCurrency(summary.expensesMTD)} this month`} />
        <KPICard
          title="Net Profit YTD"
          value={formatCurrency(summary.netYTD)}
          icon={TrendingUp}
          description={summary.netMarginYTD !== null ? `${summary.netMarginYTD.toFixed(1)}% net margin` : "Collected minus expenses"}
          changeType={summary.netYTD >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Last 12 months</CardTitle>
            <CardDescription>Cash collected vs expenses, with net by month</CardDescription>
          </CardHeader>
          <CardContent>
            <CashHistoryChart history={summary.history} />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Run-rate & cash</CardTitle>
            <CardDescription>From active placements and finance settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Active placements
              </span>
              <span className="font-bold">{summary.activePlacements}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Monthly revenue run-rate</span>
              <span className="font-bold">{formatCurrency(summary.monthlyRunRateRevenue)}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Monthly gross profit</span>
              <span className="font-bold text-primary">{formatCurrency(summary.monthlyRunRateProfit)}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Unbilled time</span>
              <span className={cn("font-bold", summary.unbilledValue > 0 && "text-amber-600")}>{formatCurrency(summary.unbilledValue)}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <PiggyBank className="w-4 h-4" /> Cash estimate
              </span>
              <span className="font-bold">{summary.cashEstimate === null ? "Not set" : formatCurrency(summary.cashEstimate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suggested tax set-aside</span>
              <span className="font-bold">{formatCurrency(summary.taxReserveSuggested)}</span>
            </div>
            {can("finance_tracker") && (
              <Link href="/finance/tracker" className="flex items-center gap-1 text-primary font-semibold text-sm pt-1 hover:underline">
                Forecasts & advice <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Receivables aging</CardTitle>
          <CardDescription>{formatCurrency(summary.arOutstanding)} outstanding, net of partial payments</CardDescription>
        </CardHeader>
        <CardContent>
          <AgingBar aging={summary.aging} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Past-due invoices ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length > 0 ? (
              <div className="space-y-3">
                {overdue.slice(0, 6).map((inv) => (
                  <Link key={inv.id} href={`/finance/invoices/${inv.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-red-50 border border-red-100">
                      <div>
                        <p className="text-sm font-bold text-foreground">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{inv.account}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{formatCurrency(inv.balance)}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.days_past_due} days late</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 text-center py-6 font-medium">No past-due invoices</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.map((p) => {
                  const inv = invById.get(p.invoice_id);
                  return (
                    <Link key={p.id} href={`/finance/invoices/${p.invoice_id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40">
                        <div>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv?.invoice_number} — {inv?.accounts?.name}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Expenses by category</CardTitle>
          <CardDescription>Fiscal year to date</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length > 0 ? (
            <div className="space-y-4">
              {expenseByCategory.map((cat) => {
                const budget = data.budgets.find((b) => b.category === cat.category);
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground flex items-center gap-2">
                        {cat.category}
                        {budget && <Badge className="border-none bg-slate-100 text-slate-600">{formatCompactCurrency(budget.monthly_amount)}/mo budget</Badge>}
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(cat.total / maxExpense) * 100}%`, background: "#c2610c" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No expenses recorded this fiscal year</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
