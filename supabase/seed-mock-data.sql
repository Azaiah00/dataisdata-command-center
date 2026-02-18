-- =============================================================================
-- Mock data with real revenue for DataIsData Command Center
-- Run this AFTER schema.sql and rls-policies.sql (tables + RLS must exist).
-- Links to existing accounts by name so seed is safe to run once.
-- =============================================================================

-- 1) Link existing contacts to accounts
UPDATE contacts
SET account_id = (SELECT id FROM accounts WHERE name = 'Richmond City IT' LIMIT 1)
WHERE full_name = 'John Doe';

UPDATE contacts
SET account_id = (SELECT id FROM accounts WHERE name = 'Henrico County Public Schools' LIMIT 1)
WHERE full_name = 'Jane Smith';

-- 2) Add one more contact (Virginia Department of Health)
INSERT INTO contacts (full_name, title_role, account_id, email, relationship_health, influence_level)
SELECT 'Maria Garcia', 'Director of Innovation', id, 'maria.garcia@vdh.virginia.gov', 'Strong', 5
FROM accounts WHERE name = 'Virginia Department of Health' LIMIT 1;

-- 3) Engagements (projects) with actual revenue
INSERT INTO engagements (name, account_id, engagement_type, start_date, end_date, status, scope_summary, budget, contract_value, margin_pct)
SELECT
  'Broadband Feasibility Study',
  id,
  'Assessment',
  '2024-09-01',
  '2025-03-31',
  'In Progress',
  'County-wide broadband feasibility and cost model for BEAD alignment.',
  72000.00,
  85000.00,
  15.29
FROM accounts WHERE name = 'Richmond City IT' LIMIT 1;

INSERT INTO engagements (name, account_id, engagement_type, start_date, end_date, status, scope_summary, budget, contract_value, margin_pct)
SELECT
  'Cybersecurity Maturity Assessment',
  id,
  'Advisory',
  '2025-01-15',
  '2025-06-30',
  'Planned',
  'NIST-based cyber assessment and roadmap for K-12 environment.',
  95000.00,
  120000.00,
  20.83
FROM accounts WHERE name = 'Henrico County Public Schools' LIMIT 1;

INSERT INTO engagements (name, account_id, engagement_type, start_date, end_date, status, scope_summary, budget, contract_value, margin_pct)
SELECT
  'IaaS Program Delivery – Phase 1',
  id,
  'Delivery',
  '2024-07-01',
  '2025-12-31',
  'In Progress',
  'Statewide innovation-as-a-service program delivery and stakeholder engagement.',
  380000.00,
  450000.00,
  15.56
FROM accounts WHERE name = 'Virginia Department of Health' LIMIT 1;

-- 4) Pipeline opportunities (with estimated value and probability)
INSERT INTO opportunities (name, account_id, primary_contact_id, service_line, stage, probability_pct, estimated_value, expected_start, expected_end, funding_source, next_step, next_step_due)
SELECT
  'Resiliency Planning Phase 2',
  a.id,
  c.id,
  'Resiliency',
  'Proposal',
  60,
  150000.00,
  '2025-04-01',
  '2026-03-31',
  'State Grant',
  'Submit final proposal',
  '2025-02-28'
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id AND c.full_name = 'John Doe'
WHERE a.name = 'Richmond City IT' LIMIT 1;

INSERT INTO opportunities (name, account_id, primary_contact_id, service_line, stage, probability_pct, estimated_value, expected_start, expected_end, funding_source, next_step, next_step_due)
SELECT
  'EdTech Integration & Training',
  a.id,
  c.id,
  'Innovation',
  'Discovery',
  30,
  200000.00,
  '2025-07-01',
  '2026-06-30',
  'General Fund',
  'Discovery workshop',
  '2025-03-15'
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id AND c.full_name = 'Jane Smith'
WHERE a.name = 'Henrico County Public Schools' LIMIT 1;

INSERT INTO opportunities (name, account_id, primary_contact_id, service_line, stage, probability_pct, estimated_value, expected_start, expected_end, funding_source, next_step, next_step_due)
SELECT
  'Statewide Data & Analytics Platform',
  a.id,
  c.id,
  'IaaS Program',
  'Negotiation',
  75,
  1200000.00,
  '2025-06-01',
  '2027-05-31',
  'ARPA',
  'Legal review of MSA',
  '2025-02-20'
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id AND c.full_name = 'Maria Garcia'
WHERE a.name = 'Virginia Department of Health' LIMIT 1;

-- 5) Activities (meetings, calls, emails) linked to accounts and engagements
INSERT INTO activities (activity_type, date_time, account_id, engagement_id, summary, outcome, next_action, next_action_due)
SELECT
  'Meeting',
  '2025-02-10T14:00:00Z',
  a.id,
  e.id,
  'Kickoff for Broadband Feasibility – scope and timeline confirmed. BEAD alignment discussed.',
  'Good',
  'Send draft deliverables list',
  '2025-02-17'
FROM accounts a
JOIN engagements e ON e.account_id = a.id AND e.name = 'Broadband Feasibility Study'
WHERE a.name = 'Richmond City IT' LIMIT 1;

INSERT INTO activities (activity_type, date_time, account_id, engagement_id, summary, outcome, next_action, next_action_due)
SELECT
  'Call',
  '2025-02-05T10:30:00Z',
  a.id,
  e.id,
  'Follow-up on Cyber Assessment RFP and timeline. Budget approved by board.',
  'Good',
  'Send SOW for signature',
  '2025-02-14'
FROM accounts a
JOIN engagements e ON e.account_id = a.id AND e.name = 'Cybersecurity Maturity Assessment'
WHERE a.name = 'Henrico County Public Schools' LIMIT 1;

INSERT INTO activities (activity_type, date_time, account_id, engagement_id, summary, outcome, next_action, next_action_due)
SELECT
  'Email',
  '2025-02-12T09:00:00Z',
  a.id,
  e.id,
  'Monthly status report sent. Phase 1 milestones on track. Q2 planning scheduled.',
  'Good',
  'Schedule Q2 planning call',
  '2025-02-25'
FROM accounts a
JOIN engagements e ON e.account_id = a.id AND e.name = 'IaaS Program Delivery – Phase 1'
WHERE a.name = 'Virginia Department of Health' LIMIT 1;

INSERT INTO activities (activity_type, date_time, account_id, summary, outcome, next_action, next_action_due)
SELECT
  'Site Visit',
  '2025-01-28T13:00:00Z',
  a.id,
  'On-site at Richmond City IT. Reviewed current infrastructure and pain points for resiliency phase 2.',
  'Good',
  'Draft proposal sections',
  '2025-02-20'
FROM accounts a
WHERE a.name = 'Richmond City IT' LIMIT 1;

INSERT INTO activities (activity_type, date_time, account_id, summary, outcome, next_action, next_action_due)
SELECT
  'Meeting',
  '2025-02-01T11:00:00Z',
  a.id,
  'Intro meeting with Maria Garcia re Statewide Data Platform. High interest; procurement timeline TBD.',
  'Good',
  'Send capability one-pager',
  '2025-02-08'
FROM accounts a
WHERE a.name = 'Virginia Department of Health' LIMIT 1;
