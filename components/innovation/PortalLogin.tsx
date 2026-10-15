"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/components/auth/AccessProvider";
import { mapToRows } from "@/lib/access/permissions";
import { createUser, linkPartner, loadPartnerLinks, loadPermissions, loadScopes, loadSettings, logAudit, replacePermissions, replaceScopes } from "@/lib/access/repo";
import type { PortalUser } from "@/lib/access/types";
import { logActivity } from "@/lib/innovation/data";
import { Field } from "./ui";

type Props =
  | { kind: "city"; accountId: string | null; orgName: string; defaultName?: string | null; defaultEmail?: string | null; defaultTitle?: string | null }
  | { kind: "vendor"; partnerId: string | null; orgName: string; defaultName?: string | null; defaultEmail?: string | null; defaultTitle?: string | null };

/**
 * "Create city login" / "Create vendor login" plus "See their view".
 * A login is a Guest seat: city seats are limited to the city's account and
 * see only the City Portal; vendor seats are linked to one partner and see
 * only the Vendor Portal. Admins can preview either one.
 */
export function PortalLogin(props: Props) {
  const router = useRouter();
  const { users, isAdmin, isRealAdmin, realUser, startPreview, refresh } = useAccess();
  const [seat, setSeat] = useState<PortalUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(props.defaultName || "");
  const [email, setEmail] = useState(props.defaultEmail || "");
  const [error, setError] = useState("");
  const target = props.kind === "city" ? props.accountId : props.partnerId;
  const portalModule = props.kind === "city" ? "client_portal" : "partner_portal";

  const findSeat = useCallback(async () => {
    if (!target) {
      setSeat(null);
      setChecked(true);
      return;
    }
    try {
      if (props.kind === "vendor") {
        const links = await loadPartnerLinks();
        const ids = links.filter((l) => l.partner_id === target).map((l) => l.user_id);
        setSeat(users.find((u) => ids.includes(u.id) && u.status === "active") || null);
      } else {
        const [scopes, perms] = await Promise.all([loadScopes(), loadPermissions()]);
        const ids = scopes.filter((s) => s.account_id === target).map((s) => s.user_id);
        const withPortal = new Set(perms.filter((p) => p.module_key === "client_portal" && p.can_view).map((p) => p.user_id));
        setSeat(users.find((u) => ids.includes(u.id) && withPortal.has(u.id) && u.status === "active" && u.seat_role === "guest") || null);
      }
    } catch {
      setSeat(null);
    }
    setChecked(true);
  }, [props.kind, target, users]);

  useEffect(() => {
    findSeat();
  }, [findSeat]);

  async function create() {
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) return setError("Add the person's name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return setError("Add the email they will sign in with.");
    if (!target) return setError(props.kind === "city" ? "Convert this intake to a client account first." : "Approve this vendor first.");
    setSaving(true);
    try {
      const settings = await loadSettings();
      const active = users.filter((u) => u.status === "active").length;
      if (active >= settings.seat_limit) {
        throw new Error(`All ${settings.seat_limit} seats are in use. Raise the seat limit in Users & Permissions first.`);
      }
      const user = await createUser({
        email: cleanEmail,
        full_name: name.trim(),
        title: props.defaultTitle || null,
        organization: props.orgName,
        seat_role: "guest",
        status: "active",
        scope_mode: "accounts",
        hidden_modules: [],
      });
      await replacePermissions(user.id, mapToRows(user.id, { [portalModule]: { view: true, create: false, edit: false, delete: false } }));
      if (props.kind === "city") await replaceScopes(user.id, [target]);
      else {
        await replaceScopes(user.id, []);
        await linkPartner(user.id, target);
      }
      await logAudit({
        actor_id: realUser?.id || null,
        actor_name: realUser?.full_name || null,
        action: "seat_created",
        target_user_id: user.id,
        target_name: user.full_name,
        details: { role: "guest", portal: portalModule, organization: props.orgName },
      });
      await logActivity(`${props.kind === "city" ? "City" : "Vendor"} login created for ${user.full_name} (${props.orgName})`, props.kind === "city" ? "account" : "partner", target, realUser?.full_name);
      toast.success(`${props.kind === "city" ? "City" : "Vendor"} login created`);
      setOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the login.");
    }
    setSaving(false);
  }

  if (!checked) return null;

  const label = props.kind === "city" ? "city" : "vendor";
  if (seat) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/70 px-3.5 py-2.5 text-sm">
        <KeyRound className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{seat.full_name}</span> has a {label} login{seat.email ? ` (${seat.email})` : ""}.
        </span>
        {isRealAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => {
              startPreview(seat.id);
              router.push(props.kind === "city" ? "/portal/city" : "/portal/partner");
            }}
          >
            <Eye className="h-4 w-4" /> See their view
          </Button>
        )}
      </div>
    );
  }

  if (!isAdmin) return null;
  return (
    <>
      <Button variant="outline" className="h-10" onClick={() => setOpen(true)} disabled={!target} title={!target ? (props.kind === "city" ? "Convert to a client account first" : "Approve the vendor first") : undefined}>
        <UserPlus className="h-4 w-4" /> Create {label} login
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a {label} login</DialogTitle>
            <DialogDescription>
              {props.kind === "city"
                ? `A Guest seat limited to ${props.orgName}. It sees only the City Portal: its tier, event invitations and matched partners.`
                : `A Guest seat linked to ${props.orgName}. It sees only the Vendor Portal: its application status, events and invoices.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
            <Field label="Sign-in email" hint="must match the Google or email account they use"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></Field>
            <p className="text-xs text-muted-foreground">Uses one seat. You can change or remove it any time in Users & Permissions.</p>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving ? "Creating…" : "Create login"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
