-- Core Tables

CREATE TYPE account_type AS ENUM ('City', 'County', 'State Agency', 'University', 'Nonprofit', 'Private');
CREATE TYPE account_status AS ENUM ('Active', 'Prospect', 'Dormant');
CREATE TYPE relationship_health AS ENUM ('Cold', 'Warm', 'Strong');
CREATE TYPE engagement_status AS ENUM ('Planned', 'In Progress', 'On Hold', 'Complete');
CREATE TYPE outcome_type AS ENUM ('Good', 'Neutral', 'Bad');
CREATE TYPE pipeline_stage AS ENUM ('Lead', 'Discovery', 'Proposal', 'Negotiation', 'Awarded', 'Lost');
CREATE TYPE activity_type AS ENUM ('Meeting', 'Call', 'Email', 'Site Visit');
CREATE TYPE partner_type AS ENUM ('Prime', 'Sub', 'Vendor', 'University', 'Community Org');

-- Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    account_type account_type NOT NULL,
    region_state TEXT,
    region_locality TEXT,
    primary_focus TEXT,
    status account_status DEFAULT 'Prospect',
    owner TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    title_role TEXT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    influence_level INTEGER CHECK (influence_level >= 1 AND influence_level <= 5),
    relationship_health relationship_health DEFAULT 'Cold',
    tags TEXT[],
    last_touch_date TIMESTAMPTZ,
    next_step TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Engagements
CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    engagement_type TEXT,
    start_date DATE,
    end_date DATE,
    status engagement_status DEFAULT 'Planned',
    scope_summary TEXT,
    budget DECIMAL(15,2),
    contract_value DECIMAL(15,2),
    margin_pct DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Opportunities (Pipeline)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    service_line TEXT,
    stage pipeline_stage DEFAULT 'Lead',
    probability_pct INTEGER CHECK (probability_pct >= 0 AND probability_pct <= 100),
    estimated_value DECIMAL(15,2),
    weighted_value DECIMAL(15,2) GENERATED ALWAYS AS (estimated_value * probability_pct / 100) STORED,
    expected_start DATE,
    expected_end DATE,
    estimated_cost DECIMAL(15,2),
    funding_source TEXT,
    competitors TEXT,
    notes TEXT,
    next_step TEXT,
    next_step_due DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type activity_type NOT NULL,
    date_time TIMESTAMPTZ DEFAULT now(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    engagement_id UUID REFERENCES engagements(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    summary TEXT,
    outcome outcome_type DEFAULT 'Neutral',
    next_action TEXT,
    next_action_due DATE,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Partners
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    partner_type partner_type NOT NULL,
    capabilities TEXT,
    contract_vehicles TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction Tables

CREATE TABLE engagement_contacts (
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (engagement_id, contact_id)
);

CREATE TABLE engagement_partners (
    engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    PRIMARY KEY (engagement_id, partner_id)
);

CREATE TABLE opportunity_partners (
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    PRIMARY KEY (opportunity_id, partner_id)
);

CREATE TABLE activity_contacts (
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, contact_id)
);

-- Seed Data

INSERT INTO accounts (name, account_type, region_state, region_locality, status, owner) VALUES
('Richmond City IT', 'City', 'VA', 'Richmond', 'Active', 'Tony Wood'),
('Henrico County Public Schools', 'County', 'VA', 'Henrico', 'Prospect', 'Tony Wood'),
('Virginia Department of Health', 'State Agency', 'VA', 'Statewide', 'Active', 'Tony Wood');

INSERT INTO contacts (full_name, title_role, email, relationship_health) VALUES
('John Doe', 'CIO', 'john.doe@richmond.gov', 'Strong'),
('Jane Smith', 'CTO', 'jane.smith@henrico.k12.va.us', 'Warm');

INSERT INTO partners (name, partner_type, capabilities) VALUES
('AWS', 'Vendor', 'Cloud Infrastructure'),
('Microsoft', 'Vendor', 'Productivity, Cloud');

-- Optional: run seed-mock-data.sql next (after rls-policies.sql) to add 2–3 mock engagements, opportunities, and activities with revenue.
