-- =============================================================================
-- Add PC's seat (DataIsData Consultant, Team Member — not an admin).
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Requires 2026-10-seats-permissions-finance-tracker.sql. Idempotent.
--
-- Email is left blank on purpose (like John's): add PC's real sign-in email in
-- Users & Permissions before switching to Google sign-in.
-- PC starts with NO module permissions — an empty workspace until Tony or
-- Azaiah turn modules on in the portal.
-- =============================================================================

INSERT INTO public.portal_users (id, email, full_name, title, organization, seat_role, status, scope_mode)
VALUES
  ('a1000000-0000-4000-8000-000000000004', NULL, 'PC', 'Consultant', 'DataIsData', 'member', 'active', 'all')
ON CONFLICT (id) DO NOTHING;
