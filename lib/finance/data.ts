import { supabase } from "@/lib/supabase";
import { num } from "@/lib/utils";
import {
  DEFAULT_FINANCE_SETTINGS,
  type AccountRow,
  type CustomField,
  type EngagementRow,
  type ExpenseRow,
  type FinanceBudget,
  type FinanceSettings,
  type IncomeEntry,
  type InvoiceRow,
  type OpportunityRow,
  type PaymentRow,
  type Placement,
  type PlacementHours,
} from "./types";

export interface FinanceData {
  trackerInstalled: boolean;
  settings: FinanceSettings;
  placements: Placement[];
  hours: PlacementHours[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  income: IncomeEntry[];
  budgets: FinanceBudget[];
  customFields: CustomField[];
  engagements: EngagementRow[];
  opportunities: OpportunityRow[];
  accounts: AccountRow[];
  contractors: { id: string; full_name: string; title_role: string | null }[];
  errors: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

function numFields<T extends Record<string, any>>(row: T, keys: string[]): T {
  const out: any = { ...row };
  for (const k of keys) if (k in out && out[k] !== null) out[k] = num(out[k]);
  return out;
}

/** Load everything the finance engines need in parallel. Missing tables are tolerated. */
export async function loadFinanceData(): Promise<FinanceData> {
  const errors: string[] = [];
  const [
    settingsRes,
    placementsRes,
    hoursRes,
    invoicesRes,
    paymentsRes,
    expensesRes,
    incomeRes,
    budgetsRes,
    fieldsRes,
    engagementsRes,
    oppsRes,
    accountsRes,
    contractorsRes,
  ] = await Promise.all([
    supabase.from("finance_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("placements").select("*, contractors(id, full_name), accounts(id, name), engagements(id, name)").order("created_at"),
    supabase.from("placement_hours").select("*").order("period_start", { ascending: false }),
    supabase.from("invoices").select("*, accounts(name)").order("issue_date", { ascending: false }),
    supabase.from("payments").select("id, invoice_id, amount, payment_date"),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("income_entries").select("*, accounts(name)").order("income_date", { ascending: false }),
    supabase.from("finance_budgets").select("*").order("category"),
    supabase.from("finance_custom_fields").select("*").order("sort_order").order("created_at"),
    supabase.from("engagements").select("id, name, account_id, engagement_type, status, start_date, end_date, contract_value, budget"),
    supabase.from("opportunities").select("id, name, account_id, stage, probability_pct, estimated_value, estimated_cost, expected_start, expected_end"),
    supabase.from("accounts").select("id, name").order("name"),
    supabase.from("contractors").select("id, full_name, title_role").order("full_name"),
  ]);

  const trackerInstalled = !settingsRes.error && !placementsRes.error;
  for (const [label, r] of [
    ["invoices", invoicesRes],
    ["payments", paymentsRes],
    ["expenses", expensesRes],
    ["engagements", engagementsRes],
  ] as const) {
    if (r.error) errors.push(`${label}: ${r.error.message}`);
  }

  return {
    trackerInstalled,
    settings: settingsRes.data
      ? (numFields({ ...DEFAULT_FINANCE_SETTINGS, ...settingsRes.data }, [
          "annual_revenue_target",
          "target_gross_margin_pct",
          "target_net_margin_pct",
          "tax_reserve_pct",
          "default_burden_pct",
          "default_payment_terms_days",
          "min_cash_runway_months",
          "opening_cash_balance",
          "monthly_overhead_estimate",
          "concentration_warning_pct",
          "fiscal_year_start_month",
        ]) as FinanceSettings)
      : DEFAULT_FINANCE_SETTINGS,
    placements: (placementsRes.data || []).map((p: any) => ({
      ...numFields(p, ["bill_rate", "pay_rate", "burden_pct", "weekly_hours"]),
      custom_fields: p.custom_fields || {},
      contractors: one(p.contractors),
      accounts: one(p.accounts),
      engagements: one(p.engagements),
    })),
    hours: (hoursRes.data || []).map((h: any) => numFields(h, ["hours", "bill_rate", "pay_rate", "burden_pct"])),
    invoices: (invoicesRes.data || []).map((i: any) => ({ ...numFields(i, ["total", "subtotal", "tax_amount"]), accounts: one(i.accounts) })),
    payments: (paymentsRes.data || []).map((p: any) => numFields(p, ["amount"])),
    expenses: (expensesRes.data || []).map((e: any) => numFields(e, ["amount"])),
    income: incomeRes.error ? [] : (incomeRes.data || []).map((i: any) => ({ ...numFields(i, ["amount"]), custom_fields: i.custom_fields || {}, accounts: one(i.accounts) })),
    budgets: budgetsRes.error ? [] : (budgetsRes.data || []).map((b: any) => numFields(b, ["monthly_amount"])),
    customFields: fieldsRes.error ? [] : ((fieldsRes.data || []) as CustomField[]).map((f) => ({ ...f, options: f.options || [] })),
    engagements: (engagementsRes.data || []).map((e: any) => numFields(e, ["contract_value", "budget"])),
    opportunities: (oppsRes.data || []).map((o: any) => numFields(o, ["probability_pct", "estimated_value", "estimated_cost"])),
    accounts: accountsRes.data || [],
    contractors: contractorsRes.data || [],
    errors,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Keep invoice statuses in sync with due dates (Sent ⇄ Overdue). Safe to call often. */
export async function syncInvoiceStatuses(): Promise<void> {
  const { error } = await supabase.rpc("sync_invoice_statuses");
  if (!error) return;
  // Fallback for databases that have not run the October migration yet.
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await supabase.from("invoices").update({ status: "Overdue", updated_at: new Date().toISOString() }).eq("status", "Sent").lt("due_date", iso);
}

/**
 * Recalculate an invoice's status from its payments. Used after recording or
 * deleting a payment so every screen agrees (dashboard, AR, P&L, tracker).
 */
export async function recomputeInvoiceStatus(invoiceId: string): Promise<string | null> {
  const [{ data: inv }, { data: pays }] = await Promise.all([
    supabase.from("invoices").select("id, total, status, due_date").eq("id", invoiceId).maybeSingle(),
    supabase.from("payments").select("amount").eq("invoice_id", invoiceId),
  ]);
  if (!inv) return null;
  if (inv.status === "Cancelled") return inv.status;
  const paid = (pays || []).reduce((s: number, p: { amount: number }) => s + num(p.amount), 0);
  const total = num(inv.total);
  let next = inv.status as string;
  if (total > 0 && paid >= total - 0.005) next = "Paid";
  else if (inv.status === "Paid") {
    // A payment was removed — fall back to Sent/Overdue based on due date.
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    next = inv.due_date && inv.due_date < iso ? "Overdue" : "Sent";
  }
  if (next !== inv.status) {
    await supabase.from("invoices").update({ status: next, updated_at: new Date().toISOString() }).eq("id", invoiceId);
  }
  return next;
}
