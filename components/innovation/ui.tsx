"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertTriangle, BookOpen, Building2, CalendarDays, ChevronDown, ChevronRight, Compass, Info, Layers, SquareKanban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import type { ModuleKey } from "@/lib/access/modules";
import { statusTone } from "@/lib/innovation/constants";
import { moduleSchemaReady } from "@/lib/innovation/data";
import { openTour } from "@/lib/innovation/tour";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: React.ElementType; module: ModuleKey; match: string[] }[] = [
  { href: "/innovation/exchange", label: "Overview", icon: Layers, module: "innovation_exchange", match: ["/innovation/exchange"] },
  { href: "/innovation/vendor-pipeline", label: "Vendor pipeline", icon: SquareKanban, module: "vendor_inquiries", match: ["/innovation/vendor-pipeline", "/innovation/vendor-inquiry", "/innovation/vendor-application"] },
  { href: "/innovation/events", label: "Events", icon: CalendarDays, module: "events", match: ["/innovation/events"] },
  { href: "/innovation/client-intake", label: "Client intake", icon: Building2, module: "client_intake", match: ["/innovation/client-intake"] },
  { href: "/innovation/exchange/guide", label: "Guide", icon: BookOpen, module: "innovation_exchange", match: ["/innovation/exchange/guide"] },
];

/** Crumbs + tab bar shown at the top of every Vendor & Event Module page. */
export function ModuleNav() {
  const pathname = usePathname() || "";
  const { canSee } = useAccess();
  const tabs = TABS.filter((t) => canSee(t.module));
  const activeHref = (() => {
    // The most specific match wins (Guide over Overview).
    let best = "";
    for (const t of tabs) for (const m of t.match) if ((pathname === m || pathname.startsWith(m + "/")) && m.length > best.length) best = t.href + "|" + m;
    return best.split("|")[0];
  })();
  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>Innovation</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">Vendor & Event Module</span>
        </p>
        <Button variant="ghost" size="sm" className="h-9 text-primary" onClick={() => openTour()}>
          <Compass className="h-4 w-4" /> Walkthrough
        </Button>
      </div>
      {tabs.length > 1 && (
        <nav aria-label="Vendor & Event Module" className="-mx-1 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-border [scrollbar-width:none]">
          {tabs.map((t) => {
            const on = activeHref === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors",
                  on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/**
 * "How this page works" instruction card. Remembers if it was collapsed.
 * `whatsNew` lists what this page adds compared with before.
 */
export function HowItWorks({
  id,
  title,
  steps,
  whatsNew,
  tourStep,
}: {
  id: string;
  title: string;
  steps: string[];
  whatsNew?: string[];
  tourStep?: number;
}) {
  const key = `did-vem-help-${id}`;
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(key) !== "closed";
      } catch {
        return true;
      }
    },
    () => true
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? stored;
  const toggle = () => {
    const next = !open;
    setOverride(next);
    try {
      localStorage.setItem(key, next ? "open" : "closed");
    } catch {
      /* ignore */
    }
  };
  return (
    <section className="rounded-3xl bg-muted/70 ring-1 ring-border print:hidden">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
          <Info className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">How this page works</span>
          {!open && <span className="block truncate text-xs text-muted-foreground">{title}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          {whatsNew && whatsNew.length > 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">New on this page</p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                {whatsNew.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              {tourStep !== undefined && (
                <Button variant="outline" size="sm" className="mt-3 h-9" onClick={() => openTour(tourStep)}>
                  <Compass className="h-4 w-4" /> Show me in the walkthrough
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Shown when the module's database update has not been run yet. */
export function SetupNotice() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    moduleSchemaReady().then(setReady).catch(() => setReady(false));
  }, []);
  if (ready !== false || hidden) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">One database step left</p>
        <p className="mt-1">
          Run <code className="rounded bg-white/70 px-1">supabase/2026-10-vendor-event-module.sql</code> in Supabase → SQL Editor. Until then, invite links, scoring
          details, event payments, RSVPs and the city and vendor logins can&apos;t be saved.
        </p>
      </div>
      <button type="button" onClick={() => setHidden(true)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-amber-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return <span className={cn("inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone(status), className)}>{status}</span>;
}

export function SampleBadge({ show }: { show?: boolean | null }) {
  if (!show) return null;
  return <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Sample</span>;
}

/** Interest form → invited → application → decision. */
export function StageTracker({ steps }: { steps: { label: string; detail: string; state: "done" | "current" | "todo" }[] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4" aria-label="Enrollment progress">
      {steps.map((s) => (
        <li key={s.label} className="min-w-0">
          <span
            className={cn(
              "block h-1.5 rounded-full",
              s.state === "done" ? "bg-primary" : s.state === "current" ? "bg-gradient-to-r from-primary from-50% to-border to-50%" : "bg-border"
            )}
          />
          <span className={cn("mt-2 block text-xs font-semibold", s.state === "todo" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
          <span className="block truncate text-xs text-muted-foreground">{s.detail}</span>
        </li>
      ))}
    </ol>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#111827]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[#6B7280]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon: Icon, href }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "ok" | "warn"; icon: React.ElementType; href?: string }) {
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-3xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
        {sub && <p className={cn("mt-1.5 text-xs font-semibold", tone === "ok" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-muted-foreground")}>{sub}</p>}
      </div>
      <span className="hidden shrink-0 rounded-2xl bg-muted p-3 text-primary min-[420px]:flex">
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Panel({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-3xl bg-white p-5 shadow-md sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium text-foreground", className)}>
      <span>
        {label}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const selectClass =
  "h-10 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm max-md:text-base max-md:h-11";

export function Chips({ items, tone = "outline" }: { items: (string | null | undefined)[] | null | undefined; tone?: "outline" | "green" }) {
  const list = (items || []).filter(Boolean) as string[];
  if (!list.length) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {list.map((x) => (
        <span key={x} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tone === "green" ? "bg-secondary text-primary" : "bg-white ring-1 ring-border text-foreground")}>
          {x}
        </span>
      ))}
    </span>
  );
}

/** A list of label/value rows that stacks on phones. */
export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[minmax(130px,190px)_1fr] sm:gap-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="mb-2 min-w-0 whitespace-pre-line break-words sm:mb-0">{v === null || v === undefined || v === "" ? "–" : v}</dd>
        </div>
      ))}
    </dl>
  );
}
