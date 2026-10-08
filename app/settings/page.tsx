"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Shield, Database, LayoutGrid, ShieldCheck, KeyRound } from "lucide-react";
import { useAccess } from "@/components/auth/AccessProvider";
import { RoleBadge } from "@/components/auth/LoginScreen";
import { updateUser, logAudit } from "@/lib/access/repo";
import { GROUPS, modulesInGroup } from "@/lib/access/modules";
import { supabaseRaw } from "@/lib/supabase";

export default function SettingsPage() {
  const { realUser, user, isPreviewing, can, refresh, setMyHiddenModules, authMode, storageMode, isRealAdmin } = useAccess();
  const me = isPreviewing ? user : realUser;
  const [profile, setProfile] = useState({ full_name: "", title: "", organization: "" });
  const [hidden, setHidden] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [db, setDb] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!me) return;
    setProfile({ full_name: me.full_name, title: me.title || "", organization: me.organization || "" });
    setHidden(me.hidden_modules || []);
  }, [me]);

  useEffect(() => {
    supabaseRaw
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .then(({ error }) => setDb(error ? { ok: false, message: error.message } : { ok: true, message: "Connected" }));
  }, []);

  if (!me) return null;

  async function saveProfile() {
    if (!me) return;
    if (!profile.full_name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      await updateUser(me.id, { full_name: profile.full_name.trim(), title: profile.title.trim() || null, organization: profile.organization.trim() || null });
      await logAudit({ actor_id: me.id, actor_name: me.full_name, action: "access_updated", target_user_id: me.id, target_name: profile.full_name.trim(), details: { changes: ["Updated own profile"] } });
      await refresh();
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function saveView(next: string[]) {
    setHidden(next);
    try {
      await setMyHiddenModules(next);
      toast.success("Your view was updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your view");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile & My View</h1>
        <p className="text-muted-foreground">Your details and which sections appear in your own menu and dashboard.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-foreground">Profile</CardTitle>
              <CardDescription>How you appear across the portal.</CardDescription>
            </div>
            <RoleBadge role={me.seat_role} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Full name</Label>
              <Input id="s-name" value={profile.full_name} disabled={isPreviewing} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Sign-in email</Label>
              <Input id="s-email" value={me.email || "Not set"} disabled />
              <p className="text-[11px] text-muted-foreground">Only an admin can change sign-in emails.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-title">Title</Label>
              <Input id="s-title" value={profile.title} disabled={isPreviewing} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-org">Organization</Label>
              <Input id="s-org" value={profile.organization} disabled={isPreviewing} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving || isPreviewing}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">My View</CardTitle>
              <CardDescription>
                Hide sections you don&apos;t use from your menu, search, dashboard and notifications. This never changes anyone else&apos;s access, and you can turn them back on any time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {GROUPS.map((g) => {
            const mods = modulesInGroup(g.key).filter((m) => can(m.key, "view"));
            if (!mods.length) return null;
            return (
              <div key={g.key}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{g.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mods.map((m) => {
                    const shown = !hidden.includes(m.key);
                    return (
                      <label key={m.key} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/40">
                        <span className="text-sm font-medium text-foreground">{m.label}</span>
                        <Switch
                          checked={shown}
                          disabled={isPreviewing}
                          onCheckedChange={(v) => saveView(v ? hidden.filter((h) => h !== m.key) : [...hidden, m.key])}
                          aria-label={`Show ${m.label}`}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {isPreviewing && <p className="text-xs text-amber-700">Exit preview to change your own view.</p>}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Security & sign-in</CardTitle>
              <CardDescription>How people get into the portal.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">{authMode === "google" ? "Google sign-in" : "Team PIN + demo sign-in"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {authMode === "google"
                    ? "Each person signs in with the Google account (or email link) that matches their seat."
                    : "Testing phase: the team PIN protects the portal, then you choose a seat. Google sign-in replaces this once permissions are confirmed."}
                </p>
              </div>
            </div>
            <Badge className={authMode === "google" ? "bg-green-100 text-green-700 border-none" : "bg-amber-100 text-amber-700 border-none"}>
              {authMode === "google" ? "Live" : "Demo"}
            </Badge>
          </div>
          {isRealAdmin && (
            <Link href="/admin/users" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ShieldCheck className="w-4 h-4" /> Manage seats and permissions
            </Link>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Database</CardTitle>
              <CardDescription>Supabase connection status.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${db === null ? "bg-slate-300" : db.ok ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className={`text-sm font-medium ${db?.ok ? "text-green-600" : "text-red-600"}`}>{db === null ? "Checking…" : db.ok ? "Connected" : db.message}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-muted-foreground">Seats & permissions storage</span>
              <Badge className={storageMode === "database" ? "bg-green-100 text-green-700 border-none" : "bg-amber-100 text-amber-700 border-none"}>
                {storageMode === "database" ? "Supabase" : "This browser (run SQL migration)"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-muted-foreground">Storage bucket</span>
              <span className="text-sm font-medium text-foreground">crm-attachments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
