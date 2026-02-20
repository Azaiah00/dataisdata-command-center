"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { DollarSign, Receipt, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface FinanceData {
  totalRevenue: number;
  outstandingAR: number;
  totalExpenses: number;
  netProfit: number;
  overdueInvoices: { id: string; invoice_number: string; total: number; due_date: string; accounts: { name: string } | null }[];
  recentPayments: { id: string; amount: number; payment_date: string; invoices: { invoice_number: string; accounts: { name: string } | null } | null }[];
  expenseByCategory: { category: string; total: number }[];
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch invoices for revenue and AR
      const { data: invoices } = await supabase.from("invoices").select("id, total, status");
      const totalRevenue = (invoices || []).filter((i: any) => i.status === "Paid").reduce((s: number, i: any) => s + (i.total || 0), 0);
      const outstandingAR = (invoices || []).filter((i: any) => ["Sent", "Overdue"].includes(i.status)).reduce((s: number, i: any) => s + (i.total || 0), 0);

      // Fetch all payments for paid amount calculation
      const { data: allPayments } = await supabase.from("payments").select("amount");
      const totalPaid = (allPayments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

      // Fetch expenses
      const { data: expenses } = await supabase.from("expenses").select("amount, category");
      const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);

      // Expense breakdown by category
      const catMap: Record<string, number> = {};
      (expenses || []).forEach((e: any) => {
        catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
      });
      const expenseByCategory = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      // Overdue invoices (normalize accounts to single object; Supabase join can type it as array)
      const { data: overdue } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date, accounts(name)")
        .eq("status", "Overdue")
        .order("due_date")
        .limit(5);

      const overdueInvoices: { id: string; invoice_number: string; total: number; due_date: string; accounts: { name: string } | null }[] = (overdue || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        total: inv.total,
        due_date: inv.due_date,
        accounts: Array.isArray(inv.accounts) ? (inv.accounts[0] ?? null) : inv.accounts ?? null,
      }));

      // Recent payments (normalize nested invoices.accounts to single object)
      const { data: recent } = await supabase
        .from("payments")
        .select("id, amount, payment_date, invoices(invoice_number, accounts(name))")
        .order("payment_date", { ascending: false })
        .limit(5);

      const recentPayments: { id: string; amount: number; payment_date: string; invoices: { invoice_number: string; accounts: { name: string } | null } | null }[] = (recent || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        payment_date: p.payment_date,
        invoices: p.invoices
          ? {
              invoice_number: p.invoices.invoice_number,
              accounts: Array.isArray(p.invoices.accounts) ? (p.invoices.accounts[0] ?? null) : p.invoices.accounts ?? null,
            }
          : null,
      }));

      setData({
        totalRevenue: totalPaid,
        outstandingAR,
        totalExpenses,
        netProfit: totalPaid - totalExpenses,
        overdueInvoices,
        recentPayments,
        expenseByCategory,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }
  if (!data) return null;

  const maxExpense = Math.max(...data.expenseByCategory.map((e) => e.total), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Finance Dashboard</h1>
        <p className="text-[#6B7280]">Overview of revenue, expenses, and cash flow.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} description="Payments collected" />
        <KPICard title="Outstanding AR" value={formatCurrency(data.outstandingAR)} icon={Receipt} description="Invoices awaiting payment" />
        <KPICard title="Total Expenses" value={formatCurrency(data.totalExpenses)} icon={CreditCard} description="All recorded expenses" />
        <KPICard
          title="Net Profit"
          value={formatCurrency(data.netProfit)}
          icon={TrendingUp}
          description="Revenue minus expenses"
          changeType={data.netProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue invoices */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Overdue Invoices ({data.overdueInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                {data.overdueInvoices.map((inv) => (
                  <Link key={inv.id} href={`/finance/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-red-50 border border-red-100 cursor-pointer">
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{inv.invoice_number}</p>
                        <p className="text-xs text-[#6B7280]">{inv.accounts?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{formatCurrency(inv.total)}</p>
                        <p className="text-[10px] text-[#6B7280]">Due {formatDate(inv.due_date)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 text-center py-6 font-medium">No overdue invoices</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {data.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-[#6B7280]">{p.invoices?.invoice_number} — {p.invoices?.accounts?.name}</p>
                    </div>
                    <span className="text-xs text-[#6B7280]">{formatDate(p.payment_date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B7280] text-center py-6">No payments recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense breakdown */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#111827]">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {data.expenseByCategory.length > 0 ? (
            <div className="space-y-4">
              {data.expenseByCategory.map((cat) => {
                const pct = (cat.total / maxExpense) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-[#111827]">{cat.category}</span>
                      <span className="font-bold text-[#111827]">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#6B7280] text-center py-6">No expenses recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
