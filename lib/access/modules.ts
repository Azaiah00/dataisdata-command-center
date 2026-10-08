/**
 * Portal module registry.
 *
 * Every page in the portal belongs to exactly one "module". Permissions are
 * granted per module and per action (view / create / edit / delete). Admin
 * toggles in /admin/users read this registry, the navigation is built from it,
 * and the route guard uses `resolveRoute()` to decide what a URL needs.
 *
 * Adding a new page? Add (or reuse) a module here and the whole portal —
 * nav, guards, admin toggles, search, notifications — picks it up.
 */

export type Action = "view" | "create" | "edit" | "delete";
export const ACTIONS: Action[] = ["view", "create", "edit", "delete"];

export type ModuleKey =
  | "dashboard"
  | "reports"
  | "documents"
  | "accounts"
  | "contacts"
  | "partners"
  | "contractors"
  | "engagements"
  | "activities"
  | "pipeline"
  | "finance_dashboard"
  | "finance_tracker"
  | "invoices"
  | "expenses"
  | "payments"
  | "pnl"
  | "innovation_portfolio"
  | "innovation_maturity"
  | "vendor_inquiries"
  | "vendor_applications"
  | "events"
  | "client_intake";

export type GroupKey = "overview" | "crm" | "work" | "finance" | "innovation";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  group: GroupKey;
  path: string;
  description: string;
  /** Actions that make sense for this module (view is always present). */
  actions: Action[];
  /** True when records in this module belong to accounts and can be limited by an account scope. */
  scopeable: boolean;
  /** Finance data is sensitive — highlighted in the admin UI. */
  sensitive?: boolean;
}

export const GROUPS: { key: GroupKey; label: string; description: string }[] = [
  { key: "overview", label: "Overview", description: "Home dashboard, reports and document library" },
  { key: "crm", label: "CRM", description: "Accounts, contacts, partners and contractors" },
  { key: "work", label: "Work", description: "Engagements, activities and the sales pipeline" },
  { key: "finance", label: "Finance", description: "Money in, money out, tracker and forecasts" },
  { key: "innovation", label: "Innovation", description: "Innovation-as-a-Service operating system" },
];

const CRUD: Action[] = ["view", "create", "edit", "delete"];

export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", group: "overview", path: "/", description: "Home page with KPIs and widgets (widgets only show for modules the user can see)", actions: ["view"], scopeable: true },
  { key: "reports", label: "Reports", group: "overview", path: "/reports", description: "Executive business reports and PDF exports", actions: ["view"], scopeable: true },
  { key: "documents", label: "Documents", group: "overview", path: "/documents", description: "All attachments across engagements, pipeline, partners and activities", actions: ["view"], scopeable: true },

  { key: "accounts", label: "Accounts", group: "crm", path: "/accounts", description: "Agencies, cities, universities and companies", actions: CRUD, scopeable: true },
  { key: "contacts", label: "Contacts", group: "crm", path: "/contacts", description: "People at accounts", actions: CRUD, scopeable: true },
  { key: "partners", label: "Partners", group: "crm", path: "/partners", description: "Primes, subs, vendors and community partners", actions: CRUD, scopeable: false },
  { key: "contractors", label: "Contractors", group: "crm", path: "/contractors", description: "DataIsData consultants and staff-aug talent", actions: CRUD, scopeable: true },

  { key: "engagements", label: "Engagements", group: "work", path: "/engagements", description: "Active and past contracts / placements", actions: CRUD, scopeable: true },
  { key: "activities", label: "Activities", group: "work", path: "/activities", description: "Meetings, calls, emails and site visits", actions: ["view", "create"], scopeable: true },
  { key: "pipeline", label: "Pipeline", group: "work", path: "/pipeline", description: "Opportunities, stages and weighted value", actions: CRUD, scopeable: true },

  { key: "finance_dashboard", label: "Finance Dashboard", group: "finance", path: "/finance", description: "Revenue, AR, expenses and net profit at a glance", actions: ["view"], scopeable: true, sensitive: true },
  { key: "finance_tracker", label: "Finance Tracker", group: "finance", path: "/finance/tracker", description: "Placements, rates, hours, budgets, custom fields, forecasts and advice", actions: CRUD, scopeable: true, sensitive: true },
  { key: "invoices", label: "Invoices", group: "finance", path: "/finance/invoices", description: "Billing to accounts", actions: CRUD, scopeable: true, sensitive: true },
  { key: "expenses", label: "Expenses", group: "finance", path: "/finance/expenses", description: "Costs, contractor pay and overhead", actions: CRUD, scopeable: true, sensitive: true },
  { key: "payments", label: "Payments", group: "finance", path: "/finance/payments", description: "Cash received against invoices", actions: ["view", "create", "delete"], scopeable: true, sensitive: true },
  { key: "pnl", label: "Profit & Loss", group: "finance", path: "/finance/pnl", description: "P&L statement and engagement profitability", actions: ["view"], scopeable: true, sensitive: true },

  { key: "innovation_portfolio", label: "Executive Portfolio", group: "innovation", path: "/innovation", description: "Innovation portfolio overview", actions: ["view"], scopeable: true },
  { key: "innovation_maturity", label: "Maturity Index", group: "innovation", path: "/innovation/maturity", description: "Innovation maturity scoring by account", actions: ["view", "create", "edit"], scopeable: true },
  { key: "vendor_inquiries", label: "Vendor Inquiries", group: "innovation", path: "/innovation/vendor-inquiry", description: "Inbound vendor interest", actions: ["view", "create"], scopeable: false },
  { key: "vendor_applications", label: "Vendor Applications", group: "innovation", path: "/innovation/vendor-application", description: "Vendor vetting and scoring", actions: ["view", "create", "edit"], scopeable: false },
  { key: "events", label: "Events", group: "innovation", path: "/innovation/events", description: "Showcases and innovation events", actions: ["view", "create", "edit"], scopeable: false },
  { key: "client_intake", label: "Client Intake", group: "innovation", path: "/innovation/client-intake", description: "New client intake and readiness", actions: ["view", "create", "edit"], scopeable: true },
];

export const MODULE_MAP: Record<ModuleKey, ModuleDef> = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.key]: m }),
  {} as Record<ModuleKey, ModuleDef>
);

export function modulesInGroup(group: GroupKey): ModuleDef[] {
  return MODULES.filter((m) => m.group === group);
}

export type RouteRequirement =
  | { kind: "module"; module: ModuleKey; action: Action }
  | { kind: "public" } // login / no-access screens
  | { kind: "self" } // own settings — any signed-in user
  | { kind: "admin" }; // seat & permission management

/** Prefix table, most specific first. */
const PREFIXES: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/finance/tracker", module: "finance_tracker" },
  { prefix: "/finance/invoices", module: "invoices" },
  { prefix: "/finance/expenses", module: "expenses" },
  { prefix: "/finance/payments", module: "payments" },
  { prefix: "/finance/pnl", module: "pnl" },
  { prefix: "/finance", module: "finance_dashboard" },
  { prefix: "/innovation/maturity", module: "innovation_maturity" },
  { prefix: "/innovation/vendor-inquiry", module: "vendor_inquiries" },
  { prefix: "/innovation/vendor-application", module: "vendor_applications" },
  { prefix: "/innovation/events", module: "events" },
  { prefix: "/innovation/client-intake", module: "client_intake" },
  { prefix: "/innovation", module: "innovation_portfolio" },
  { prefix: "/accounts", module: "accounts" },
  { prefix: "/contacts", module: "contacts" },
  { prefix: "/partners", module: "partners" },
  { prefix: "/contractors", module: "contractors" },
  { prefix: "/engagements", module: "engagements" },
  { prefix: "/activities", module: "activities" },
  { prefix: "/pipeline", module: "pipeline" },
  { prefix: "/reports", module: "reports" },
  { prefix: "/documents", module: "documents" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Work out which module + action a URL requires. */
export function resolveRoute(pathname: string | null | undefined): RouteRequirement {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (p === "/login" || p === "/no-access") return { kind: "public" };
  if (p === "/settings") return { kind: "self" };
  if (matchesPrefix(p, "/admin")) return { kind: "admin" };
  if (p === "/") return { kind: "module", module: "dashboard", action: "view" };

  for (const { prefix, module } of PREFIXES) {
    if (matchesPrefix(p, prefix)) {
      const rest = p.slice(prefix.length).split("/").filter(Boolean);
      let action: Action = "view";
      if (rest[0] === "new") action = "create";
      else if (rest[1] === "edit") action = "edit";
      // Sub-sections of the tracker are all governed by finance_tracker view;
      // create/edit/delete are checked inside the page per control.
      return { kind: "module", module, action };
    }
  }
  // Unknown route — let Next.js render its 404 but still require sign-in.
  return { kind: "self" };
}
