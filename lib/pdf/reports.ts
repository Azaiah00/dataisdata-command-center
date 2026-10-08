"use client";

import { BrandedPdf, BRAND, pdfDateStamp, type Kpi } from "./branded";
import { formatCurrency, formatDate, num } from "@/lib/utils";
import type { FinanceData } from "@/lib/finance/data";
import type { FinanceSummary } from "@/lib/finance/summary";
import type { ForecastResult } from "@/lib/finance/forecast";
import type { Insight } from "@/lib/finance/insights";
import { placementMetrics, resolveRecordFields, formatByType, fieldFormat } from "@/lib/finance/calc";
import { monthLabel } from "@/lib/finance/dates";

const money = (n: number) => formatCurrency(n);
const compact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);

/* -------------------------------------------------------------------------- */
/*  Generic list export — used by every list page                             */
/* -------------------------------------------------------------------------- */

export async function exportListPdf(opts: {
  title: string;
  subtitle?: string;
  preparedBy?: string;
  kpis?: Kpi[];
  columns: string[];
  rows: (string | number)[][];
  alignRight?: number[];
  foot?: (string | number)[][];
  landscape?: boolean;
  filename: string;
  notes?: string[];
}) {
  const pdf = await BrandedPdf.create({
    title: opts.title,
    subtitle: opts.subtitle,
    preparedBy: opts.preparedBy,
    orientation: opts.landscape || opts.columns.length > 6 ? "landscape" : "portrait",
  });
  if (opts.kpis?.length) pdf.kpis(opts.kpis);
  pdf.table({ head: opts.columns, body: opts.rows, alignRight: opts.alignRight, foot: opts.foot });
  opts.notes?.forEach((n) => pdf.paragraph(n, { size: 8, color: BRAND.muted }));
  pdf.save(`${opts.filename}-${pdfDateStamp()}`);
}

/* -------------------------------------------------------------------------- */
/*  Invoice                                                                    */
/* -------------------------------------------------------------------------- */

export async function exportInvoicePdf(opts: {
  invoice: {
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    subtotal: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    payment_terms_days?: number | null;
  };
  accountName: string;
  engagementName?: string | null;
  lines: { description: string; quantity: number; unit_price: number; amount: number }[];
  payments: { amount: number; payment_date: string; payment_method: string; reference_number: string | null }[];
  preparedBy?: string;
}) {
  const { invoice } = opts;
  const pdf = await BrandedPdf.create({
    title: `Invoice ${invoice.invoice_number}`,
    subtitle: `${invoice.status} · Issued ${formatDate(invoice.issue_date)}`,
    preparedBy: opts.preparedBy,
    confidential: false,
    clientFacing: true,
  });
  const d = pdf.doc;
  const half = pdf.contentWidth / 2;

  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(...BRAND.muted);
  d.text("BILL TO", pdf.margin, pdf.y);
  d.text("INVOICE DETAILS", pdf.margin + half + 10, pdf.y);
  d.setFontSize(12);
  d.setTextColor(...BRAND.ink);
  d.text(d.splitTextToSize(opts.accountName, half - 10), pdf.margin, pdf.y + 16);
  if (opts.engagementName) {
    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    d.setTextColor(...BRAND.muted);
    d.text(d.splitTextToSize(`Engagement: ${opts.engagementName}`, half - 10), pdf.margin, pdf.y + 32);
  }
  const details: [string, string][] = [
    ["Invoice #", invoice.invoice_number],
    ["Issue date", formatDate(invoice.issue_date)],
    ["Due date", invoice.due_date ? formatDate(invoice.due_date) : "Upon receipt"],
    ["Terms", invoice.payment_terms_days ? `Net ${invoice.payment_terms_days}` : invoice.due_date ? "See due date" : "Due on receipt"],
  ];
  d.setFontSize(9);
  details.forEach(([k, v], i) => {
    const yy = pdf.y + 16 + i * 14;
    d.setFont("helvetica", "normal");
    d.setTextColor(...BRAND.muted);
    d.text(k, pdf.margin + half + 10, yy);
    d.setFont("helvetica", "bold");
    d.setTextColor(...BRAND.ink);
    d.text(v, pdf.margin + pdf.contentWidth, yy, { align: "right" });
  });
  pdf.y += 16 + details.length * 14 + 16;

  pdf.table({
    head: ["Description", "Qty", "Unit price", "Amount"],
    body: opts.lines.map((l) => [l.description, String(num(l.quantity)), money(num(l.unit_price)), money(num(l.amount))]),
    alignRight: [1, 2, 3],
    columnStyles: { 0: { cellWidth: pdf.contentWidth * 0.52 } },
  });

  const paid = opts.payments.reduce((t, p) => t + num(p.amount), 0);
  const balance = num(invoice.total) - paid;
  const boxX = pdf.margin + pdf.contentWidth * 0.5;
  const rows: [string, string, boolean][] = [
    ["Subtotal", money(num(invoice.subtotal)), false],
    ["Tax", money(num(invoice.tax_amount)), false],
    ["Total", money(num(invoice.total)), true],
    ["Payments received", `- ${money(paid)}`, false],
  ];
  pdf.ensureSpace(rows.length * 16 + 50);
  rows.forEach(([k, v, bold]) => {
    d.setFont("helvetica", bold ? "bold" : "normal");
    d.setFontSize(9.5);
    d.setTextColor(...(bold ? BRAND.ink : BRAND.muted));
    d.text(k, boxX, pdf.y);
    d.setTextColor(...BRAND.ink);
    d.text(v, pdf.margin + pdf.contentWidth, pdf.y, { align: "right" });
    pdf.y += 16;
  });
  d.setFillColor(...BRAND.primary);
  d.roundedRect(boxX - 8, pdf.y - 6, pdf.contentWidth * 0.5 + 8, 30, 5, 5, "F");
  d.setTextColor(255, 255, 255);
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.text("Balance due", boxX + 2, pdf.y + 13);
  d.text(money(balance), pdf.margin + pdf.contentWidth - 8, pdf.y + 13, { align: "right" });
  pdf.y += 48;

  if (opts.payments.length) {
    pdf.heading("Payment history");
    pdf.table({
      head: ["Date", "Method", "Reference", "Amount"],
      body: opts.payments.map((p) => [formatDate(p.payment_date), p.payment_method, p.reference_number || "—", money(num(p.amount))]),
      alignRight: [3],
    });
  }
  if (invoice.notes) {
    pdf.heading("Notes");
    pdf.paragraph(invoice.notes);
  }
  pdf.paragraph("Thank you for your business. Please reference the invoice number with your payment.", { size: 9, color: BRAND.muted });
  pdf.save(`DataIsData-${invoice.invoice_number}`);
}

/* -------------------------------------------------------------------------- */
/*  Profit & Loss                                                              */
/* -------------------------------------------------------------------------- */

export async function exportPnlPdf(opts: {
  rangeLabel: string;
  totalInvoiced: number;
  totalCollected: number;
  otherIncome: number;
  expensesByCategory: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
  engagements: { name: string; revenue: number; expenses: number; profit: number }[];
  preparedBy?: string;
}) {
  const pdf = await BrandedPdf.create({ title: "Profit & Loss Statement", subtitle: opts.rangeLabel, preparedBy: opts.preparedBy });
  const revenue = opts.totalCollected + opts.otherIncome;
  pdf.kpis([
    { label: "Revenue (cash)", value: money(revenue) },
    { label: "Expenses", value: money(opts.totalExpenses) },
    { label: "Net profit", value: money(opts.netProfit), tone: opts.netProfit >= 0 ? "good" : "bad" },
    { label: "Net margin", value: revenue > 0 ? `${((opts.netProfit / revenue) * 100).toFixed(1)}%` : "—" },
  ]);
  pdf.heading("Revenue");
  pdf.keyValue([
    ["Invoiced in period", money(opts.totalInvoiced)],
    ["Collected from invoices", money(opts.totalCollected)],
    ["Other income", money(opts.otherIncome)],
    ["Total revenue (cash basis)", money(revenue)],
  ], { boldLast: true });
  pdf.heading("Expenses");
  pdf.keyValue([...opts.expensesByCategory.map((c) => [c.category, money(c.total)] as [string, string]), ["Total expenses", money(opts.totalExpenses)]], {
    boldLast: true,
  });
  pdf.heading("Net result");
  pdf.keyValue([["Net profit / (loss)", money(opts.netProfit)]], { boldLast: true });
  if (opts.engagements.length) {
    pdf.heading("Profitability by engagement");
    pdf.table({
      head: ["Engagement", "Revenue", "Expenses", "Profit", "Margin"],
      body: opts.engagements.map((e) => [
        e.name,
        money(e.revenue),
        money(e.expenses),
        money(e.profit),
        e.revenue > 0 ? `${((e.profit / e.revenue) * 100).toFixed(1)}%` : "—",
      ]),
      alignRight: [1, 2, 3, 4],
    });
  }
  pdf.paragraph("Cash basis: revenue is recognised when payments are received; expenses on their expense date.", { size: 8, color: BRAND.muted });
  pdf.save(`DataIsData-PnL-${opts.rangeLabel.replace(/\s+/g, "-")}`);
}

/* -------------------------------------------------------------------------- */
/*  Finance Tracker full report                                               */
/* -------------------------------------------------------------------------- */

export async function exportTrackerReportPdf(opts: {
  data: FinanceData;
  summary: FinanceSummary;
  forecast: ForecastResult;
  insights: Insight[];
  preparedBy?: string;
  sections?: { overview?: boolean; placements?: boolean; forecast?: boolean; insights?: boolean; ar?: boolean; budgets?: boolean };
}) {
  const { data, summary, forecast, insights } = opts;
  const sec = { overview: true, placements: true, forecast: true, insights: true, ar: true, budgets: true, ...(opts.sections || {}) };
  const pdf = await BrandedPdf.create({
    title: "Finance Tracker Report",
    subtitle: `Fiscal year from ${formatDate(summary.fyStart)} · as of ${formatDate(summary.today)}`,
    preparedBy: opts.preparedBy,
  });

  if (sec.overview) {
    pdf.heading("Executive summary");
    pdf.kpis([
      { label: "Collected YTD", value: compact(summary.collectedYTD), sub: `${compact(summary.invoicedYTD)} invoiced` },
      { label: "Expenses YTD", value: compact(summary.expensesYTD) },
      { label: "Net profit YTD", value: compact(summary.netYTD), tone: summary.netYTD >= 0 ? "good" : "bad", sub: summary.netMarginYTD !== null ? `${summary.netMarginYTD.toFixed(1)}% margin` : undefined },
      { label: "Receivables", value: compact(summary.arOutstanding), sub: summary.dso !== null ? `DSO ${Math.round(summary.dso)} days` : undefined, tone: summary.aging.d61_90 + summary.aging.d90_plus > 0 ? "warn" : "default" },
      { label: "Monthly run-rate", value: compact(summary.monthlyRunRateRevenue), sub: `${summary.activePlacements} active placements` },
      { label: "Run-rate gross profit", value: compact(summary.monthlyRunRateProfit), sub: summary.blendedMarginPct !== null ? `${summary.blendedMarginPct.toFixed(1)}% blended margin` : undefined },
      { label: "Cash estimate", value: summary.cashEstimate === null ? "Not set" : compact(summary.cashEstimate), sub: summary.runwayMonths !== null ? `${summary.runwayMonths.toFixed(1)} months runway` : undefined },
      { label: "Tax set-aside", value: compact(summary.taxReserveSuggested), sub: `${data.settings.tax_reserve_pct}% of YTD net` },
    ]);
    pdf.heading("Last 12 months", "Cash collected vs expenses by month");
    pdf.barChart({
      labels: summary.history.map((h) => monthLabel(h.key)),
      series: [
        { name: "Collected", values: summary.history.map((h) => h.collected), color: BRAND.bright },
        { name: "Expenses", values: summary.history.map((h) => h.expenses), color: [194, 97, 12] },
      ],
      line: { name: "Net", values: summary.history.map((h) => h.net), color: BRAND.dark },
      format: compact,
    });
  }

  if (sec.insights && insights.length) {
    pdf.heading("Advice & alerts", "Generated from live portal data. Guidance only — confirm tax and legal matters with your CPA or attorney.");
    pdf.insights(insights);
  }

  if (sec.forecast) {
    pdf.heading(`${forecast.months.length}-month forecast`, "Committed placements + fixed-fee engagements + weighted pipeline, less direct cost and overhead");
    pdf.barChart({
      labels: forecast.months.map((m) => monthLabel(m.key)),
      series: [
        { name: "Committed revenue", values: forecast.months.map((m) => m.placementRevenue + m.advisoryRevenue), color: BRAND.bright },
        { name: "Weighted pipeline", values: forecast.months.map((m) => m.pipelineRevenue), color: [79, 111, 209] },
        { name: "Total cost", values: forecast.months.map((m) => m.directCost + m.overhead), color: [194, 97, 12] },
      ],
      line: { name: "Net profit", values: forecast.months.map((m) => m.netProfit), color: BRAND.dark },
      format: compact,
    });
    pdf.table({
      head: ["Month", "Revenue", "Pipeline", "Direct cost", "Overhead", "Net profit", "Cash (end)"],
      body: forecast.months.map((m) => [
        monthLabel(m.key, "long"),
        money(m.revenue),
        money(m.pipelineRevenue),
        money(m.directCost),
        money(m.overhead),
        money(m.netProfit),
        money(m.cumulativeCash),
      ]),
      foot: [["Total", money(forecast.totals.revenue), money(forecast.totals.pipelineRevenue), money(forecast.totals.directCost), money(forecast.totals.overhead), money(forecast.totals.netProfit), ""]],
      alignRight: [1, 2, 3, 4, 5, 6],
      fontSize: 7.5,
    });
    pdf.heading("Forecast assumptions");
    forecast.assumptions.forEach((a) => pdf.paragraph(`• ${a}`, { size: 8.5, color: BRAND.muted }));
  }

  if (sec.placements) {
    const fields = data.customFields.filter((f) => f.is_active && f.entity === "placement" && f.show_in_reports);
    pdf.heading("Placements", "Bill rate, loaded cost and margin for every placement");
    pdf.table({
      head: ["Consultant / role", "Agency", "Status", "Bill", "Loaded cost", "Spread", "Margin", "Monthly GP", ...fields.map((f) => f.label)],
      body: data.placements.map((p) => {
        const m = placementMetrics(p, data.hours, summary.today);
        const vars = resolveRecordFields(m as unknown as Record<string, number>, data.customFields.filter((f) => f.entity === "placement"), p.custom_fields);
        return [
          `${p.contractors?.full_name || "Unassigned"}\n${p.role_title}`,
          p.accounts?.name || "—",
          p.status,
          money(m.bill_rate),
          money(m.loaded_cost),
          money(m.spread),
          `${m.margin_pct.toFixed(1)}%`,
          money(m.monthly_profit),
          ...fields.map((f) => formatByType(f.field_type === "formula" || ["number", "currency", "percent"].includes(f.field_type) ? vars[f.field_key] : p.custom_fields?.[f.field_key], fieldFormat(f))),
        ];
      }),
      alignRight: [3, 4, 5, 6, 7],
      fontSize: 7.5,
    });
  }

  if (sec.ar) {
    pdf.heading("Accounts receivable aging");
    pdf.kpis(
      [
        { label: "Current", value: compact(summary.aging.current) },
        { label: "1–30 days", value: compact(summary.aging.d1_30), tone: summary.aging.d1_30 ? "warn" : "default" },
        { label: "31–60 days", value: compact(summary.aging.d31_60), tone: summary.aging.d31_60 ? "warn" : "default" },
        { label: "61–90 days", value: compact(summary.aging.d61_90), tone: summary.aging.d61_90 ? "bad" : "default" },
        { label: "90+ days", value: compact(summary.aging.d90_plus), tone: summary.aging.d90_plus ? "bad" : "default" },
      ],
      5
    );
    if (summary.openInvoices.length) {
      pdf.table({
        head: ["Invoice", "Account", "Due", "Days late", "Total", "Paid", "Balance"],
        body: summary.openInvoices.map((i) => [i.invoice_number, i.account, i.due_date ? formatDate(i.due_date) : "—", String(i.days_past_due), money(i.total), money(i.paid), money(i.balance)]),
        alignRight: [3, 4, 5, 6],
      });
    }
  }

  if (sec.budgets && summary.budgetStatus.length) {
    pdf.heading("Budgets this month");
    pdf.table({
      head: ["Category", "Budget", "Actual", "Used"],
      body: summary.budgetStatus.map((b) => [b.category, money(b.budget), money(b.actual), `${b.pct.toFixed(0)}%`]),
      alignRight: [1, 2, 3],
    });
  }

  if (summary.revenueByAccount.length) {
    pdf.heading("Revenue by agency", "Trailing 12 months of cash collected (or active run-rate when no payments are recorded yet)");
    pdf.table({
      head: ["Account", "Amount", "Share"],
      body: summary.revenueByAccount.slice(0, 12).map((r) => [r.name, money(r.amount), `${r.share.toFixed(1)}%`]),
      alignRight: [1, 2],
    });
  }

  pdf.save("DataIsData-Finance-Tracker-Report");
}

/* -------------------------------------------------------------------------- */
/*  Seats & permissions report (admin)                                         */
/* -------------------------------------------------------------------------- */

export async function exportAccessReportPdf(opts: {
  users: { full_name: string; email: string | null; role: string; status: string; scope: string; access: string[] }[];
  preparedBy?: string;
}) {
  const pdf = await BrandedPdf.create({ title: "Seats & Access Report", subtitle: `${opts.users.length} seats`, preparedBy: opts.preparedBy });
  pdf.table({
    head: ["Name", "Email", "Role", "Status", "Record scope"],
    body: opts.users.map((u) => [u.full_name, u.email || "—", u.role, u.status, u.scope]),
  });
  opts.users.forEach((u) => {
    pdf.heading(u.full_name, `${u.role} · ${u.status} · ${u.scope}`);
    pdf.paragraph(u.access.length ? u.access.join("\n") : "No modules enabled.", { size: 8.5 });
  });
  pdf.save("DataIsData-Seats-and-Access");
}
