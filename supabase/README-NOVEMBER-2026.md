# November 2026 update — Engagement classification

Based on Tony's CRM design notes ("Suggested CRM field structure"): every engagement is described by
three separate dropdowns, plus an Engagement Status that is kept apart from the type.

| Field | Column | Answers |
|---|---|---|
| Engagement Type | `engagement_type` (already existed) | How DataIsData is engaged by the client |
| Service / Practice | `service_practice` (new) | What DataIsData is delivering |
| Revenue / Pricing Model | `revenue_model` (new) | How the engagement generates revenue |
| Engagement Status | `engagement_status` (new) | Identified → Discovery → Proposed → Negotiation → Awarded → Active → On Hold → Completed → Closed |

The old `status` field (Planned / In Progress / On Hold / Complete) is unchanged and is now labelled
**Delivery Status**.

## Run once

Supabase Dashboard → **SQL Editor** → New query → paste **`2026-11-engagement-classification.sql`** → **Run**.

- Only adds three empty columns. No existing value is updated, deleted or renamed.
- Existing types such as "Staff Aug" stay exactly as stored; the portal shows and groups them as
  "Staff Augmentation".
- The result grid at the end shows your engagement count (unchanged) and 0 for the three new fields.
- Safe to run more than once.

Until it runs, the portal keeps working as before: the Engagement Type dropdown works, and the other three
fields stay hidden (a short note says the update is needed).

## Where the fields show up

- **New Engagement** and **Edit** forms: the four dropdowns in an "Engagement classification" block.
- **Engagement page**: a Classification card, plus the service and Engagement Status in the header.
- **Engagements list**: filters for all four fields, a count by phase (in development, generating
  revenue, on hold, closed out, not set), the classification under each name, and Engagement Status
  under Delivery Status. Search covers all four.
- **Account page**: each engagement card shows its type · service · revenue model.
- **Pipeline → Convert to engagement**: the opportunity's service line becomes the Service / Practice
  (or the type, if it is one) and Engagement Status starts at "Awarded".
- **Reports**: "Engagements by Classification" (count, contract value and average margin per type,
  service, revenue model and status) and the same tables in the PDF export.

New items carry a "New" tag and a teal outline until Tue Nov 3, 11 PM Eastern
(`CLASSIFICATION_NEW_UNTIL` in `lib/engagementClassification.ts`); after that they disappear by themselves.
