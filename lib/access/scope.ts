import { supabaseRaw, type DataScope, EMPTY_SCOPE } from "@/lib/supabase";

const uniq = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter(Boolean) as string[]));

/**
 * Resolve every record id that belongs to a set of accounts. Used to scope a
 * user who is limited to specific accounts (e.g. John Kissel → DMAS).
 * Tables that do not exist yet are simply skipped.
 */
export async function computeScope(accountIds: string[]): Promise<DataScope> {
  const acc = uniq(accountIds);
  if (!acc.length) return { ...EMPTY_SCOPE, active: true };

  const accIn = `(${acc.join(",")})`;
  const accArr = `{${acc.join(",")}}`;

  const [engs, invs, accContacts, contacts, opps, acts, placements] = await Promise.all([
    supabaseRaw.from("engagements").select("id").in("account_id", acc),
    supabaseRaw.from("invoices").select("id").in("account_id", acc),
    supabaseRaw.from("account_contacts").select("contact_id").in("account_id", acc),
    supabaseRaw.from("contacts").select("id").in("account_id", acc),
    supabaseRaw.from("opportunities").select("id").or(`account_id.in.${accIn},related_account_ids.ov.${accArr}`),
    supabaseRaw.from("activities").select("id").in("account_id", acc),
    supabaseRaw.from("placements").select("id, contractor_id").in("account_id", acc),
  ]);

  // Opportunities may not have related_account_ids in older databases — fall back to primary account only.
  let oppIds = (opps.data || []).map((o: { id: string }) => o.id);
  if (opps.error) {
    const fallback = await supabaseRaw.from("opportunities").select("id").in("account_id", acc);
    oppIds = (fallback.data || []).map((o: { id: string }) => o.id);
  }

  const engagementIds = uniq((engs.data || []).map((e: { id: string }) => e.id));
  const placementRows = placements.error ? [] : (placements.data || []) as { id: string; contractor_id: string | null }[];

  let contractorIds: string[] = placementRows.map((p) => p.contractor_id || "").filter(Boolean);
  if (engagementIds.length) {
    const ec = await supabaseRaw.from("engagement_contractors").select("contractor_id").in("engagement_id", engagementIds);
    contractorIds = contractorIds.concat((ec.data || []).map((r: { contractor_id: string }) => r.contractor_id));
  }

  return {
    active: true,
    accountIds: acc,
    engagementIds,
    invoiceIds: uniq((invs.data || []).map((i: { id: string }) => i.id)),
    contactIds: uniq([
      ...(accContacts.data || []).map((r: { contact_id: string }) => r.contact_id),
      ...(contacts.data || []).map((c: { id: string }) => c.id),
    ]),
    contractorIds: uniq(contractorIds),
    opportunityIds: uniq(oppIds),
    activityIds: uniq((acts.data || []).map((a: { id: string }) => a.id)),
    placementIds: uniq(placementRows.map((p) => p.id)),
  };
}
