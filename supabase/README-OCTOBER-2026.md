# October 2026 update — Seats, Permissions & Finance Tracker

## Run now (demo-login phase)

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste **`2026-10-seats-permissions-finance-tracker.sql`** → **Run**.
   - Creates the seat tables (`portal_users`, `user_permissions`, `user_account_scopes`, `portal_audit_log`, `portal_settings`)
     and seeds Tony (Owner), Azaiah (Admin) and John Kissel (Guest, no access yet).
   - Creates the Finance Tracker tables (`finance_settings`, `placements`, `placement_hours`, `income_entries`,
     `finance_budgets`, `finance_custom_fields`).
   - Adds missing columns (`expenses.notes/vendor/recurrence/custom_fields`, `invoices.payment_terms_days/sent_at/custom_fields`),
     makes invoice numbering robust and adds `sync_invoice_statuses()` (Sent ⇄ Overdue).
   - Safe to run more than once.

Until this runs, the portal still works: seats and permissions are kept in the browser (a yellow banner tells admins).

## Run later (when Google sign-in goes live)

Do **not** run `2026-10-phase2-google-auth-rls.sql` until these are done:

1. Supabase → **Authentication → Providers → Google**: enable it and paste the Google OAuth Client ID/Secret
   (Google Cloud Console → APIs & Services → Credentials → OAuth client, type "Web application";
   authorized redirect URI = `https://jpjqfwvvihnvcnogkhwh.supabase.co/auth/v1/callback`).
2. Supabase → **Authentication → Providers → Email**: keep enabled (one-time sign-in links for people
   without a Google account — e.g. agency staff on Microsoft 365).
3. Supabase → **Authentication → URL Configuration**: Site URL `https://dataisdata-project-portal.netlify.app`,
   and add it (plus `http://localhost:3000`) to Redirect URLs.
4. In **Users & Permissions**, make sure every seat has the exact email they will sign in with
   (John's is blank on purpose).
5. Netlify → Site settings → Environment variables: add `NEXT_PUBLIC_AUTH_MODE` = `google`, then redeploy.
   (Locally: add the same line to `.env.local`.) This removes the PIN screen and the demo buttons.
6. Run `2026-10-phase2-google-auth-rls.sql`. From then on Postgres enforces every permission switch and
   account scope itself — even direct API calls can only see what the seat is allowed to see.

To roll back to demo mode: set `NEXT_PUBLIC_AUTH_MODE=demo` and re-run the October migration file
(which re-creates the anon policies for the new tables) plus `rls-policies.sql` / `finance-schema.sql` for the older tables.
