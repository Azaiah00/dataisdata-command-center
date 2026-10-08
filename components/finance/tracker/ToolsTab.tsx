"use client";

import { useState } from "react";
import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSummary } from "@/lib/finance/summary";
import { billRateForMargin, loadedCostRate, maxPayRateForMargin } from "@/lib/finance/calc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency, num } from "@/lib/utils";
import { Calculator, Scale, Receipt, Percent } from "lucide-react";

function Field({ label, value, onChange, suffix, id }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={suffix ? "pr-12" : ""} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Result({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold mt-0.5", tone === "good" && "text-primary", tone === "bad" && "text-red-600")}>{value}</p>
    </div>
  );
}

export function ToolsTab({ data, summary }: { data: FinanceData; summary: FinanceSummary }) {
  const s = data.settings;
  // Rate calculator
  const [pay, setPay] = useState("65");
  const [burden, setBurden] = useState(String(s.default_burden_pct));
  const [targetM, setTargetM] = useState(String(s.target_gross_margin_pct));
  const [bill, setBill] = useState("95");
  const [hrs, setHrs] = useState("40");
  const loaded = loadedCostRate(num(pay), num(burden));
  const spread = num(bill) - loaded;
  const margin = num(bill) > 0 ? (spread / num(bill)) * 100 : 0;
  const markup = num(pay) > 0 ? ((num(bill) - num(pay)) / num(pay)) * 100 : 0;
  const neededBill = billRateForMargin(num(pay), num(burden), num(targetM));
  const maxPay = maxPayRateForMargin(num(bill), num(burden), num(targetM));

  // Break-even
  const defaultOverhead = Math.max(num(s.monthly_overhead_estimate), Math.round(summary.avgMonthlyExpenses));
  const [overhead, setOverhead] = useState(String(defaultOverhead || 5000));
  const [avgSpread, setAvgSpread] = useState(summary.weeklyRunRateRevenue > 0 && summary.activePlacements ? (summary.weeklyRunRateProfit / Math.max(1, summary.activePlacements * 40)).toFixed(2) : "20");
  const hoursNeeded = num(avgSpread) > 0 ? num(overhead) / num(avgSpread) : 0;
  const ftesNeeded = hoursNeeded / ((40 * 52) / 12);

  // Invoice / payment timing
  const [invAmount, setInvAmount] = useState("25000");
  const [terms, setTerms] = useState(String(s.default_payment_terms_days));
  const [payCycleDays, setPayCycleDays] = useState("14");
  const gapDays = Math.max(0, num(terms) - 0) + num(payCycleDays) / 2;
  const workingCapital = (num(invAmount) / 30) * gapDays * (1 - num(s.target_gross_margin_pct) / 100);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" /> Rate & margin calculator
          </CardTitle>
          <CardDescription>Price a new role or a renewal in seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field id="t-pay" label="Pay rate" value={pay} onChange={setPay} suffix="$/hr" />
            <Field id="t-burden" label="Burden" value={burden} onChange={setBurden} suffix="%" />
            <Field id="t-bill" label="Bill rate" value={bill} onChange={setBill} suffix="$/hr" />
            <Field id="t-target" label="Target margin" value={targetM} onChange={setTargetM} suffix="%" />
            <Field id="t-hrs" label="Hours / week" value={hrs} onChange={setHrs} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Result label="Loaded cost" value={`${formatCurrency(loaded)}/hr`} />
            <Result label="Spread" value={`${formatCurrency(spread)}/hr`} tone={spread < 0 ? "bad" : undefined} />
            <Result label="Gross margin" value={`${margin.toFixed(1)}%`} tone={margin >= num(targetM) ? "good" : "bad"} />
            <Result label="Markup on pay" value={`${markup.toFixed(1)}%`} />
            <Result label="Monthly gross profit" value={formatCurrency(spread * num(hrs) * (52 / 12))} />
            <Result label="Annual gross profit" value={formatCurrency(spread * num(hrs) * 52)} />
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
            <p>
              Minimum bill rate for {num(targetM)}% margin at {formatCurrency(num(pay))}/hr pay: <strong>{formatCurrency(neededBill)}/hr</strong>
            </p>
            <p>
              Maximum pay rate for {num(targetM)}% margin at {formatCurrency(num(bill))}/hr bill: <strong>{formatCurrency(maxPay)}/hr</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Break-even
          </CardTitle>
          <CardDescription>How much billable work covers your fixed costs each month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-oh" label="Monthly overhead" value={overhead} onChange={setOverhead} suffix="$" />
            <Field id="t-spread" label="Average spread" value={avgSpread} onChange={setAvgSpread} suffix="$/hr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Result label="Billable hours needed / month" value={Math.ceil(hoursNeeded).toLocaleString()} />
            <Result label="Full-time placements needed" value={ftesNeeded.toFixed(1)} />
          </div>
          <p className="text-xs text-muted-foreground">
            You currently have {summary.activePlacements} active placement{summary.activePlacements === 1 ? "" : "s"} producing {formatCurrency(summary.monthlyRunRateProfit)} gross profit a month.
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Payroll float
          </CardTitle>
          <CardDescription>Cash you need on hand because contractors are paid before agencies pay you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field id="t-inv" label="Monthly billing" value={invAmount} onChange={setInvAmount} suffix="$" />
            <Field id="t-terms" label="Agency terms" value={terms} onChange={setTerms} suffix="days" />
            <Field id="t-cycle" label="Pay cycle" value={payCycleDays} onChange={setPayCycleDays} suffix="days" />
          </div>
          <Result label="Working capital to float payroll" value={formatCurrency(workingCapital)} />
          <p className="text-xs text-muted-foreground">
            Estimate: daily labor cost × (payment terms + half a pay cycle), using your {s.target_gross_margin_pct}% target margin. Faster invoicing shrinks this number.
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" /> Quick references
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">Margin vs markup.</strong> Margin = spread ÷ bill rate. Markup = (bill − pay) ÷ pay. A 50% markup on pay is only a ~33% margin before burden.
          </p>
          <p>
            <strong className="text-foreground">Burden.</strong> W2 consultants carry employer payroll taxes, unemployment insurance, workers&apos; comp and any benefits. Set your real rate in Settings; 1099/C2C usually near 0%.
          </p>
          <p>
            <strong className="text-foreground">Formula fields.</strong> Anything you calculate in a spreadsheet today can become a formula field (Custom Fields tab) and appear in tables, totals and PDFs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
