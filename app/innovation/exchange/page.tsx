"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Building2, CalendarDays, ClipboardList, Compass, DollarSign, ExternalLink, Eye, FileCheck, Handshake, Link2, Trash2, Users, Wand2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import { Empty, ModuleNav, PageTitle, Panel, SetupNotice, Stat } from "@/components/innovation/ui";
import { APPROVED, CATEGORIES } from "@/lib/innovation/constants";
import { errorText, isPastEvent, money, moduleSchemaReady, publicUrl, shortDate, stageOf, timeAgo, toNum } from "@/lib/innovation/data";
import { hasSampleData, loadSampleData, removeSampleData } from "@/lib/innovation/sample";
import { loadPartnerLinks, loadPermissions } from "@/lib/access/repo";
import { openTour } from "@/lib/innovation/tour";
import type { ActivityRow, ClientIntake, EventRow, EventVendor, VendorApplication, VendorInquiry } from "@/lib/innovation/types";
import type { PortalUser } from "@/lib/access/types";

type Attention = { href: string; title: string; detail: string; icon: React.ElementType };

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  } catch {
    toast.error("Copy isn’t available here");
  }
}

export default function VendorEventOverviewPage() {
  const router = useRouter();
  const { can, isAdmin, isRealAdmin, realUser, users, startPreview } = useAccess();
  const actor = realUser?.full_name || "DataIsData";
  const [loading, setLoading] = useState(true);
  const [inq, setInq] = useState<VendorInquiry[]>([]);
  const [apps, setApps] = useState<Pick<VendorApplication, "id" | "inquiry_id" | "status" | "score" | "created_at">[]>([]);
  const [eventVendors, setEventVendors] = useState<EventVendor[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [intakes, setIntakes] = useState<ClientIntake[]>([]);
  const [requests, setRequests] = useState<{ event_id: string; partner_id: string; sponsorship_tier: string }[]>([]);
  const [log, setLog] = useState<ActivityRow[]>([]);
  const [ready, setReady] = useState(true);
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logins, setLogins] = useState<{ city: PortalUser[]; vendor: PortalUser[] }>({ city: [], vendor: [] });

  const load = useCallback(async () => {
    const [a, b, c, d, e, f, g] = await Promise.all([
      supabase.from("vendor_inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("vendor_applications").select("id, inquiry_id, status, score, created_at"),
      supabase.from("event_vendors").select("*"),
      supabase.from("events").select("*").order("event_date"),
      supabase.from("client_intakes").select("*").order("created_at", { ascending: false }),
      supabase.from("event_vendor_requests").select("event_id, partner_id, sponsorship_tier").eq("status", "Pending"),
      supabase.from("innovation_activity").select("*").order("created_at", { ascending: false }).limit(8),
    ]);
    setInq((a.data as VendorInquiry[]) || []);
    setApps((b.data as typeof apps) || []);
    setEventVendors((c.data as EventVendor[]) || []);
    setEvents((d.data as EventRow[]) || []);
    setIntakes((e.data as ClientIntake[]) || []);
    setRequests(f.error ? [] : ((f.data as typeof requests) || []));
    setLog(g.error ? [] : ((g.data as ActivityRow[]) || []));
    const r = await moduleSchemaReady(true);
    setReady(r);
    setSample(r ? await hasSampleData() : false);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [perms, links] = await Promise.all([loadPermissions(), loadPartnerLinks()]);
        const has = (uid: string, m: string) => perms.some((p) => p.user_id === uid && p.module_key === m && p.can_view);
        const guests = users.filter((u) => u.seat_role === "guest" && u.status === "active");
        setLogins({
          city: guests.filter((u) => has(u.id, "client_portal")),
          vendor: guests.filter((u) => has(u.id, "partner_portal") && links.some((l) => l.user_id === u.id)),
        });
      } catch {
        /* seat tables may be browser-only */
      }
    })();
  }, [users]);

  const appBy = new Map(apps.filter((x) => x.inquiry_id).map((x) => [x.inquiry_id as string, x]));
  const stage = (i: VendorInquiry) => stageOf(i, appBy.get(i.id));
  const unscreened = inq.filter((i) => stage(i) === "unscreened");
  const pending = inq.filter((i) => stage(i) === "pending");
  const invited = inq.filter((i) => stage(i) === "invited");
  const approvedPartner = apps.filter((x) => x.status === "Approved Innovation Partner").length;
  const approvedEvent = apps.filter((x) => x.status === "Approved Event Participant").length;
  const booked = eventVendors.reduce((t, v) => t + toNum(v.fee), 0);
  const collected = eventVendors.filter((v) => v.paid).reduce((t, v) => t + toNum(v.fee), 0);
  const newIntakes = intakes.filter((c) => (c.status || "New") === "New");
  const upcoming = events.filter((e) => !isPastEvent(e)).slice(0, 4);
  const byCat = CATEGORIES.map((c) => [c, inq.filter((i) => i.core_service_category === c).length] as const).filter((x) => x[1] > 0).sort((x, y) => y[1] - x[1]);
  const max = Math.max(1, ...byCat.map((x) => x[1]));

  const attention: Attention[] = [
    ...unscreened.map((i) => ({ href: `/innovation/vendor-pipeline/${i.id}`, title: `New inquiry: ${i.company_name}`, detail: timeAgo(i.created_at), icon: ClipboardList })),
    ...pending.map((i) => ({ href: `/innovation/vendor-pipeline/${i.id}`, title: `Score application: ${i.company_name}`, detail: `Applied ${timeAgo(appBy.get(i.id)?.created_at)}`, icon: FileCheck })),
    ...requests.map((r) => ({ href: `/innovation/events/${r.event_id}`, title: `Spot request: ${r.sponsorship_tier}`, detail: events.find((e) => e.id === r.event_id)?.name || "Event", icon: CalendarDays })),
    ...newIntakes.map((c) => ({ href: `/innovation/client-intake/${c.id}`, title: `Review assessment: ${c.organization_name}`, detail: timeAgo(c.created_at), icon: Building2 })),
  ];

  async function sampleAction(add: boolean) {
    setBusy(true);
    try {
      if (add) {
        await loadSampleData(actor);
        toast.success("Sample data loaded");
      } else {
        const res = await removeSampleData(actor);
        toast.success(res.keptAccounts.length ? `Sample data removed. Kept ${res.keptAccounts.join(", ")} because real work is attached.` : "Sample data removed");
      }
    } catch (e) {
      toast.error(errorText(e, "Could not update the sample data"));
    }
    setBusy(false);
    load();
  }

  const preview = (u: PortalUser, path: string) => {
    startPreview(u.id);
    router.push(path);
  };

  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle
        title="Vendor & Event Module"
        subtitle="Run showcase events, curate the vendor ecosystem, and match approved partners to the cities and counties that need them. It works inside the Innovation pages you already have."
        actions={
          <>
            <Button variant="outline" className="h-10" onClick={() => openTour(0)}><Compass className="h-4 w-4" /> Start the walkthrough</Button>
            <Link href="/innovation/vendor-pipeline"><Button className="h-10">Open the pipeline <ArrowRight className="h-4 w-4" /></Button></Link>
          </>
        }
      />
      <SetupNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="New inquiries" value={unscreened.length} sub="Unscreened" icon={ClipboardList} href="/innovation/vendor-pipeline" />
        <Stat label="Pending review" value={pending.length} sub={`${invited.length} more invited`} tone="warn" icon={FileCheck} href="/innovation/vendor-pipeline" />
        <Stat label="Approved" value={approvedPartner + approvedEvent} sub={`${approvedPartner} partner · ${approvedEvent} event-only`} tone="ok" icon={Handshake} />
        <Stat label="Sponsorship revenue" value={money(booked)} sub={`${money(collected)} collected`} tone="ok" icon={DollarSign} href="/innovation/events" />
        <Stat label="Client intakes" value={intakes.length} sub={`${newIntakes.length} new to review`} tone="warn" icon={Building2} href="/innovation/client-intake" />
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">How it works</p>
          <h2 className="mt-1 text-lg font-bold">Four parts. DataIsData controls every gate.</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Public interest form", "Low friction, linked from your website or a QR code at events. Every submission lands as an unscreened inquiry.", "Public · New"],
            ["Invite-only application", "Tony sends a private link to the vendors he likes: profile, capability, financials, alignment, security.", "Private link · New"],
            ["Scoring & approval", "Six weighted criteria, 0–100. The score suggests a status; a reviewer decides, records why and confirms no conflict.", "Team · Upgraded"],
            ["Event records", "Approved vendors, sponsorship tier and fee, paid invoices, attending localities, leads and revenue.", "Approved only · Upgraded"],
          ].map(([t, d, tag], i) => (
            <li key={t} className="rounded-3xl bg-white p-5 shadow-md">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              <p className="mt-3 text-xs font-semibold text-primary">{tag}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 rounded-3xl bg-muted/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold">City intake is the same pattern, pointed the other way</h3>
            <p className="mt-1 text-sm text-muted-foreground">Localities fill out the public Innovation Assessment. Tony reviews it, assigns a tier and sees which approved partners fit.</p>
          </div>
          <Link href="/innovation/client-intake"><Button variant="outline" className="h-10 bg-white"><Building2 className="h-4 w-4" /> Client intake</Button></Link>
        </div>
      </section>

      <Panel title="Share the public pages">
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">No PIN or login needed. Put these on dataisdata.com, in email signatures or on a QR code at your events.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["Partner interest form", "/join/partner", "For vendors"],
            ["Innovation Assessment", "/join/assessment", "For cities, counties and agencies"],
          ] as const).map(([label, path, who]) => (
            <div key={path} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[40px_minmax(0,1fr)_auto]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><Link2 className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{who} · {publicUrl(path)}</span>
              </span>
              <span className="col-span-2 flex gap-2 sm:col-span-1">
                <Button size="sm" variant="outline" className="h-9" onClick={() => copy(publicUrl(path))}>Copy link</Button>
                <a href={path} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" className="h-9" aria-label={`Open ${label}`}><ExternalLink className="h-4 w-4" /></Button></a>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="One database, three kinds of login">
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">Everyone looks at the same records with different permissions. There’s no second system to keep updated.</p>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 ring-2 ring-primary/25">
            <p className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" /> DataIsData team</p>
            <p className="mt-1 text-sm text-muted-foreground">Sees everything: every vendor, score, decision, event, fee and locality.</p>
            <p className="mt-3 text-xs text-muted-foreground">Signed in as {actor}</p>
          </div>
          {([
            ["city", "A city", Building2, "Sees only its own tier, event invitations (and RSVPs) and matched partners. Later: its projects, cost avoidance and quarterly report.", "/portal/city", "Create one from a converted client intake."],
            ["vendor", "A vendor", Handshake, "Sees only its own application status, events, invoices and leads, and can request a spot at upcoming showcases. Never sees scores or notes.", "/portal/partner", "Create one from an approved vendor’s record."],
          ] as const).map(([k, title, Icon, body, path, how]) => (
            <div key={k} className="rounded-3xl bg-muted/70 p-5">
              <p className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {logins[k].slice(0, 3).map((u) =>
                  isRealAdmin ? (
                    <Button key={u.id} size="sm" variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal bg-white py-1.5 text-left" onClick={() => preview(u, path)}>
                      <Eye className="h-4 w-4" /> See {u.organization || u.full_name}’s view
                    </Button>
                  ) : (
                    <span key={u.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-border">{u.organization || u.full_name}</span>
                  )
                )}
                {logins[k].length === 0 && <p className="text-xs text-muted-foreground">No {k} logins yet. {how}</p>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Needs your attention" action={<span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">{attention.length}</span>}>
          {loading ? null : attention.length === 0 ? (
            <Empty>All caught up.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {attention.slice(0, 6).map((a) => (
                <li key={a.href + a.title}>
                  <Link href={a.href} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><a.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block text-xs text-muted-foreground">{a.detail}</span></span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming events" action={<Link href="/innovation/events" className="inline-flex min-h-10 items-center text-sm font-medium text-primary">All events</Link>}>
          {upcoming.length === 0 ? (
            <Empty>No upcoming events.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((e) => {
                const ev = eventVendors.filter((v) => v.event_id === e.id);
                return (
                  <li key={e.id}>
                    <Link href={`/innovation/events/${e.id}`} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><CalendarDays className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.name}</span><span className="block text-xs text-muted-foreground">{shortDate(e.event_date, false)}{e.location ? ` · ${e.location}` : ""} · {ev.length} vendor{ev.length === 1 ? "" : "s"}</span></span>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">{money(ev.reduce((t, v) => t + toNum(v.fee), 0))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Vendors by category">
          {byCat.length === 0 ? (
            <Empty>No vendors yet.</Empty>
          ) : (
            <div className="space-y-3">
              {byCat.map(([c, n]) => (
                <div key={c} className="grid grid-cols-[minmax(0,130px)_1fr_28px] items-center gap-3 text-sm">
                  <span className="truncate">{c}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></span>
                  <b className="text-right tabular-nums">{n}</b>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{inq.filter((i) => APPROVED.includes(appBy.get(i.id)?.status || "")).length} of {inq.length} approved</p>
            </div>
          )}
        </Panel>
        <Panel title="Activity" action={<span className="text-xs text-muted-foreground">Every step is time-stamped</span>}>
          {log.length === 0 ? (
            <Empty>{ready ? "Nothing logged yet." : "The activity log starts once the database update is run."}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {log.map((l) => (
                <li key={l.id} className="grid grid-cols-[8px_1fr_auto] items-start gap-3 py-2.5 text-sm">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-green-bright" />
                  <span className="min-w-0 break-words">{l.message}</span>
                  <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={l.created_at}>{timeAgo(l.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {isAdmin && ready && can("vendor_inquiries", "create") && (
        <Panel title="Sample data">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-muted-foreground">
              {sample
                ? "Sample records are loaded and marked with a Sample tag. Remove them in one click when you’re done showing the module."
                : "Load 8 fictional vendors, 3 localities and 3 events so every page has something to show. They’re tagged Sample and remove in one click."}
            </p>
            {sample ? (
              <Button variant="outline" className="h-10 border-red-200 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => sampleAction(false)}><Trash2 className="h-4 w-4" /> {busy ? "Removing…" : "Remove sample data"}</Button>
            ) : (
              <Button variant="outline" className="h-10" disabled={busy} onClick={() => sampleAction(true)}><Wand2 className="h-4 w-4" /> {busy ? "Loading…" : "Load sample data"}</Button>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
