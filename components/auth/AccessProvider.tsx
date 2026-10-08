"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseRaw, setDataScope, EMPTY_SCOPE } from "@/lib/supabase";
import type { Action, ModuleKey } from "@/lib/access/modules";
import { MODULES } from "@/lib/access/modules";
import type { PermissionMap, PortalUser } from "@/lib/access/types";
import { canDo, hasFullAccess, rowsToMap } from "@/lib/access/permissions";
import {
  getStorageMode,
  loadPermissions,
  loadScopes,
  loadUsers,
  logAudit,
  touchLogin,
  updateUser,
  type StorageMode,
} from "@/lib/access/repo";
import { computeScope } from "@/lib/access/scope";

export type AuthMode = "demo" | "google";
export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === "google" ? "google" : "demo";

type Status = "loading" | "signedOut" | "ready" | "unauthorized" | "suspended" | "error";

const SESSION_KEY = "did-session";
const PREVIEW_KEY = "did-preview-user";
const DEMO_SESSION_HOURS = 12;

interface AccessContextValue {
  status: Status;
  error: string | null;
  authMode: AuthMode;
  storageMode: StorageMode;
  /** The person actually signed in. */
  realUser: PortalUser | null;
  /** The person whose access is being applied (differs from realUser while previewing). */
  user: PortalUser | null;
  users: PortalUser[];
  permissions: PermissionMap;
  isPreviewing: boolean;
  /** Effective admin rights (false while an admin previews a non-admin). */
  isAdmin: boolean;
  isRealAdmin: boolean;
  isRealOwner: boolean;
  scopedAccountIds: string[] | null;
  can: (module: ModuleKey, action?: Action) => boolean;
  /** can view AND not hidden in the user's personal "My View". */
  canSee: (module: ModuleKey) => boolean;
  firstAccessiblePath: () => string | null;
  signInDemo: (userId: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInEmailLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  startPreview: (userId: string) => void;
  stopPreview: () => void;
  refresh: () => Promise<void>;
  setMyHiddenModules: (modules: string[]) => Promise<void>;
  unauthorizedEmail: string | null;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside <AccessProvider>");
  return ctx;
}

/** Safe variant for components that may render outside the provider. */
export function useOptionalAccess(): AccessContextValue | null {
  return useContext(AccessContext);
}

function readDemoSession(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { userId: string; signedInAt: string };
    const ageHours = (Date.now() - new Date(s.signedInAt).getTime()) / 36e5;
    if (!s.userId || ageHours > DEMO_SESSION_HOURS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s.userId;
  } catch {
    return null;
  }
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [realUser, setRealUser] = useState<PortalUser | null>(null);
  const [effectiveUser, setEffectiveUser] = useState<PortalUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [scopedAccountIds, setScopedAccountIds] = useState<string[] | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const loadSeq = useRef(0);

  /**
   * Resolve the record scope for a user WITHOUT applying it, so a stale load
   * (e.g. preview started then exited quickly) can never overwrite the scope
   * of the load that actually wins.
   */
  const resolveScopeFor = useCallback(async (target: PortalUser) => {
    if (hasFullAccess(target) || target.scope_mode !== "accounts") {
      return { scope: EMPTY_SCOPE, accountIds: null as string[] | null };
    }
    const scopeRows = await loadScopes(target.id);
    const accountIds = scopeRows.map((s) => s.account_id);
    return { scope: await computeScope(accountIds), accountIds };
  }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      setError(null);
      // 1) Who is signed in?
      let signedInId: string | null = null;
      let signedInEmail: string | null = null;
      let authUserId: string | null = null;
      if (AUTH_MODE === "google") {
        const { data } = await supabaseRaw.auth.getSession();
        signedInEmail = data.session?.user?.email?.toLowerCase() || null;
        authUserId = data.session?.user?.id || null;
      } else {
        signedInId = readDemoSession();
      }

      // 2) Seats
      const allUsers = await loadUsers();
      if (seq !== loadSeq.current) return;
      setUsers(allUsers);
      setStorageMode(getStorageMode());

      const me = signedInEmail
        ? allUsers.find((u) => (u.email || "").toLowerCase() === signedInEmail)
        : allUsers.find((u) => u.id === signedInId);

      if (!me) {
        setDataScope(EMPTY_SCOPE);
        setRealUser(null);
        setEffectiveUser(null);
        if (signedInEmail) {
          setUnauthorizedEmail(signedInEmail);
          setStatus("unauthorized");
        } else {
          setStatus("signedOut");
        }
        return;
      }
      if (me.status !== "active") {
        setDataScope(EMPTY_SCOPE);
        setRealUser(me);
        setEffectiveUser(null);
        setStatus("suspended");
        return;
      }
      if (AUTH_MODE === "google" && authUserId && me.auth_user_id !== authUserId) {
        touchLogin(me.id, authUserId);
      }

      // 3) Preview (admins only)
      let storedPreview: string | null = null;
      try {
        storedPreview = sessionStorage.getItem(PREVIEW_KEY);
      } catch {
        storedPreview = null;
      }
      const previewTarget =
        hasFullAccess(me) && storedPreview && storedPreview !== me.id
          ? allUsers.find((u) => u.id === storedPreview) || null
          : null;
      if (!previewTarget && storedPreview) {
        try {
          sessionStorage.removeItem(PREVIEW_KEY);
        } catch {
          /* ignore */
        }
      }
      const target = previewTarget || me;

      // 4) Permissions + scope of the effective user (applied only if this load is still current)
      const rows = hasFullAccess(target) ? [] : await loadPermissions(target.id);
      const resolved = await resolveScopeFor(target);
      if (seq !== loadSeq.current) return;
      if (resolved.accountIds) {
        const ids = resolved.accountIds;
        const mySeq = seq;
        const refreshScope = async () => {
          const next = await computeScope(ids);
          if (mySeq === loadSeq.current) setDataScope(next, refreshScope);
        };
        setDataScope(resolved.scope, refreshScope);
      } else {
        setDataScope(EMPTY_SCOPE);
      }
      setScopedAccountIds(resolved.accountIds);

      setRealUser(me);
      setEffectiveUser(target);
      setPreviewId(previewTarget ? previewTarget.id : null);
      setPermissions(rowsToMap(rows));
      setStatus("ready");
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setError(e instanceof Error ? e.message : "Could not load access settings.");
      setStatus("error");
    }
  }, [resolveScopeFor]);

  useEffect(() => {
    load();
    if (AUTH_MODE !== "google") return;
    const { data } = supabaseRaw.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const can = useCallback(
    (module: ModuleKey, action: Action = "view") => canDo(effectiveUser, permissions, module, action),
    [effectiveUser, permissions]
  );

  const canSee = useCallback(
    (module: ModuleKey) => can(module, "view") && !(effectiveUser?.hidden_modules || []).includes(module),
    [can, effectiveUser]
  );

  const firstAccessiblePath = useCallback(() => {
    const m = MODULES.find((x) => canSee(x.key)) || MODULES.find((x) => can(x.key, "view"));
    return m ? m.path : null;
  }, [can, canSee]);

  const signInDemo = useCallback(
    async (userId: string) => {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, signedInAt: new Date().toISOString() }));
      try {
        sessionStorage.removeItem(PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      const u = users.find((x) => x.id === userId);
      await touchLogin(userId);
      await logAudit({
        actor_id: userId,
        actor_name: u?.full_name || null,
        action: "signed_in",
        target_user_id: userId,
        target_name: u?.full_name || null,
        details: { method: "demo" },
      });
      setStatus("loading");
      await load();
    },
    [load, users]
  );

  const signInGoogle = useCallback(async () => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error: err } = await supabaseRaw.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (err) setError(err.message);
  }, []);

  const signInEmailLink = useCallback(async (email: string) => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error: err } = await supabaseRaw.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    return err ? err.message : null;
  }, []);

  const signOut = useCallback(async () => {
    loadSeq.current++;
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* ignore */
    }
    if (AUTH_MODE === "google") await supabaseRaw.auth.signOut();
    setDataScope(EMPTY_SCOPE);
    setRealUser(null);
    setEffectiveUser(null);
    setPermissions({});
    setPreviewId(null);
    setStatus("signedOut");
  }, []);

  const startPreview = useCallback(
    (userId: string) => {
      if (!realUser || !hasFullAccess(realUser)) return;
      try {
        sessionStorage.setItem(PREVIEW_KEY, userId);
      } catch {
        /* ignore */
      }
      const target = users.find((u) => u.id === userId);
      logAudit({
        actor_id: realUser.id,
        actor_name: realUser.full_name,
        action: "preview_started",
        target_user_id: userId,
        target_name: target?.full_name || null,
        details: null,
      });
      setStatus("loading");
      load();
    },
    [load, realUser, users]
  );

  const stopPreview = useCallback(() => {
    try {
      sessionStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* ignore */
    }
    setStatus("loading");
    load();
  }, [load]);

  const setMyHiddenModules = useCallback(
    async (modules: string[]) => {
      if (!effectiveUser || previewId) return; // never write to someone else's seat while previewing
      await updateUser(effectiveUser.id, { hidden_modules: modules });
      await load();
    },
    [effectiveUser, load, previewId]
  );

  const value = useMemo<AccessContextValue>(
    () => ({
      status,
      error,
      authMode: AUTH_MODE,
      storageMode,
      realUser,
      user: effectiveUser,
      users,
      permissions,
      isPreviewing: !!previewId,
      isAdmin: hasFullAccess(effectiveUser),
      isRealAdmin: hasFullAccess(realUser),
      isRealOwner: realUser?.seat_role === "owner",
      scopedAccountIds,
      can,
      canSee,
      firstAccessiblePath,
      signInDemo,
      signInGoogle,
      signInEmailLink,
      signOut,
      startPreview,
      stopPreview,
      refresh: load,
      setMyHiddenModules,
      unauthorizedEmail,
    }),
    [
      status,
      error,
      storageMode,
      realUser,
      effectiveUser,
      users,
      permissions,
      previewId,
      scopedAccountIds,
      can,
      canSee,
      firstAccessiblePath,
      signInDemo,
      signInGoogle,
      signInEmailLink,
      signOut,
      startPreview,
      stopPreview,
      load,
      setMyHiddenModules,
      unauthorizedEmail,
    ]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

/** Render children only when the current user may perform `action` on `module`. */
export function Can({
  module,
  action = "view",
  children,
  fallback = null,
}: {
  module: ModuleKey;
  action?: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const access = useOptionalAccess();
  if (!access) return <>{children}</>;
  return <>{access.can(module, action) ? children : fallback}</>;
}
