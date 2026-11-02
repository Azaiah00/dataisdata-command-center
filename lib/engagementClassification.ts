"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

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
  { value: "Platform Development", description: "Designing and building websites, portals, CRM systems, applications and digital platforms." },
  { value: "Platform Subscription / Licensing", description: "Recurring revenue from clients using DataIsData-owned platforms or technology." },
  { value: "Innovation as a Service (IaaS)", description: "Ongoing innovation programs, pilot development, technology discovery and implementation support." },
  { value: "Pilot / Proof of Concept", description: "Limited-scope engagements to test new technologies or demonstrate business value." },
  { value: "Strategic Partnership", description: "Collaborations with companies, universities, municipalities or other organizations to pursue opportunities." },
  { value: "Joint Venture", description: "Formal arrangements where DataIsData and another organization jointly pursue or deliver work." },
  { value: "Revenue Sharing", description: "DataIsData earns a percentage of revenue generated through a solution or partnership." },
  { value: "Program Management", description: "Managing multi-project initiatives, resources, deliverables, budgets and outcomes." },
  { value: "Training / Workforce Development", description: "Technology training, workforce programs, internships and career pathway initiatives." },
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
  { key: "engagement_type", label: "Engagement Type", hint: "How DataIsData is engaged by the client", options: ENGAGEMENT_TYPE_OPTIONS },
  { key: "service_practice", label: "Service / Practice", hint: "What DataIsData is delivering", options: SERVICE_PRACTICE_OPTIONS },
  { key: "revenue_model", label: "Revenue / Pricing Model", hint: "How the engagement generates revenue", options: REVENUE_MODEL_OPTIONS },
  { key: "engagement_status", label: "Engagement Status", hint: "Where the engagement is, from identified to closed", options: ENGAGEMENT_STATUS_OPTIONS },
] as const;

export type ClassificationKey = (typeof CLASSIFICATION_FIELDS)[number]["key"];
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
  iaas: "Innovation as a Service (IaaS)",
  "innovation as a service": "Innovation as a Service (IaaS)",
  poc: "Pilot / Proof of Concept",
};

export function displayType(value: string | null | undefined): string | null {
  if (!value) return null;
  return TYPE_ALIASES[value.trim().toLowerCase()] || value;
}

export function describe(key: ClassificationKey, value: string | null | undefined): string | null {
  if (!value) return null;
  const field = CLASSIFICATION_FIELDS.find((f) => f.key === key);
  const v = key === "engagement_type" ? displayType(value) : value;
  return field?.options.find((o) => o.value === v)?.description ?? null;
}

/** Engagement Status rolled up for reporting: in development vs generating revenue vs done. */
export type Phase = "In development" | "Generating revenue" | "On hold" | "Closed out" | "Not set";
export const PHASES: Phase[] = ["In development", "Generating revenue", "On hold", "Closed out", "Not set"];
export function phaseOf(engagementStatus: string | null | undefined): Phase {
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
  return [displayType(e.engagement_type), e.service_practice, e.revenue_model].filter(Boolean).join(" · ");
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
