export const ACCOUNT_TYPES = ['City', 'County', 'State', 'State Agency', 'University', 'Nonprofit', 'Private'] as const;
export const ACCOUNT_STATUSES = ['Active', 'Prospect', 'Dormant'] as const;
export const RELATIONSHIP_HEALTHS = ['Cold', 'Warm', 'Strong'] as const;
export const ENGAGEMENT_STATUSES = ['Planned', 'In Progress', 'On Hold', 'Complete'] as const;
export const OUTCOME_TYPES = ['Good', 'Neutral', 'Bad'] as const;
export const PIPELINE_STAGES = ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'Awarded', 'Lost'] as const;
export const ACTIVITY_TYPES = ['Meeting', 'Call', 'Email', 'Site Visit'] as const;
export const PARTNER_TYPES = ['Prime', 'Sub', 'Vendor', 'University', 'Community Org'] as const;
export const INNOVATION_THEMES = ['Cyber', 'Broadband', 'AI', 'Resiliency', 'Workforce'] as const;
export const LIFECYCLE_STAGES = ['Idea', 'Assessment', 'Funding', 'Procurement', 'Implementation', 'Optimization', 'Measurement', 'Replication'] as const;
export const COMPLIANCE_FRAMEWORKS = ['NIST', 'CISA', 'SOC2', 'CJIS'] as const;
export const FUNDING_SOURCES = ['ARPA', 'BEAD', 'State Grant', 'Federal', 'Foundation'] as const;
export const FUNDING_STAGES = ['Identified', 'Applied', 'Awarded', 'Reporting'] as const;
export const INNOVATION_TIERS = ['Dashboard Only', 'Advisory', 'Full IaaS'] as const;
export const VENDOR_STATUSES = ['Approved Innovation Partner', 'Approved Event Participant', 'Conditional', 'Not Approved'] as const;
export const INQUIRY_INTERESTS = ['Vendor Showcase Events', 'Strategic Partnership', 'Prime/Sub Opportunities', 'Innovation Pilot', 'Other'] as const;
export const CLIENT_INTERESTS = ['Innovation Dashboard', 'Advisory Services', 'Managed IaaS', 'Broadband Strategy', 'Cyber Assessment'] as const;
export const SPONSORSHIP_TIERS = ['Showcase', 'Premium Sponsor', 'Strategic Partner'] as const;
export const EVENT_THEMES = ['AI', 'Cyber', 'Broadband', 'Resiliency'] as const;
export const MATURITY_CATEGORIES = ['governance', 'cyber_resilience', 'broadband_readiness', 'data_maturity', 'ai_readiness', 'workforce_capacity', 'vendor_alignment', 'grant_capture'] as const;

export const STAGE_COLORS: Record<string, string> = {
  Lead: 'bg-slate-500',
  Discovery: 'bg-blue-500',
  Proposal: 'bg-indigo-500',
  Negotiation: 'bg-purple-500',
  Awarded: 'bg-green-500',
  Lost: 'bg-red-500',
};

export const STATUS_COLORS: Record<string, string> = {
  Active: 'text-green-600 bg-green-50',
  Prospect: 'text-blue-600 bg-blue-50',
  Dormant: 'text-slate-600 bg-slate-50',
};

// Finance Hub constants
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'] as const;
export const PAYMENT_METHODS = ['Check', 'ACH', 'Wire', 'Credit Card', 'Other'] as const;
export const EXPENSE_CATEGORIES = ['Labor', 'Materials', 'Travel', 'Software', 'Overhead', 'Other'] as const;
export const EXPENSE_STATUSES = ['Pending', 'Approved', 'Reimbursed'] as const;
