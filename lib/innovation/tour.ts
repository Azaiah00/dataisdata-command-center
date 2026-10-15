/**
 * Guided walkthrough of the Vendor & Event Module.
 * The steps move through the real Command Center pages. State is kept per
 * browser so the walkthrough survives page changes and reloads.
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface TourStep {
  title: string;
  body: string;
  todo?: string;
  path: string;
  /** Other paths where this step still counts as "you are here". */
  alsoOn?: string[];
  badge?: "New" | "Upgraded";
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the Vendor & Event Module",
    body: "This walkthrough moves through the real pages in your Command Center. It covers how vendors get in, how you score them, how events are run, how cities come in, and what a city or vendor login sees. About eight minutes.",
    todo: "If the pages are empty, press Load sample data on this page first. Sample records are clearly marked and remove in one click.",
    path: "/innovation/exchange",
    badge: "New",
  },
  {
    title: "1. A vendor raises their hand",
    body: "This is the public interest form. No PIN, no login. Link it from dataisdata.com, an email signature or a QR code at your events. Every submission lands as an unscreened inquiry.",
    todo: "Fill it out as a made-up company and press Submit interest.",
    path: "/join/partner",
    alsoOn: ["/join/partner/thanks"],
    badge: "New",
  },
  {
    title: "2. It lands as an unscreened inquiry",
    body: "The Vendor Pipeline shows every company by stage. Nobody is in your ecosystem until you invite them.",
    todo: "Open a card in Unscreened inquiries, then press Invite to apply.",
    path: "/innovation/vendor-pipeline",
    badge: "New",
  },
  {
    title: "3. The invite-only application",
    body: "Inviting creates a private link and a ready-to-send email. Only that link opens the full Strategic Partner Enrollment Application.",
    todo: "On a vendor in Invited to apply, press Open their application link, fill it in as the vendor and submit it.",
    path: "/innovation/vendor-pipeline",
    alsoOn: ["/join/apply"],
    badge: "New",
  },
  {
    title: "4. Score and approve",
    body: "The same six weighted criteria as before, now with sliders. The 0–100 score suggests a status. You make the call, record why, and confirm the conflict-of-interest check. Approving creates the Partner record in CRM › Partners.",
    todo: "Open a vendor in Pending review, move the sliders and press Record decision.",
    path: "/innovation/vendor-pipeline",
    badge: "Upgraded",
  },
  {
    title: "5. Event records",
    body: "Each event tracks its vendors, sponsorship tier and fee, which invoices are paid, invited localities and their replies, leads and revenue. Only approved vendors can be added. Revenue fills in from paid fees.",
    todo: "Open an event. Add an approved vendor, mark the invoice paid and invite a locality.",
    path: "/innovation/events",
    badge: "Upgraded",
  },
  {
    title: "6. City intake",
    body: "The same pattern pointed the other way. A locality fills out the public Innovation Assessment. You review it, assign a tier and readiness score, and see which approved partners fit the challenges it named.",
    todo: "Open an intake, choose a tier and press Save review. Then Convert to client account.",
    path: "/innovation/client-intake",
    badge: "Upgraded",
  },
  {
    title: "7. The city's login",
    body: "One database, three kinds of login. A city login is a Guest seat limited to that city's account. It sees only its own tier, event invitations (and can RSVP) and the partners matched to it.",
    todo: "On a converted intake press Create city login, then See their view. Use Exit preview in the yellow bar to come back.",
    path: "/innovation/client-intake",
    alsoOn: ["/portal/city"],
    badge: "New",
  },
  {
    title: "8. The vendor's login",
    body: "A vendor login sees only its own application status, events, invoices and leads, and can request a spot at upcoming showcases. It never sees scores or reviewer notes.",
    todo: "On an approved vendor press Create vendor login, then See their view and request a spot. Exit preview, and the request is waiting on the event.",
    path: "/innovation/vendor-pipeline",
    alsoOn: ["/portal/partner"],
    badge: "New",
  },
  {
    title: "What's new and what comes next",
    body: "The guide lists everything that was added or upgraded, the guardrails built into the workflow, and the build order from here: project tracking with cost avoidance, the client portal and quarterly report, then maturity comparisons and grants.",
    path: "/innovation/exchange/guide",
    badge: "New",
  },
];

const KEY = "did-vem-tour-v1";
const EVENT = "did-vem-tour";

export interface TourState {
  open: boolean;
  step: number;
  /** The "What's new" card has been seen or dismissed. */
  seen: boolean;
}

const DEFAULT: TourState = { open: false, step: 0, seen: false };

function read(): TourState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return memory || DEFAULT;
    const s = JSON.parse(raw) as Partial<TourState>;
    return { ...DEFAULT, ...s, step: Math.max(0, Math.min(TOUR_STEPS.length - 1, Number(s.step) || 0)) };
  } catch {
    return memory || DEFAULT;
  }
}

let memory: TourState | null = null;
function write(s: TourState) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the tour still works for this visit */
  }
  snapshot = null;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: s }));
}

/** Open the walkthrough from anywhere (e.g. a "Walkthrough" button). */
export function openTour(step?: number) {
  const s = read();
  write({ ...s, open: true, seen: true, step: step === undefined ? s.step : step });
}

let snapshot: TourState | null = null;
let snapshotRaw: string | null = "__unset__";
function getSnapshot(): TourState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== snapshotRaw || !snapshot) {
    snapshotRaw = raw;
    snapshot = read();
  }
  return snapshot;
}
function subscribe(cb: () => void) {
  const on = () => cb();
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
}

export function useTour() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((patch: Partial<TourState>) => {
    write({ ...read(), ...patch });
  }, []);
  return { state, ready, update };
}

export function onStep(pathname: string | null, step: TourStep): boolean {
  const p = pathname || "/";
  const match = (x: string) => p === x || p.startsWith(x + "/");
  return match(step.path) || (step.alsoOn || []).some(match);
}
