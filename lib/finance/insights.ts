import type { FinanceData } from "./data";
import type { FinanceSummary } from "./summary";
import type { ForecastResult } from "./forecast";
import { placementMetrics } from "./calc";
import { addDaysISO, daysBetween, monthLabel, parseDate, todayISO } from "./dates";
import { formatCurrency, num } from "@/lib/utils";

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: "Cash" | "Receivables" | "Margin" | "Growth" | "Risk" | "Operations" | "Tax" | "Data quality";
  title: string;
  detail: string;
  action?: { label: string; href: string };
  impact?: number; // $ at stake, used for ranking
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

/**
 * Rules-based advisor. Every rule reads the same data the rest of the portal
 * uses, so advice updates the moment an invoice, payment, expense, placement
 * or opportunity changes anywhere.
 */
export function buildInsights(data: FinanceData, summary: FinanceSummary, forecast: ForecastResult | null, todayStr = todayISO()): Insight[] {
  const s = data.settings;
  const out: Insight[] = [];
  const today = parseDate(todayStr)!;

  // --- Receivables ---------------------------------------------------------
  const over60 = summary.aging.d61_90 + summary.aging.d90_plus;
  const pastDue = summary.arOutstanding - summary.aging.current;
  if (over60 > 0) {
    out.push({
      id: "ar-60",
      severity: "critical",
      category: "Receivables",
      title: `${formatCurrency(over60)} is more than 60 days past due`,
      detail: "Escalate with the agency's accounts-payable office and confirm the invoice was received and approved. Older receivables get harder to collect every week.",
      action: { label: "Review open invoices", href: "/finance/invoices" },
      impact: over60,
    });
  } else if (pastDue > 0) {
    out.push({
      id: "ar-past-due",
      severity: "warning",
      category: "Receivables",
      title: `${formatCurrency(pastDue)} is past due`,
      detail: "Send a friendly reminder with the invoice attached and confirm the PO / contract number on file.",
      action: { label: "Review open invoices", href: "/finance/invoices" },
      impact: pastDue,
    });
  }
  if (summary.dso !== null && summary.dso > num(s.default_payment_terms_days) + 15) {
    out.push({
      id: "dso",
      severity: "warning",
      category: "Receivables",
      title: `Days Sales Outstanding is ${Math.round(summary.dso)} days`,
      detail: `That is well beyond your ${num(s.default_payment_terms_days)}-day terms. Invoice on the same day each period, include the PO number, and follow up a week before the due date.`,
      action: { label: "Open AR aging", href: "/finance/tracker?tab=overview" },
    });
  }

  // --- Unbilled work & draft invoices -------------------------------------
  if (summary.unbilledValue > 0) {
    out.push({
      id: "unbilled",
      severity: summary.unbilledValue > 10000 ? "critical" : "warning",
      category: "Cash",
      title: `${formatCurrency(summary.unbilledValue)} of logged time hasn't been invoiced`,
      detail: `${summary.unbilledHours.toLocaleString()} hours are waiting. Every day they sit unbilled pushes cash out by a day.`,
      action: { label: "Invoice logged hours", href: "/finance/tracker?tab=hours" },
      impact: summary.unbilledValue,
    });
  }
  const weekAgo = addDaysISO(todayStr, -7);
  const staleDrafts = data.invoices.filter((i) => i.status === "Draft" && i.issue_date <= weekAgo);
  if (staleDrafts.length) {
    const value = staleDrafts.reduce((t, i) => t + num(i.total), 0);
    out.push({
      id: "drafts",
      severity: "warning",
      category: "Cash",
      title: `${staleDrafts.length} draft invoice${staleDrafts.length === 1 ? " has" : "s have"} not been sent`,
      detail: `${formatCurrency(value)} can't be collected until it's sent. Review and mark them Sent.`,
      action: { label: "Open invoices", href: "/finance/invoices" },
      impact: value,
    });
  }

  // --- Cash & runway -------------------------------------------------------
  if (summary.cashEstimate === null) {
    out.push({
      id: "cash-unknown",
      severity: "info",
      category: "Cash",
      title: "Set an opening cash balance to unlock runway and cash forecasts",
      detail: "Enter your bank balance and the date it was true. The tracker rolls it forward with every payment and expense.",
      action: { label: "Finance settings", href: "/finance/tracker?tab=settings" },
    });
  } else if (summary.runwayMonths !== null && summary.runwayMonths < num(s.min_cash_runway_months)) {
    out.push({
      id: "runway",
      severity: "critical",
      category: "Cash",
      title: `Cash runway is about ${summary.runwayMonths.toFixed(1)} months`,
      detail: `Below your ${num(s.min_cash_runway_months)}-month minimum. Prioritise collections, delay discretionary spend, and consider a line of credit before payroll gets tight.`,
      action: { label: "See forecast", href: "/finance/tracker?tab=forecast" },
    });
  }
  if (forecast?.lowestCash && forecast.startingCash !== null && forecast.lowestCash.value < 0) {
    out.push({
      id: "cash-negative",
      severity: "critical",
      category: "Cash",
      title: `Forecast cash goes negative in ${monthLabel(forecast.lowestCash.key, "long")}`,
      detail: `Projected low point ${formatCurrency(forecast.lowestCash.value)}. Payroll for contractors is due before agencies pay — plan funding now.`,
      action: { label: "See forecast", href: "/finance/tracker?tab=forecast" },
      impact: Math.abs(forecast.lowestCash.value),
    });
  }

  // --- Margin --------------------------------------------------------------
  const target = num(s.target_gross_margin_pct);
  const active = data.placements.filter((p) => p.status === "Active");
  const lowMargin = active
    .map((p) => ({ p, m: placementMetrics(p, data.hours, todayStr) }))
    .filter(({ m }) => m.bill_rate > 0 && m.margin_pct < target);
  const negative = lowMargin.filter(({ m }) => m.spread < 0);
  if (negative.length) {
    out.push({
      id: "neg-spread",
      severity: "critical",
      category: "Margin",
      title: `${negative.length} placement${negative.length === 1 ? " loses" : "s lose"} money every hour`,
      detail: negative
        .map(({ p, m }) => `${p.contractors?.full_name || p.role_title}: bill $${m.bill_rate.toFixed(2)} vs loaded cost $${m.loaded_cost.toFixed(2)}`)
        .join(" · "),
      action: { label: "Fix placements", href: "/finance/tracker?tab=placements" },
    });
  }
  const thin = lowMargin.filter(({ m }) => m.spread >= 0);
  if (thin.length) {
    const gap = thin.reduce((t, { m }) => t + ((target - m.margin_pct) / 100) * m.annual_revenue, 0);
    out.push({
      id: "thin-margin",
      severity: "warning",
      category: "Margin",
      title: `${thin.length} placement${thin.length === 1 ? " is" : "s are"} below your ${target}% target margin`,
      detail: `Closing the gap is worth about ${formatCurrency(gap)} a year. Use the Rate Calculator to price renewals, or review burden assumptions.`,
      action: { label: "Open rate calculator", href: "/finance/tracker?tab=tools" },
      impact: gap,
    });
  }
  if (summary.blendedMarginPct !== null && summary.blendedMarginPct >= target && active.length) {
    out.push({
      id: "margin-ok",
      severity: "positive",
      category: "Margin",
      title: `Blended placement margin is ${summary.blendedMarginPct.toFixed(1)}%`,
      detail: `At or above your ${target}% target across ${active.length} active placement${active.length === 1 ? "" : "s"}.`,
    });
  }

  // --- Placements ending ---------------------------------------------------
  const soon = active.filter((p) => {
    const end = parseDate(p.end_date);
    return end && daysBetween(today, end) <= 60;
  });
  if (soon.length) {
    const atRisk = soon.reduce((t, p) => t + placementMetrics(p, [], todayStr).monthly_profit, 0);
    out.push({
      id: "ending",
      severity: soon.some((p) => daysBetween(today, parseDate(p.end_date)!) <= 30) ? "warning" : "info",
      category: "Growth",
      title: `${soon.length} placement${soon.length === 1 ? " ends" : "s end"} within 60 days`,
      detail: `${formatCurrency(atRisk)} / month of gross profit depends on extensions. Ask the agency about renewal now and line up the next role for each consultant.`,
      action: { label: "View placements", href: "/finance/tracker?tab=placements" },
      impact: atRisk * 3,
    });
  }

  // --- Concentration -------------------------------------------------------
  const top = summary.revenueByAccount[0];
  const warnAt = num(s.concentration_warning_pct);
  if (top && summary.revenueByAccount.length >= 1 && top.share >= warnAt) {
    out.push({
      id: "concentration",
      severity: top.share >= Math.max(60, warnAt + 20) ? "critical" : "warning",
      category: "Risk",
      title: `${top.name} is ${top.share.toFixed(0)}% of revenue`,
      detail: "Heavy reliance on one agency means one budget cut or contract change hits hard. Grow a second and third anchor account through the pipeline.",
      action: { label: "Open pipeline", href: "/pipeline" },
    });
  }

  // --- Revenue target & pipeline coverage ----------------------------------
  if (summary.revenueTarget > 0 && summary.targetProgressPct !== null && summary.targetPacePct !== null) {
    const behind = summary.targetPacePct - summary.targetProgressPct;
    if (behind > 10) {
      out.push({
        id: "target-behind",
        severity: "warning",
        category: "Growth",
        title: `Behind revenue target pace by ${behind.toFixed(0)} points`,
        detail: `Collected ${summary.targetProgressPct.toFixed(summary.targetProgressPct < 10 ? 1 : 0)}% of the ${formatCurrency(summary.revenueTarget)} target vs ${summary.targetPacePct.toFixed(0)}% of the year elapsed.`,
        action: { label: "See forecast", href: "/finance/tracker?tab=forecast" },
      });
    } else {
      out.push({
        id: "target-ok",
        severity: "positive",
        category: "Growth",
        title: `On pace for the ${formatCurrency(summary.revenueTarget)} revenue target`,
        detail: `${summary.targetProgressPct.toFixed(0)}% collected with ${summary.targetPacePct.toFixed(0)}% of the year elapsed.`,
      });
    }
    const gap = Math.max(0, summary.revenueTarget - summary.collectedYTD);
    if (gap > 0) {
      const coverage = summary.weightedPipeline / gap;
      if (coverage < 1) {
        out.push({
          id: "coverage",
          severity: "warning",
          category: "Growth",
          title: `Weighted pipeline covers ${(coverage * 100).toFixed(0)}% of the remaining target`,
          detail: `${formatCurrency(gap)} still to collect this fiscal year vs ${formatCurrency(summary.weightedPipeline)} weighted pipeline. Aim for 3x coverage.`,
          action: { label: "Open pipeline", href: "/pipeline" },
        });
      }
    }
  } else {
    out.push({
      id: "no-target",
      severity: "info",
      category: "Growth",
      title: "Set an annual revenue target",
      detail: "With a target, the tracker shows pace, pipeline coverage and how far ahead or behind you are.",
      action: { label: "Finance settings", href: "/finance/tracker?tab=settings" },
    });
  }

  // --- Budgets ---------------------------------------------------------------
  const over = summary.budgetStatus.filter((b) => b.budget > 0 && b.actual > b.budget);
  if (over.length) {
    out.push({
      id: "budget-over",
      severity: "warning",
      category: "Operations",
      title: `${over.length} budget categor${over.length === 1 ? "y is" : "ies are"} over this month`,
      detail: over.map((b) => `${b.category}: ${formatCurrency(b.actual)} of ${formatCurrency(b.budget)}`).join(" · "),
      action: { label: "Open budgets", href: "/finance/tracker?tab=budgets" },
    });
  }

  // --- Tax --------------------------------------------------------------------
  if (summary.taxReserveSuggested > 0) {
    out.push({
      id: "tax",
      severity: "info",
      category: "Tax",
      title: `Set aside about ${formatCurrency(summary.taxReserveSuggested)} for taxes`,
      detail: `${num(s.tax_reserve_pct)}% of year-to-date net profit (${formatCurrency(summary.netYTD)}). Move it to a separate account and confirm the rate and estimated-payment dates with your CPA.`,
    });
  }

  // --- Operations / data quality -------------------------------------------
  const billingGap = data.engagements.filter(
    (e) => e.status === "In Progress" && num(e.contract_value) > 0 && !data.invoices.some((i) => i.engagement_id === e.id)
  );
  if (billingGap.length) {
    out.push({
      id: "no-billing",
      severity: "warning",
      category: "Operations",
      title: `${billingGap.length} active engagement${billingGap.length === 1 ? " has" : "s have"} no invoices yet`,
      detail: billingGap.map((e) => e.name).slice(0, 4).join(", ") + (billingGap.length > 4 ? "…" : "") + ". Confirm the billing schedule and raise the first invoice.",
      action: { label: "Create invoice", href: "/finance/invoices/new" },
      impact: billingGap.reduce((t, e) => t + num(e.contract_value), 0),
    });
  }
  const noReceipt = data.expenses.filter((e) => num(e.amount) >= 75 && !e.receipt_url);
  if (noReceipt.length) {
    out.push({
      id: "receipts",
      severity: "info",
      category: "Data quality",
      title: `${noReceipt.length} expense${noReceipt.length === 1 ? "" : "s"} of $75+ ${noReceipt.length === 1 ? "has" : "have"} no receipt`,
      detail: "Attach receipts so deductions are documented if you are ever asked to support them.",
      action: { label: "Open expenses", href: "/finance/expenses" },
    });
  }
  const staffAug = data.engagements.filter((e) => (e.engagement_type || "").toLowerCase().includes("staff"));
  const missingValue = staffAug.filter((e) => !num(e.contract_value));
  if (missingValue.length) {
    out.push({
      id: "missing-contract-value",
      severity: "info",
      category: "Data quality",
      title: `${missingValue.length} of ${staffAug.length} staff-aug engagements have no contract value`,
      detail: "Add contract values (or create placements with bill/pay rates) so historical revenue, margin by agency and forecasts are complete.",
      action: { label: "Open engagements", href: "/engagements" },
    });
  }
  const staffAugActive = staffAug.filter((e) => e.status === "In Progress");
  const unplaced = staffAugActive.filter((e) => !data.placements.some((p) => p.engagement_id === e.id));
  if (data.placements.length === 0 || unplaced.length) {
    out.push({
      id: "placements-missing",
      severity: data.placements.length === 0 ? "warning" : "info",
      category: "Data quality",
      title:
        data.placements.length === 0
          ? "Add your active placements to turn on margin tracking"
          : `${unplaced.length} active staff-aug engagement${unplaced.length === 1 ? " has" : "s have"} no placement record`,
      detail: "A placement captures the bill rate, pay rate, burden and hours for one consultant. It drives margin, forecasts, invoices and contractor pay automatically.",
      action: { label: "Add a placement", href: "/finance/tracker?tab=placements" },
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (b.impact || 0) - (a.impact || 0));
}
