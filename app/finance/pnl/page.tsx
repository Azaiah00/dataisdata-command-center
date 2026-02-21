"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { Printer, Download, TrendingUp, TrendingDown } from "lucide-react";

type DateRange = "month" | "quarter" | "year" | "all";

function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;
  switch (range) {
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(2000, 0, 1);
  }
  return { start: start.toISOString().split("T")[0], end };
}

interface PnLData {
  totalInvoiced: number;
  totalCollected: number;
  expensesByCategory: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
  engagementProfitability: { id: string; name: string; revenue: number; expenses: number; profit: number }[];
}

export default function ProfitAndLossPage() {
  const [range, setRange] = useState<DateRange>("year");
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPnL() {
      setLoading(true);
      const { start, end } = getDateRange(range);

      // Invoices in range
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, total, status, engagement_id")
        .gte("issue_date", start)
        .lte("issue_date", end);

      const totalInvoiced = (invoices || []).reduce((s: number, i: any) => s + (i.total || 0), 0);

      // Payments in range
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, invoice_id")
        .gte("payment_date", start)
        .lte("payment_date", end);

      const totalCollected = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);

      // Expenses in range
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category, engagement_id")
        .gte("expense_date", start)
        .lte("expense_date", end);

      const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);

      // Expense breakdown
      const catMap: Record<string, number> = {};
      (expenses || []).forEach((e: any) => {
        catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
      });
      const expensesByCategory = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      // Per-engagement profitability
      const { data: engs } = await supabase.from("engagements").select("id, name");
      const engMap: Record<string, { name: string; revenue: number; expenses: number }> = {};
      (engs || []).forEach((e: any) => { engMap[e.id] = { name: e.name, revenue: 0, expenses: 0 }; });

      // Revenue per engagement from paid invoices in range
      const paidInvIds = new Set((payments || []).map((p: any) => p.invoice_id));
      (invoices || []).forEach((inv: any) => {
        if (inv.engagement_id && engMap[inv.engagement_id] && paidInvIds.has(inv.id)) {
          engMap[inv.engagement_id].revenue += inv.total || 0;
        }
      });

      // Expenses per engagement
      (expenses || []).forEach((e: any) => {
        if (e.engagement_id && engMap[e.engagement_id]) {
          engMap[e.engagement_id].expenses += e.amount || 0;
        }
      });

      const engagementProfitability = Object.entries(engMap)
        .filter(([, v]) => v.revenue > 0 || v.expenses > 0)
        .map(([id, v]) => ({ id, name: v.name, revenue: v.revenue, expenses: v.expenses, profit: v.revenue - v.expenses }))
        .sort((a, b) => b.profit - a.profit);

      setData({
        totalInvoiced,
        totalCollected,
        expensesByCategory,
        totalExpenses,
        netProfit: totalCollected - totalExpenses,
        engagementProfitability,
      });
      setLoading(false);
    }
    fetchPnL();
  }, [range]);

  const rangeLabel = range === "month" ? "This Month" : range === "quarter" ? "This Quarter" : range === "year" ? "This Year" : "All Time";

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Print header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-primary">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">DataIsData</h1>
            <p className="text-sm text-[#6B7280]">Innovation as a Service</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-[#111827]">Profit & Loss Report</h2>
            <p className="text-sm text-[#6B7280]">{rangeLabel} | {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Profit & Loss</h1>
          <p className="text-[#6B7280]">Revenue, expenses, and profitability analysis.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : data ? (
        <>
          {/* Revenue section */}
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Revenue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-[#6B7280]">Total Invoiced</span>
                <span className="font-bold text-[#111827]">{formatCurrency(data.totalInvoiced)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-bold text-[#111827]">Total Collected (Cash In)</span>
                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(data.totalCollected)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses section */}
          <Card className="border-none shadow-sm">
            <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Expenses</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.expensesByCategory.map((cat) => (
                <div key={cat.category} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-[#6B7280]">{cat.category}</span>
                  <span className="font-bold text-[#111827]">{formatCurrency(cat.total)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-slate-200">
                <span className="text-sm font-bold text-[#111827]">Total Expenses</span>
                <span className="font-bold text-red-600 text-lg">{formatCurrency(data.totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className={cn("border-none shadow-sm", data.netProfit >= 0 ? "bg-green-50/50" : "bg-red-50/50")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {data.netProfit >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Net Profit / Loss</p>
                    <p className="text-sm text-[#6B7280]">{rangeLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-3xl font-bold", data.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(data.netProfit)}
                  </p>
                  {data.totalCollected > 0 && (
                    <p className="text-sm text-[#6B7280]">
                      {((data.netProfit / data.totalCollected) * 100).toFixed(1)}% margin
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-engagement profitability */}
          {data.engagementProfitability.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Profitability by Engagement</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-xs font-bold text-[#6B7280] uppercase">Engagement</th>
                      <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Revenue</th>
                      <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Expenses</th>
                      <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Profit</th>
                      <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.engagementProfitability.map((eng) => (
                      <tr key={eng.id} className="border-b border-slate-50">
                        <td className="py-3 text-[#111827] font-medium">{eng.name}</td>
                        <td className="py-3 text-right text-emerald-600 font-bold">{formatCurrency(eng.revenue)}</td>
                        <td className="py-3 text-right text-red-600">{formatCurrency(eng.expenses)}</td>
                        <td className={cn("py-3 text-right font-bold", eng.profit >= 0 ? "text-green-600" : "text-red-600")}>
                          {formatCurrency(eng.profit)}
                        </td>
                        <td className="py-3 text-right text-[#6B7280]">
                          {eng.revenue > 0 ? `${((eng.profit / eng.revenue) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      {/* Print footer */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-primary">
        <p className="text-sm text-[#6B7280]">DataIsData Command Center | Profit & Loss Report | {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
