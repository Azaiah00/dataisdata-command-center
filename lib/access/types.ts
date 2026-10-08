import type { Action, ModuleKey } from "./modules";

export type SeatRole = "owner" | "admin" | "member" | "guest";
export type SeatStatus = "active" | "invited" | "suspended";
export type ScopeMode = "all" | "accounts";

export interface PortalUser {
  id: string;
  email: string | null;
  full_name: string;
  title: string | null;
  organization: string | null;
  seat_role: SeatRole;
  status: SeatStatus;
  scope_mode: ScopeMode;
  /** Modules this user has chosen to hide from their own view ("My View"). */
  hidden_modules: string[];
  auth_user_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionRow {
  user_id: string;
  module_key: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type ModulePermission = Record<Action, boolean>;
export type PermissionMap = Partial<Record<ModuleKey, ModulePermission>>;

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_user_id: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface PortalSettings {
  seat_limit: number;
  organization_name: string;
}

export const ROLE_LABELS: Record<SeatRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Team Member",
  guest: "Guest / Partner",
};

export const ROLE_DESCRIPTIONS: Record<SeatRole, string> = {
  owner: "Full access to everything, including seats, billing data and permissions. Cannot be removed.",
  admin: "Full access to everything and can manage seats and permissions.",
  member: "DataIsData team member. Sees only what an admin turns on.",
  guest: "External partner or client (e.g. agency staff). Sees only what an admin turns on.",
};
