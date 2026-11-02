"use client";

/**
 * Writes for Admin > Field Options (Owner and Admin seats only — the page sits under /admin,
 * and once Google sign-in is live Postgres enforces the same rule).
 *
 * Choices are stored in portal_field_options. Engagements are only ever changed by an explicit
 * "rename and update" that the admin confirms with the exact record count shown; hiding or
 * removing a choice never changes any engagement.
 */
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/access/repo";
import {
  CLASSIFICATION_FIELDS,
  DEFAULT_OPTIONS,
  FIELD_OPTIONS_TABLE,
  type ClassificationKey,
  type FieldOption,
  type Phase,
  displayValue,
  loadFieldOptions,
} from "@/lib/engagementClassification";

type Actor = { id: string | null; name: string | null };
type StatusPhase = Exclude<Phase, "Not set">;

const label = (key: ClassificationKey) => CLASSIFICATION_FIELDS.find((f) => f.key === key)?.label || key;

async function audit(actor: Actor, key: ClassificationKey, what: string, details: Record<string, unknown>) {
  await logAudit({
    actor_id: actor.id,
    actor_name: actor.name,
    action: "field_options_updated",
    target_user_id: null,
    target_name: label(key),
    details: { field: key, change: what, ...details },
  });
}

function fail(error: { message: string } | null, fallback: string): never {
  const msg = error?.message || fallback;
  if (/duplicate|unique/i.test(msg)) throw new Error("That choice already exists in this list.");
  throw new Error(msg);
}

/** All rows for a field straight from the table (including hidden ones). */
async function rowsFor(key: ClassificationKey): Promise<FieldOption[]> {
  const { data, error } = await supabase
    .from(FIELD_OPTIONS_TABLE)
    .select("id, field_key, value, description, sort_order, active, phase")
    .eq("field_key", key)
    .order("sort_order", { ascending: true });
  if (error) fail(error, "Could not read the list.");
  return (data || []) as FieldOption[];
}

/**
 * If a list has no rows yet (it was showing the built-in choices), save the built-in choices
 * first so edits apply to a real, complete list.
 */
async function ensureSaved(key: ClassificationKey, actor: Actor) {
  const rows = await rowsFor(key);
  if (rows.length) return;
  const { error } = await supabase.from(FIELD_OPTIONS_TABLE).insert(
    DEFAULT_OPTIONS[key].map((o, i) => ({
      field_key: key,
      value: o.value,
      description: o.description,
      sort_order: (i + 1) * 10,
      active: true,
      phase: key === "engagement_status" ? defaultStatusPhase(o.value) : null,
      updated_by: actor.name,
    }))
  );
  if (error) fail(error, "Could not save the list.");
}

function defaultStatusPhase(v: string): StatusPhase {
  if (["Awarded", "Active"].includes(v)) return "Generating revenue";
  if (v === "On Hold") return "On hold";
  if (["Completed", "Closed"].includes(v)) return "Closed out";
  return "In development";
}

function clean(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

export async function addOption(
  key: ClassificationKey,
  input: { value: string; description: string; phase?: StatusPhase | null },
  actor: Actor
) {
  const value = clean(input.value);
  if (!value) throw new Error("Enter a name for the choice.");
  await ensureSaved(key, actor);
  const rows = await rowsFor(key);
  if (rows.some((r) => r.value.toLowerCase() === value.toLowerCase())) throw new Error(`"${value}" is already in this list${rows.find((r) => r.value.toLowerCase() === value.toLowerCase())?.active ? "" : " (hidden): show it instead"}.`);
  const sort = Math.max(0, ...rows.map((r) => r.sort_order)) + 10;
  const { error } = await supabase.from(FIELD_OPTIONS_TABLE).insert({
    field_key: key,
    value,
    description: clean(input.description) || null,
    sort_order: sort,
    active: true,
    phase: key === "engagement_status" ? input.phase || "In development" : null,
    updated_by: actor.name,
  });
  if (error) fail(error, "Could not add the choice.");
  await audit(actor, key, `added "${value}"`, { value });
  await loadFieldOptions(true);
}

/** Engagements whose shown value for this field is `value` (handles "Staff Aug" → "Staff Augmentation"). */
export async function engagementsUsing(key: ClassificationKey, value: string): Promise<string[]> {
  const { data, error } = await supabase.from("engagements").select(`id, ${key}`);
  if (error) fail(error, "Could not count engagements.");
  return ((data || []) as unknown as Record<string, string | null>[])
    .filter((r) => displayValue(key, r[key]) === value)
    .map((r) => r.id as string);
}

/** How many engagements show each value of this field (keyed by shown value). */
export async function usageCounts(key: ClassificationKey): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("engagements").select(key);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const r of (data || []) as unknown as Record<string, string | null>[]) {
    const v = displayValue(key, r[key]);
    if (v) out[v] = (out[v] || 0) + 1;
  }
  return out;
}

export async function updateOption(
  key: ClassificationKey,
  row: FieldOption,
  patch: { value?: string; description?: string; phase?: StatusPhase | null; active?: boolean },
  actor: Actor,
  opts: { updateEngagements?: boolean } = {}
): Promise<{ updatedEngagements: number }> {
  await ensureSaved(key, actor);
  const id = row.id || (await rowsFor(key)).find((r) => r.value === row.value)?.id;
  if (!id) throw new Error("Could not find that choice. Refresh and try again.");

  const next: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: actor.name };
  let renamedTo: string | null = null;
  if (patch.value !== undefined) {
    const value = clean(patch.value);
    if (!value) throw new Error("A choice needs a name.");
    if (value !== row.value) {
      const rows = await rowsFor(key);
      if (rows.some((r) => r.id !== id && r.value.toLowerCase() === value.toLowerCase())) throw new Error(`"${value}" is already in this list.`);
      next.value = value;
      renamedTo = value;
    }
  }
  if (patch.description !== undefined) next.description = clean(patch.description) || null;
  if (patch.phase !== undefined && key === "engagement_status") next.phase = patch.phase;
  if (patch.active !== undefined) next.active = patch.active;

  // Rename the engagements first (only when asked), so the list never points at a name no record uses.
  let updatedEngagements = 0;
  if (renamedTo && opts.updateEngagements) {
    const ids = await engagementsUsing(key, row.value);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await supabase.from("engagements").update({ [key]: renamedTo }).in("id", chunk);
      if (error) fail(error, "Could not update the engagements.");
      updatedEngagements += chunk.length;
    }
  }

  const { error } = await supabase.from(FIELD_OPTIONS_TABLE).update(next).eq("id", id);
  if (error) fail(error, "Could not save the choice.");

  const changes: string[] = [];
  if (renamedTo) changes.push(`renamed "${row.value}" to "${renamedTo}"${opts.updateEngagements ? ` and updated ${updatedEngagements} engagement${updatedEngagements === 1 ? "" : "s"}` : ""}`);
  if (patch.description !== undefined && clean(patch.description) !== (row.description || "")) changes.push(`edited the definition of "${renamedTo || row.value}"`);
  if (patch.phase !== undefined && patch.phase !== row.phase) changes.push(`set "${renamedTo || row.value}" to report as ${patch.phase}`);
  if (patch.active !== undefined && patch.active !== row.active) changes.push(`${patch.active ? "showed" : "hid"} "${row.value}"`);
  if (changes.length) await audit(actor, key, changes.join("; "), { value: row.value, ...(renamedTo ? { new_value: renamedTo } : {}) });

  await loadFieldOptions(true);
  return { updatedEngagements };
}

/** Swap a choice with its neighbour. */
export async function moveOption(key: ClassificationKey, row: FieldOption, direction: -1 | 1, actor: Actor) {
  await ensureSaved(key, actor);
  const rows = await rowsFor(key);
  // Re-number 10, 20, 30… so every row has a distinct position, then swap.
  const ordered = rows.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
  const i = ordered.findIndex((r) => (row.id ? r.id === row.id : r.value === row.value));
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ordered.length) return;
  [ordered[i].sort_order, ordered[j].sort_order] = [ordered[j].sort_order, ordered[i].sort_order];
  for (const r of ordered) {
    const original = rows.find((x) => x.id === r.id);
    if (original && original.sort_order !== r.sort_order) {
      const { error } = await supabase.from(FIELD_OPTIONS_TABLE).update({ sort_order: r.sort_order }).eq("id", r.id);
      if (error) fail(error, "Could not reorder.");
    }
  }
  await loadFieldOptions(true);
}

/**
 * Remove a choice from the list. Engagements that already hold it keep it (it shows as
 * "(current)" on their form). The last choice in a list can't be removed: hide it instead.
 */
export async function deleteOption(key: ClassificationKey, row: FieldOption, actor: Actor) {
  await ensureSaved(key, actor);
  const rows = await rowsFor(key);
  if (rows.length <= 1) throw new Error("A list needs at least one choice. Hide it instead.");
  const target = rows.find((r) => (row.id ? r.id === row.id : r.value === row.value));
  if (!target) throw new Error("Could not find that choice. Refresh and try again.");
  const { error } = await supabase.from(FIELD_OPTIONS_TABLE).delete().eq("id", target.id);
  if (error) fail(error, "Could not remove the choice.");
  await audit(actor, key, `removed "${row.value}"`, { value: row.value });
  await loadFieldOptions(true);
}
