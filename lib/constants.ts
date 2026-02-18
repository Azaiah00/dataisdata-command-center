export const ACCOUNT_TYPES = ['City', 'County', 'State Agency', 'University', 'Nonprofit', 'Private'] as const;
export const ACCOUNT_STATUSES = ['Active', 'Prospect', 'Dormant'] as const;
export const RELATIONSHIP_HEALTHS = ['Cold', 'Warm', 'Strong'] as const;
export const ENGAGEMENT_STATUSES = ['Planned', 'In Progress', 'On Hold', 'Complete'] as const;
export const OUTCOME_TYPES = ['Good', 'Neutral', 'Bad'] as const;
export const PIPELINE_STAGES = ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'Awarded', 'Lost'] as const;
export const ACTIVITY_TYPES = ['Meeting', 'Call', 'Email', 'Site Visit'] as const;
export const PARTNER_TYPES = ['Prime', 'Sub', 'Vendor', 'University', 'Community Org'] as const;

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
