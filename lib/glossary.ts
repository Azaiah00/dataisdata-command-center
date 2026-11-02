/**
 * Portal glossary: one place that defines the terms used across the Command Center.
 * Classification definitions come straight from lib/engagementClassification.ts, so the
 * dropdowns and the glossary can never disagree.
 */
import type { ModuleKey } from "@/lib/access/modules";
import { activeOptions, CLASSIFICATION_FIELDS, type ClassificationKey, type FieldStore, STATUS_PHASES } from "@/lib/engagementClassification";
import { CRITERIA, SPONSORSHIP, TIER_DESCRIPTIONS } from "@/lib/innovation/constants";

export type GlossaryTerm = { term: string; definition: string };
export type GlossarySection = {
  id: string;
  title: string;
  intro?: string;
  /** Seats need at least one of these modules to see the section. */
  modules: ModuleKey[];
  terms: GlossaryTerm[];
};

const INNOVATION_MODULES: ModuleKey[] = [
  "innovation_portfolio",
  "innovation_maturity",
  "innovation_exchange",
  "vendor_inquiries",
  "vendor_applications",
  "events",
  "client_intake",
];

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

const INTROS: Record<ClassificationKey, { id: string; intro: string }> = {
  engagement_type: { id: "engagement-type", intro: "How DataIsData is engaged by the client: the business relationship or delivery model, not the service itself." },
  service_practice: { id: "service-practice", intro: "What DataIsData is delivering on the engagement." },
  revenue_model: { id: "revenue-model", intro: "How the engagement generates revenue." },
  engagement_status: { id: "engagement-status", intro: "Where the engagement is, from first identified to closed. Kept separate from Engagement Type and from Delivery Status." },
};

/**
 * The classification sections, built from the live lists in Admin > Field Options, so the
 * Glossary always matches the dropdowns. Choices without a definition are listed as such.
 */
export function classificationGlossary(live: FieldStore): GlossarySection[] {
  const sections: GlossarySection[] = CLASSIFICATION_FIELDS.map((f) => ({
    id: INTROS[f.key].id,
    title: f.label,
    intro: INTROS[f.key].intro,
    modules: ["engagements"],
    terms: activeOptions(f.key, live).map((o) => ({ term: o.value, definition: o.description || "No definition added yet." })),
  }));
  const statuses = live.rows.engagement_status.filter((r) => r.active);
  const list = (phase: string) => statuses.filter((r) => r.phase === phase).map((r) => r.value).join(", ") || "No statuses";
  sections.push({
    id: "engagement-phases",
    title: "Engagement phases (reporting)",
    intro: "How Engagement Status is grouped on the Engagements list and in Reports.",
    modules: ["engagements", "reports"],
    terms: [
      ...STATUS_PHASES.map((p) => ({
        term: p,
        definition: `${list(p)}.${p === "In development" ? " Being pursued, not yet won." : p === "Generating revenue" ? " Won work." : ""}`,
      })),
      { term: "Not set", definition: "No Engagement Status chosen yet." },
    ],
  });
  return sections;
}

/** Everything else in the Glossary (fixed terms). */
export const GLOSSARY: GlossarySection[] = [
  {
    id: "delivery-status",
    title: "Delivery Status",
    intro: "The original engagement status, describing delivery of the work.",
    modules: ["engagements"],
    terms: [
      { term: "Planned", definition: "Work is scheduled but has not started." },
      { term: "In Progress", definition: "Work is underway." },
      { term: "On Hold", definition: "Work is paused." },
      { term: "Complete", definition: "Work is finished." },
    ],
  },
  {
    id: "pipeline-stage",
    title: "Pipeline stages",
    intro: "Where an opportunity is before it becomes an engagement.",
    modules: ["pipeline"],
    terms: [
      { term: "Lead", definition: "A possible opportunity that has not been qualified yet." },
      { term: "Discovery", definition: "Learning the client's needs, budget and timeline." },
      { term: "Proposal", definition: "A proposal or quote has been submitted." },
      { term: "Negotiation", definition: "Terms, scope or price are being negotiated." },
      { term: "Awarded", definition: "Won. Use Convert to engagement to start delivery, billing and finance tracking." },
      { term: "Lost", definition: "Not won or no longer pursued." },
      { term: "Weighted value", definition: "Estimated value multiplied by the probability of winning." },
    ],
  },
  {
    id: "innovation-tier",
    title: "Innovation tiers",
    intro: "Service levels offered to cities and agencies through Client Intake.",
    modules: INNOVATION_MODULES,
    terms: Object.entries(TIER_DESCRIPTIONS).map(([term, definition]) => ({ term, definition: `${definition}.` })),
  },
  {
    id: "vendor-decision",
    title: "Vendor decisions",
    intro: "The outcome recorded when a vendor application is scored (0–100). The score suggests a decision; the reviewer makes the call.",
    modules: INNOVATION_MODULES,
    terms: [
      { term: "Approved Innovation Partner", definition: "Suggested at 80 or above. Full partner: events, matching and partnership opportunities." },
      { term: "Approved Event Participant", definition: "Suggested at 65–79. Approved for showcase events." },
      { term: "Conditional", definition: "Suggested at 50–64. Approved once listed conditions are met." },
      { term: "Not Approved", definition: "Suggested below 50. Not added to the ecosystem." },
    ],
  },
  {
    id: "vendor-criteria",
    title: "Vendor scoring criteria",
    intro: "The six weighted criteria used to score vendor applications.",
    modules: INNOVATION_MODULES,
    terms: CRITERIA.map((c) => ({ term: `${c.label} (${c.weight}%)`, definition: `${c.hint}.` })),
  },
  {
    id: "sponsorship",
    title: "Sponsorship tiers",
    intro: "Event sponsorship levels and their default fees.",
    modules: INNOVATION_MODULES,
    terms: SPONSORSHIP.map((s) => ({ term: `${s.tier} (${fmt(s.fee)})`, definition: `${s.description}.` })),
  },
  {
    id: "maturity",
    title: "Innovation Maturity Index",
    intro: "Each account is scored 0–100 in each category; the overall score is the average.",
    modules: ["innovation_maturity"],
    terms: [
      { term: "Governance", definition: "Leadership, policy and decision-making for technology and innovation." },
      { term: "Broadband Readiness", definition: "Connectivity coverage, plans and funding for broadband." },
      { term: "Data Maturity", definition: "How well data is collected, managed and used for decisions." },
      { term: "AI Readiness", definition: "Preparedness to adopt AI responsibly: data, skills, policy and use cases." },
      { term: "Workforce Capacity", definition: "Staff skills and capacity to deliver technology programs." },
      { term: "Vendor Alignment", definition: "How well current vendors and contracts support the organization's goals." },
      { term: "Grant Capture", definition: "Ability to find, win and manage grant funding." },
    ],
  },
];
