import type { CriteriaScores } from "./constants";

export interface VendorInquiry {
  id: string;
  company_name: string;
  primary_contact: string | null;
  title: string | null;
  email: string | null;
  website: string | null;
  core_service_category: string | null;
  worked_public_sector: boolean | null;
  states: string | null;
  brief_description: string | null;
  interested_in: string[] | null;
  status: string | null;
  created_at: string;
  invite_token?: string | null;
  invited_at?: string | null;
  invited_by?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  partner_id?: string | null;
  source?: string | null;
  is_sample?: boolean | null;
}

export interface VendorApplication {
  id: string;
  inquiry_id: string | null;
  years_in_business: number | null;
  legal_structure: string | null;
  certifications: string[] | null;
  insurance_coverage: string | null;
  contract_vehicles: string | null;
  public_sector_references: string | null;
  core_offerings: string | null;
  problem_solved: string | null;
  existing_gov_clients: string | null;
  differentiator: string | null;
  technology_stack: string | null;
  integration_capabilities: string | null;
  annual_revenue_range: string | null;
  bonding_capacity: string | null;
  growth_pct: number | string | null;
  cost_reduction_explanation: string | null;
  strategic_alignment: string | null;
  open_to_revenue_share: boolean | null;
  security_certifications: string | null;
  data_handling_practices: string | null;
  compliance_standards: string | null;
  score: number | null;
  status: string | null;
  reviewed_by: string | null;
  partner_id: string | null;
  created_at: string;
  criteria_scores?: Partial<CriteriaScores> | null;
  decision_notes?: string | null;
  coi_confirmed?: boolean | null;
  decided_at?: string | null;
}

export interface EventRow {
  id: string;
  name: string;
  location: string | null;
  event_date: string | null;
  theme: string | null;
  target_audience: string | null;
  registration_link: string | null;
  cost_to_vendor: number | null;
  cost_to_attendees: number | string | null;
  notes: string | null;
  post_event_leads: number | null;
  revenue_generated: number | string | null;
  status: string | null;
  capacity?: number | null;
  created_at: string;
}

export interface EventVendor {
  event_id: string;
  partner_id: string;
  sponsorship_tier: string | null;
  fee: number | string | null;
  paid?: boolean | null;
  paid_at?: string | null;
}

export interface EventAttendee {
  event_id: string;
  account_id: string;
  rsvp: "yes" | "no" | null;
  invited_at: string | null;
  responded_at: string | null;
}

export interface EventRequest {
  id: string;
  event_id: string;
  partner_id: string;
  sponsorship_tier: string;
  status: "Pending" | "Approved" | "Declined";
  requested_by: string | null;
  created_at: string;
}

export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  done: boolean;
  created_at: string;
}

export interface PartnerLite {
  id: string;
  name: string;
  vendor_status: string | null;
  vendor_score: number | null;
  innovation_category?: string | null;
  capabilities?: string | null;
  public_description?: string | null;
}

export interface ClientIntake {
  id: string;
  organization_name: string;
  organization_type?: string | null;
  population_size: number | null;
  annual_it_budget: number | string | null;
  top_challenges: string[] | null;
  current_initiatives: string | null;
  grant_funding_interest: boolean | null;
  strategic_plan_link: string | null;
  interested_in: string[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  status: string | null;
  assigned_tier: string | null;
  advisory_estimate: number | string | null;
  readiness_score: number | null;
  account_id: string | null;
  created_at: string;
  advisory_engagement?: boolean | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  source?: string | null;
}

export interface ActivityRow {
  id: string;
  created_at: string;
  actor_name: string | null;
  message: string;
  ref_type: string | null;
  ref_id: string | null;
}
