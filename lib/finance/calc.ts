import type { CustomEntity, CustomField, Placement, PlacementHours, ResultFormat } from "./types";
import { evaluateFormulaFields } from "./formula";
import { daysBetween, parseDate, todayISO } from "./dates";
import { num } from "@/lib/utils";

export const WEEKS_PER_MONTH = 52 / 12;

/** Built-in numeric fields available to formulas, per entity. */
export const BUILTIN_FIELDS: Record<CustomEntity, { key: string; label: string; format: ResultFormat }[]> = {
  placement: [
    { key: "bill_rate", label: "Bill rate ($/hr)", format: "currency" },
    { key: "pay_rate", label: "Pay rate ($/hr)", format: "currency" },
    { key: "burden_pct", label: "Burden %", format: "percent" },
    { key: "weekly_hours", label: "Weekly hours", format: "number" },
    { key: "loaded_cost", label: "Loaded cost ($/hr)", format: "currency" },
    { key: "spread", label: "Spread ($/hr)", format: "currency" },
    { key: "margin_pct", label: "Gross margin %", format: "percent" },
    { key: "markup_pct", label: "Markup %", format: "percent" },
    { key: "weekly_revenue", label: "Weekly revenue", format: "currency" },
    { key: "weekly_profit", label: "Weekly gross profit", format: "currency" },
    { key: "monthly_revenue", label: "Monthly revenue", format: "currency" },
    { key: "monthly_profit", label: "Monthly gross profit", format: "currency" },
    { key: "annual_revenue", label: "Annualized revenue", format: "currency" },
    { key: "annual_profit", label: "Annualized gross profit", format: "currency" },
    { key: "remaining_weeks", label: "Weeks remaining", format: "number" },
    { key: "remaining_revenue", label: "Remaining revenue", format: "currency" },
    { key: "remaining_profit", label: "Remaining gross profit", format: "currency" },
    { key: "hours_logged", label: "Hours logged", format: "number" },
    { key: "billed_to_date", label: "Billable to date", format: "currency" },
    { key: "cost_to_date", label: "Cost to date", format: "currency" },
  ],
  expense: [{ key: "amount", label: "Amount", format: "currency" }],
  invoice: [
    { key: "total", label: "Invoice total", format: "currency" },
    { key: "paid", label: "Paid to date", format: "currency" },
    { key: "balance", label: "Balance due", format: "currency" },
    { key: "days_outstanding", label: "Days outstanding", format: "number" },
  ],
  income: [{ key: "amount", label: "Amount", format: "currency" }],
};

export interface PlacementMetrics {
  bill_rate: number;
  pay_rate: number;
  burden_pct: number;
  weekly_hours: number;
  loaded_cost: number;
  spread: number;
  margin_pct: number;
  markup_pct: number;
  weekly_revenue: number;
  weekly_profit: number;
  monthly_revenue: number;
  monthly_profit: number;
  annual_revenue: number;
  annual_profit: number;
  remaining_weeks: number;
  remaining_revenue: number;
  remaining_profit: number;
  hours_logged: number;
  billed_to_date: number;
  cost_to_date: number;
  unbilled_hours: number;
  unbilled_value: number;
}

export function loadedCostRate(payRate: number, burdenPct: number) {
  return num(payRate) * (1 + num(burdenPct) / 100);
}

export function placementMetrics(p: Placement, hours: PlacementHours[] = [], today = todayISO()): PlacementMetrics {
  const bill = num(p.bill_rate);
  const pay = num(p.pay_rate);
  const burden = num(p.burden_pct);
  const wh = num(p.weekly_hours);
  const loaded = loadedCostRate(pay, burden);
  const spread = bill - loaded;
  const mine = hours.filter((h) => h.placement_id === p.id);
  const hoursLogged = mine.reduce((s, h) => s + num(h.hours), 0);
  const billed = mine.reduce((s, h) => s + num(h.hours) * num(h.bill_rate), 0);
  const cost = mine.reduce((s, h) => s + num(h.hours) * loadedCostRate(num(h.pay_rate), num(h.burden_pct)), 0);
  const unbilled = mine.filter((h) => !h.invoice_id);

  let remainingWeeks = 0;
  if (p.status === "Active" || p.status === "Pending") {
    const t = parseDate(today)!;
    const start = parseDate(p.start_date);
    const from = start && start > t ? start : t;
    const end = parseDate(p.end_date);
    remainingWeeks = end ? Math.max(0, (daysBetween(from, end) + 1) / 7) : 0;
  }

  return {
    bill_rate: bill,
    pay_rate: pay,
    burden_pct: burden,
    weekly_hours: wh,
    loaded_cost: loaded,
    spread,
    margin_pct: bill > 0 ? (spread / bill) * 100 : 0,
    markup_pct: pay > 0 ? ((bill - pay) / pay) * 100 : 0,
    weekly_revenue: bill * wh,
    weekly_profit: spread * wh,
    monthly_revenue: bill * wh * WEEKS_PER_MONTH,
    monthly_profit: spread * wh * WEEKS_PER_MONTH,
    annual_revenue: bill * wh * 52,
    annual_profit: spread * wh * 52,
    remaining_weeks: remainingWeeks,
    remaining_revenue: bill * wh * remainingWeeks,
    remaining_profit: spread * wh * remainingWeeks,
    hours_logged: hoursLogged,
    billed_to_date: billed,
    cost_to_date: cost,
    unbilled_hours: unbilled.reduce((s, h) => s + num(h.hours), 0),
    unbilled_value: unbilled.reduce((s, h) => s + num(h.hours) * num(h.bill_rate), 0),
  };
}

/** Numeric values of user-defined (non-formula) fields on a record. */
export function customNumericValues(fields: CustomField[], values: Record<string, unknown> | null | undefined) {
  const out: Record<string, number> = {};
  for (const f of fields) {
    if (!f.is_active) continue;
    if (f.field_type === "number" || f.field_type === "currency" || f.field_type === "percent") {
      out[f.field_key] = num(values?.[f.field_key]);
    }
  }
  return out;
}

/** Base vars + every active formula field resolved for one record. */
export function resolveRecordFields(
  base: Record<string, number>,
  fields: CustomField[],
  values: Record<string, unknown> | null | undefined
): Record<string, number> {
  const vars = { ...base, ...customNumericValues(fields, values) };
  const formulas = fields
    .filter((f) => f.is_active && f.field_type === "formula" && f.formula)
    .map((f) => ({ key: f.field_key, formula: f.formula as string }));
  return { ...vars, ...evaluateFormulaFields(vars, formulas) };
}

export function formatByType(value: unknown, format: ResultFormat | "text" | "date" | "select") {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "currency")
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(num(value));
  if (format === "percent") return `${num(value).toFixed(1)}%`;
  if (format === "number") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num(value));
  return String(value);
}

export function fieldFormat(f: CustomField): ResultFormat | "text" | "date" | "select" {
  if (f.field_type === "formula") return f.result_format;
  if (f.field_type === "currency") return "currency";
  if (f.field_type === "percent") return "percent";
  if (f.field_type === "number") return "number";
  return f.field_type;
}

export function aggregate(values: number[], how: string): number | null {
  if (!values.length || how === "none") return null;
  switch (how) {
    case "avg":
      return values.reduce((s, x) => s + x, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.reduce((s, x) => s + x, 0);
  }
}

/* --------------------------- rate calculator maths ------------------------ */

/** Bill rate needed to hit a target gross margin on a loaded cost. */
export function billRateForMargin(payRate: number, burdenPct: number, targetMarginPct: number) {
  const loaded = loadedCostRate(payRate, burdenPct);
  const m = Math.min(99, Math.max(0, targetMarginPct)) / 100;
  return m >= 1 ? 0 : loaded / (1 - m);
}

/** Max pay rate that still hits a target margin at a given bill rate. */
export function maxPayRateForMargin(billRate: number, burdenPct: number, targetMarginPct: number) {
  const m = Math.min(99, Math.max(0, targetMarginPct)) / 100;
  return (billRate * (1 - m)) / (1 + burdenPct / 100);
}
