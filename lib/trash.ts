/**
 * Portal Recently Deleted (soft delete).
 *
 * Delete = snapshot in portal_trash + deleted_at on the row → hidden from lists.
 * Restore = clear deleted_at → record shows again everywhere lists filter active rows.
 * Purge = hard delete row + mark trash purged.
 */
import { supabase } from "@/lib/supabase";
import { TRASH_ENTITIES, TRASH_ENTITY_LABELS, type TrashEntityType } from "@/lib/trash/config";

export type { TrashEntityType } from "@/lib/trash/config";
export { TRASH_ENTITY_LABELS };

export type TrashItem = {
  id: string;
  entity_type: TrashEntityType;
  entity_id: string;
  display_label: string;
  account_id: string | null;
  payload: Record<string, unknown>;
  deleted_at: string;
  deleted_by: string | null;
  restored_at: string | null;
  purged_at: string | null;
};

const TRASH_TABLE = "portal_trash";

function isMissingTrashSchema(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42703" ||
    msg.includes("portal_trash") ||
    msg.includes("deleted_at") ||
    msg.includes("does not exist")
  );
}

export function trashSchemaHint() {
  return "Run supabase/2026-11-portal-trash.sql, supabase/2026-11-portal-trash-accounts-partners.sql, and supabase/2026-11-portal-trash-extended.sql in the Supabase SQL Editor, then reload.";
}

async function buildPayload(entityType: TrashEntityType, row: Record<string, unknown>, entityId: string) {
  const base = { record: row };
  switch (entityType) {
    case "contacts": {
      const { data: links } = await supabase.from("account_contacts").select("account_id").eq("contact_id", entityId);
      return { ...base, account_contacts: links || [] };
    }
    case "accounts": {
      const { data: childIds } = await supabase.from("accounts").select("id").eq("parent_account_id", entityId);
      return { ...base, child_account_ids: (childIds || []).map((r) => r.id) };
    }
    case "partners": {
      const [{ data: engLinks }, { data: oppLinks }] = await Promise.all([
        supabase.from("engagement_partners").select("*").eq("partner_id", entityId),
        supabase.from("opportunity_partners").select("*").eq("partner_id", entityId),
      ]);
      return { ...base, engagement_partners: engLinks || [], opportunity_partners: oppLinks || [] };
    }
    case "invoices": {
      const [{ data: lines }, { data: payments }] = await Promise.all([
        supabase.from("invoice_line_items").select("*").eq("invoice_id", entityId),
        supabase.from("payments").select("*").eq("invoice_id", entityId),
      ]);
      return { ...base, invoice_line_items: lines || [], payments: payments || [] };
    }
    case "opportunities": {
      const { data: oppPartners } = await supabase.from("opportunity_partners").select("*").eq("opportunity_id", entityId);
      return { ...base, opportunity_partners: oppPartners || [] };
    }
    case "engagements": {
      const [{ data: ep }, { data: ec }, { data: ek }] = await Promise.all([
        supabase.from("engagement_partners").select("*").eq("engagement_id", entityId),
        supabase.from("engagement_contacts").select("*").eq("engagement_id", entityId),
        supabase.from("engagement_contractors").select("*").eq("engagement_id", entityId),
      ]);
      return { ...base, engagement_partners: ep || [], engagement_contacts: ec || [], engagement_contractors: ek || [] };
    }
    default:
      return base;
  }
}

/** Move any supported record to Recently Deleted. */
export async function moveToTrash(entityType: TrashEntityType, entityId: string, deletedByPortalUserId: string | null) {
  const def = TRASH_ENTITIES[entityType];
  const { data: row, error: loadErr } = await supabase.from(def.table).select("*").eq("id", entityId).maybeSingle();
  if (loadErr) {
    if (isMissingTrashSchema(loadErr)) return { ok: false as const, error: trashSchemaHint() };
    return { ok: false as const, error: loadErr.message };
  }
  if (!row) return { ok: false as const, error: `${def.label} not found.` };

  const payload = await buildPayload(entityType, row as Record<string, unknown>, entityId);
  const now = new Date().toISOString();

  const { error: trashErr } = await supabase.from(TRASH_TABLE).upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      display_label: def.displayLabel(row as Record<string, unknown>),
      account_id: def.accountId(row as Record<string, unknown>),
      payload,
      deleted_by: deletedByPortalUserId,
      deleted_at: now,
      restored_at: null,
      purged_at: null,
    },
    { onConflict: "entity_type,entity_id" }
  );

  if (trashErr) {
    if (isMissingTrashSchema(trashErr)) return { ok: false as const, error: trashSchemaHint() };
    return { ok: false as const, error: trashErr.message };
  }

  const { error: softErr } = await supabase
    .from(def.table)
    .update({ deleted_at: now, deleted_by: deletedByPortalUserId })
    .eq("id", entityId);

  if (softErr) {
    if (isMissingTrashSchema(softErr)) return { ok: false as const, error: trashSchemaHint() };
    return { ok: false as const, error: softErr.message };
  }

  return { ok: true as const, error: null };
}

/** @deprecated use moveToTrash('contacts', ...) */
export const softDeleteContact = (id: string, by: string | null) => moveToTrash("contacts", id, by);
export const softDeleteAccount = (id: string, by: string | null) => moveToTrash("accounts", id, by);
export const softDeletePartner = (id: string, by: string | null) => moveToTrash("partners", id, by);

export async function listTrash(): Promise<{ items: TrashItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from(TRASH_TABLE)
    .select("*")
    .is("restored_at", null)
    .is("purged_at", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    if (isMissingTrashSchema(error)) return { items: [], error: trashSchemaHint() };
    return { items: [], error: error.message };
  }
  return { items: (data || []) as TrashItem[], error: null };
}

export async function restoreTrashItem(trashId: string) {
  const { data: row, error: loadErr } = await supabase.from(TRASH_TABLE).select("*").eq("id", trashId).maybeSingle();
  if (loadErr || !row) return { ok: false as const, error: loadErr?.message || "Item not found." };

  const item = row as TrashItem;
  const def = TRASH_ENTITIES[item.entity_type];
  if (!def) return { ok: false as const, error: "Unknown item type." };

  const { error } = await supabase
    .from(def.table)
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", item.entity_id);
  if (error) return { ok: false as const, error: error.message };

  const { error: markErr } = await supabase.from(TRASH_TABLE).update({ restored_at: new Date().toISOString() }).eq("id", trashId);
  if (markErr) return { ok: false as const, error: markErr.message };

  return { ok: true as const, error: null };
}

export async function purgeTrashItem(trashId: string) {
  const { data: row, error: loadErr } = await supabase.from(TRASH_TABLE).select("*").eq("id", trashId).maybeSingle();
  if (loadErr || !row) return { ok: false as const, error: loadErr?.message || "Item not found." };

  const item = row as TrashItem;
  const def = TRASH_ENTITIES[item.entity_type];
  if (!def) return { ok: false as const, error: "Unknown item type." };

  const { error } = await supabase.from(def.table).delete().eq("id", item.entity_id);
  if (error) return { ok: false as const, error: error.message };

  const { error: markErr } = await supabase.from(TRASH_TABLE).update({ purged_at: new Date().toISOString() }).eq("id", trashId);
  if (markErr) return { ok: false as const, error: markErr.message };

  return { ok: true as const, error: null };
}

export function trashItemDetailHref(item: TrashItem): string | null {
  const def = TRASH_ENTITIES[item.entity_type];
  return def ? def.detailPath(item.entity_id) : null;
}

export function trashItemModuleKey(item: TrashItem) {
  return TRASH_ENTITIES[item.entity_type]?.moduleKey ?? null;
}

/** Only Owner/Admin seats purge from Recently Deleted (enforced in UI; DB uses module delete + admin). */
export function canPurgeTrashItem(item: TrashItem, isAdmin: boolean) {
  return isAdmin && !!TRASH_ENTITIES[item.entity_type];
}
