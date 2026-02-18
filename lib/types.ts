export type AccountType = 'City' | 'County' | 'State Agency' | 'University' | 'Nonprofit' | 'Private';
export type AccountStatus = 'Active' | 'Prospect' | 'Dormant';
export type RelationshipHealth = 'Cold' | 'Warm' | 'Strong';
export type EngagementStatus = 'Planned' | 'In Progress' | 'On Hold' | 'Complete';
export type OutcomeType = 'Good' | 'Neutral' | 'Bad';
export type PipelineStage = 'Lead' | 'Discovery' | 'Proposal' | 'Negotiation' | 'Awarded' | 'Lost';
export type ActivityType = 'Meeting' | 'Call' | 'Email' | 'Site Visit';
export type PartnerType = 'Prime' | 'Sub' | 'Vendor' | 'University' | 'Community Org';

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
    created_at: string;
    updated_at: string;
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
    budget: number | null;
    contract_value: number | null;
    margin_pct: number | null;
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
    notes: string | null;
    created_at: string;
    updated_at: string;
}
