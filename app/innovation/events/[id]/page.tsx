"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, Check, DollarSign, Handshake, Plus, Receipt, Send, Trash2, TrendingUp, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/components/auth/AccessProvider";
import { Empty, KV, ModuleNav, Panel, SampleBadge, SetupNotice, Stat, StatusBadge, selectClass } from "@/components/innovation/ui";
import { APPROVED, EVENT_STATUSES, SPONSORSHIP, defaultFee } from "@/lib/innovation/constants";
import { errorText, logActivity, money, shortDate, syncEventRevenue, timeAgo, toNum } from "@/lib/innovation/data";
import type { EventAttendee, EventRequest, EventRow, EventTask, EventVendor, PartnerLite } from "@/lib/innovation/types";
import { cn } from "@/lib/utils";

type AccountLite = { id: string; name: string; account_type: string | null };

export default function EventDetailPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { can, realUser } = useAccess();
  const actor = realUser?.full_name || "DataIsData";
  const canEdit = can("events", "edit");
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<(EventRow & { is_sample?: boolean | null }) | null>(null);
  const [partners, setPartners] = useState<PartnerLite[]>([]);
  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [pick, setPick] = useState("");
  const [tier, setTier] = useState<string>("Showcase");
  const [fee, setFee] = useState(String(defaultFee("Showcase")));
  const [city, setCity] = useState("");
  const [leads, setLeads] = useState("");
  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [ev, pa, ve, rq, at, ac, tk] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase.from("partners").select("id, name, vendor_status, vendor_score, innovation_category").order("name"),
      supabase.from("event_vendors").select("*").eq("event_id", eventId),
      supabase.from("event_vendor_requests").select("*").eq("event_id", eventId).eq("status", "Pending").order("created_at"),
      supabase.from("event_attendees").select("*").eq("event_id", eventId).order("invited_at"),
      supabase.from("accounts").select("id, name, account_type").order("name"),
      supabase.from("event_tasks").select("*").eq("event_id", eventId).order("created_at"),
    ]);
    const e = (ev.data as EventRow) || null;
    setEvent(e);
    setLeads(e?.post_event_leads != null ? String(e.post_event_leads) : "");
    // Older databases may not have innovation_category yet.
    if (pa.error) {
      const fallback = await supabase.from("partners").select("id, name, vendor_status, vendor_score").order("name");
      setPartners((fallback.data as PartnerLite[]) || []);
    } else setPartners((pa.data as PartnerLite[]) || []);
    setVendors((ve.data as EventVendor[]) || []);
    setRequests(rq.error ? [] : ((rq.data as EventRequest[]) || []));
    setAttendees(at.error ? [] : ((at.data as EventAttendee[]) || []));
    setAccounts((ac.data as AccountLite[]) || []);
    setTasks(tk.error ? [] : ((tk.data as EventTask[]) || []));
    setLoading(false);
  }, [eventId, setTasks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const partnerName = useCallback((pid: string) => partners.find((p) => p.id === pid)?.name || "Partner", [partners]);
  const accountName = useCallback((aid: string) => accounts.find((a) => a.id === aid)?.name || "Locality", [accounts]);
  const eligible = useMemo(() => partners.filter((p) => APPROVED.includes(p.vendor_status || "") && !vendors.some((v) => v.partner_id === p.id)), [partners, vendors]);
  const invitable = useMemo(() => accounts.filter((a) => !attendees.some((x) => x.account_id === a.id)), [accounts, attendees]);
  const pickId = eligible.some((p) => p.id === pick) ? pick : eligible[0]?.id || "";
  const cityId = invitable.some((a) => a.id === city) ? city : invitable[0]?.id || "";

  const booked = vendors.reduce((t, v) => t + toNum(v.fee), 0);
  const collected = vendors.filter((v) => v.paid).reduce((t, v) => t + toNum(v.fee), 0);
  const going = attendees.filter((a) => a.rsvp === "yes").length;

  async function run(fn: () => Promise<{ error: unknown } | void>, ok?: string, after?: () => Promise<void>) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res && res.error) {
      toast.error(errorText(res.error));
      return false;
    }
    if (after) await after();
    if (ok) toast.success(ok);
    await load();
    return true;
  }

  async function addVendor(pid: string, t: string, f: number, fromRequest?: EventRequest) {
    if (!event) return;
    const res = await run(
      async () => supabase.from("event_vendors").insert([{ event_id: eventId, partner_id: pid, sponsorship_tier: t, fee: f, paid: false }]),
      fromRequest ? "Request approved and invoiced" : "Vendor added and invoiced",
      async () => {
        if (fromRequest) await supabase.from("event_vendor_requests").update({ status: "Approved", decided_at: new Date().toISOString() }).eq("id", fromRequest.id);
        await logActivity(`${partnerName(pid)} added to ${event.name} as ${t} (${money(f)})${fromRequest ? " from its request" : ""}`, "event", eventId, actor);
      }
    );
    return res;
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (!event) {
    return (
      <div className="space-y-6">
        <ModuleNav />
        <Empty>Event not found. <Link href="/innovation/events" className="font-semibold text-primary">Back to events</Link></Empty>
      </div>
    );
  }

  const paidToggle = (v: EventVendor, big = false) => (
    <button
      type="button"
      disabled={!canEdit || busy}
      onClick={() =>
        run(
          async () => supabase.from("event_vendors").update({ paid: !v.paid, paid_at: v.paid ? null : new Date().toISOString() }).eq("event_id", eventId).eq("partner_id", v.partner_id),
          v.paid ? "Marked unpaid" : "Marked paid",
          async () => {
            await syncEventRevenue(eventId);
            await logActivity(`${partnerName(v.partner_id)}: ${event.name} fee marked ${v.paid ? "unpaid" : "paid"}`, "event", eventId, actor);
          }
        )
      }
      aria-label={v.paid ? `${partnerName(v.partner_id)} paid. Mark as unpaid` : `${partnerName(v.partner_id)} invoice sent. Mark as paid`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors disabled:cursor-default",
        big ? "min-h-10" : "min-h-8",
        v.paid ? "bg-secondary text-primary hover:bg-accent" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
      )}
    >
      {v.paid ? <><Check className="h-3.5 w-3.5" /> Paid</> : "Invoice sent"}
    </button>
  );
  const removeBtn = (v: EventVendor) =>
    canEdit && (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        aria-label={`Remove ${partnerName(v.partner_id)}`}
        disabled={busy}
        onClick={() =>
          run(async () => supabase.from("event_vendors").delete().eq("event_id", eventId).eq("partner_id", v.partner_id), "Vendor removed", async () => {
            await syncEventRevenue(eventId);
            await logActivity(`${partnerName(v.partner_id)} removed from ${event.name}`, "event", eventId, actor);
          })
        }
      >
        <X className="h-4 w-4" />
      </Button>
    );

  return (
    <div className="space-y-6">
      <ModuleNav />
      <Link href="/innovation/events" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Events</Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{shortDate(event.event_date)}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111827] break-words">{event.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[#6B7280]">
            <span>{[event.location, event.target_audience].filter(Boolean).join(" · ") || "Details to be set"}</span>
            <SampleBadge show={event.is_sample} />
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium sm:w-56">
          Event status
          <select
            className={selectClass}
            value={event.status || "Planned"}
            disabled={!canEdit || busy}
            onChange={(e) => {
              const s = e.target.value;
              run(async () => supabase.from("events").update({ status: s }).eq("id", eventId), "Status updated", async () => logActivity(`${event.name} marked ${s}`, "event", eventId, actor));
            }}
          >
            {EVENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <SetupNotice />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Revenue booked" value={money(booked)} sub={`${vendors.length} sponsor${vendors.length === 1 ? "" : "s"}`} icon={DollarSign} />
        <Stat label="Collected" value={money(collected)} sub={booked - collected > 0 ? `${money(booked - collected)} outstanding` : "All collected"} tone={booked - collected > 0 ? "warn" : "ok"} icon={Receipt} />
        <Stat label="Vendors" value={vendors.length} sub="Approved partners only" icon={Handshake} />
        <Stat label="Localities attending" value={going} sub={`${attendees.length} invited`} icon={Building2} />
        <div className="flex h-full items-start justify-between gap-3 rounded-3xl bg-white p-5 shadow-md">
          <div className="min-w-0">
            <label htmlFor="ev-leads" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Leads generated</label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="ev-leads"
                inputMode="numeric"
                className="h-11 w-24 text-xl font-bold"
                value={leads}
                disabled={!canEdit}
                onChange={(e) => setLeads(e.target.value.replace(/\D/g, ""))}
                onBlur={() => {
                  const n = leads === "" ? null : Number(leads);
                  if (n === (event.post_event_leads ?? null)) return;
                  run(async () => supabase.from("events").update({ post_event_leads: n }).eq("id", eventId), "Leads saved", async () => logActivity(`${event.name}: ${n ?? 0} leads recorded`, "event", eventId, actor));
                }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-muted-foreground">Update after the event</p>
          </div>
          <span className="hidden shrink-0 rounded-2xl bg-muted p-3 text-primary min-[420px]:flex"><TrendingUp className="h-5 w-5" /></span>
        </div>
      </div>

      <Panel
        title="Participating vendors"
        action={!canEdit ? <span className="text-xs text-muted-foreground">View only</span> : eligible.length === 0 ? <span className="text-xs text-muted-foreground">Every approved vendor is already on this event</span> : null}
      >
        {canEdit && eligible.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_120px_auto]">
            <label className="sr-only" htmlFor="ev-vendor">Approved vendor</label>
            <select id="ev-vendor" className={selectClass} value={pickId} onChange={(e) => setPick(e.target.value)}>
              {eligible.map((p) => <option key={p.id} value={p.id}>{p.name}{p.vendor_score != null ? ` (${p.vendor_score})` : ""}</option>)}
            </select>
            <label className="sr-only" htmlFor="ev-tier">Sponsorship tier</label>
            <select id="ev-tier" className={selectClass} value={tier} onChange={(e) => { setTier(e.target.value); setFee(String(defaultFee(e.target.value))); }}>
              {SPONSORSHIP.map((t) => <option key={t.tier} value={t.tier}>{t.tier}</option>)}
            </select>
            <label className="sr-only" htmlFor="ev-fee">Fee</label>
            <Input id="ev-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Fee in dollars" />
            <Button className="h-10" disabled={busy || !pickId} onClick={() => addVendor(pickId, tier, Number(fee) || 0)}><Plus className="h-4 w-4" /> Add vendor</Button>
          </div>
        )}
        {requests.length > 0 && (
          <div className="mb-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Requests from vendor logins</p>
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{partnerName(r.partner_id)} asked for a <b>{r.sponsorship_tier}</b> spot ({money(defaultFee(r.sponsorship_tier))}) · {timeAgo(r.created_at)}</span>
                {canEdit && (
                  <span className="flex gap-2">
                    <Button size="sm" className="h-9" disabled={busy} onClick={() => addVendor(r.partner_id, r.sponsorship_tier, defaultFee(r.sponsorship_tier), r)}>Approve</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 bg-white"
                      disabled={busy}
                      onClick={() =>
                        run(async () => supabase.from("event_vendor_requests").update({ status: "Declined", decided_at: new Date().toISOString() }).eq("id", r.id), "Request declined", async () =>
                          logActivity(`${partnerName(r.partner_id)}: ${r.sponsorship_tier} request for ${event.name} declined`, "event", eventId, actor)
                        )
                      }
                    >
                      Decline
                    </Button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {vendors.length === 0 ? (
          <Empty>No vendors yet. Approve vendors in the pipeline, then add them here.</Empty>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-3">Vendor</th>
                    <th className="py-2.5 pr-3">Sponsorship tier</th>
                    <th className="py-2.5 pr-3 text-right">Fee</th>
                    <th className="py-2.5 pr-3">Invoice</th>
                    <th className="py-2.5"><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.partner_id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3"><Link href={`/partners/${v.partner_id}`} className="inline-flex min-h-10 items-center font-semibold text-[#111827] hover:text-primary">{partnerName(v.partner_id)}</Link></td>
                      <td className="py-2 pr-3">{v.sponsorship_tier || "Showcase"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{money(v.fee)}</td>
                      <td className="py-2 pr-3">{paidToggle(v)}</td>
                      <td className="py-2 text-right">{removeBtn(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2.5 md:hidden">
              {vendors.map((v) => (
                <div key={v.partner_id} className="rounded-2xl border border-border p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/partners/${v.partner_id}`} className="inline-flex min-h-10 items-center font-semibold text-[#111827]">{partnerName(v.partner_id)}</Link>
                    {removeBtn(v)}
                  </div>
                  <p className="text-sm text-muted-foreground">{v.sponsorship_tier || "Showcase"} · {money(v.fee)}</p>
                  <div className="mt-2">{paidToggle(v, true)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Localities"
          className="lg:col-span-2"
          action={
            canEdit && invitable.length > 0 ? (
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <label className="sr-only" htmlFor="ev-city">Locality</label>
                <select id="ev-city" className={cn(selectClass, "sm:w-60")} value={cityId} onChange={(e) => setCity(e.target.value)}>
                  {invitable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <Button
                  variant="outline"
                  className="h-10"
                  disabled={busy || !cityId}
                  onClick={() =>
                    run(async () => supabase.from("event_attendees").insert([{ event_id: eventId, account_id: cityId }]), "Invitation sent", async () => logActivity(`${accountName(cityId)} invited to ${event.name}`, "event", eventId, actor))
                  }
                >
                  <Send className="h-4 w-4" /> Invite
                </Button>
              </div>
            ) : null
          }
        >
          {attendees.length === 0 ? (
            <Empty>No localities invited yet. Invite accounts from CRM; they reply from their own city login.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {attendees.map((a) => (
                <li key={a.account_id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><Building2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/accounts/${a.account_id}`} className="font-semibold text-[#111827] hover:text-primary">{accountName(a.account_id)}</Link>
                    <span className="block text-xs text-muted-foreground">Invited {timeAgo(a.invited_at)}{a.responded_at ? ` · replied ${timeAgo(a.responded_at)}` : ""}</span>
                  </span>
                  <StatusBadge status={a.rsvp === "yes" ? "Attending" : a.rsvp === "no" ? "Can't attend" : "Invited, no reply"} />
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      aria-label={`Remove ${accountName(a.account_id)}`}
                      disabled={busy}
                      onClick={() => run(async () => supabase.from("event_attendees").delete().eq("event_id", eventId).eq("account_id", a.account_id), "Invitation removed")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Replies come straight from each city’s own login.</p>
        </Panel>
        <Panel title="Details">
          <KV
            rows={[
              ["Theme", event.theme],
              ["Capacity", event.capacity],
              ["Registration link", event.registration_link],
              ["Cost to attendees", event.cost_to_attendees == null || toNum(event.cost_to_attendees) === 0 ? "Free" : money(event.cost_to_attendees)],
              ["Notes", event.notes],
            ]}
          />
        </Panel>
      </div>

      <Panel title="Follow-up tasks">
        {tasks.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No tasks yet.</p>}
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                  checked={t.done}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const done = e.target.checked;
                    setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, done } : x)));
                    supabase.from("event_tasks").update({ done }).eq("id", t.id).then(({ error }) => {
                      if (error) toast.error(errorText(error));
                      else if (done) logActivity(`Task done: ${t.title}`, "event", eventId, actor);
                    });
                  }}
                />
                <span className={cn(t.done && "text-muted-foreground line-through")}>{t.title}</span>
              </label>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Delete task: ${t.title}`} onClick={() => run(async () => supabase.from("event_tasks").delete().eq("id", t.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const title = newTask.trim();
              if (!title) return;
              run(async () => supabase.from("event_tasks").insert([{ event_id: eventId, title: title.slice(0, 300) }]), undefined, async () => setNewTask(""));
            }}
          >
            <label className="sr-only" htmlFor="task-in">New task</label>
            <Input id="task-in" placeholder="Add a follow-up task" value={newTask} onChange={(e) => setNewTask(e.target.value)} className="min-w-0" />
            <Button type="submit" variant="outline" className="h-10 shrink-0" disabled={busy}><Plus className="h-4 w-4" /> Add</Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
