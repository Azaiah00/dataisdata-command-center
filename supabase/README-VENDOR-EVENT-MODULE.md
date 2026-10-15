# Vendor & Event Module (Innovation) — setup

## 1. Run the database update (once)

Supabase Dashboard → **SQL Editor** → New query → paste **`2026-10-vendor-event-module.sql`** → **Run**.
Safe to run more than once. It only adds columns, tables and functions; nothing is removed or renamed.

Until it runs, the Innovation pages still open, but a yellow "One database step left" notice appears and
invite links, scoring details, event payments, RSVPs and the city / vendor logins can't be saved.

## 2. What it adds

| Where | What |
| --- | --- |
| `vendor_inquiries` | `invite_token`, `invited_at`, `invited_by`, `closed_at`, `close_reason`, `partner_id`, `source`, `is_sample` |
| `vendor_applications` | `criteria_scores` (the six 0–100 scores), `decision_notes`, `coi_confirmed`, `decided_at`, `source`, `is_sample` |
| `partners` | `innovation_category` (used for matching), `website`, `public_description`, `is_sample` |
| `client_intakes` | `organization_type`, `advisory_engagement`, `reviewed_at`, `reviewed_by`, `review_notes`, `source`, `is_sample` |
| `events` / `event_vendors` | `capacity`, `is_sample` / `paid`, `paid_at`, `created_at` |
| `accounts` | `is_sample` |
| New tables | `event_attendees` (locality invitations + RSVP), `event_vendor_requests`, `event_tasks`, `innovation_activity`, `portal_user_partners` (vendor login → partner) |
| Public functions (no login) | `submit_vendor_inquiry`, `get_vendor_invitation`, `submit_vendor_application`, `submit_innovation_assessment` |
| Portal functions | `city_portal_data`, `city_portal_rsvp`, `partner_portal_data`, `partner_portal_request_spot` |

## 3. Public pages (no PIN, no login)

- `/join` — chooser
- `/join/partner` — Innovation Partner Interest Form
- `/join/apply/<private token>` — invite-only Strategic Partner Enrollment Application
- `/join/assessment` — Innovation Assessment for cities, counties and agencies

They write through the public functions above, so they keep working after Phase 2 removes anon table access.

## 4. City and vendor logins

- **City login**: Client intake → *Convert to client account* → *Create city login*. Creates a Guest seat limited
  to that account with only the **City Portal** (`/portal/city`) turned on.
- **Vendor login**: approve the vendor → *Create vendor login* on its record. Creates a Guest seat linked to the
  partner with only the **Vendor Portal** (`/portal/partner`) turned on.
- Both use a seat (count toward the seat limit) and can be edited or removed in Users & Permissions.
- Admins can open either view with *See their view* (uses the existing Preview as… feature).

## 5. When Google sign-in goes live

`2026-10-phase2-google-auth-rls.sql` now has a section **6) Vendor & Event Module** that covers the new tables.
Run the vendor-event file first, then Phase 2. Both are safe to re-run.

## 6. Sample data

On **Innovation → Vendor & Event Module**, admins can *Load sample data* (8 fictional vendors, 3 localities,
3 events, all tagged *Sample*) and *Remove sample data* afterwards. Sample accounts that real engagements,
invoices, opportunities or activities were attached to are kept and un-tagged instead of deleted.
Seats created for sample organizations stay until you remove them in Users & Permissions.
