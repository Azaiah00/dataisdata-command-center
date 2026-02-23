-- Add optional related_account_ids to opportunities (multi-account linking).
-- Run this once in Supabase Dashboard → SQL Editor.
-- Required for: New/Edit Opportunity "Additional Accounts" and Account page pipeline sync.

ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS related_account_ids uuid[] NULL;

COMMENT ON COLUMN public.opportunities.related_account_ids IS 'Optional extra accounts linked to this opportunity; account_id remains the primary account.';
