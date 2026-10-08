export type PlacementStatus = "Pending" | "Active" | "On Hold" | "Ended";
export type PayType = "W2" | "1099" | "C2C";
export type Recurrence = "none" | "monthly" | "quarterly" | "annual";
export type CustomEntity = "placement" | "expense" | "invoice" | "income";
export type CustomFieldType = "number" | "currency" | "percent" | "text" | "date" | "select" | "formula";
export type ResultFormat = "number" | "currency" | "percent";
export type Aggregate = "none" | "sum" | "avg" | "min" | "max";

export const PLACEMENT_STATUSES: PlacementStatus[] = ["Pending", "Active", "On Hold", "Ended"];
export const PAY_TYPES: PayType[] = ["W2", "1099", "C2C"];
export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];
export const INCOME_CATEGORIES = ["Grant", "Reimbursement", "Interest", "Owner Contribution", "Referral Fee", "Other Income"] as const;

export interface FinanceSettings {
  fiscal_year_start_month: number;
  annual_revenue_target: number;
  target_gross_margin_pct: number;
  target_net_margin_pct: number;
  tax_reserve_pct: number;
  default_burden_pct: number;
  default_payment_terms_days: number;
  min_cash_runway_months: number;
  opening_cash_balance: number;
  opening_cash_as_of: string | null;
  monthly_overhead_estimate: number;
  concentration_warning_pct: number;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  fiscal_year_start_month: 1,
  annual_revenue_target: 0,
  target_gross_margin_pct: 25,
  target_net_margin_pct: 12,
  tax_reserve_pct: 25,
  default_burden_pct: 18,
  default_payment_terms_days: 30,
  min_cash_runway_months: 3,
  opening_cash_balance: 0,
  opening_cash_as_of: null,
  monthly_overhead_estimate: 0,
  concentration_warning_pct: 40,
};

export interface Placement {
  id: string;
  contractor_id: string | null;
  account_id: string | null;
  engagement_id: string | null;
  role_title: string;
  status: PlacementStatus;
  start_date: string | null;
  end_date: string | null;
  bill_rate: number;
  pay_rate: number;
  pay_type: PayType;
  burden_pct: number;
  weekly_hours: number;
  payment_terms_days: number | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  contractors?: { id: string; full_name: string } | null;
  accounts?: { id: string; name: string } | null;
  engagements?: { id: string; name: string } | null;
}

export interface PlacementHours {
  id: string;
  placement_id: string;
  period_start: string;
  period_end: string;
  hours: number;
  bill_rate: number;
  pay_rate: number;
  burden_pct: number;
  invoice_id: string | null;
  expense_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface IncomeEntry {
  id: string;
  income_date: string;
  source: string;
  category: string;
  amount: number;
  account_id: string | null;
  engagement_id: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  accounts?: { name: string } | null;
}

export interface FinanceBudget {
  id: string;
  category: string;
  monthly_amount: number;
  notes: string | null;
}

export interface CustomField {
  id: string;
  entity: CustomEntity;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  formula: string | null;
  result_format: ResultFormat;
  options: string[];
  aggregate: Aggregate;
  show_in_reports: boolean;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** Lightweight rows used by the tracker engines. */
export interface InvoiceRow {
  id: string;
  invoice_number: string;
  account_id: string;
  engagement_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  total: number;
  payment_terms_days?: number | null;
  custom_fields?: Record<string, unknown> | null;
  accounts?: { name: string } | null;
}

export interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
}

export interface ExpenseRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  status: string;
  engagement_id: string | null;
  account_id: string | null;
  contractor_id: string | null;
  receipt_url: string | null;
  recurrence?: string | null;
  vendor?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export interface EngagementRow {
  id: string;
  name: string;
  account_id: string | null;
  engagement_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  budget: number | null;
}

export interface OpportunityRow {
  id: string;
  name: string;
  account_id: string | null;
  stage: string;
  probability_pct: number | null;
  estimated_value: number | null;
  estimated_cost: number | null;
  expected_start: string | null;
  expected_end: string | null;
}

export interface AccountRow {
  id: string;
  name: string;
}
