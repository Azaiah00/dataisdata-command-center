import type { FinanceData } from "./data";
import { placementMetrics } from "./calc";
import { addMonths, daysBetween, fiscalYearStart, monthKey, parseDate, startOfMonth, todayISO, toISODate } from "./dates";
import { num } from "@/lib/utils";

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
}

export interface MonthPoint {
  key: string; // YYYY-MM
  collected: number; // invoice payments + other income
  invoiced: number;
  expenses: number;
  net: number;
}

export interface OpenInvoice {
  id: string;
  invoice_number: string;
  account: string;
  total: number;
  paid: number;
  balance: number;
  due_date: string | null;
  days_past_due: number;
  status: string;
}

export interface FinanceSummary {
  today: string;
  fyStart: string;
  // Year to date (fiscal)
  collectedYTD: number;
  invoicedYTD: number;
  expensesYTD: number;
  netYTD: number;
  netMarginYTD: number | null;
  // This month
  collectedMTD: number;
  expensesMTD: number;
  // Receivables
  arOutstanding: number;
  aging: AgingBuckets;
  openInvoices: OpenInvoice[];
  dso: number | null;
  // Placements
  activePlacements: number;
  weeklyRunRateRevenue: number;
  weeklyRunRateProfit: number;
  monthlyRunRateRevenue: number;
  monthlyRunRateProfit: number;
  blendedMarginPct: number | null;
  unbilledValue: number;
  unbilledHours: number;
  // Cash
  cashEstimate: number | null;
  avgMonthlyExpenses: number;
  avgMonthlyNet: number;
  runwayMonths: number | null; // null = cash-flow positive or unknown
  taxReserveSuggested: number;
  // Targets
  revenueTarget: number;
  targetProgressPct: number | null;
  targetPacePct: number | null; // expected % of target by today
  // Concentration
  revenueByAccount: { account_id: string; name: string; amount: number; share: number }[];
  // History
  history: MonthPoint[];
  // Budgets this month
  budgetStatus: { category: string; budget: number; actual: number; pct: number }[];
  // Pipeline
  weightedPipeline: number;
  openPipeline: number;
}

export function invoicePaidMap(data: Pick<FinanceData, "payments">): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of data.payments) m[p.invoice_id] = (m[p.invoice_id] || 0) + num(p.amount);
  return m;
}

export function computeSummary(data: FinanceData, todayStr = todayISO()): FinanceSummary {
  const today = parseDate(todayStr)!;
  const s = data.settings;
  const fy = fiscalYearStart(today, s.fiscal_year_start_month);
  const fyStr = toISODate(fy);
  const monthStart = toISODate(startOfMonth(today));
  const paid = invoicePaidMap(data);
  const invById = new Map(data.invoices.map((i) => [i.id, i]));
  const accountName = new Map(data.accounts.map((a) => [a.id, a.name]));

  const inRange = (d: string | null | undefined, from: string, to = todayStr) => !!d && d >= from && d <= to;

  const collectedYTD =
    data.payments.filter((p) => inRange(p.payment_date, fyStr)).reduce((t, p) => t + num(p.amount), 0) +
    data.income.filter((i) => inRange(i.income_date, fyStr)).reduce((t, i) => t + num(i.amount), 0);
  const invoicedYTD = data.invoices
    .filter((i) => i.status !== "Cancelled" && inRange(i.issue_date, fyStr))
    .reduce((t, i) => t + num(i.total), 0);
  const expensesYTD = data.expenses.filter((e) => inRange(e.expense_date, fyStr)).reduce((t, e) => t + num(e.amount), 0);
  const netYTD = collectedYTD - expensesYTD;

  const collectedMTD =
    data.payments.filter((p) => inRange(p.payment_date, monthStart)).reduce((t, p) => t + num(p.amount), 0) +
    data.income.filter((i) => inRange(i.income_date, monthStart)).reduce((t, i) => t + num(i.amount), 0);
  const expensesMTD = data.expenses.filter((e) => inRange(e.expense_date, monthStart)).reduce((t, e) => t + num(e.amount), 0);

  // Receivables (net of partial payments)
  const aging: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  const openInvoices: OpenInvoice[] = [];
  for (const inv of data.invoices) {
    if (!["Sent", "Overdue"].includes(inv.status)) continue;
    const balance = Math.max(0, num(inv.total) - (paid[inv.id] || 0));
    if (balance <= 0.004) continue;
    const due = parseDate(inv.due_date);
    const dpd = due ? daysBetween(due, today) : 0;
    if (dpd <= 0) aging.current += balance;
    else if (dpd <= 30) aging.d1_30 += balance;
    else if (dpd <= 60) aging.d31_60 += balance;
    else if (dpd <= 90) aging.d61_90 += balance;
    else aging.d90_plus += balance;
    openInvoices.push({
      id: inv.id,
      invoice_number: inv.invoice_number,
      account: inv.accounts?.name || accountName.get(inv.account_id) || "—",
      total: num(inv.total),
      paid: paid[inv.id] || 0,
      balance,
      due_date: inv.due_date,
      days_past_due: Math.max(0, dpd),
      status: inv.status,
    });
  }
  openInvoices.sort((a, b) => b.days_past_due - a.days_past_due || b.balance - a.balance);
  const arOutstanding = Object.values(aging).reduce((t, v) => t + v, 0);

  const d90 = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90));
  const invoiced90 = data.invoices.filter((i) => i.status !== "Cancelled" && inRange(i.issue_date, d90)).reduce((t, i) => t + num(i.total), 0);
  const dso = invoiced90 > 0 ? (arOutstanding / invoiced90) * 90 : null;

  // Placements run-rate
  const active = data.placements.filter((p) => p.status === "Active");
  let wRev = 0;
  let wProfit = 0;
  for (const p of active) {
    const m = placementMetrics(p, data.hours, todayStr);
    wRev += m.weekly_revenue;
    wProfit += m.weekly_profit;
  }
  let unbilledValue = 0;
  let unbilledHours = 0;
  for (const h of data.hours) {
    if (h.invoice_id) continue;
    unbilledHours += num(h.hours);
    unbilledValue += num(h.hours) * num(h.bill_rate);
  }

  // Monthly history (last 12 months incl. current)
  const history: MonthPoint[] = [];
  const first = addMonths(startOfMonth(today), -11);
  for (let i = 0; i < 12; i++) {
    const key = monthKey(addMonths(first, i));
    history.push({ key, collected: 0, invoiced: 0, expenses: 0, net: 0 });
  }
  const hIdx = new Map(history.map((h, i) => [h.key, i]));
  const bump = (date: string | null | undefined, field: "collected" | "invoiced" | "expenses", amount: number) => {
    const d = parseDate(date);
    if (!d) return;
    const i = hIdx.get(monthKey(d));
    if (i !== undefined) history[i][field] += amount;
  };
  data.payments.forEach((p) => bump(p.payment_date, "collected", num(p.amount)));
  data.income.forEach((i) => bump(i.income_date, "collected", num(i.amount)));
  data.invoices.filter((i) => i.status !== "Cancelled").forEach((i) => bump(i.issue_date, "invoiced", num(i.total)));
  data.expenses.forEach((e) => bump(e.expense_date, "expenses", num(e.amount)));
  history.forEach((h) => (h.net = h.collected - h.expenses));

  // Average of the last 3 *completed* months. Recurring expenses are entered once, so they
  // are replaced by their monthly equivalent (same rule the forecast uses).
  const completed = history.slice(-4, -1);
  const completedKeys = new Set(completed.map((h) => h.key));
  const recurringRows = data.expenses.filter((e) => e.recurrence && e.recurrence !== "none");
  const recurringInWindow = recurringRows
    .filter((e) => {
      const d = parseDate(e.expense_date);
      return d ? completedKeys.has(monthKey(d)) : false;
    })
    .reduce((t, e) => t + num(e.amount), 0);
  const recurringMonthly = recurringRows
    .filter((e) => e.expense_date <= todayStr)
    .reduce((t, e) => t + num(e.amount) / (e.recurrence === "quarterly" ? 3 : e.recurrence === "annual" ? 12 : 1), 0);
  const nMonths = Math.max(1, completed.length);
  const avgMonthlyExpenses = (completed.reduce((t, h) => t + h.expenses, 0) - recurringInWindow) / nMonths + recurringMonthly;
  const avgMonthlyCollected = completed.reduce((t, h) => t + h.collected, 0) / nMonths;
  const avgMonthlyNet = avgMonthlyCollected - avgMonthlyExpenses;

  // Cash estimate from an opening balance
  let cashEstimate: number | null = null;
  if (s.opening_cash_as_of) {
    const from = s.opening_cash_as_of;
    const after = (d: string | null | undefined) => !!d && d > from && d <= todayStr;
    cashEstimate =
      num(s.opening_cash_balance) +
      data.payments.filter((p) => after(p.payment_date)).reduce((t, p) => t + num(p.amount), 0) +
      data.income.filter((i) => after(i.income_date)).reduce((t, i) => t + num(i.amount), 0) -
      data.expenses.filter((e) => after(e.expense_date)).reduce((t, e) => t + num(e.amount), 0);
  }
  const burn = -(avgMonthlyNet - num(s.monthly_overhead_estimate));
  const runwayMonths = cashEstimate !== null && burn > 0 ? Math.max(0, cashEstimate / burn) : null;

  // Revenue concentration (trailing 12 months of cash collected, by account)
  const t12 = toISODate(addMonths(startOfMonth(today), -11));
  const byAcct: Record<string, number> = {};
  data.payments
    .filter((p) => inRange(p.payment_date, t12))
    .forEach((p) => {
      const inv = invById.get(p.invoice_id);
      if (inv) byAcct[inv.account_id] = (byAcct[inv.account_id] || 0) + num(p.amount);
    });
  // Fall back to active run-rate when there is no cash history yet
  if (!Object.keys(byAcct).length) {
    active.forEach((p) => {
      if (p.account_id) byAcct[p.account_id] = (byAcct[p.account_id] || 0) + placementMetrics(p, [], todayStr).annual_revenue;
    });
  }
  const totalByAcct = Object.values(byAcct).reduce((t, v) => t + v, 0);
  const revenueByAccount = Object.entries(byAcct)
    .map(([account_id, amount]) => ({
      account_id,
      name: accountName.get(account_id) || "Unknown account",
      amount,
      share: totalByAcct > 0 ? (amount / totalByAcct) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Budgets vs actual this month
  const monthExpenses: Record<string, number> = {};
  data.expenses.filter((e) => inRange(e.expense_date, monthStart)).forEach((e) => {
    monthExpenses[e.category] = (monthExpenses[e.category] || 0) + num(e.amount);
  });
  const budgetStatus = data.budgets.map((b) => {
    const actual = monthExpenses[b.category] || 0;
    return { category: b.category, budget: num(b.monthly_amount), actual, pct: num(b.monthly_amount) > 0 ? (actual / num(b.monthly_amount)) * 100 : 0 };
  });

  // Target pace
  const target = num(s.annual_revenue_target);
  const fyEnd = addMonths(fy, 12);
  const elapsed = daysBetween(fy, today) + 1;
  const fyDays = daysBetween(fy, fyEnd);
  const targetPacePct = target > 0 ? Math.min(100, (elapsed / fyDays) * 100) : null;

  const openOpps = data.opportunities.filter((o) => !["Awarded", "Lost"].includes(o.stage));

  return {
    today: todayStr,
    fyStart: fyStr,
    collectedYTD,
    invoicedYTD,
    expensesYTD,
    netYTD,
    netMarginYTD: collectedYTD > 0 ? (netYTD / collectedYTD) * 100 : null,
    collectedMTD,
    expensesMTD,
    arOutstanding,
    aging,
    openInvoices,
    dso,
    activePlacements: active.length,
    weeklyRunRateRevenue: wRev,
    weeklyRunRateProfit: wProfit,
    monthlyRunRateRevenue: (wRev * 52) / 12,
    monthlyRunRateProfit: (wProfit * 52) / 12,
    blendedMarginPct: wRev > 0 ? (wProfit / wRev) * 100 : null,
    unbilledValue,
    unbilledHours,
    cashEstimate,
    avgMonthlyExpenses,
    avgMonthlyNet,
    runwayMonths,
    taxReserveSuggested: Math.max(0, netYTD) * (num(s.tax_reserve_pct) / 100),
    revenueTarget: target,
    targetProgressPct: target > 0 ? (collectedYTD / target) * 100 : null,
    targetPacePct,
    revenueByAccount,
    history,
    budgetStatus,
    weightedPipeline: openOpps.reduce((t, o) => t + (num(o.estimated_value) * num(o.probability_pct)) / 100, 0),
    openPipeline: openOpps.reduce((t, o) => t + num(o.estimated_value), 0),
  };
}
