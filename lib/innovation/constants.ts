/**
 * Vendor & Event Module — shared reference data.
 * Names match lib/constants.ts and the columns in supabase/iaas-schema.sql,
 * so everything here lands in the tables the Innovation pages already use.
 */
import { CLIENT_INTERESTS, INNOVATION_THEMES, INQUIRY_INTERESTS, INNOVATION_TIERS } from "@/lib/constants";

export { CLIENT_INTERESTS, INQUIRY_INTERESTS, INNOVATION_TIERS };

/** Vendor categories and city challenges share one list so they can be matched. */
export const CATEGORIES = [...INNOVATION_THEMES, "GovTech & Data", "Grants & Funding", "Other"] as const;
export const CHALLENGES = CATEGORIES.filter((c) => c !== "Other");

export const TIER_DESCRIPTIONS: Record<string, string> = {
  "Dashboard Only": "Innovation dashboard and a quarterly report",
  Advisory: "Dashboard plus DataIsData advisory hours",
  "Full IaaS": "DataIsData runs the innovation program end to end",
};

export const SPONSORSHIP = [
  { tier: "Showcase", fee: 2500, description: "Table and listing at the event" },
  { tier: "Premium Sponsor", fee: 5000, description: "Showcase plus a speaking slot" },
  { tier: "Strategic Partner", fee: 10000, description: "Premium plus matchmaking meetings" },
] as const;
export const defaultFee = (tier: string | null | undefined) => SPONSORSHIP.find((t) => t.tier === tier)?.fee ?? 0;

export const EVENT_STATUSES = ["Planned", "Registration Open", "Completed"] as const;

export const CERTIFICATIONS = ["SWaM", "Minority-Owned", "Woman-Owned", "8(a)", "HUBZone", "SDVOSB", "None yet"];
export const COMPLIANCE = ["NIST", "CISA", "SOC 2", "CJIS", "StateRAMP / FedRAMP", "ISO 27001", "None yet"];
export const LEGAL_STRUCTURES = ["LLC", "S-Corp", "C-Corp", "Partnership", "Sole proprietor", "Nonprofit"];
export const REVENUE_RANGES = ["Under $1M", "$1M–$2M", "$2M–$5M", "$5M–$10M", "$10M–$50M", "$50M+"];
export const ORG_TYPES = ["City", "County", "Town", "State Agency", "University"];

/** Same six criteria and weights as the Vendor Applications review page. Each is scored 0–100. */
export const CRITERIA = [
  { key: "public_sector_experience", label: "Public sector experience", weight: 20, hint: "Government clients, references, contract vehicles" },
  { key: "financial_stability", label: "Financial stability", weight: 15, hint: "Revenue range, growth, years in business, insurance" },
  { key: "strategic_fit", label: "Strategic fit", weight: 20, hint: "Cuts cost for localities; Cyber, Broadband, AI or Resiliency alignment" },
  { key: "innovation_value", label: "Innovation value", weight: 15, hint: "Differentiator, technology, integration" },
  { key: "compliance_security", label: "Compliance & security", weight: 15, hint: "Certifications, data handling, standards" },
  { key: "ecosystem_complement", label: "Ecosystem complement", weight: 15, hint: "Fills a gap in the current partner network" },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type CriteriaScores = Record<CriterionKey, number>;

export const defaultScores = (): CriteriaScores =>
  Object.fromEntries(CRITERIA.map((c) => [c.key, 50])) as CriteriaScores;

export function weightedScore(s: Partial<CriteriaScores> | null | undefined): number {
  const src = s || {};
  return Math.round(CRITERIA.reduce((t, c) => t + (c.weight * Math.max(0, Math.min(100, Number(src[c.key] ?? 0)))) / 100, 0));
}

export const DECISIONS = ["Approved Innovation Partner", "Approved Event Participant", "Conditional", "Not Approved"] as const;
export type Decision = (typeof DECISIONS)[number];
export const APPROVED: string[] = ["Approved Innovation Partner", "Approved Event Participant"];
export const isApprovedStatus = (s: string | null | undefined) => !!s && APPROVED.includes(s);

/** 80+ partner, 65–79 event-only, 50–64 conditional, under 50 not approved. */
export function suggestDecision(score: number): Decision {
  if (score >= 80) return "Approved Innovation Partner";
  if (score >= 65) return "Approved Event Participant";
  if (score >= 50) return "Conditional";
  return "Not Approved";
}

export const INQUIRY_STATUS = {
  unscreened: "Unscreened Inquiry",
  invited: "Invited to Apply",
  submitted: "Application Submitted",
  closed: "Closed: Not a Fit",
} as const;

/** Tailwind classes for every status the module shows. */
export function statusTone(status: string | null | undefined): string {
  switch (status) {
    case "Approved Innovation Partner":
    case "Paid":
    case "Attending":
    case "Client":
    case "Converted":
    case "Completed":
      return "bg-secondary text-primary";
    case "Approved Event Participant":
    case "Registration Open":
    case "Reviewed":
    case "Qualified":
      return "bg-blue-50 text-blue-700";
    case "Invited to Apply":
      return "bg-violet-50 text-violet-700";
    case "Pending Review":
    case "Application Submitted":
    case "New":
    case "Invoice sent":
    case "Pending":
      return "bg-amber-50 text-amber-700";
    case "Conditional":
      return "bg-orange-50 text-orange-700";
    case "Not Approved":
    case "Closed: Not a Fit":
    case "Can't attend":
    case "Declined":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export type PipelineStage = "unscreened" | "invited" | "pending" | "approved" | "other";
export const PIPELINE_COLUMNS: { key: PipelineStage; title: string; dot: string; help: string }[] = [
  { key: "unscreened", title: "Unscreened inquiries", dot: "bg-slate-400", help: "From the public form. Nobody is in yet." },
  { key: "invited", title: "Invited to apply", dot: "bg-violet-500", help: "Private link sent. Waiting on their application." },
  { key: "pending", title: "Pending review", dot: "bg-amber-500", help: "Application in. Score it." },
  { key: "approved", title: "Approved", dot: "bg-brand-green-bright", help: "Can join events and be matched." },
  { key: "other", title: "Conditional / not approved", dot: "bg-red-500", help: "Closed, conditional or declined." },
];
