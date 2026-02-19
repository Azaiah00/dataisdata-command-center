-- DataIsData IaaS add-on schema
-- This file extends the current CRM schema without replacing existing tables.

-- Engagement extensions
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS innovation_theme TEXT,
ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT,
ADD COLUMN IF NOT EXISTS strategic_plan_goal TEXT,
ADD COLUMN IF NOT EXISTS council_priority TEXT,
ADD COLUMN IF NOT EXISTS compliance_framework TEXT,
ADD COLUMN IF NOT EXISTS existing_tool_owned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS redundant_purchase_risk BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS annual_license_cost DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS estimated_savings DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS funding_source TEXT,
ADD COLUMN IF NOT EXISTS grant_deadline DATE,
ADD COLUMN IF NOT EXISTS match_pct DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS grant_probability_pct INTEGER CHECK (grant_probability_pct >= 0 AND grant_probability_pct <= 100),
ADD COLUMN IF NOT EXISTS funding_stage TEXT,
ADD COLUMN IF NOT EXISTS manual_process BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automation_candidate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_hours_saved DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ai_impact_score INTEGER CHECK (ai_impact_score >= 0 AND ai_impact_score <= 100);

-- Partner extensions
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS performance_rating INTEGER CHECK (performance_rating >= 0 AND performance_rating <= 100),
ADD COLUMN IF NOT EXISTS socioeconomic_status TEXT,
ADD COLUMN IF NOT EXISTS past_performance_notes TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
ADD COLUMN IF NOT EXISTS revenue_share_pct DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS vendor_score INTEGER CHECK (vendor_score >= 0 AND vendor_score <= 100),
ADD COLUMN IF NOT EXISTS vendor_status TEXT;

-- Account extensions
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS innovation_tier TEXT,
ADD COLUMN IF NOT EXISTS population_size INTEGER,
ADD COLUMN IF NOT EXISTS annual_it_budget DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS top_challenges TEXT[],
ADD COLUMN IF NOT EXISTS grant_funding_interest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100);

-- Innovation maturity snapshots
CREATE TABLE IF NOT EXISTS innovation_maturity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    governance INTEGER CHECK (governance >= 0 AND governance <= 100),
    cyber_resilience INTEGER CHECK (cyber_resilience >= 0 AND cyber_resilience <= 100),
    broadband_readiness INTEGER CHECK (broadband_readiness >= 0 AND broadband_readiness <= 100),
    data_maturity INTEGER CHECK (data_maturity >= 0 AND data_maturity <= 100),
    ai_readiness INTEGER CHECK (ai_readiness >= 0 AND ai_readiness <= 100),
    workforce_capacity INTEGER CHECK (workforce_capacity >= 0 AND workforce_capacity <= 100),
    vendor_alignment INTEGER CHECK (vendor_alignment >= 0 AND vendor_alignment <= 100),
    grant_capture INTEGER CHECK (grant_capture >= 0 AND grant_capture <= 100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor stage 1 inquiry
CREATE TABLE IF NOT EXISTS vendor_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    primary_contact TEXT,
    title TEXT,
    email TEXT,
    website TEXT,
    core_service_category TEXT,
    worked_public_sector BOOLEAN,
    states TEXT,
    brief_description TEXT CHECK (char_length(brief_description) <= 500),
    interested_in TEXT[],
    status TEXT DEFAULT 'Unscreened Inquiry',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor stage 2 application
CREATE TABLE IF NOT EXISTS vendor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES vendor_inquiries(id) ON DELETE SET NULL,
    years_in_business INTEGER,
    legal_structure TEXT,
    certifications TEXT[],
    insurance_coverage TEXT,
    contract_vehicles TEXT,
    public_sector_references TEXT,
    core_offerings TEXT,
    problem_solved TEXT,
    existing_gov_clients TEXT,
    differentiator TEXT,
    technology_stack TEXT,
    integration_capabilities TEXT,
    annual_revenue_range TEXT,
    bonding_capacity TEXT,
    growth_pct DECIMAL(5,2),
    cost_reduction_explanation TEXT,
    strategic_alignment TEXT,
    open_to_revenue_share BOOLEAN,
    security_certifications TEXT,
    data_handling_practices TEXT,
    compliance_standards TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    status TEXT DEFAULT 'Pending Review',
    reviewed_by TEXT,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Client enrollment intake
CREATE TABLE IF NOT EXISTS client_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name TEXT NOT NULL,
    population_size INTEGER,
    annual_it_budget DECIMAL(15,2),
    top_challenges TEXT[],
    current_initiatives TEXT,
    grant_funding_interest BOOLEAN,
    strategic_plan_link TEXT,
    interested_in TEXT[],
    contact_name TEXT,
    contact_email TEXT,
    contact_title TEXT,
    status TEXT DEFAULT 'New',
    assigned_tier TEXT,
    advisory_estimate DECIMAL(15,2),
    readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendor showcase events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    event_date DATE,
    theme TEXT,
    target_audience TEXT,
    registration_link TEXT,
    cost_to_vendor DECIMAL(15,2),
    cost_to_attendees DECIMAL(15,2),
    notes TEXT,
    post_event_leads INTEGER,
    revenue_generated DECIMAL(15,2),
    status TEXT DEFAULT 'Planned',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Event vendor junction
CREATE TABLE IF NOT EXISTS event_vendors (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    sponsorship_tier TEXT,
    fee DECIMAL(15,2),
    PRIMARY KEY (event_id, partner_id)
);

-- Public-private partnership tracking
CREATE TABLE IF NOT EXISTS p3_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_entity_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    private_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    revenue_share_model TEXT,
    infrastructure_asset_type TEXT,
    risk_allocation TEXT,
    term_length TEXT,
    monetization_strategy TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now()
);
