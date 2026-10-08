import type { FinanceData } from "./data";
import { loadedCostRate } from "./calc";
import { addMonths, businessDays, endOfMonth, monthKey, overlapDays, parseDate, startOfMonth, todayISO, daysBetween } from "./dates";
import { num } from "@/lib/utils";

export interface ForecastOptions {
  months: number;
  includePipeline: boolean;
  /** Multiplier applied to pipeline probabilities (1 = as entered). */
  pipelineWinFactor: number;
  /** % change applied to every active bill rate (pay rates unchanged). */
  billRateChangePct: number;
  /** Hypothetical new placements starting next month. */
  newPlacements: number;
  newPlacementBillRate: number;
  newPlacementPayRate: number;
  newPlacementHours: number;
  /** Assume ended placements are extended at the same terms. */
  assumeExtensions: boolean;
}

export const DEFAULT_FORECAST_OPTIONS: ForecastOptions = {
  months: 12,
  includePipeline: true,
  pipelineWinFactor: 1,
  billRateChangePct: 0,
  newPlacements: 0,
  newPlacementBillRate: 95,
  newPlacementPayRate: 65,
  newPlacementHours: 40,
  assumeExtensions: false,
};

export interface ForecastMonth {
  key: string;
  placementRevenue: number;
  advisoryRevenue: number;
  pipelineRevenue: number;
  revenue: number;
  directCost: number;
  overhead: number;
  grossProfit: number;
  netProfit: number;
  cashIn: number; // revenue shifted by payment terms (+ AR collections)
  cashOut: number;
  cumulativeCash: number;
  trend: number | null; // linear-regression projection of historical collections
}

export interface ForecastResult {
  months: ForecastMonth[];
  totals: { revenue: number; directCost: number; grossProfit: number; overhead: number; netProfit: number; pipelineRevenue: number };
  startingCash: number | null;
  lowestCash: { key: string; value: number } | null;
  assumptions: string[];
}

/** Hours worked by a placement within [from, to] assuming a Mon–Fri week. */
function hoursInRange(weeklyHours: number, from: Date, to: Date) {
  return (businessDays(from, to) / 5) * weeklyHours;
}

function linearTrend(values: number[]): { slope: number; intercept: number } | null {
  const pts = values.map((v, i) => [i, v] as const).filter(([, v]) => v !== 0);
  if (pts.length < 3) return null;
  const n = pts.length;
  const sx = pts.reduce((s, [x]) => s + x, 0);
  const sy = pts.reduce((s, [, y]) => s + y, 0);
  const sxx = pts.reduce((s, [x]) => s + x * x, 0);
  const sxy = pts.reduce((s, [x, y]) => s + x * y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n };
}

export function buildForecast(
  data: FinanceData,
  opts: ForecastOptions = DEFAULT_FORECAST_OPTIONS,
  cashStart: number | null = null,
  historyCollected: number[] = [],
  todayStr = todayISO()
): ForecastResult {
  const today = parseDate(todayStr)!;
  const s = data.settings;
  const first = startOfMonth(today);
  const horizon = Math.max(1, Math.min(36, Math.round(opts.months)));
  const months: ForecastMonth[] = [];
  for (let i = 0; i < horizon; i++) {
    months.push({
      key: monthKey(addMonths(first, i)),
      placementRevenue: 0,
      advisoryRevenue: 0,
      pipelineRevenue: 0,
      revenue: 0,
      directCost: 0,
      overhead: 0,
      grossProfit: 0,
      netProfit: 0,
      cashIn: 0,
      cashOut: 0,
      cumulativeCash: 0,
      trend: null,
    });
  }
  const horizonEnd = endOfMonth(addMonths(first, horizon - 1));
  const assumptions: string[] = [];
  const rateFactor = 1 + num(opts.billRateChangePct) / 100;
  const termsMonths = (days: number | null | undefined) => Math.max(0, Math.round(num(days ?? s.default_payment_terms_days) / 30));
  const cashInShift: number[] = new Array(horizon + 3).fill(0);

  // 1) Staff-aug placements (Active + Pending)
  const engagementsWithPlacements = new Set<string>();
  for (const p of data.placements) {
    if (p.engagement_id && p.status !== "Ended") engagementsWithPlacements.add(p.engagement_id);
    if (p.status !== "Active" && p.status !== "Pending") continue;
    const start = parseDate(p.start_date) || today;
    let end = parseDate(p.end_date) || horizonEnd;
    if (opts.assumeExtensions) end = horizonEnd;
    const from = start > today ? start : today;
    const bill = num(p.bill_rate) * rateFactor;
    const loaded = loadedCostRate(num(p.pay_rate), num(p.burden_pct));
    const shift = termsMonths(p.payment_terms_days);
    months.forEach((m, i) => {
      const mStart = i === 0 ? today : addMonths(first, i);
      const mEnd = endOfMonth(addMonths(first, i));
      const a = from > mStart ? from : mStart;
      const b = end < mEnd ? end : mEnd;
      if (b < a) return;
      const hrs = hoursInRange(num(p.weekly_hours), a, b);
      m.placementRevenue += hrs * bill;
      m.directCost += hrs * loaded;
      cashInShift[i + shift] += hrs * bill;
    });
  }
  if (data.placements.some((p) => p.status === "Active" && !p.end_date))
    assumptions.push("Placements without an end date are assumed to run through the whole forecast.");

  // 2) Fixed-fee / advisory engagements: remaining contract value spread evenly over remaining months
  const invoicedByEng: Record<string, number> = {};
  data.invoices.forEach((i) => {
    if (i.engagement_id && i.status !== "Cancelled") invoicedByEng[i.engagement_id] = (invoicedByEng[i.engagement_id] || 0) + num(i.total);
  });
  for (const e of data.engagements) {
    if (!["In Progress", "Planned"].includes(e.status)) continue;
    if (engagementsWithPlacements.has(e.id)) continue; // already counted via placements
    const value = num(e.contract_value);
    if (value <= 0) continue;
    const remaining = Math.max(0, value - (invoicedByEng[e.id] || 0));
    if (remaining <= 0) continue;
    const start = parseDate(e.start_date) || today;
    const end = parseDate(e.end_date) || addMonths(start, 12);
    const from = start > today ? start : today;
    const totalDays = Math.max(1, daysBetween(from, end) + 1);
    const perDay = remaining / totalDays;
    const targetMargin = num(s.target_gross_margin_pct) / 100;
    months.forEach((m, i) => {
      const mStart = i === 0 ? today : addMonths(first, i);
      const mEnd = endOfMonth(addMonths(first, i));
      const days = overlapDays(from, end, mStart, mEnd);
      if (!days) return;
      const rev = days * perDay;
      m.advisoryRevenue += rev;
      m.directCost += rev * (1 - targetMargin);
      cashInShift[i + termsMonths(null)] += rev;
    });
  }
  if (data.engagements.some((e) => ["In Progress", "Planned"].includes(e.status) && num(e.contract_value) > 0))
    assumptions.push("Fixed-fee engagements: remaining contract value (minus amounts already invoiced) is spread evenly to the end date, with delivery cost at your target gross margin.");

  // 3) Weighted pipeline
  if (opts.includePipeline) {
    const targetMargin = num(s.target_gross_margin_pct) / 100;
    for (const o of data.opportunities) {
      if (["Awarded", "Lost"].includes(o.stage)) continue;
      const prob = Math.min(1, (num(o.probability_pct) / 100) * num(opts.pipelineWinFactor));
      const value = num(o.estimated_value) * prob;
      if (value <= 0) continue;
      const start = parseDate(o.expected_start) || addMonths(first, 2);
      const end = parseDate(o.expected_end) || addMonths(start, 12);
      if (end < start) continue;
      const totalDays = Math.max(1, daysBetween(start, end) + 1);
      const perDay = value / totalDays;
      const costRatio = num(o.estimated_cost) > 0 && num(o.estimated_value) > 0 ? num(o.estimated_cost) / num(o.estimated_value) : 1 - targetMargin;
      months.forEach((m, i) => {
        const mStart = i === 0 ? today : addMonths(first, i);
        const mEnd = endOfMonth(addMonths(first, i));
        const days = overlapDays(start, end, mStart, mEnd);
        if (!days) return;
        const rev = days * perDay;
        m.pipelineRevenue += rev;
        m.directCost += rev * costRatio;
        cashInShift[i + termsMonths(null)] += rev;
      });
    }
    assumptions.push(
      `Pipeline is weighted by each opportunity's probability${num(opts.pipelineWinFactor) !== 1 ? ` × ${num(opts.pipelineWinFactor).toFixed(2)} scenario factor` : ""}; opportunities without dates are assumed to start in 2 months and run 12.`
    );
  }

  // 4) Scenario: new placements from next month
  if (opts.newPlacements > 0) {
    const loaded = loadedCostRate(num(opts.newPlacementPayRate), num(s.default_burden_pct));
    months.forEach((m, i) => {
      if (i === 0) return;
      const mStart = addMonths(first, i);
      const hrs = hoursInRange(num(opts.newPlacementHours), mStart, endOfMonth(mStart)) * opts.newPlacements;
      m.placementRevenue += hrs * num(opts.newPlacementBillRate);
      m.directCost += hrs * loaded;
      cashInShift[i + termsMonths(null)] += hrs * num(opts.newPlacementBillRate);
    });
    assumptions.push(`Scenario adds ${opts.newPlacements} new placement(s) from next month at $${num(opts.newPlacementBillRate)}/hr bill and $${num(opts.newPlacementPayRate)}/hr pay.`);
  }

  // 5) Overhead: recurring expenses + settings estimate
  const recurring = data.expenses.filter((e) => e.recurrence && e.recurrence !== "none");
  // Month 0 only covers today → month end (costs already paid this month are in the cash estimate).
  const daysInMonth0 = endOfMonth(first).getDate();
  const remainingFrac0 = (daysInMonth0 - today.getDate() + 1) / daysInMonth0;
  months.forEach((m, i) => {
    const mDate = addMonths(first, i);
    let oh = num(s.monthly_overhead_estimate) * (i === 0 ? remainingFrac0 : 1);
    for (const e of recurring) {
      const startD = parseDate(e.expense_date);
      if (!startD || startD > endOfMonth(mDate)) continue;
      const monthsSince = (mDate.getFullYear() - startD.getFullYear()) * 12 + (mDate.getMonth() - startD.getMonth());
      const due =
        e.recurrence === "monthly" ||
        (e.recurrence === "quarterly" && monthsSince % 3 === 0) ||
        (e.recurrence === "annual" && monthsSince % 12 === 0);
      if (!due) continue;
      if (i === 0) {
        // Occurrence day this month; skip it if it has already happened (it is in actual expenses/cash).
        const occDay = Math.min(startD.getDate(), daysInMonth0);
        if (occDay <= today.getDate()) continue;
      }
      oh += num(e.amount);
    }
    m.overhead = oh;
  });
  if (recurring.length) assumptions.push(`${recurring.length} recurring expense(s) are projected forward on their schedule.`);
  if (num(s.monthly_overhead_estimate) > 0)
    assumptions.push(`Plus $${num(s.monthly_overhead_estimate).toLocaleString()} / month of overhead from Finance Settings.`);

  // 6) Existing receivables are collected by their due dates
  const paidMap: Record<string, number> = {};
  data.payments.forEach((p) => (paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + num(p.amount)));
  data.invoices.forEach((inv) => {
    if (!["Sent", "Overdue"].includes(inv.status)) return;
    const bal = Math.max(0, num(inv.total) - (paidMap[inv.id] || 0));
    if (!bal) return;
    const due = parseDate(inv.due_date) || today;
    const idx = due <= today ? 0 : (due.getFullYear() - first.getFullYear()) * 12 + (due.getMonth() - first.getMonth());
    if (idx < horizon) cashInShift[Math.max(0, idx)] += bal;
  });
  assumptions.push("Cash-in is shifted by payment terms (default " + num(s.default_payment_terms_days) + " days); open invoices are assumed collected on their due date.");

  // 7) Trend line from history
  const trend = linearTrend(historyCollected);

  let cash = cashStart ?? 0;
  let lowest: { key: string; value: number } | null = null;
  months.forEach((m, i) => {
    m.revenue = m.placementRevenue + m.advisoryRevenue + m.pipelineRevenue;
    m.grossProfit = m.revenue - m.directCost;
    m.netProfit = m.grossProfit - m.overhead;
    m.cashIn = cashInShift[i];
    m.cashOut = m.directCost + m.overhead;
    cash += m.cashIn - m.cashOut;
    m.cumulativeCash = cash;
    if (!lowest || cash < lowest.value) lowest = { key: m.key, value: cash };
    m.trend = trend ? Math.max(0, trend.intercept + trend.slope * (historyCollected.length + i)) : null;
  });

  const totals = months.reduce(
    (t, m) => ({
      revenue: t.revenue + m.revenue,
      directCost: t.directCost + m.directCost,
      grossProfit: t.grossProfit + m.grossProfit,
      overhead: t.overhead + m.overhead,
      netProfit: t.netProfit + m.netProfit,
      pipelineRevenue: t.pipelineRevenue + m.pipelineRevenue,
    }),
    { revenue: 0, directCost: 0, grossProfit: 0, overhead: 0, netProfit: 0, pipelineRevenue: 0 }
  );

  if (cashStart === null) assumptions.push("No opening cash balance is set, so the cash line starts at $0 (set it in Finance Settings).");

  return { months, totals, startingCash: cashStart, lowestCash: lowest, assumptions };
}
