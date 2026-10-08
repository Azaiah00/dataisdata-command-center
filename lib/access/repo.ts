/**
 * Data access for seats, permissions, account scopes and the audit log.
 *
 * Two storage backends:
 *  - "database": the portal_users / user_permissions / user_account_scopes /
 *    portal_audit_log tables in Supabase (created by the October 2026 SQL).
 *  - "local": a browser-only fallback used automatically when those tables
 *    have not been created yet, so the demo logins work immediately. A banner
 *    tells admins to run the SQL; nothing is shared between browsers in this mode.
 */
import { supabaseRaw } from "@/lib/supabase";
import type { AuditEntry, PermissionRow, PortalSettings, PortalUser } from "./types";

export type StorageMode = "database" | "local";

export const SEED_IDS = {
  tony: "a1000000-0000-4000-8000-000000000001",
  azaiah: "a1000000-0000-4000-8000-000000000002",
  john: "a1000000-0000-4000-8000-000000000003",
} as const;

const now = () => new Date().toISOString();

export const SEED_USERS: PortalUser[] = [
  {
    id: SEED_IDS.tony,
    email: "tony@dataisdata.com",
    full_name: "Tony Wood",
    title: "Founder & CEO",
    organization: "DataIsData",
    seat_role: "owner",
    status: "active",
    scope_mode: "all",
    hidden_modules: [],
    auth_user_id: null,
    last_login_at: null,
    created_at: "2026-10-07T00:00:00.000Z",
    updated_at: "2026-10-07T00:00:00.000Z",
  },
  {
    id: SEED_IDS.azaiah,
    email: "azaiah@dataisdata.com",
    full_name: "Azaiah Wood",
    title: "Developer",
    organization: "DataIsData",
    seat_role: "admin",
    status: "active",
    scope_mode: "all",
    hidden_modules: [],
    auth_user_id: null,
    last_login_at: null,
    created_at: "2026-10-07T00:00:00.000Z",
    updated_at: "2026-10-07T00:00:00.000Z",
  },
  {
    id: SEED_IDS.john,
    email: null,
    full_name: "John Kissel",
    title: "Director of Innovation & Technology",
    organization: "Virginia DMAS",
    seat_role: "guest",
    status: "active",
    scope_mode: "all",
    hidden_modules: [],
    auth_user_id: null,
    last_login_at: null,
    created_at: "2026-10-07T00:00:00.000Z",
    updated_at: "2026-10-07T00:00:00.000Z",
  },
];

export const DEFAULT_SETTINGS: PortalSettings = { seat_limit: 10, organization_name: "DataIsData" };

/* ------------------------------ local backend ----------------------------- */

const LOCAL_KEY = "did-access-local-v1";

interface LocalDb {
  users: PortalUser[];
  permissions: PermissionRow[];
  scopes: { user_id: string; account_id: string }[];
  audit: AuditEntry[];
  settings: PortalSettings;
}

function readLocal(): LocalDb {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDb;
      if (parsed && Array.isArray(parsed.users)) return { ...parsed, settings: parsed.settings || DEFAULT_SETTINGS };
    }
  } catch {
    /* corrupted local store — start fresh */
  }
  return { users: SEED_USERS, permissions: [], scopes: [], audit: [], settings: DEFAULT_SETTINGS };
}

function writeLocal(db: LocalDb) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked */
  }
}

/* ----------------------------- mode detection ----------------------------- */

let mode: StorageMode | null = null;

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /could not find the table|does not exist|schema cache/i.test(error.message || "")
  );
}

export function getStorageMode(): StorageMode {
  return mode || "local";
}

/* --------------------------------- reads ---------------------------------- */

export async function loadUsers(): Promise<PortalUser[]> {
  const { data, error } = await supabaseRaw.from("portal_users").select("*").order("created_at");
  if (error) {
    if (isMissingTable(error)) {
      mode = "local";
      return readLocal().users;
    }
    throw new Error(error.message);
  }
  mode = "database";
  return (data || []).map((u) => ({ ...u, hidden_modules: u.hidden_modules || [] })) as PortalUser[];
}

export async function loadPermissions(userId?: string): Promise<PermissionRow[]> {
  if (getStorageMode() === "local") {
    const rows = readLocal().permissions;
    return userId ? rows.filter((r) => r.user_id === userId) : rows;
  }
  let q = supabaseRaw.from("user_permissions").select("*");
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as PermissionRow[];
}

export async function loadScopes(userId?: string): Promise<{ user_id: string; account_id: string }[]> {
  if (getStorageMode() === "local") {
    const rows = readLocal().scopes;
    return userId ? rows.filter((r) => r.user_id === userId) : rows;
  }
  let q = supabaseRaw.from("user_account_scopes").select("user_id, account_id");
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadAudit(limit = 100): Promise<AuditEntry[]> {
  if (getStorageMode() === "local") return readLocal().audit.slice(0, limit);
  const { data, error } = await supabaseRaw
    .from("portal_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as AuditEntry[];
}

export async function loadSettings(): Promise<PortalSettings> {
  if (getStorageMode() === "local") return readLocal().settings;
  const { data, error } = await supabaseRaw.from("portal_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return { seat_limit: data.seat_limit ?? DEFAULT_SETTINGS.seat_limit, organization_name: data.organization_name ?? DEFAULT_SETTINGS.organization_name };
}

/* --------------------------------- writes --------------------------------- */

export async function saveSettings(settings: PortalSettings) {
  if (getStorageMode() === "local") {
    const db = readLocal();
    db.settings = settings;
    writeLocal(db);
    return;
  }
  const { error } = await supabaseRaw.from("portal_settings").upsert({ id: 1, ...settings, updated_at: now() });
  if (error) throw new Error(error.message);
}

export type UserInput = Omit<PortalUser, "id" | "created_at" | "updated_at" | "auth_user_id" | "last_login_at"> & {
  id?: string;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export async function createUser(input: UserInput): Promise<PortalUser> {
  const user: PortalUser = {
    ...input,
    id: input.id || newId(),
    email: input.email ? input.email.trim().toLowerCase() : null,
    auth_user_id: null,
    last_login_at: null,
    created_at: now(),
    updated_at: now(),
  };
  if (getStorageMode() === "local") {
    const db = readLocal();
    if (user.email && db.users.some((u) => u.email === user.email)) throw new Error("A seat with that email already exists.");
    db.users.push(user);
    writeLocal(db);
    return user;
  }
  const { data, error } = await supabaseRaw.from("portal_users").insert(user).select("*").single();
  if (error) throw new Error(error.code === "23505" ? "A seat with that email already exists." : error.message);
  return data as PortalUser;
}

export async function updateUser(id: string, patch: Partial<PortalUser>): Promise<void> {
  const clean = { ...patch, updated_at: now() } as Partial<PortalUser>;
  if (clean.email !== undefined) clean.email = clean.email ? clean.email.trim().toLowerCase() : null;
  delete (clean as { id?: string }).id;
  if (getStorageMode() === "local") {
    const db = readLocal();
    if (clean.email && db.users.some((u) => u.id !== id && u.email === clean.email)) throw new Error("A seat with that email already exists.");
    db.users = db.users.map((u) => (u.id === id ? { ...u, ...clean } : u));
    writeLocal(db);
    return;
  }
  const { error } = await supabaseRaw.from("portal_users").update(clean).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "A seat with that email already exists." : error.message);
}

export async function replacePermissions(userId: string, rows: PermissionRow[]): Promise<void> {
  if (getStorageMode() === "local") {
    const db = readLocal();
    db.permissions = [...db.permissions.filter((r) => r.user_id !== userId), ...rows];
    writeLocal(db);
    return;
  }
  const { error } = await supabaseRaw.from("user_permissions").upsert(rows, { onConflict: "user_id,module_key" });
  if (error) throw new Error(error.message);
}

export async function replaceScopes(userId: string, accountIds: string[]): Promise<void> {
  const unique = Array.from(new Set(accountIds));
  if (getStorageMode() === "local") {
    const db = readLocal();
    db.scopes = [...db.scopes.filter((s) => s.user_id !== userId), ...unique.map((account_id) => ({ user_id: userId, account_id }))];
    writeLocal(db);
    return;
  }
  const del = await supabaseRaw.from("user_account_scopes").delete().eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  if (unique.length) {
    const { error } = await supabaseRaw
      .from("user_account_scopes")
      .insert(unique.map((account_id) => ({ user_id: userId, account_id })));
    if (error) throw new Error(error.message);
  }
}

export async function logAudit(entry: Omit<AuditEntry, "id" | "created_at">): Promise<void> {
  const full: AuditEntry = { ...entry, id: newId(), created_at: now() };
  try {
    if (getStorageMode() === "local") {
      const db = readLocal();
      db.audit = [full, ...db.audit].slice(0, 500);
      writeLocal(db);
      return;
    }
    await supabaseRaw.from("portal_audit_log").insert(full);
  } catch {
    /* audit logging must never block the action itself */
  }
}

export async function touchLogin(userId: string, authUserId?: string | null) {
  const patch: Partial<PortalUser> = { last_login_at: now() };
  if (authUserId) patch.auth_user_id = authUserId;
  try {
    if (getStorageMode() === "local") {
      const db = readLocal();
      db.users = db.users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
      writeLocal(db);
      return;
    }
    await supabaseRaw.from("portal_users").update(patch).eq("id", userId);
  } catch {
    /* non-critical */
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (getStorageMode() === "local") {
    const db = readLocal();
    db.users = db.users.filter((u) => u.id !== id);
    db.permissions = db.permissions.filter((p) => p.user_id !== id);
    db.scopes = db.scopes.filter((s) => s.user_id !== id);
    writeLocal(db);
    return;
  }
  const { error } = await supabaseRaw.from("portal_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
