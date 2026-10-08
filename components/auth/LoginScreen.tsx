"use client";

import { useState } from "react";
import { useAccess } from "./AccessProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand/BrandMark";
import { ROLE_LABELS } from "@/lib/access/types";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2, Mail, ShieldCheck, FlaskConical, AlertTriangle, Ban } from "lucide-react";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const ROLE_TONE: Record<string, string> = {
  owner: "bg-primary text-white",
  admin: "bg-brand-green-bright/15 text-brand-green-bright",
  member: "bg-slate-100 text-slate-700",
  guest: "bg-amber-50 text-amber-700",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge className={cn("border-none", ROLE_TONE[role] || ROLE_TONE.member, className)}>
      {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
    </Badge>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3a7.2 7.2 0 0 1-10.71-3.78h-4v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.34 14.31a7.2 7.2 0 0 1 0-4.62V6.6h-4a12 12 0 0 0 0 10.8l4-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.34 6.6l4 3.09A7.17 7.17 0 0 1 12 4.75z" />
    </svg>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted p-12 text-white">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full bg-brand-green-bright/30 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={44} rounded="rounded-xl" className="ring-white/20" />
          <span className="text-2xl font-bold font-mono tracking-tight">DataIsData</span>
        </div>
        <div className="relative space-y-5 max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/dataisdata-mark-silver.png" alt="" className="w-40 h-40 opacity-90 drop-shadow-2xl" />
          <h1 className="text-4xl font-bold tracking-tight leading-tight">Command Center</h1>
          <p className="text-white/80 text-lg">
            One secure home for DataIsData accounts, engagements, pipeline, innovation programs and finance.
          </p>
        </div>
        <p className="relative text-xs text-white/60">Access is managed per seat. Contact an administrator for changes.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <BrandMark size={40} rounded="rounded-xl" />
            <span className="text-2xl font-bold font-mono tracking-tight">DataIsData</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { authMode, users, signInDemo, signInGoogle, signInEmailLink, storageMode, error } = useAccess();
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const order: Record<string, number> = { owner: 0, admin: 1, member: 2, guest: 3 };
  const activeSeats = users.filter((u) => u.status === "active").sort((a, b) => (order[a.seat_role] ?? 9) - (order[b.seat_role] ?? 9) || a.full_name.localeCompare(b.full_name));

  return (
    <Shell>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign in</h2>
        <p className="text-muted-foreground">
          {authMode === "google"
            ? "Use the Google account tied to your DataIsData seat."
            : "Demo sign-in is enabled while seats and permissions are being tested."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl text-base gap-3"
          disabled={authMode !== "google"}
          onClick={() => {
            setBusy("google");
            signInGoogle().finally(() => setBusy(null));
          }}
        >
          {busy === "google" ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          Continue with Google
          {authMode !== "google" && (
            <Badge className="ml-1 bg-slate-100 text-slate-600 border-none">Coming next</Badge>
          )}
        </Button>

        {authMode === "google" && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setBusy("email");
              const err = await signInEmailLink(email);
              setBusy(null);
              setEmailMsg(err ? err : "Check your inbox for a secure sign-in link.");
            }}
          >
            <p className="text-xs text-muted-foreground text-center">No Google account? Get a one-time sign-in link.</p>
            <div className="flex gap-2">
              <Input type="email" placeholder="you@agency.gov" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              <Button type="submit" variant="secondary" className="h-11" disabled={busy === "email"}>
                {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              </Button>
            </div>
            {emailMsg && <p className="text-xs text-center text-primary font-medium">{emailMsg}</p>}
          </form>
        )}
      </div>

      {authMode === "demo" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <FlaskConical className="w-3.5 h-3.5" /> Demo sign-in
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {activeSeats.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={!!busy}
                onClick={() => {
                  setBusy(u.id);
                  signInDemo(u.id).finally(() => setBusy(null));
                }}
                className="group w-full flex items-center gap-3 rounded-2xl border border-border bg-white p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {initials(u.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{u.full_name}</span>
                    <RoleBadge role={u.seat_role} />
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {[u.title, u.organization].filter(Boolean).join(" · ") || u.email || "DataIsData seat"}
                  </span>
                </span>
                {busy === u.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </button>
            ))}
            {!activeSeats.length && <p className="text-sm text-muted-foreground">No active seats found.</p>}
          </div>
          {storageMode === "local" && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
              Seat tables are not installed in Supabase yet, so seats and permissions are saved in this browser only.
            </p>
          )}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" /> Every seat only sees what an administrator has enabled.
      </p>
    </Shell>
  );
}

export function BlockedScreen({ kind }: { kind: "unauthorized" | "suspended" | "error" }) {
  const { unauthorizedEmail, signOut, error, refresh } = useAccess();
  const copy = {
    unauthorized: {
      title: "This account doesn't have a seat yet",
      body: `${unauthorizedEmail || "This email"} is not on the DataIsData seat list. Ask Tony or Azaiah to add you, then sign in again.`,
    },
    suspended: {
      title: "Your seat is paused",
      body: "An administrator has paused access for this seat. Reach out to DataIsData if you think this is a mistake.",
    },
    error: {
      title: "We couldn't load your access",
      body: error || "Something went wrong while loading seats and permissions.",
    },
  }[kind];
  return (
    <Shell>
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <Ban className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="text-muted-foreground">{copy.body}</p>
        <div className="flex gap-2">
          {kind === "error" && <Button onClick={() => refresh()}>Try again</Button>}
          <Button variant="outline" onClick={() => signOut()}>
            Back to sign in
          </Button>
        </div>
      </div>
    </Shell>
  );
}
