export type AccountType = 'City' | 'County' | 'State' | 'State Agency' | 'University' | 'Nonprofit' | 'Private';
export type AccountStatus = 'Active' | 'Prospect' | 'Dormant';
export type RelationshipHealth = 'Cold' | 'Warm' | 'Strong';
export type EngagementStatus = 'Planned' | 'In Progress' | 'On Hold' | 'Complete';
export type OutcomeType = 'Good' | 'Neutral' | 'Bad';
export type PipelineStage = 'Lead' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Awarded' | 'Lost';
export type ActivityType = 'Meeting' | 'Call' | 'Email' | 'Site Visit';
export type PartnerType = 'Prime' | 'Sub' | 'Vendor' | 'University' | 'Community Org';
export type InnovationTier = 'Dashboard Only' | 'Advisory' | 'Full IaaS';
export type VendorStatus = 'Approved Innovation Partner' | 'Approved Event Participant' | 'Conditional' | 'Not Approved';

export interface Account {
    id: string;
    name: string;
    account_type: AccountType;
    region_state: string | null;
    region_locality: string | null;
    primary_focus: string | null;
    status: AccountStatus;
    owner: string | null;
    notes: string | null;
    parent_account_id: string | null;
    innovation_tier: InnovationTier | null;
    population_size: number | null;
    annual_it_budget: number | null;
    top_challenges: string[] | null;
    grant_funding_interest: boolean | null;
    readiness_score: number | null;
    created_at: string;
    updated_at: string;
    // Joined data
    parent_account?: Account;
    child_accounts?: Account[];
    account_contacts?: { account_id: string; contact_id: string }[];
}

export interface Contact {
    id: string;
    full_name: string;
    title_role: string | null;
    account_id: string | null;
    email: string | null;
    phone: string | null;
    influence_level: number | null;
    relationship_health: RelationshipHealth;
    tags: string[] | null;
    last_touch_date: string | null;
    next_step: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    accounts?: Account;
    account_contacts?: { account_id: string; contact_id: string }[];
}

export interface Engagement {
    id: string;
    name: string;
    account_id: string;
    engagement_type: string | null;
    start_date: string | null;
    end_date: string | null;
    status: EngagementStatus;
    scope_summary: string | null;
    attachments: string[] | null;
    budget: number | null;
    contract_value: number | null;
    margin_pct: number | null;
    innovation_theme: string | null;
    lifecycle_stage: string | null;
    strategic_plan_goal: string | null;
    council_priority: string | null;
    compliance_framework: string | null;
    existing_tool_owned: boolean | null;
    redundant_purchase_risk: boolean | null;
    annual_license_cost: number | null;
    estimated_savings: number | null;
    funding_source: string | null;
    grant_deadline: string | null;
    match_pct: number | null;
    grant_probability_pct: number | null;
    funding_stage: string | null;
    manual_process: boolean | null;
    automation_candidate: boolean | null;
    estimated_hours_saved: number | null;
    ai_impact_score: number | null;
    created_at: string;
    updated_at: string;
    // Joined data
    accounts?: Account;
}

export interface Activity {
    id: string;
    activity_type: ActivityType;
    date_time: string;
    account_id: string;
    engagement_id: string | null;
    opportunity_id: string | null;
    summary: string | null;
    outcome: OutcomeType;
    next_action: string | null;
    next_action_due: string | null;
    attachments: string[] | null;
    created_at: string;
    // Joined data
    accounts?: Account;
    engagements?: Engagement;
    opportunities?: Opportunity;
}

export interface Opportunity {
    id: string;
    name: string;
    account_id: string;
    primary_contact_id: string | null;
    service_line: string | null;
    stage: PipelineStage;
    probability_pct: number | null;
    estimated_value: number | null;
    weighted_value: number | null;
    expected_start: string | null;
    expected_end: string | null;
    estimated_cost: number | null;
    funding_source: string | null;
    competitors: string | null;
    notes: string | null;
    next_step: string | null;
    next_step_due: string | null;
    attachments: string[] | null;
    created_at: string;
    updated_at: string;
    // Joined data
    accounts?: Account;
    contacts?: Contact;
}

export interface Partner {
    id: string;
    name: string;
    partner_type: PartnerType;
    capabilities: string | null;
    contract_vehicles: string | null;
    performance_rating: number | null;
    socioeconomic_status: string | null;
    past_performance_notes: string | null;
    risk_score: number | null;
    revenue_share_pct: number | null;
    vendor_score: number | null;
    vendor_status: VendorStatus | null;
    notes: string | null;
    attachments: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface Contractor {
    id: string;
    full_name: string;
    title_role: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface InnovationMaturitySnapshot {
    id: string;
    account_id: string;
    as_of_date: string;
    overall_score: number | null;
    governance: number | null;
    cyber_resilience: number | null;
    broadband_readiness: number | null;
    data_maturity: number | null;
    ai_readiness: number | null;
    workforce_capacity: number | null;
    vendor_alignment: number | null;
    grant_capture: number | null;
    created_at: string;
}

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
    growth_pct: number | null;
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
}

export interface ClientIntake {
    id: string;
    organization_name: string;
    population_size: number | null;
    annual_it_budget: number | null;
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
    advisory_estimate: number | null;
    readiness_score: number | null;
    account_id: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    name: string;
    location: string | null;
    event_date: string | null;
    theme: string | null;
    target_audience: string | null;
    registration_link: string | null;
    cost_to_vendor: number | null;
    cost_to_attendees: number | null;
    notes: string | null;
    post_event_leads: number | null;
    revenue_generated: number | null;
    status: string | null;
    created_at: string;
}

export interface EventVendor {
    event_id: string;
    partner_id: string;
    sponsorship_tier: string | null;
    fee: number | null;
}

export interface P3Deal {
    id: string;
    public_entity_id: string | null;
    private_partner_id: string | null;
    revenue_share_model: string | null;
    infrastructure_asset_type: string | null;
    risk_allocation: string | null;
    term_length: string | null;
    monetization_strategy: string | null;
    status: string | null;
    created_at: string;
}

// Finance Hub types

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
export type PaymentMethod = 'Check' | 'ACH' | 'Wire' | 'Credit Card' | 'Other';
export type ExpenseCategory = 'Labor' | 'Materials' | 'Travel' | 'Software' | 'Overhead' | 'Other';
export type ExpenseStatus = 'Pending' | 'Approved' | 'Reimbursed';

export interface Invoice {
    id: string;
    invoice_number: string;
    account_id: string;
    engagement_id: string | null;
    issue_date: string;
    due_date: string | null;
    status: InvoiceStatus;
    subtotal: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    attachments: string[] | null;
    created_at: string;
    updated_at: string;
    // Joined data
    accounts?: { id: string; name: string };
    engagements?: { id: string; name: string };
    invoice_line_items?: InvoiceLineItem[];
    payments?: Payment[];
}

export interface InvoiceLineItem {
    id: string;
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    created_at: string;
}

export interface Payment {
    id: string;
    invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    reference_number: string | null;
    notes: string | null;
    created_at: string;
    // Joined data
    invoices?: { id: string; invoice_number: string; account_id: string; accounts?: { name: string } };
}

export interface Expense {
    id: string;
    engagement_id: string | null;
    account_id: string | null;
    contractor_id: string | null;
    category: ExpenseCategory;
    description: string;
    amount: number;
    expense_date: string;
    receipt_url: string | null;
    status: ExpenseStatus;
    created_at: string;
    updated_at: string;
    // Joined data
    accounts?: { name: string };
    engagements?: { name: string };
    contractors?: { full_name: string };
}
