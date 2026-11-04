import type { ModuleKey } from "@/lib/access/modules";

/** Types stored in portal_trash.entity_type (matches primary table name). */
export type TrashEntityType =
  | "contacts"
  | "accounts"
  | "partners"
  | "contractors"
  | "engagements"
  | "opportunities"
  | "activities"
  | "expenses"
  | "invoices";

export type TrashEntityDef = {
  table: TrashEntityType;
  moduleKey: ModuleKey;
  label: string;
  detailPath: (id: string) => string;
  displayLabel: (row: Record<string, unknown>) => string;
  accountId: (row: Record<string, unknown>) => string | null;
};

export const TRASH_ENTITIES: Record<TrashEntityType, TrashEntityDef> = {
  contacts: {
    table: "contacts",
    moduleKey: "contacts",
    label: "Contact",
    detailPath: (id) => `/contacts/${id}`,
    displayLabel: (r) => String(r.full_name || "Contact"),
    accountId: (r) => (r.account_id as string) || null,
  },
  accounts: {
    table: "accounts",
    moduleKey: "accounts",
    label: "Account",
    detailPath: (id) => `/accounts/${id}`,
    displayLabel: (r) => String(r.name || "Account"),
    accountId: (r) => (r.id as string) || null,
  },
  partners: {
    table: "partners",
    moduleKey: "partners",
    label: "Partner",
    detailPath: (id) => `/partners/${id}`,
    displayLabel: (r) => String(r.name || "Partner"),
    accountId: () => null,
  },
  contractors: {
    table: "contractors",
    moduleKey: "contractors",
    label: "Contractor",
    detailPath: (id) => `/contractors/${id}`,
    displayLabel: (r) => String(r.full_name || "Contractor"),
    accountId: () => null,
  },
  engagements: {
    table: "engagements",
    moduleKey: "engagements",
    label: "Engagement",
    detailPath: (id) => `/engagements/${id}`,
    displayLabel: (r) => String(r.name || "Engagement"),
    accountId: (r) => (r.account_id as string) || null,
  },
  opportunities: {
    table: "opportunities",
    moduleKey: "pipeline",
    label: "Pipeline opportunity",
    detailPath: (id) => `/pipeline/${id}`,
    displayLabel: (r) => String(r.name || "Opportunity"),
    accountId: (r) => (r.account_id as string) || null,
  },
  activities: {
    table: "activities",
    moduleKey: "activities",
    label: "Activity",
    detailPath: (id) => `/activities/${id}`,
    displayLabel: (r) => {
      const summary = String(r.summary || "").trim();
      if (summary) return summary.slice(0, 80);
      return `${r.activity_type || "Activity"} · ${r.date_time ? new Date(String(r.date_time)).toLocaleDateString() : "—"}`;
    },
    accountId: (r) => (r.account_id as string) || null,
  },
  expenses: {
    table: "expenses",
    moduleKey: "expenses",
    label: "Expense",
    detailPath: (id) => `/finance/expenses/${id}`,
    displayLabel: (r) => String(r.description || r.category || "Expense"),
    accountId: (r) => (r.account_id as string) || null,
  },
  invoices: {
    table: "invoices",
    moduleKey: "invoices",
    label: "Invoice",
    detailPath: (id) => `/finance/invoices/${id}`,
    displayLabel: (r) => String(r.invoice_number || "Invoice"),
    accountId: (r) => (r.account_id as string) || null,
  },
};

export const TRASH_ENTITY_LABELS: Record<TrashEntityType, string> = Object.fromEntries(
  Object.entries(TRASH_ENTITIES).map(([k, v]) => [k, v.label])
) as Record<TrashEntityType, string>;

/** Seats, audit log, and portal settings are not soft-deleted through this flow. */
export const TRASH_PROTECTED_TABLES = ["portal_users", "portal_settings", "portal_audit_log", "user_permissions"] as const;
