"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSettings } from "@/lib/finance/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccess } from "@/components/auth/AccessProvider";
import { num } from "@/lib/utils";
import { toast } from "sonner";
import { Save } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Row = { key: keyof FinanceSettings; label: string; help: string; suffix?: string; type?: "date" };

const GROUPS: { title: string; description: string; rows: Row[] }[] = [
  {
    title: "Targets",
    description: "What success looks like this year.",
    rows: [
      { key: "annual_revenue_target", label: "Annual revenue target", help: "Cash collected per fiscal year.", suffix: "$" },
      { key: "target_gross_margin_pct", label: "Target gross margin", help: "Spread ÷ bill rate on placements; also used to cost fixed-fee work.", suffix: "%" },
      { key: "target_net_margin_pct", label: "Target net margin", help: "After all expenses.", suffix: "%" },
    ],
  },
  {
    title: "Cash",
    description: "Lets the tracker roll your bank balance forward automatically.",
    rows: [
      { key: "opening_cash_balance", label: "Opening cash balance", help: "Your operating account balance on the date below.", suffix: "$" },
      { key: "opening_cash_as_of", label: "Balance as of", help: "Payments, income and expenses after this date adjust the estimate.", type: "date" },
      { key: "min_cash_runway_months", label: "Minimum runway", help: "Alert when cash covers fewer months of net burn than this.", suffix: "months" },
      { key: "monthly_overhead_estimate", label: "Extra monthly overhead", help: "Fixed costs NOT already entered as recurring expenses (used in forecasts).", suffix: "$" },
    ],
  },
  {
    title: "Staffing assumptions",
    description: "Defaults applied to new placements and invoices.",
    rows: [
      { key: "default_burden_pct", label: "Default W2 burden", help: "Employer payroll taxes, workers' comp, benefits, insurance.", suffix: "%" },
      { key: "default_payment_terms_days", label: "Default payment terms", help: "Days agencies take to pay invoices.", suffix: "days" },
      { key: "concentration_warning_pct", label: "Client concentration alert", help: "Warn when one agency exceeds this share of revenue.", suffix: "%" },
    ],
  },
  {
    title: "Tax",
    description: "Planning estimate only — confirm rates and due dates with your CPA.",
    rows: [{ key: "tax_reserve_pct", label: "Tax set-aside rate", help: "Share of year-to-date net profit to reserve.", suffix: "%" }],
  },
];

export function SettingsTab({ data, reload }: { data: FinanceData; reload: () => Promise<void> }) {
  const { can } = useAccess();
  const editable = can("finance_tracker", "edit");
  const [s, setS] = useState<FinanceSettings>(data.settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(data.settings), [data.settings]);
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);

  async function save() {
    const pctKeys: (keyof FinanceSettings)[] = ["target_gross_margin_pct", "target_net_margin_pct", "tax_reserve_pct", "concentration_warning_pct"];
    for (const k of pctKeys) if (num(s[k]) < 0 || num(s[k]) > 100) return toast.error("Percentages must be between 0 and 100");
    setSaving(true);
    const payload = {
      id: 1,
      ...s,
      opening_cash_as_of: s.opening_cash_as_of || null,
      fiscal_year_start_month: Math.min(12, Math.max(1, Math.round(num(s.fiscal_year_start_month)))),
      default_payment_terms_days: Math.max(0, Math.round(num(s.default_payment_terms_days))),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("finance_settings").upsert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Finance settings saved — every report and forecast has been updated");
    await reload();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Fiscal year</CardTitle>
          <CardDescription>Year-to-date figures, targets and the P&amp;L use this start month.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs">
          <Select value={String(s.fiscal_year_start_month)} onValueChange={(v) => setS({ ...s, fiscal_year_start_month: Number(v) })} disabled={!editable}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  Starts in {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {GROUPS.map((g) => (
        <Card key={g.title} className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{g.title}</CardTitle>
            <CardDescription>{g.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {g.rows.map((r) => (
              <div key={r.key} className="space-y-1.5">
                <Label htmlFor={`fs-${r.key}`}>{r.label}</Label>
                <div className="relative">
                  <Input
                    id={`fs-${r.key}`}
                    type={r.type === "date" ? "date" : "number"}
                    step="any"
                    disabled={!editable}
                    value={(s[r.key] as string | number | null) ?? ""}
                    onChange={(e) => setS({ ...s, [r.key]: r.type === "date" ? e.target.value || null : e.target.value === "" ? 0 : Number(e.target.value) })}
                    className={r.suffix ? "pr-16" : ""}
                  />
                  {r.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{r.suffix}</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">{r.help}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {editable && (
        <div className="flex justify-end gap-2 sticky bottom-4">
          <Button variant="outline" disabled={!dirty || saving} onClick={() => setS(data.settings)}>
            Discard
          </Button>
          <Button disabled={!dirty || saving} onClick={save}>
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
