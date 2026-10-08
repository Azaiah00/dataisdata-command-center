import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window === "undefined") {
    console.warn("Supabase credentials missing. Check .env.local");
  }
}

/**
 * Unscoped client. Only used by the access layer (users, permissions, scope
 * resolution). Application pages must import `supabase` below instead so that
 * record scoping is applied automatically.
 */
export const supabaseRaw = createClient(supabaseUrl, supabaseAnonKey);

/* -------------------------------------------------------------------------- */
/*  Record scoping                                                            */
/* -------------------------------------------------------------------------- */

/**
 * When a user is limited to specific accounts (e.g. John = DMAS only), every
 * read/update/delete against account-linked tables is automatically filtered
 * to records that belong to those accounts. Pages keep calling
 * `supabase.from("engagements").select(...)` exactly as before.
 *
 * This is the client-side layer used during the demo-login phase. Once Google
 * sign-in is live, the same rules are enforced in Postgres by the RLS policies
 * in supabase/2026-10-phase2-google-auth-rls.sql.
 */
export interface DataScope {
  active: boolean;
  accountIds: string[];
  engagementIds: string[];
  invoiceIds: string[];
  contactIds: string[];
  contractorIds: string[];
  opportunityIds: string[];
  activityIds: string[];
  placementIds: string[];
}

export const EMPTY_SCOPE: DataScope = {
  active: false,
  accountIds: [],
  engagementIds: [],
  invoiceIds: [],
  contactIds: [],
  contractorIds: [],
  opportunityIds: [],
  activityIds: [],
  placementIds: [],
};

let currentScope: DataScope = EMPTY_SCOPE;
let onScopedMutation: (() => Promise<void>) | null = null;

export function setDataScope(scope: DataScope, onMutation?: () => Promise<void>) {
  currentScope = scope;
  onScopedMutation = onMutation || null;
}

export function getDataScope(): DataScope {
  return currentScope;
}

const NO_MATCH = "00000000-0000-0000-0000-000000000000";
const ids = (list: string[]) => (list.length ? list : [NO_MATCH]);
const inList = (list: string[]) => `(${ids(list).join(",")})`;
const arr = (list: string[]) => `{${ids(list).join(",")}}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyScope(builder: any, table: string): any {
  const s = currentScope;
  if (!s.active || !builder) return builder;
  switch (table) {
    case "accounts":
      return builder.in("id", ids(s.accountIds));
    case "contacts":
      return builder.or(`account_id.in.${inList(s.accountIds)},id.in.${inList(s.contactIds)}`);
    case "account_contacts":
      return builder.in("account_id", ids(s.accountIds));
    case "engagements":
    case "activities":
    case "invoices":
    case "placements":
    case "income_entries":
    case "client_intakes":
    case "innovation_maturity_snapshots":
      return builder.in("account_id", ids(s.accountIds));
    case "opportunities":
      return builder.or(`account_id.in.${inList(s.accountIds)},related_account_ids.ov.${arr(s.accountIds)}`);
    case "opportunity_partners":
      return builder.in("opportunity_id", ids(s.opportunityIds));
    case "activity_contacts":
      return builder.in("activity_id", ids(s.activityIds));
    case "engagement_contractors":
    case "engagement_contacts":
    case "engagement_partners":
      return builder.in("engagement_id", ids(s.engagementIds));
    case "contractors":
      return builder.in("id", ids(s.contractorIds));
    case "invoice_line_items":
    case "payments":
      return builder.in("invoice_id", ids(s.invoiceIds));
    case "expenses":
      return builder.or(`account_id.in.${inList(s.accountIds)},engagement_id.in.${inList(s.engagementIds)}`);
    case "placement_hours":
      return builder.in("placement_id", ids(s.placementIds));
    default:
      return builder;
  }
}

/** After a scoped user creates/edits something, refresh their scope so new records stay visible. */
function trackMutation(builder: any): any {
  if (!currentScope.active || !builder || typeof builder !== "object") return builder;
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: any, reject: any) =>
          target
            .then(async (value: any) => {
              try {
                if (onScopedMutation) await onScopedMutation();
              } catch {
                /* scope refresh is best-effort */
              }
              return value;
            })
            .then(resolve, reject);
      }
      const value = Reflect.get(target, prop, target);
      if (typeof value === "function") {
        return (...args: any[]) => {
          const result = value.apply(target, args);
          return result && typeof result === "object" && "then" in result ? trackMutation(result) : result;
        };
      }
      return value;
    },
  });
}

function wrapQueryBuilder(qb: any, table: string): any {
  return new Proxy(qb, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;
      if (prop === "select") {
        return (...args: any[]) => applyScope(value.apply(target, args), table);
      }
      if (prop === "update" || prop === "delete") {
        return (...args: any[]) => trackMutation(applyScope(value.apply(target, args), table));
      }
      if (prop === "insert" || prop === "upsert") {
        return (...args: any[]) => trackMutation(value.apply(target, args));
      }
      return value.bind(target);
    },
  });
}

export const supabase: typeof supabaseRaw = new Proxy(supabaseRaw, {
  get(target, prop) {
    if (prop === "from") {
      return (table: string) => wrapQueryBuilder(target.from(table), table);
    }
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */
