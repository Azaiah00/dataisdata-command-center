"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { securityTerm } from "@/lib/terms";

/**
 * Engagement classification, from Tony's CRM design notes ("Suggested CRM field structure").
 *
 * Every engagement is described on three separate dimensions, so the CRM never confuses
 * what DataIsData is doing with how the company gets paid:
 *   - Engagement Type         how DataIsData is engaged by the client
 *   - Service / Practice      what DataIsData is delivering
 *   - Revenue / Pricing Model how the engagement generates revenue
 * plus Engagement Status, which is kept separate from the type.
 *
 * Columns (all optional text, added by supabase/2026-11-engagement-classification.sql):
 *   engagements.engagement_type   (already existed; values like "Staff Aug" are kept as-is)
 *   engagements.service_practice
 *   engagements.revenue_model
 *   engagements.engagement_status
 * The existing `status` column (Planned / In Progress / On Hold / Complete) is untouched and is
 * shown as "Delivery Status".
 */

export type Option = { value: string; description: string };

export const ENGAGEMENT_TYPE_OPTIONS: Option[] = [
  { value: "Staff Augmentation", description: "Providing contractors or specialized resources to clients, such as the DMAS engagements." },
  { value: "Advisory", description: "Strategic guidance, executive advisory, fractional CTO/CIO and innovation leadership." },
  { value: "Consulting", description: "Defined professional services: assessments, recommendations, planning or business transformation." },
  { value: "Project-Based", description: "A specific project with defined deliverables, milestones and completion dates." },
  { value: "Managed Services", description: "Ongoing responsibility for managing a client's technology, innovation programs or operations." },
  { value: "Strategic Partnership", description: "Collaborations with companies, universities, municipalities or other organizations to pursue opportunities." },
  { value: "Joint Venture", description: "Formal arrangements where DataIsData and another organization jointly pursue or deliver work." },
  { value: "Pilot / Proof of Concept", description: "Limited-scope engagements to test new technologies or demonstrate business value." },
  { value: "Assessment / Discovery", description: "Initial paid engagements to evaluate client needs, identify opportunities or develop a roadmap." },
];

export const SERVICE_PRACTICE_OPTIONS: Option[] = [
  { value: "Platform Development", description: "Websites, portals, CRM systems, applications and digital platforms." },
  { value: "Innovation as a Service", description: "Ongoing innovation programs, pilots, technology discovery and implementation." },
  { value: "AI & Automation", description: "AI solutions, workflow automation and intelligent tools." },
  { value: "Municipal Broadband / Smart City", description: "Broadband strategy and smart-city technology for municipalities." },
  { value: "Program & Project Management", description: "Running programs and projects: schedules, budgets, resources and outcomes." },
  { value: "Technology Strategy", description: "Technology roadmaps, assessments and executive guidance." },
  { value: "Workforce Development", description: "Training, internships and career pathway programs." },
  { value: "Enterprise Architecture", description: "Systems, data and infrastructure architecture." },
  { value: "Professional Resources", description: "Contractors and specialized staff placed with the client." },
  { value: "Economic & Innovation Development", description: "Economic development and innovation-district initiatives." },
  { value: "Smart Infrastructure", description: "Connected infrastructure, sensing and inspection technology." },
];

export const REVENUE_MODEL_OPTIONS: Option[] = [
  { value: "Hourly / Time & Materials", description: "Billed by the hour for time and materials." },
  { value: "Fixed Fee", description: "One agreed price for the defined scope." },
  { value: "Monthly Retainer", description: "A set fee every month for ongoing access or services." },
  { value: "Subscription / Licensing", description: "Recurring fees for using a DataIsData platform or technology." },
  { value: "Revenue Share", description: "A percentage of the revenue the solution or partnership generates." },
  { value: "Milestone-Based", description: "Paid as defined milestones are delivered." },
  { value: "Performance-Based", description: "Paid on measured results or outcomes." },
  { value: "Hybrid", description: "A combination of the models above." },
];

export const ENGAGEMENT_STATUS_OPTIONS: Option[] = [
  { value: "Identified", description: "Opportunity spotted; not yet engaged." },
  { value: "Discovery", description: "Learning the client's needs." },
  { value: "Proposed", description: "Proposal or quote submitted." },
  { value: "Negotiation", description: "Terms being negotiated." },
  { value: "Awarded", description: "Won; work not yet started." },
  { value: "Active", description: "Work underway and generating revenue." },
  { value: "On Hold", description: "Paused." },
  { value: "Completed", description: "Work delivered." },
  { value: "Closed", description: "Closed out (completed, cancelled or not pursued)." },
];

/** The four classification fields, in the order they appear on forms and reports. */
export const CLASSIFICATION_FIELDS = [
  { key: "engagement_type", label: "Engagement Type", hint: "How DataIsData is engaged by the client" },
  { key: "service_practice", label: "Service / Practice", hint: "What DataIsData is delivering" },
  { key: "revenue_model", label: "Revenue / Pricing Model", hint: "How the engagement generates revenue" },
  { key: "engagement_status", label: "Engagement Status", hint: "Where the engagement is, from identified to closed" },
] as const;

export type ClassificationKey = (typeof CLASSIFICATION_FIELDS)[number]["key"];

/** The built-in lists, used until the Field Options table exists (and to seed it). */
export const DEFAULT_OPTIONS: Record<ClassificationKey, Option[]> = {
  engagement_type: ENGAGEMENT_TYPE_OPTIONS,
  service_practice: SERVICE_PRACTICE_OPTIONS,
  revenue_model: REVENUE_MODEL_OPTIONS,
  engagement_status: ENGAGEMENT_STATUS_OPTIONS,
};
/** The fields that need the new database columns (engagement_type already exists). */
export const NEW_COLUMNS: ClassificationKey[] = ["service_practice", "revenue_model", "engagement_status"];

/**
 * Older shorthand already in Tony's data, shown and grouped under the full name.
 * Display only: the stored value is never rewritten.
 */
const TYPE_ALIASES: Record<string, string> = {
  "staff aug": "Staff Augmentation",
  "staff aug.": "Staff Augmentation",
  "staff augmentation": "Staff Augmentation",
  poc: "Pilot / Proof of Concept",
};

export function displayType(value: string | null | undefined): string | null {
  if (!value) return null;
  return securityTerm(TYPE_ALIASES[value.trim().toLowerCase()] || value);
}

/** How a stored classification value is shown (aliases and the Cyber → Security wording). Display only. */
export function displayValue(key: ClassificationKey, value: string | null | undefined): string | null {
  if (!value) return null;
  return key === "engagement_type" ? displayType(value) : securityTerm(value);
}

export function describe(key: ClassificationKey, value: string | null | undefined): string | null {
  if (!value) return null;
  const v = displayValue(key, value);
  return store.rows[key].find((o) => o.value === v)?.description || null;
}

/** Engagement Status rolled up for reporting: in development vs generating revenue vs done. */
export type Phase = "In development" | "Generating revenue" | "On hold" | "Closed out" | "Not set";
export const PHASES: Phase[] = ["In development", "Generating revenue", "On hold", "Closed out", "Not set"];
/** Phases a status can be reported under (everything except "Not set"). */
export const STATUS_PHASES: Exclude<Phase, "Not set">[] = ["In development", "Generating revenue", "On hold", "Closed out"];

/**
 * The reporting phase of an Engagement Status. Uses the phase set for that status in
 * Admin > Field Options, falling back to the built-in mapping.
 */
export function phaseOf(engagementStatus: string | null | undefined): Phase {
  if (!engagementStatus) return "Not set";
  const live = store.rows.engagement_status.find((o) => o.value === engagementStatus);
  if (live?.phase) return live.phase;
  return defaultPhase(engagementStatus);
}

function defaultPhase(engagementStatus: string | null | undefined): Phase {
  switch (engagementStatus) {
    case "Identified":
    case "Discovery":
    case "Proposed":
    case "Negotiation":
      return "In development";
    case "Awarded":
    case "Active":
      return "Generating revenue";
    case "On Hold":
      return "On hold";
    case "Completed":
    case "Closed":
      return "Closed out";
    default:
      return "Not set";
  }
}

/** One line such as "Project-Based · Platform Development · Fixed Fee", skipping blanks. */
export function classificationLine(e: { engagement_type?: string | null; service_practice?: string | null; revenue_model?: string | null }) {
  return [displayType(e.engagement_type), securityTerm(e.service_practice), securityTerm(e.revenue_model)].filter(Boolean).join(" · ");
}

/**
 * Whether the new columns exist yet. Until the SQL file is run, the new fields stay hidden and
 * are never sent on save, so editing engagements keeps working exactly as before.
 */
let readyCache: boolean | null = null;
export function useClassificationColumns(): boolean | null {
  const [ready, setReady] = useState<boolean | null>(readyCache);
  useEffect(() => {
    if (readyCache !== null) return;
    let alive = true;
    supabase
      .from("engagements")
      .select("service_practice, revenue_model, engagement_status")
      .limit(1)
      .then(({ error }) => {
        // Only a missing column means "not ready"; any other error (network, auth) is not
        // cached, so the next page load checks again.
        const missing = !!error && /column|schema cache|does not exist/i.test(error.message);
        if (!error) readyCache = true;
        if (missing) readyCache = false;
        if (alive) setReady(!error);
      });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** Keep only the classification values that can be saved right now ("" becomes null). */
export function classificationPayload(values: Partial<Record<ClassificationKey, string | null | undefined>>, columnsReady: boolean | null) {
  const out: Partial<Record<ClassificationKey, string | null>> = {};
  out.engagement_type = values.engagement_type ? values.engagement_type : null;
  if (columnsReady) for (const k of NEW_COLUMNS) out[k] = values[k] ? values[k]! : null;
  return out;
}

/* ---------------- "New" highlight ---------------- */

/** The classification fields are flagged as new until this moment (48 hours after release), then the flag disappears by itself. */
export const CLASSIFICATION_NEW_UNTIL = "2026-11-04T04:00:00Z"; // Tue Nov 3, 11:00 PM Eastern

/** Re-checks once a minute so an open page drops the highlight on time. */
function subscribeClock(onChange: () => void) {
  const t = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(t);
}

/** True while `until` is in the future. False during server rendering, so server and browser HTML match. */
export function useIsNew(until: string = CLASSIFICATION_NEW_UNTIL): boolean {
  return useSyncExternalStore(
    subscribeClock,
    () => Date.now() < new Date(until).getTime(),
    () => false
  );
}

/* ---------------- Live option lists (Admin > Field Options) ---------------- */

/**
 * The dropdown choices for the four classification fields live in the
 * `portal_field_options` table (supabase/2026-11-field-options.sql), so Owner and Admin seats
 * can add, rename, reorder, hide or remove them in Admin > Field Options. Every form, filter,
 * report and the Glossary read the same list from here.
 *
 * Until that table exists (or for a field with no rows yet), the built-in lists above are used.
 * Hiding or removing a choice never touches engagements: a record that already holds it keeps
 * it, shown as "(current)" in its dropdown.
 */
export type FieldOption = {
  id: string | null;
  field_key: ClassificationKey;
  value: string;
  description: string;
  sort_order: number;
  active: boolean;
  /** Engagement Status only: which reporting phase the status rolls up to. */
  phase: Exclude<Phase, "Not set"> | null;
};

export const FIELD_OPTIONS_TABLE = "portal_field_options";

export type FieldStore = {
  /** "database": loaded from the table · "defaults": table not created yet · "loading": first load pending */
  source: "loading" | "database" | "defaults";
  rows: Record<ClassificationKey, FieldOption[]>;
  loadedAt: number;
};

function defaultRows(key: ClassificationKey): FieldOption[] {
  return DEFAULT_OPTIONS[key].map((o, i) => ({
    id: null,
    field_key: key,
    value: o.value,
    description: o.description,
    sort_order: (i + 1) * 10,
    active: true,
    phase: key === "engagement_status" ? (defaultPhase(o.value) as Exclude<Phase, "Not set">) : null,
  }));
}

const DEFAULT_ROWS = Object.fromEntries(CLASSIFICATION_FIELDS.map((f) => [f.key, defaultRows(f.key)])) as Record<ClassificationKey, FieldOption[]>;

let store: FieldStore = { source: "loading", rows: DEFAULT_ROWS, loadedAt: 0 };
const listeners = new Set<() => void>();
function emit(next: Partial<FieldStore>) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}
function subscribeStore(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const isMissingTable = (msg: string) => /does not exist|schema cache|relation|not find the table/i.test(msg);
const PHASE_SET = new Set<string>(STATUS_PHASES);

let inflight: Promise<void> | null = null;
/** Load (or refresh) the lists. Re-reads at most once a minute unless `force` is set. */
export function loadFieldOptions(force = false): Promise<void> {
  if (!force && store.source !== "loading" && Date.now() - store.loadedAt < 60_000) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from(FIELD_OPTIONS_TABLE)
      .select("id, field_key, value, description, sort_order, active, phase")
      .order("sort_order", { ascending: true })
      .order("value", { ascending: true });
    if (error) {
      // Table not created yet: keep the built-in lists. Other errors (offline): keep what we have.
      emit({ source: isMissingTable(error.message) ? "defaults" : store.source === "loading" ? "defaults" : store.source, loadedAt: Date.now() });
      return;
    }
    const rows = Object.fromEntries(CLASSIFICATION_FIELDS.map((f) => [f.key, [] as FieldOption[]])) as Record<ClassificationKey, FieldOption[]>;
    for (const r of (data || []) as FieldOption[]) {
      if (!(r.field_key in rows)) continue;
      rows[r.field_key].push({
        ...r,
        description: r.description || "",
        phase: r.phase && PHASE_SET.has(r.phase) ? r.phase : null,
      });
    }
    // A field with no rows at all falls back to its built-in list.
    for (const f of CLASSIFICATION_FIELDS) if (!rows[f.key].length) rows[f.key] = DEFAULT_ROWS[f.key];
    emit({ source: "database", rows, loadedAt: Date.now() });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Live lists for the four fields; components re-render when an admin changes them. */
export function useFieldOptions() {
  const s = useSyncExternalStore(subscribeStore, () => store, () => store);
  useEffect(() => {
    void loadFieldOptions();
  }, []);
  return s;
}

/** The choices shown in a dropdown right now (visible ones, in order). */
export function activeOptions(key: ClassificationKey, s: FieldStore = store): Option[] {
  return s.rows[key].filter((r) => r.active).map((r) => ({ value: r.value, description: r.description }));
}

/** Current options for a field outside React (e.g. while converting an opportunity). */
export async function currentOptions(key: ClassificationKey): Promise<Option[]> {
  await loadFieldOptions();
  return activeOptions(key);
}
