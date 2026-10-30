import { supabase } from "@/lib/supabase";

/**
 * Safely bring a many-to-many link table in line with what the user picked.
 *
 * The old pattern was "delete every link, then insert the selected ones".
 * If the insert failed (network blip, permission, timeout) every link was
 * gone. This only inserts the links that are new and only removes the ones
 * the user actually took off, so nothing else is ever touched.
 */
export async function syncLinks(opts: {
  table: string;
  ownerColumn: string;
  ownerId: string;
  otherColumn: string;
  desiredIds: string[];
}): Promise<{ error: string | null; added: number; removed: number }> {
  const { table, ownerColumn, ownerId, otherColumn } = opts;
  const desired = Array.from(new Set(opts.desiredIds.filter(Boolean)));

  const current = await supabase.from(table).select(otherColumn).eq(ownerColumn, ownerId);
  if (current.error) return { error: current.error.message, added: 0, removed: 0 };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const existing = new Set(((current.data || []) as any[]).map((r) => r[otherColumn] as string));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const toAdd = desired.filter((id) => !existing.has(id));
  const toRemove = Array.from(existing).filter((id) => !desired.includes(id));

  if (toAdd.length) {
    const rows = toAdd.map((id) => ({ [ownerColumn]: ownerId, [otherColumn]: id }));
    const ins = await supabase.from(table).upsert(rows, { onConflict: `${ownerColumn},${otherColumn}`, ignoreDuplicates: true });
    if (ins.error) {
      // Older tables without a matching unique constraint: fall back to plain insert.
      const plain = await supabase.from(table).insert(rows);
      if (plain.error && !/duplicate key/i.test(plain.error.message)) return { error: plain.error.message, added: 0, removed: 0 };
    }
  }
  if (toRemove.length) {
    const del = await supabase.from(table).delete().eq(ownerColumn, ownerId).in(otherColumn, toRemove);
    if (del.error) return { error: del.error.message, added: toAdd.length, removed: 0 };
  }
  return { error: null, added: toAdd.length, removed: toRemove.length };
}

/** Parse anything a person might type into a money / number box. Empty → null. */
export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  const s = String(value).replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/**
 * Contacts are tied to accounts in two places: contacts.account_id (the primary
 * account) and the account_contacts link table (every account). These helpers
 * keep both in agreement so a contact shows up the same way everywhere.
 */
export async function accountIdsForContact(contactId: string, primaryAccountId: string | null): Promise<string[]> {
  const { data } = await supabase.from("account_contacts").select("account_id").eq("contact_id", contactId);
  const ids = (data || []).map((r: { account_id: string }) => r.account_id);
  return Array.from(new Set([...(primaryAccountId ? [primaryAccountId] : []), ...ids]));
}

export async function contactIdsForAccount(accountId: string): Promise<string[]> {
  const [links, direct] = await Promise.all([
    supabase.from("account_contacts").select("contact_id").eq("account_id", accountId),
    supabase.from("contacts").select("id").eq("account_id", accountId),
  ]);
  return Array.from(
    new Set([...(links.data || []).map((r: { contact_id: string }) => r.contact_id), ...(direct.data || []).map((r: { id: string }) => r.id)])
  );
}

/** After an account's contact list changes: link table + primary account kept in step. */
export async function syncAccountContacts(accountId: string, desiredContactIds: string[]): Promise<string | null> {
  const res = await syncLinks({ table: "account_contacts", ownerColumn: "account_id", ownerId: accountId, otherColumn: "contact_id", desiredIds: desiredContactIds });
  if (res.error) return res.error;
  // Contacts removed from this account that had it as their primary account:
  // move their primary to another account they're still linked to (or clear it).
  const { data: orphans, error: oErr } = await supabase.from("contacts").select("id").eq("account_id", accountId);
  if (oErr) return oErr.message;
  for (const c of (orphans || []) as { id: string }[]) {
    if (desiredContactIds.includes(c.id)) continue;
    const { data: other } = await supabase.from("account_contacts").select("account_id").eq("contact_id", c.id).neq("account_id", accountId).limit(1);
    const next = (other || [])[0]?.account_id ?? null;
    const up = await supabase.from("contacts").update({ account_id: next, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (up.error) return up.error.message;
  }
  // Contacts added with no primary account yet: make this their primary.
  if (desiredContactIds.length) {
    const r2 = await supabase.from("contacts").update({ account_id: accountId, updated_at: new Date().toISOString() }).in("id", desiredContactIds).is("account_id", null);
    if (r2.error) return r2.error.message;
  }
  return null;
}

/** Every contact at an account (primary account or linked), plus an always-included id (e.g. the current primary contact). */
export async function loadAccountContacts(accountId: string, alwaysInclude?: string | null): Promise<{ id: string; full_name: string }[]> {
  const [direct, links] = await Promise.all([
    supabase.from("contacts").select("id, full_name").eq("account_id", accountId),
    supabase.from("account_contacts").select("contacts(id, full_name)").eq("account_id", accountId),
  ]);
  const map = new Map<string, { id: string; full_name: string }>();
  (direct.data || []).forEach((c: { id: string; full_name: string }) => map.set(c.id, c));
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  (links.data || []).forEach((r: any) => {
    const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    if (c) map.set(c.id, c);
  });
  if (alwaysInclude && alwaysInclude !== "none" && !map.has(alwaysInclude)) {
    const { data } = await supabase.from("contacts").select("id, full_name").eq("id", alwaysInclude).maybeSingle();
    if (data) map.set(data.id, data);
  }
  return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}
