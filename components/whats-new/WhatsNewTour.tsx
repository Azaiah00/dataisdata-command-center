"use client";

/**
 * "Explore what's new" walkthrough for the November 2026 engagement classification update.
 *
 * Shows a one-time welcome card when someone with Engagements access opens the portal, then walks
 * through every place the update appears on the real pages, outlining each new part as it goes.
 * It only reads and navigates: it never saves, creates or changes a record.
 *
 * TEMPORARY: remove this file and its two references (DashboardLayout.tsx and ModuleTour.tsx)
 * when the update no longer needs introducing. It also switches itself off at WHATS_NEW_UNTIL.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Minus, Sparkles, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptionalAccess } from "@/components/auth/AccessProvider";
import type { ModuleKey } from "@/lib/access/modules";
import { isPublicPath } from "@/lib/access/modules";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CLASSIFICATION_NEW_UNTIL, useIsNew } from "@/lib/engagementClassification";

export const WHATS_NEW_UNTIL = CLASSIFICATION_NEW_UNTIL;

/* ---------------- state (per browser, survives page changes) ---------------- */

type State = { seen: boolean; open: boolean; step: number };
const KEY = "did-whatsnew-2026-11-classification";
const EVENT = "did-whatsnew";
const DEFAULT: State = { seen: false, open: false, step: 0 };
let memory: State | null = null;
let snap: State | null = null;
let snapRaw: string | null = "__unset__";

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory || DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    return memory || DEFAULT;
  }
}
function write(s: State) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: still works for this visit */
  }
  snap = null;
  window.dispatchEvent(new Event(EVENT));
}
function getSnapshot(): State {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== snapRaw || !snap) {
    snapRaw = raw;
    snap = read();
  }
  return snap;
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function useWhatsNewState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((patch: Partial<State>) => write({ ...read(), ...patch }), []);
  return { state, ready, update };
}

/** True while this walkthrough's welcome card or steps are on screen (other tours stay out of the way). */
export function useWhatsNewBusy(): boolean {
  const { state, ready } = useWhatsNewState();
  const live = useIsNew(WHATS_NEW_UNTIL);
  const access = useOptionalAccess();
  const eligible = !!access && access.status === "ready" && access.can("engagements") && !access.isPreviewing;
  return ready && live && eligible && (!state.seen || state.open);
}

/* ---------------- steps ---------------- */

type Ctx = { engagementId: string | null; accountId: string | null };
type Step = {
  title: string;
  body: string;
  todo?: string;
  path: (c: Ctx) => string | null;
  /** data-tour value of the element to outline on that page. */
  target?: string;
  /** Click the target once it appears (only used for harmless things like switching a tab). */
  clickTarget?: boolean;
  module?: ModuleKey;
  action?: "view" | "create" | "edit";
  /** Only Owner and Admin seats see this step. */
  adminOnly?: boolean;
};

const STEPS: Step[] = [
  {
    title: "Engagements now have a classification",
    body: "Every engagement is now described in three separate ways: Engagement Type (how DataIsData is engaged), Service / Practice (what DataIsData delivers) and Revenue / Pricing Model (how it gets paid). Engagement Status is a fourth field, kept separate from the type. Your existing data is unchanged: the new fields start empty.",
    todo: "Use the four filters to narrow the list. The chips underneath count engagements in development, generating revenue, on hold and closed out.",
    path: () => "/engagements",
    target: "eng-filters",
    module: "engagements",
  },
  {
    title: "Classification on every row",
    body: "Under each engagement name you now see its type, service and revenue model. The Status column shows the Delivery Status (Planned, In Progress, On Hold, Complete) with the new Engagement Status underneath. \"Staff Aug\" is displayed as Staff Augmentation; the stored value has not changed.",
    path: () => "/engagements",
    target: "eng-table",
    module: "engagements",
  },
  {
    title: "The Classification card",
    body: "Each engagement page has a Classification card with all four fields. Anything not filled in yet shows as Not set. The link under the title opens the Glossary, which defines every choice.",
    path: (c) => (c.engagementId ? `/engagements/${c.engagementId}` : null),
    target: "eng-classification",
    module: "engagements",
  },
  {
    title: "Fill it in with Edit",
    body: "Press Edit to see the four dropdowns in the Engagement classification block. Pick a type, service, revenue model and status, then Save. Nothing changes until you press Save, and Cancel leaves the record exactly as it was.",
    todo: "Try opening Edit and the dropdowns, then press Cancel.",
    path: (c) => (c.engagementId ? `/engagements/${c.engagementId}` : null),
    target: "eng-edit",
    module: "engagements",
    action: "edit",
  },
  {
    title: "New engagements",
    body: "The New Engagement form has the same classification block, so new work is classified from the start. Example: Project-Based + Platform Development + Fixed Fee.",
    path: () => "/engagements/new",
    target: "eng-class-fields",
    module: "engagements",
    action: "create",
  },
  {
    title: "On each account",
    body: "On an account's Engagements tab, each engagement card now shows its type, service and revenue model.",
    path: (c) => (c.accountId ? `/accounts/${c.accountId}` : null),
    target: "account-engagements-tab",
    clickTarget: true,
    module: "accounts",
  },
  {
    title: "Awarded opportunities",
    body: "When you use Convert to engagement on an awarded opportunity, its service line now becomes the engagement's Service / Practice and its Engagement Status starts at Awarded, so converted work arrives already classified.",
    path: () => "/pipeline",
    module: "pipeline",
  },
  {
    title: "Reports by classification",
    body: "Reports has a new Engagements by Classification section: how many engagements are in development, generating revenue or closed out, and the count, contract value and average margin for each type, service, revenue model and status. The PDF download includes the same tables.",
    todo: "Switch between Engagement Type, Service / Practice, Revenue / Pricing Model and Engagement Status.",
    path: () => "/reports",
    target: "report-classification",
    module: "reports",
  },
  {
    title: "The Glossary",
    body: "A new Glossary page (in the sidebar under Insights) defines every Engagement Type, Service / Practice, Revenue Model and status, plus pipeline stages, innovation tiers and vendor scoring terms. Search it or jump to a section.",
    path: () => "/glossary",
    target: "glossary",
  },
  {
    title: "Edit the choices yourself",
    body: "Admin > Field Options lets Owner and Admin seats add, rename, reorder, hide or remove the choices in all four classification dropdowns, and edit their Glossary definitions. Changes apply to every form, filter, report and the Glossary at once. Renaming a choice can also update the engagements that use it; hiding or removing one never changes an engagement.",
    path: () => "/admin/field-options",
    target: "field-options",
    adminOnly: true,
  },
];

/* ---------------- component ---------------- */

export function WhatsNewTour() {
  const pathname = usePathname();
  const router = useRouter();
  const access = useOptionalAccess();
  const { state, ready, update } = useWhatsNewState();
  const live = useIsNew(WHATS_NEW_UNTIL);
  const [collapsed, setCollapsed] = useState(false);
  const [ctx, setCtx] = useState<Ctx>({ engagementId: null, accountId: null });

  const eligible = !!access && access.status === "ready" && access.can("engagements") && !access.isPreviewing && !isPublicPath(pathname);

  // Only the steps this seat can actually open.
  const steps = useMemo(
    () => (access ? STEPS.filter((s) => (!s.module || access.can(s.module, s.action || "view")) && (!s.adminOnly || access.isAdmin)) : []),
    [access]
  );
  const idx = Math.max(0, Math.min(steps.length - 1, state.step));
  const step = steps[idx];
  const target = step ? step.path(ctx) : null;
  const here = !!target && pathname === target;

  // A real engagement (and its account) to show the engagement and account steps on. Read only.
  useEffect(() => {
    if (!eligible || !live || (state.seen && !state.open) || ctx.engagementId) return;
    let alive = true;
    supabase
      .from("engagements")
      .select("id, account_id")
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .then(({ data }) => {
        const row = (data || [])[0] as { id: string; account_id: string | null } | undefined;
        if (alive && row) setCtx({ engagementId: row.id, accountId: row.account_id });
      });
    return () => {
      alive = false;
    };
  }, [eligible, live, state.seen, state.open, state.step, ctx.engagementId]);

  // Outline the step's element once it appears on the page.
  useEffect(() => {
    if (!state.open || !step?.target || !here) return;
    let el: HTMLElement | null = null;
    let tries = 0;
    const t = window.setInterval(() => {
      el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el || ++tries > 40) {
        window.clearInterval(t);
        if (!el) return;
        el.classList.add("tour-spotlight");
        // On phones the step card fills the bottom of the screen, so bring the item to the top instead.
        if (window.innerWidth < 640) {
          window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84), behavior: "smooth" });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        // Radix tabs switch on mousedown, so send that as well as a click.
        if (step.clickTarget) {
          el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
          el.click();
        }
      }
    }, 150);
    return () => {
      window.clearInterval(t);
      el?.classList.remove("tour-spotlight");
    };
  }, [state.open, step, here]);

  if (!ready || !live || !eligible || !steps.length) return null;

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, i));
    update({ step: n, open: true, seen: true });
    const p = steps[n].path(ctx);
    if (p && pathname !== p) router.push(p);
  };

  if (state.open && step) {
    const last = idx === steps.length - 1;
    return (
      <aside
        aria-label="What's new walkthrough"
        className="fixed z-[70] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[390px] rounded-3xl bg-white shadow-2xl ring-1 ring-border overflow-hidden print:hidden"
      >
        <div className="flex items-center gap-2 bg-brand-green-dark px-4 py-2 text-white">
          <Sparkles className="w-4 h-4 shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] truncate">
            What&apos;s new · {idx + 1} of {steps.length}
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
          <div className="h-full bg-brand-green-bright transition-all" style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
        </div>
        <div className={cn("px-4 pt-3 pb-3 sm:pt-4 max-h-[30vh] sm:max-h-[42vh] overflow-y-auto", collapsed && "hidden sm:block")} aria-live="polite">
          <div className="flex items-start gap-2">
            <h2 className="text-base font-bold text-foreground leading-snug">{step.title}</h2>
            <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold bg-secondary text-primary">New</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
          {step.todo && (
            <p className="mt-3 flex gap-2 rounded-2xl bg-muted px-3 py-2.5 text-sm text-brand-green-dark">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-bright" />
              <span>{step.todo}</span>
            </p>
          )}
          {!here && target && (
            <Button variant="outline" size="sm" className="mt-3 h-10" onClick={() => router.push(target)}>
              Take me there <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        {collapsed && <p className="px-4 pt-3 text-sm font-semibold text-foreground truncate sm:hidden">{step.title}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" className="h-10" onClick={() => goTo(idx - 1)} disabled={idx === 0}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          {last ? (
            <Button size="sm" className="h-10" onClick={() => update({ open: false, step: 0 })}>
              Finish
            </Button>
          ) : (
            <Button size="sm" className="h-10" onClick={() => goTo(idx + 1)}>
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>
    );
  }

  if (!state.seen) {
    return (
      <aside
        aria-label="What's new"
        className="fixed z-[70] bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[410px] rounded-3xl bg-white shadow-2xl ring-1 ring-border overflow-hidden print:hidden"
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
            <Sparkles className="w-4 h-4" /> Explore what&apos;s new
          </p>
          <h2 className="mt-2 text-xl font-bold leading-tight pr-8 flex items-center gap-2">
            <Tags className="w-5 h-5 shrink-0" /> Engagement classification
          </h2>
          <p className="mt-1 text-sm text-white/80">Type, service, revenue model and status on every engagement, the way you laid it out.</p>
        </div>
        <ul className="space-y-2 p-5 text-sm text-foreground max-h-[34vh] sm:max-h-none overflow-y-auto">
          {[
            "Engagement Type: how DataIsData is engaged (9 types)",
            "Service / Practice: what DataIsData delivers",
            "Revenue / Pricing Model: how the engagement gets paid",
            "Engagement Status: Identified through Closed, separate from delivery status",
            "Filters, account cards, opportunity conversion and Reports all use them",
            "A new Glossary page defines every term in one place",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="px-5 -mt-2 pb-3 text-xs text-muted-foreground">Your existing engagements are unchanged. The new fields start empty until you fill them in.</p>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" className="h-10" onClick={() => update({ seen: true })}>
            Not now
          </Button>
          <Button className="h-10" onClick={() => goTo(0)}>
            Take the tour <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </aside>
    );
  }

  // After the welcome card: a small pill to reopen the walkthrough while the update is new.
  return (
    <Button
      onClick={() => update({ open: true })}
      className="fixed z-[55] bottom-4 left-4 lg:left-[17rem] h-11 rounded-full shadow-xl print:hidden"
      aria-label="Open the What's new walkthrough"
    >
      <Sparkles className="w-4 h-4" /> What&apos;s new
    </Button>
  );
}
