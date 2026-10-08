"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/auth/AccessProvider";
import { initials, RoleBadge } from "@/components/auth/LoginScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfButton } from "@/components/ui/PdfButton";
import {
  createUser,
  loadAudit,
  loadPermissions,
  loadScopes,
  loadSettings,
  logAudit,
  replacePermissions,
  saveSettings,
} from "@/lib/access/repo";
import { mapToRows, PERMISSION_TEMPLATES, rowsToMap, summarizeAccess, hasFullAccess } from "@/lib/access/permissions";
import { MODULES } from "@/lib/access/modules";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type AuditEntry, type PermissionMap, type PortalSettings, type PortalUser, type SeatRole } from "@/lib/access/types";
import { exportAccessReportPdf } from "@/lib/pdf/reports";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, Users, Eye, Settings2, History, Search, Filter, Globe, Armchair, Pencil, Check, X } from "lucide-react";

const AUDIT_LABELS: Record<string, string> = {
  signed_in: "signed in",
  seat_created: "added a seat for",
  access_updated: "updated access for",
  seat_suspended: "paused the seat for",
  seat_reactivated: "re-activated the seat for",
  seat_removed: "removed the seat for",
  preview_started: "previewed the portal as",
  settings_updated: "changed portal settings",
};

export default function UsersPage() {
  const router = useRouter();
  const { users, realUser, isRealOwner, startPreview, refresh, storageMode } = useAccess();
  const [perms, setPerms] = useState<Record<string, PermissionMap>>({});
  const [scopeCounts, setScopeCounts] = useState<Record<string, number>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [settings, setSettings] = useState<PortalSettings>({ seat_limit: 10, organization_name: "DataIsData" });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState("10");

  const loadAll = useCallback(async () => {
    const [rows, scopes, log, s] = await Promise.all([loadPermissions(), loadScopes(), loadAudit(100), loadSettings()]);
    const byUser: Record<string, PermissionMap> = {};
    users.forEach((u) => (byUser[u.id] = rowsToMap(rows.filter((r) => r.user_id === u.id))));
    setPerms(byUser);
    const sc: Record<string, number> = {};
    scopes.forEach((x) => (sc[x.user_id] = (sc[x.user_id] || 0) + 1));
    setScopeCounts(sc);
    setAudit(log);
    setSettings(s);
    setLimitDraft(String(s.seat_limit));
  }, [users]);

  useEffect(() => {
    loadAll().catch((e) => toast.error(e.message));
  }, [loadAll]);

  const activeSeats = users.filter((u) => u.status !== "suspended").length;
  const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2, guest: 3 };
  const filtered = useMemo(
    () =>
      [...users].sort((a, b) => (ROLE_ORDER[a.seat_role] ?? 9) - (ROLE_ORDER[b.seat_role] ?? 9) || a.full_name.localeCompare(b.full_name)).filter((u) => {
        const matches = `${u.full_name} ${u.email || ""} ${u.organization || ""}`.toLowerCase().includes(q.trim().toLowerCase());
        return matches && (roleFilter === "all" || u.seat_role === roleFilter);
      }),
    [users, q, roleFilter]
  );

  async function saveLimit() {
    const n = Math.max(1, Math.round(Number(limitDraft) || 1));
    if (n < activeSeats) {
      toast.error(`You already have ${activeSeats} seats in use.`);
      return;
    }
    const next = { ...settings, seat_limit: n };
    await saveSettings(next);
    await logAudit({ actor_id: realUser?.id || null, actor_name: realUser?.full_name || null, action: "settings_updated", target_user_id: null, target_name: null, details: { seat_limit: n } });
    setSettings(next);
    setEditingLimit(false);
    toast.success("Seat limit updated");
  }

  async function exportReport() {
    await exportAccessReportPdf({
      preparedBy: realUser?.full_name,
      users: users.map((u) => {
        const map = perms[u.id] || {};
        const full = hasFullAccess(u);
        return {
          full_name: u.full_name,
          email: u.email,
          role: ROLE_LABELS[u.seat_role],
          status: u.status,
          scope: full || u.scope_mode === "all" ? "All records" : `${scopeCounts[u.id] || 0} account(s) only`,
          access: full
            ? ["Full access to every section (role-based)."]
            : MODULES.filter((m) => map[m.key]?.view).map((m) => {
                const p = map[m.key]!;
                const acts = ["view", p.create && "add", p.edit && "edit", p.delete && "delete"].filter(Boolean).join(", ");
                return `• ${m.label}: ${acts}`;
              }),
        };
      }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Admin
          </p>
          <h1 className="text-2xl font-bold text-foreground">Users & Permissions</h1>
          <p className="text-muted-foreground">Add seats, choose exactly what each person can see and do, and preview their experience.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfButton onExport={exportReport} label="Access report PDF" />
          <Button onClick={() => setAddOpen(true)} disabled={activeSeats >= settings.seat_limit}>
            <UserPlus className="w-4 h-4" /> Add seat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Seats in use</p>
                <p className="text-3xl font-bold mt-2">
                  {activeSeats}
                  <span className="text-lg text-muted-foreground font-medium"> / {settings.seat_limit}</span>
                </p>
              </div>
              <Armchair className="w-6 h-6 text-primary" />
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (activeSeats / Math.max(1, settings.seat_limit)) * 100)}%` }} />
            </div>
            {editingLimit ? (
              <div className="mt-3 flex items-center gap-2">
                <Input type="number" min={1} value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} className="h-8 w-20" aria-label="Seat limit" />
                <Button size="icon-sm" onClick={saveLimit} aria-label="Save seat limit">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditingLimit(false)} aria-label="Cancel">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingLimit(true)} className="mt-3 text-xs font-medium text-primary hover:underline flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Change seat limit
              </button>
            )}
          </CardContent>
        </Card>
        {(["admin", "member", "guest"] as SeatRole[]).map((r) => (
          <Card key={r} className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r === "admin" ? "Owner & Admins" : `${ROLE_LABELS[r]}s`}</p>
              <p className="text-3xl font-bold mt-2">{users.filter((u) => (r === "admin" ? hasFullAccess(u) : u.seat_role === r) && u.status !== "suspended").length}</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ROLE_DESCRIPTIONS[r]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="seats">
        <TabsList>
          <TabsTrigger value="seats">
            <Users className="w-4 h-4" /> Seats
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="w-4 h-4" /> Activity log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seats" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {(Object.keys(ROLE_LABELS) as SeatRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((u) => {
              const map = perms[u.id] || {};
              const isMe = u.id === realUser?.id;
              return (
                <Card key={u.id} className={cn("border-none shadow-sm transition-shadow hover:shadow-md", u.status === "suspended" && "opacity-70")}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold", u.seat_role === "owner" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
                        {initials(u.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{u.full_name}</p>
                          <RoleBadge role={u.seat_role} />
                          {u.status !== "active" && <Badge className="border-none bg-red-50 text-red-700 capitalize">{u.status === "suspended" ? "Paused" : u.status}</Badge>}
                          {isMe && <Badge className="border-none bg-slate-100 text-slate-600">You</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{[u.title, u.organization].filter(Boolean).join(" · ") || "—"}</p>
                        <p className={cn("text-xs truncate", u.email ? "text-muted-foreground" : "text-amber-700 font-medium")}>
                          {u.email || "No sign-in email yet — add one before Google sign-in goes live"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Access</p>
                        <p className="mt-1 text-foreground font-medium">{summarizeAccess(u, map)}</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Records</p>
                        <p className="mt-1 text-foreground font-medium flex items-center gap-1">
                          {hasFullAccess(u) || u.scope_mode === "all" ? (
                            <>
                              <Globe className="w-3 h-3" /> All records
                            </>
                          ) : (
                            <>
                              <Filter className="w-3 h-3" /> {scopeCounts[u.id] || 0} account(s) only
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">Last sign-in: {u.last_login_at ? formatDateTime(u.last_login_at) : "Never"}</p>
                      <div className="flex gap-2">
                        {!isMe && u.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => startPreview(u.id)}>
                            <Eye className="w-4 h-4" /> Preview
                          </Button>
                        )}
                        <Button size="sm" onClick={() => router.push(`/admin/users/${u.id}`)}>
                          <Settings2 className="w-4 h-4" /> Manage access
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!filtered.length && <p className="text-sm text-muted-foreground">No seats match your search.</p>}
          {storageMode === "local" && (
            <p className="text-xs text-amber-700">Changes are stored in this browser until the October 2026 SQL migration is run in Supabase.</p>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Activity log</CardTitle>
              <CardDescription>Sign-ins, seat changes and permission updates. Newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {audit.length ? (
                <ol className="space-y-3">
                  {audit.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="flex-1">
                        <strong>{a.actor_name || "Someone"}</strong> {AUDIT_LABELS[a.action] || a.action}{" "}
                        {a.target_name && a.action !== "signed_in" && a.action !== "settings_updated" ? <strong>{a.target_name}</strong> : null}
                        {a.details && a.action === "access_updated" && Array.isArray((a.details as { changes?: string[] }).changes) && (
                          <span className="block text-xs text-muted-foreground mt-0.5">{((a.details as { changes: string[] }).changes || []).join(" · ")}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.created_at)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddSeatDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        canCreateAdmin={isRealOwner || realUser?.seat_role === "admin"}
        onCreated={async (u) => {
          await refresh();
          router.push(`/admin/users/${u.id}`);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Need to change what you personally see? Use <Link href="/settings" className="text-primary font-medium hover:underline">Profile & My View</Link>.
      </p>
    </div>
  );
}

function AddSeatDialog({
  open,
  onOpenChange,
  onCreated,
  canCreateAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (u: PortalUser) => void;
  canCreateAdmin: boolean;
}) {
  const { realUser } = useAccess();
  const [form, setForm] = useState({ full_name: "", email: "", title: "", organization: "", seat_role: "guest" as SeatRole, template: "none" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ full_name: "", email: "", title: "", organization: "", seat_role: "guest", template: "none" });
  }, [open]);

  const emailValid = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Name is required");
    if (!emailValid) return toast.error("Enter a valid email or leave it blank");
    setBusy(true);
    try {
      const u = await createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        title: form.title.trim() || null,
        organization: form.organization.trim() || null,
        seat_role: form.seat_role,
        status: "active",
        scope_mode: "all",
        hidden_modules: [],
      });
      if (form.seat_role === "member" || form.seat_role === "guest") {
        const template = PERMISSION_TEMPLATES.find((t) => t.key === form.template) || PERMISSION_TEMPLATES[0];
        await replacePermissions(u.id, mapToRows(u.id, template.build()));
      }
      await logAudit({
        actor_id: realUser?.id || null,
        actor_name: realUser?.full_name || null,
        action: "seat_created",
        target_user_id: u.id,
        target_name: u.full_name,
        details: { role: form.seat_role, template: form.template },
      });
      toast.success(`${u.full_name} added`);
      onOpenChange(false);
      onCreated(u);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add seat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a seat</DialogTitle>
            <DialogDescription>New team members and guests start with only the access you choose here — fine-tune it on the next screen.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="seat-name">Full name *</Label>
              <Input id="seat-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="seat-email">Sign-in email</Label>
              <Input id="seat-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@agency.gov" />
              <p className={cn("text-xs", emailValid ? "text-muted-foreground" : "text-destructive")}>
                {emailValid ? "Must match the account they will sign in with once Google sign-in is turned on." : "That email doesn't look right."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seat-title">Title</Label>
              <Input id="seat-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seat-org">Organization</Label>
              <Input id="seat-org" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.seat_role} onValueChange={(v) => setForm({ ...form, seat_role: v as SeatRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">{ROLE_LABELS.guest}</SelectItem>
                  <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                  {canCreateAdmin && <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Starting access</Label>
              <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })} disabled={form.seat_role === "admin"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/60 p-3">{ROLE_DESCRIPTIONS[form.seat_role]}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add seat & set access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
