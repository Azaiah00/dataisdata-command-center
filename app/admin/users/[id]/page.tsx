"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/auth/AccessProvider";
import { initials, RoleBadge } from "@/components/auth/LoginScreen";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { AccountScopePicker } from "@/components/admin/AccountScopePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabaseRaw } from "@/lib/supabase";
import { deleteUser, loadPermissions, loadScopes, logAudit, replacePermissions, replaceScopes, updateUser } from "@/lib/access/repo";
import { mapToRows, PERMISSION_TEMPLATES, rowsToMap } from "@/lib/access/permissions";
import { MODULES } from "@/lib/access/modules";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type PermissionMap, type PortalUser, type ScopeMode, type SeatRole } from "@/lib/access/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save, ShieldCheck, Wand2, PauseCircle, PlayCircle, Trash2, Undo2, Building2 } from "lucide-react";

function diffPermissions(before: PermissionMap, after: PermissionMap): string[] {
  const out: string[] = [];
  for (const m of MODULES) {
    const a = before[m.key];
    const b = after[m.key];
    const fmt = (p?: { view: boolean; create: boolean; edit: boolean; delete: boolean }) =>
      !p || !p.view ? "off" : ["view", p.create && "add", p.edit && "edit", p.delete && "delete"].filter(Boolean).join("/");
    if (fmt(a) !== fmt(b)) out.push(`${m.label}: ${fmt(a)} → ${fmt(b)}`);
  }
  return out;
}

export default function ManageAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { users, realUser, isRealOwner, refresh, startPreview } = useAccess();
  const target = users.find((u) => u.id === id) || null;

  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "", title: "", organization: "" });
  const [role, setRole] = useState<SeatRole>("guest");
  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [perms, setPerms] = useState<PermissionMap>({});
  const [original, setOriginal] = useState<{ perms: PermissionMap; scopeIds: string[]; scopeMode: ScopeMode; role: SeatRole; profile: typeof profile } | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; account_type: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isSelf = target?.id === realUser?.id;
  const targetIsOwner = target?.seat_role === "owner";
  // Owners can edit anyone; admins can edit anyone except the owner. Nobody changes their own role/status.
  const canEditRole = !!target && !targetIsOwner && !isSelf && (isRealOwner || realUser?.seat_role === "admin");
  const canEditProfile = !!target && (!targetIsOwner || isRealOwner);

  const load = useCallback(async () => {
    if (!target) return;
    const [rows, scopes, accRes] = await Promise.all([
      loadPermissions(target.id),
      loadScopes(target.id),
      supabaseRaw.from("accounts").select("id, name, account_type").order("name"),
    ]);
    const p = rowsToMap(rows);
    const ids = scopes.map((s) => s.account_id);
    const prof = { full_name: target.full_name, email: target.email || "", title: target.title || "", organization: target.organization || "" };
    setPerms(p);
    setScopeIds(ids);
    setScopeMode(target.scope_mode);
    setRole(target.seat_role);
    setProfile(prof);
    setOriginal({ perms: p, scopeIds: ids, scopeMode: target.scope_mode, role: target.seat_role, profile: prof });
    setAccounts(accRes.data || []);
    setLoaded(true);
  }, [target]);

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  const fullAccess = role === "owner" || role === "admin";
  const changes = useMemo(() => (original ? diffPermissions(original.perms, perms) : []), [original, perms]);
  const dirty =
    !!original &&
    (changes.length > 0 ||
      original.scopeMode !== scopeMode ||
      original.role !== role ||
      JSON.stringify([...original.scopeIds].sort()) !== JSON.stringify([...scopeIds].sort()) ||
      JSON.stringify(original.profile) !== JSON.stringify(profile));

  if (!target) {
    return (
      <div className="text-center py-20 space-y-3">
        <h2 className="text-2xl font-bold">Seat not found</h2>
        <Link href="/admin/users" className="text-primary hover:underline">
          Back to Users & Permissions
        </Link>
      </div>
    );
  }

  async function save() {
    if (!target || !original) return;
    if (!profile.full_name.trim()) return toast.error("Name is required");
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) return toast.error("Enter a valid email");
    setSaving(true);
    try {
      const patch: Partial<PortalUser> = {
        full_name: profile.full_name.trim(),
        email: profile.email.trim() || null,
        title: profile.title.trim() || null,
        organization: profile.organization.trim() || null,
        scope_mode: fullAccess ? "all" : scopeMode,
      };
      if (canEditRole) patch.seat_role = role;
      // A new sign-in email must not keep the old Google login linked to this seat.
      if ((original.profile.email || "").trim().toLowerCase() !== profile.email.trim().toLowerCase()) patch.auth_user_id = null;
      await updateUser(target.id, patch);
      await replacePermissions(target.id, mapToRows(target.id, perms));
      await replaceScopes(target.id, scopeMode === "accounts" && !fullAccess ? scopeIds : []);
      const summary = [...changes];
      if (original.role !== role) summary.unshift(`Role: ${ROLE_LABELS[original.role]} → ${ROLE_LABELS[role]}`);
      if (original.scopeMode !== scopeMode || JSON.stringify([...original.scopeIds].sort()) !== JSON.stringify([...scopeIds].sort()))
        summary.push(scopeMode === "all" ? "Records: all" : `Records: ${scopeIds.length} account(s) only`);
      if (JSON.stringify(original.profile) !== JSON.stringify(profile)) summary.push("Profile details updated");
      await logAudit({
        actor_id: realUser?.id || null,
        actor_name: realUser?.full_name || null,
        action: "access_updated",
        target_user_id: target.id,
        target_name: profile.full_name.trim(),
        details: { changes: summary.slice(0, 25) },
      });
      toast.success("Access saved — it applies immediately");
      setOriginal({ perms, scopeIds, scopeMode: fullAccess ? "all" : scopeMode, role: canEditRole ? role : original.role, profile });
      if (fullAccess) setScopeMode("all");
      if (!canEditRole) setRole(original.role);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(next: "active" | "suspended") {
    if (!target) return;
    await updateUser(target.id, { status: next });
    await logAudit({
      actor_id: realUser?.id || null,
      actor_name: realUser?.full_name || null,
      action: next === "suspended" ? "seat_suspended" : "seat_reactivated",
      target_user_id: target.id,
      target_name: target.full_name,
      details: null,
    });
    toast.success(next === "suspended" ? "Seat paused — they can no longer sign in" : "Seat re-activated");
    await refresh();
  }

  async function remove() {
    if (!target) return;
    await deleteUser(target.id);
    await logAudit({
      actor_id: realUser?.id || null,
      actor_name: realUser?.full_name || null,
      action: "seat_removed",
      target_user_id: target.id,
      target_name: target.full_name,
      details: null,
    });
    toast.success("Seat removed");
    await refresh();
    router.push("/admin/users");
  }

  const scopedAccountNames = accounts.filter((a) => scopeIds.includes(a.id)).map((a) => a.name);

  return (
    <div className="space-y-6 pb-24">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Users & Permissions
      </Link>

      <div className="rounded-3xl bg-white border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-5 justify-between">
        <div className="flex items-center gap-4">
          <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold", targetIsOwner ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
            {initials(target.full_name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{target.full_name}</h1>
              <RoleBadge role={target.seat_role} />
              {target.status === "suspended" && <span className="text-xs font-semibold text-red-600">Paused</span>}
            </div>
            <p className="text-muted-foreground">{[target.title, target.organization].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSelf && target.status === "active" && (
            <Button variant="outline" onClick={() => (dirty ? toast.error("Save your changes first, then preview.") : startPreview(target.id))}>
              <Eye className="w-4 h-4" /> Preview as {target.full_name.split(" ")[0]}
            </Button>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem] gap-6 items-start">
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> What {profile.full_name.split(" ")[0] || "they"} can see and do
                </CardTitle>
                <CardDescription>Flip a switch to turn a section on or off. Changes apply as soon as you save.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!fullAccess && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5" /> Quick start:
                    </span>
                    {PERMISSION_TEMPLATES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        title={t.description}
                        onClick={() => setPerms(t.build())}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                <PermissionMatrix
                  value={perms}
                  onChange={setPerms}
                  scoped={scopeMode === "accounts"}
                  lockedReason={fullAccess ? `${ROLE_LABELS[role]} seats always have every permission. Change the role to Team Member or Guest to limit access.` : undefined}
                />
              </CardContent>
            </Card>

            {!fullAccess && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" /> Which records
                  </CardTitle>
                  <CardDescription>
                    Limit this seat to specific accounts. Partners, events and vendor sections are not tied to accounts and follow the switches above only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountScopePicker mode={scopeMode} onModeChange={setScopeMode} selected={scopeIds} onSelectedChange={setScopeIds} accounts={accounts} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6 xl:sticky xl:top-24">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Seat details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Full name</Label>
                  <Input id="p-name" value={profile.full_name} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-email">Sign-in email</Label>
                  <Input id="p-email" type="email" value={profile.email} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Required for Google sign-in" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-title">Title</Label>
                    <Input id="p-title" value={profile.title} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-org">Organization</Label>
                    <Input id="p-org" value={profile.organization} disabled={!canEditProfile} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as SeatRole)} disabled={!canEditRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetIsOwner && <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>}
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                      <SelectItem value="guest">{ROLE_LABELS.guest}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {!canEditRole
                      ? targetIsOwner
                        ? "The Owner seat can't be changed or removed."
                        : "You can't change your own role."
                      : ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {fullAccess ? (
                  <p className="text-muted-foreground">Full access to every section and record.</p>
                ) : (
                  <>
                    <p>
                      <strong>{MODULES.filter((m) => perms[m.key]?.view).length}</strong> of {MODULES.length} sections visible
                    </p>
                    <p className="text-muted-foreground">
                      {scopeMode === "all" ? "All records" : scopedAccountNames.length ? `Only: ${scopedAccountNames.join(", ")}` : "No accounts selected"}
                    </p>
                    {MODULES.filter((m) => perms[m.key]?.view && m.sensitive).length > 0 && (
                      <p className="text-amber-700 text-xs font-medium">Includes sensitive Finance sections.</p>
                    )}
                  </>
                )}
                {dirty && changes.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 space-y-1 max-h-40 overflow-y-auto">
                    <p className="font-semibold">Unsaved changes</p>
                    {changes.map((c) => (
                      <p key={c}>{c}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {!targetIsOwner && !isSelf && (
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Seat status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {target.status === "suspended" ? (
                    <Button variant="outline" className="w-full" onClick={() => setStatus("active")}>
                      <PlayCircle className="w-4 h-4" /> Re-activate seat
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setStatus("suspended")}>
                      <PauseCircle className="w-4 h-4" /> Pause seat (block sign-in)
                    </Button>
                  )}
                  <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmRemove(true)}>
                    <Trash2 className="w-4 h-4" /> Remove seat
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur transition-transform print:hidden",
          dirty ? "translate-y-0" : "translate-y-full invisible"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {changes.length ? `${changes.length} permission change${changes.length === 1 ? "" : "s"}` : "Unsaved changes"} for {profile.full_name || "this seat"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => load()} disabled={saving}>
              <Undo2 className="w-4 h-4" /> Discard
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save access"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {target.full_name}&apos;s seat?</DialogTitle>
            <DialogDescription>
              This deletes the seat and all of its permissions. Records they created stay in the portal. To block access temporarily, pause the seat instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Remove seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
