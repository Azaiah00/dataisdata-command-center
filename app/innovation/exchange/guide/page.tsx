"use client";

import { CheckCircle2, Compass, Database, FileCheck, Lock, Receipt, Scale, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleNav, PageTitle, Panel } from "@/components/innovation/ui";
import { TOUR_STEPS, openTour } from "@/lib/innovation/tour";

const CHANGES: { area: string; before: string; now: string; tag: "New" | "Upgraded" }[] = [
  { area: "Vendor & Event Module overview", before: "–", now: "Headline numbers, what needs attention, upcoming events, activity log, the public links to share, the three logins and sample data.", tag: "New" },
  { area: "Public interest form", before: "Vendor Inquiries › Open Public Form only worked inside the portal (behind the PIN).", now: "A real public page at /join/partner. No PIN, no login, spam protection. Lands as an unscreened inquiry.", tag: "New" },
  { area: "Vendor Pipeline", before: "Separate Vendor Inquiries and Vendor Applications lists.", now: "One board by stage: Unscreened, Invited, Pending review, Approved, Conditional / not approved.", tag: "New" },
  { area: "Invite to apply", before: "Changed the status label only.", now: "Creates a private, unguessable link and a ready-to-send email. Only that link opens the application.", tag: "Upgraded" },
  { area: "Invite-only application", before: "Typed in by the team.", now: "The vendor fills it out at /join/apply/… and it attaches to their inquiry automatically.", tag: "New" },
  { area: "Scoring & approval", before: "Six number boxes, a status menu, and a separate Approve and Create Partner button.", now: "Same six criteria and weights, as sliders with a live 0–100 total and suggested status. A reason and a conflict-of-interest check are required. Approving creates or updates the Partner record.", tag: "Upgraded" },
  { area: "Event records", before: "Vendors with tier and fee, plus leads and revenue typed in by hand.", now: "Paid / invoice-sent per sponsor, revenue filled in from paid fees, locality invitations and RSVPs, vendor spot requests, follow-up tasks, status.", tag: "Upgraded" },
  { area: "Client intake", before: "Tier, estimate and readiness as text boxes.", now: "Public Innovation Assessment at /join/assessment, tier cards, readiness slider, partner matching by challenge, the independence rule, event invitations and a city login.", tag: "Upgraded" },
  { area: "City login", before: "–", now: "A Guest seat limited to one account. Sees only the City Portal: tier, readiness, invitations with RSVP, matched partners.", tag: "New" },
  { area: "Vendor login", before: "–", now: "A Guest seat linked to one partner. Sees only the Vendor Portal: status, events, invoices, leads, and spot requests.", tag: "New" },
  { area: "Walkthrough & help", before: "–", now: "A guided walkthrough across the real pages, a one-time What’s new card, and a How this page works card on every page.", tag: "New" },
];

const GUARDRAILS = [
  ["Published vendor fees", "Every event shows which vendors paid and at what tier, and the city portal shows it too. Localities always know who paid to be in the room.", Receipt],
  ["Independence rule", "When DataIsData advises a locality, it takes no revenue share on deals between that locality and the vendors, and recommends at least two options per need.", ShieldCheck],
  ["Same score for everyone", "Six weighted criteria applied to every applicant. The score suggests; a named reviewer decides and records why.", Star],
  ["Conflict check on every decision", "The reviewer confirms no financial interest beyond published event fees before a decision is saved.", CheckCircle2],
  ["Audit trail", "Inquiries, invitations, applications, decisions, payments, RSVPs and requests are time-stamped in the activity log.", TrendingUp],
  ["Invite-only applications", "The detailed application opens only from a private link. Nobody self-enrolls into the ecosystem.", Lock],
] as const;

const PHASES = [
  { n: "1", title: "Now: this module", now: true, items: ["Public interest form → unscreened inquiry", "Invite-only application by private link", "Weighted 0–100 scoring and approval statuses", "Event records: vendors, sponsorship tier, attendees, leads, revenue", "City intake: Innovation Assessment, review, tier"], why: "Tony is hosting events now, so it’s useful immediately and brings in vendor fees right away. It’s lower risk than the dashboards and builds the ecosystem the later modules need." },
  { n: "2", title: "Next", items: ["Project tracking with cost avoidance as the headline number", "Read-only client portal for paying cities (the City Portal grows into this)", "Quarterly report for each client"] },
  { n: "3", title: "Once several cities are on it", items: ["Maturity score with comparisons across cities (the Maturity Index page is the start)", "Grant tracking"] },
  { n: "4", title: "Later, if at all", items: ["Public-private partnership tracker", "AI-readiness layer"] },
];

export default function ModuleGuidePage() {
  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle
        title="Guide: what’s new and how it works"
        subtitle="Everything this update added to the Command Center, the rules built into the workflow, and what comes next."
        actions={<Button className="h-10" onClick={() => openTour(0)}><Compass className="h-4 w-4" /> Start the walkthrough</Button>}
      />

      <Panel title="Getting started">
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            ["Run the database update", "Supabase → SQL Editor → paste supabase/2026-10-vendor-event-module.sql → Run. Safe to run more than once.", Database],
            ["Share the public links", "Copy the Partner interest form and Innovation Assessment links from the module overview. Put them on dataisdata.com and on event QR codes.", FileCheck],
            ["Take the walkthrough", "It moves through the real pages in about eight minutes. Load sample data first if the pages are empty.", Compass],
          ].map(([t, d, Icon], i) => {
            const I = Icon as React.ElementType;
            return (
              <li key={t as string} className="rounded-3xl bg-muted/70 p-5">
                <span className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span><I className="h-4 w-4 text-primary" /> {t as string}</span>
                <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel title="What was added and what changed">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pr-4">Area</th>
                <th className="py-2.5 pr-4">Before</th>
                <th className="py-2.5 pr-4">Now</th>
              </tr>
            </thead>
            <tbody>
              {CHANGES.map((c) => (
                <tr key={c.area} className="border-b border-border align-top last:border-0">
                  <td className="py-3 pr-4 font-semibold">
                    {c.area}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${c.tag === "New" ? "bg-secondary text-primary" : "bg-blue-50 text-blue-700"}`}>{c.tag}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.before}</td>
                  <td className="py-3 pr-4">{c.now}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">
          {CHANGES.map((c) => (
            <div key={c.area} className="rounded-2xl border border-border p-4 text-sm">
              <p className="font-semibold">{c.area} <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${c.tag === "New" ? "bg-secondary text-primary" : "bg-blue-50 text-blue-700"}`}>{c.tag}</span></p>
              {c.before !== "–" && <p className="mt-1 text-muted-foreground"><b className="font-semibold">Before:</b> {c.before}</p>}
              <p className="mt-1"><b className="font-semibold">Now:</b> {c.now}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="The flow, step by step">
        <ol className="grid gap-3 md:grid-cols-2">
          {TOUR_STEPS.slice(1, -1).map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-border p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold">{s.title.replace(/^\d+\.\s*/, "")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                <Button variant="link" className="h-auto p-0 pt-2 text-sm" onClick={() => openTour(i + 1)}>Show me</Button>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Guardrails built into the workflow">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GUARDRAILS.map(([t, d, Icon]) => (
            <div key={t} className="rounded-2xl bg-muted/70 p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><Scale className="mt-0.5 h-4 w-4 shrink-0" /> Have counsel review the fee, revenue-share and advisory policies before the first paid event. Public procurement rules vary by state and locality.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Internal plus client access, in sync">
          <p className="text-sm text-muted-foreground">One database and one app, with three kinds of login. “In sync” means everyone is looking at the same records with different permissions. There’s no second system to keep updated.</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><b>DataIsData team:</b> sees everything.</li>
            <li><b>A city:</b> sees only its own projects, scores and reports (today: tier, invitations, matches).</li>
            <li><b>A vendor:</b> sees only its own application and events.</li>
          </ul>
        </Panel>
        <Panel title="Selling it: option D, in sequence">
          <ol className="space-y-2 text-sm">
            <li><b>1. Use it internally</b> to run Tony’s own events and engagements.</li>
            <li><b>2. Give paying clients a login</b> to view their own data.</li>
            <li><b>3. License it later,</b> only after several localities are paying: to other firms or as a multi-state product.</li>
          </ol>
        </Panel>
      </div>

      <Panel title="Build order from here">
        <ol className="divide-y divide-border">
          {PHASES.map((p) => (
            <li key={p.n} className="grid grid-cols-[44px_1fr] gap-4 py-4 first:pt-0 last:pb-0">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold ${p.now ? "bg-primary text-white" : "bg-muted text-primary"}`}>{p.n}</span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">{p.title}{p.now && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary">Live now</span>}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{p.items.map((x) => <li key={x}>{x}</li>)}</ul>
                {p.why && <p className="mt-2 text-sm text-muted-foreground">{p.why}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Before a city signs">
        <p className="text-sm text-muted-foreground">City IT departments will ask about security and hosting before they sign anything. This is in place or planned:</p>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <li className="rounded-2xl bg-muted/70 p-3"><b>Real database:</b> the Command Center’s Supabase project.</li>
          <li className="rounded-2xl bg-muted/70 p-3"><b>Real logins:</b> the planned Google / email sign-in. City and vendor logins are Guest seats.</li>
          <li className="rounded-2xl bg-muted/70 p-3"><b>Separate data per client:</b> today the portal limits each seat; after the Phase 2 sign-in step, Postgres enforces it with row-level security (this module is included).</li>
          <li className="rounded-2xl bg-muted/70 p-3"><b>Security answers:</b> where data lives, encryption, access logs, backups and who can see what. Worth writing up once and reusing.</li>
        </ul>
      </Panel>
    </div>
  );
}
