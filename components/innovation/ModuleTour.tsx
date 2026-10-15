"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Compass, Minus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useOptionalAccess } from "@/components/auth/AccessProvider";
import { TOUR_STEPS, onStep, useTour } from "@/lib/innovation/tour";
import { cn } from "@/lib/utils";

const MODULE_PATHS = ["/innovation/exchange", "/innovation/vendor-pipeline", "/innovation/events", "/innovation/client-intake", "/innovation/vendor-inquiry", "/innovation/vendor-application", "/portal", "/join"];

/**
 * Floating demo cards that walk Tony (or anyone on the team) through the
 * Vendor & Event Module on the real pages, plus a one-time "What's new" card.
 */
export function ModuleTour() {
  const pathname = usePathname();
  const router = useRouter();
  const access = useOptionalAccess();
  const { state, ready, update } = useTour();
  const [collapsed, setCollapsed] = useState(false);
  if (!ready) return null;

  const isTeam = !!access && access.status === "ready" && access.can("innovation_exchange");
  const onModulePage = MODULE_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));
  const step = TOUR_STEPS[state.step] || TOUR_STEPS[0];
  const last = state.step === TOUR_STEPS.length - 1;

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(TOUR_STEPS.length - 1, i));
    update({ step: n, open: true, seen: true });
    if (!onStep(pathname, TOUR_STEPS[n])) router.push(TOUR_STEPS[n].path);
  };

  if (state.open) {
    const here = onStep(pathname, step);
    return (
      <aside
        aria-label="Vendor & Event Module walkthrough"
        className="fixed z-[60] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px] rounded-3xl bg-white shadow-2xl ring-1 ring-border overflow-hidden print:hidden"
      >
        <div className="flex items-center gap-2 bg-brand-green-dark px-4 py-2 text-white">
          <Compass className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] truncate">
            Walkthrough · {state.step + 1} of {TOUR_STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
            aria-label={collapsed ? "Show step details" : "Hide step details"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => update({ open: false })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white sm:ml-auto"
            aria-label="Minimize walkthrough"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        <div className="h-1 bg-border">
          <div className="h-full bg-brand-green-bright transition-all" style={{ width: `${((state.step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>
        <div className={cn("px-4 pt-4 pb-3 max-h-[42vh] overflow-y-auto", collapsed && "hidden sm:block")} aria-live="polite">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-bold text-foreground leading-snug">{step.title}</h2>
            {step.badge && (
              <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", step.badge === "New" ? "bg-secondary text-primary" : "bg-blue-50 text-blue-700")}>
                {step.badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
          {step.todo && (
            <p className="mt-3 flex gap-2 rounded-2xl bg-muted px-3 py-2.5 text-sm text-brand-green-dark">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-bright" />
              <span>{step.todo}</span>
            </p>
          )}
          {!here && (
            <Button variant="outline" size="sm" className="mt-3 h-10" onClick={() => router.push(step.path)}>
              Take me there <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        {collapsed && <p className="px-4 pt-3 text-sm font-semibold text-foreground truncate sm:hidden">{step.title}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" className="h-10" onClick={() => goTo(state.step - 1)} disabled={state.step === 0}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {last ? (
            <Button size="sm" className="h-10" onClick={() => update({ open: false, step: 0 })}>
              Finish
            </Button>
          ) : (
            <Button size="sm" className="h-10" onClick={() => goTo(state.step + 1)}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>
    );
  }

  // One-time "What's new" card for the team, on the dashboard and Innovation pages.
  if (!state.seen && isTeam && !access?.isPreviewing && (pathname === "/" || pathname?.startsWith("/innovation"))) {
    return (
      <aside
        aria-label="What's new"
        className="fixed z-[60] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[400px] rounded-3xl bg-white shadow-2xl ring-1 ring-border overflow-hidden print:hidden"
      >
        <div className="relative bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted p-5 text-white">
          <button
            type="button"
            onClick={() => update({ seen: true })}
            className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
            <Sparkles className="w-4 h-4" /> New in Innovation
          </p>
          <h2 className="mt-2 text-xl font-bold leading-tight pr-8">Vendor & Event Module</h2>
          <p className="mt-1 text-sm text-white/80">Run showcase events, curate vendors and match them to the cities that need them.</p>
        </div>
        <ul className="space-y-2 p-5 text-sm text-foreground">
          {[
            "Public interest form and invite-only application by private link",
            "Weighted 0–100 scoring with a recorded decision and conflict check",
            "Event records with paid invoices, locality RSVPs, leads and revenue",
            "City intake with tiers and matching, plus city and vendor logins",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" className="h-10" onClick={() => update({ seen: true })}>
            Not now
          </Button>
          <Button
            className="h-10"
            onClick={() => {
              update({ open: true, seen: true, step: 0 });
              if (!onStep(pathname, TOUR_STEPS[0])) router.push(TOUR_STEPS[0].path);
            }}
          >
            Take the walkthrough <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </aside>
    );
  }

  // Public pages show the pill only in a browser that has used the walkthrough (never to real visitors).
  if (onModulePage && (isTeam || (!access && state.seen))) {
    return (
      <Button
        onClick={() => update({ open: true, seen: true })}
        className="fixed z-[60] bottom-4 right-4 sm:bottom-5 sm:right-5 h-11 rounded-full shadow-xl print:hidden"
        aria-label="Open the walkthrough"
      >
        <Compass className="w-4 h-4" /> Walkthrough {state.step + 1}/{TOUR_STEPS.length}
      </Button>
    );
  }
  return null;
}
