import { ACTIONS, MODULES, MODULE_MAP, type Action, type ModuleKey } from "./modules";
import type { ModulePermission, PermissionMap, PermissionRow, PortalUser, SeatRole } from "./types";

export const NO_PERMISSION: ModulePermission = { view: false, create: false, edit: false, delete: false };

export function hasFullAccess(user: Pick<PortalUser, "seat_role"> | null | undefined): boolean {
  return !!user && (user.seat_role === "owner" || user.seat_role === "admin");
}

export function isManager(role: SeatRole | undefined | null) {
  return role === "owner" || role === "admin";
}

export function rowsToMap(rows: PermissionRow[]): PermissionMap {
  const map: PermissionMap = {};
  for (const r of rows) {
    if (!MODULE_MAP[r.module_key]) continue;
    map[r.module_key] = {
      view: !!r.can_view,
      create: !!r.can_create,
      edit: !!r.can_edit,
      delete: !!r.can_delete,
    };
  }
  return map;
}

/** Normalise a permission so actions never exceed view and unsupported actions are off. */
export function normalizePermission(module: ModuleKey, p: ModulePermission): ModulePermission {
  const def = MODULE_MAP[module];
  const out = { ...NO_PERMISSION };
  if (!p.view) return out;
  out.view = true;
  for (const a of ACTIONS) {
    if (a === "view") continue;
    out[a] = !!p[a] && def.actions.includes(a);
  }
  return out;
}

export function mapToRows(userId: string, map: PermissionMap): PermissionRow[] {
  return MODULES.map((m) => {
    const p = normalizePermission(m.key, map[m.key] || NO_PERMISSION);
    return {
      user_id: userId,
      module_key: m.key,
      can_view: p.view,
      can_create: p.create,
      can_edit: p.edit,
      can_delete: p.delete,
    };
  });
}

export function canDo(
  user: PortalUser | null | undefined,
  map: PermissionMap,
  module: ModuleKey,
  action: Action = "view"
): boolean {
  if (!user || user.status !== "active") return false;
  if (hasFullAccess(user)) return true;
  const p = map[module];
  if (!p || !p.view) return false;
  return !!p[action];
}

/* -------------------------------------------------------------------------- */
/*  Quick-start templates shown in the admin "Manage access" panel             */
/* -------------------------------------------------------------------------- */

export interface PermissionTemplate {
  key: string;
  label: string;
  description: string;
  build: () => PermissionMap;
}

function build(fn: (m: (typeof MODULES)[number]) => ModulePermission | null): PermissionMap {
  const out: PermissionMap = {};
  for (const m of MODULES) {
    const p = fn(m);
    if (p) out[m.key] = normalizePermission(m.key, p);
  }
  return out;
}

const all: ModulePermission = { view: true, create: true, edit: true, delete: true };
const viewOnly: ModulePermission = { view: true, create: false, edit: false, delete: false };
const contribute: ModulePermission = { view: true, create: true, edit: true, delete: false };

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    key: "none",
    label: "No access",
    description: "Start from nothing and turn on exactly what this person needs.",
    build: () => ({}),
  },
  {
    key: "partner_view",
    label: "Partner — view only",
    description: "Dashboard, CRM, Work and Innovation as read-only. No Finance.",
    build: () =>
      build((m) => (m.group === "finance" || m.key === "documents" ? null : viewOnly)),
  },
  {
    key: "partner_collab",
    label: "Partner — collaborate",
    description: "Read CRM/Work/Innovation, log activities and add notes. No Finance, no deletes.",
    build: () =>
      build((m) => {
        if (m.group === "finance") return null;
        if (m.key === "activities") return contribute;
        if (m.group === "innovation") return contribute;
        return viewOnly;
      }),
  },
  {
    key: "team",
    label: "Team member",
    description: "Everything except Finance. Can create and edit, cannot delete.",
    build: () => build((m) => (m.group === "finance" ? null : contribute)),
  },
  {
    key: "finance",
    label: "Finance & operations",
    description: "Full Finance plus read-only CRM and Work.",
    build: () =>
      build((m) => {
        if (m.group === "finance") return all;
        if (m.group === "crm" || m.group === "work" || m.group === "overview") return viewOnly;
        return null;
      }),
  },
  {
    key: "everything",
    label: "Everything (no admin rights)",
    description: "All modules and actions, but cannot manage seats or permissions.",
    build: () => build(() => all),
  },
];

/** Plain-English summary used on user cards. */
export function summarizeAccess(user: PortalUser, map: PermissionMap): string {
  if (hasFullAccess(user)) return "Full access to every module";
  const visible = MODULES.filter((m) => map[m.key]?.view);
  if (!visible.length) return "No modules enabled yet";
  const editable = visible.filter((m) => map[m.key]?.create || map[m.key]?.edit);
  return `${visible.length} module${visible.length === 1 ? "" : "s"} visible · ${editable.length} with edit rights`;
}
