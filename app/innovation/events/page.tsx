"use client";

import { Can } from "@/components/auth/AccessProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, DollarSign, MapPin, Plus, Receipt, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Empty, HowItWorks, ModuleNav, PageTitle, SampleBadge, SetupNotice, Stat, StatusBadge } from "@/components/innovation/ui";
import { SPONSORSHIP } from "@/lib/innovation/constants";
import { isPastEvent, money, shortDate, toNum } from "@/lib/innovation/data";
import type { EventAttendee, EventRow, EventVendor } from "@/lib/innovation/types";

type Row = EventRow & { is_sample?: boolean | null };

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [requests, setRequests] = useState<{ event_id: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      const [ev, ve, at, rq] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: true, nullsFirst: false }),
        supabase.from("event_vendors").select("*"),
        supabase.from("event_attendees").select("*"),
        supabase.from("event_vendor_requests").select("event_id").eq("status", "Pending"),
      ]);
      setEvents((ev.data as Row[]) || []);
      setVendors((ve.data as EventVendor[]) || []);
      setAttendees(at.error ? [] : ((at.data as EventAttendee[]) || []));
      setRequests(rq.error ? [] : ((rq.data as { event_id: string }[]) || []));
      setLoading(false);
    }
    loadData();
  }, []);

  const booked = vendors.reduce((t, v) => t + toNum(v.fee), 0);
  const collected = vendors.filter((v) => v.paid).reduce((t, v) => t + toNum(v.fee), 0);
  const leads = events.reduce((t, e) => t + (e.post_event_leads || 0), 0);
  const upcoming = events.filter((e) => !isPastEvent(e));
  const list = [...upcoming, ...events.filter(isPastEvent).reverse()];

  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle
        title="Vendor Showcase Events"
        subtitle="Put approved partners in front of localities. Only approved vendors can be added, and every fee is published so localities always know who paid to be in the room."
        actions={
          <Can module="events" action="create">
            <Link href="/innovation/events/new">
              <Button className="h-10"><Plus className="h-4 w-4" /> New event</Button>
            </Link>
          </Can>
        }
      />
      <SetupNotice />
      <HowItWorks
        id="events"
        title="Running an event from start to finish"
        steps={[
          "Create the event: date, location, theme and audience.",
          "Add approved vendors at a sponsorship tier. The fee fills in and an invoice is marked as sent.",
          "Invite localities. Their replies come straight from each city’s own login.",
          "Mark invoices paid as money comes in. Revenue on the event updates from paid fees.",
          "After the event, record the leads it produced and tick off the follow-up tasks.",
        ]}
        whatsNew={["Paid / invoice-sent tracking per sponsor", "Locality invitations and RSVPs", "Vendor spot requests from their own login", "Follow-up tasks per event"]}
        tourStep={5}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue booked" value={money(booked)} sub={`${vendors.length} sponsorships`} icon={DollarSign} />
        <Stat label="Collected" value={money(collected)} sub={booked - collected > 0 ? `${money(booked - collected)} outstanding` : "All collected"} tone={booked - collected > 0 ? "warn" : "ok"} icon={Receipt} />
        <Stat label="Leads generated" value={leads} sub="Recorded after each event" icon={TrendingUp} />
        <Stat label="Upcoming events" value={upcoming.length} sub={`${events.length} in total`} icon={CalendarDays} />
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {SPONSORSHIP.map((t) => (
          <div key={t.tier} className="rounded-3xl bg-muted/70 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.tier}</p>
            <p className="mt-1 text-xl font-bold">{money(t.fee)}</p>
            <p className="text-xs text-muted-foreground">{t.description} · {vendors.filter((v) => v.sponsorship_tier === t.tier).length} booked</p>
          </div>
        ))}
      </section>
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      ) : list.length === 0 ? (
        <Empty>No events yet. Create one with New event.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const ev = vendors.filter((v) => v.event_id === e.id);
            const going = attendees.filter((a) => a.event_id === e.id && a.rsvp === "yes").length;
            const req = requests.filter((r) => r.event_id === e.id).length;
            return (
              <Link key={e.id} href={`/innovation/events/${e.id}`} className="grid content-start gap-2.5 rounded-3xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{shortDate(e.event_date)}</p>
                  <StatusBadge status={isPastEvent(e) && e.status !== "Completed" ? "Completed" : e.status || "Planned"} />
                </div>
                <p className="text-lg font-bold leading-snug text-[#111827]">{e.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {e.location || "Location to be set"}{e.theme ? ` · ${e.theme}` : ""}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-semibold">
                  <span className="rounded-full bg-white px-2.5 py-0.5 ring-1 ring-border">{ev.length} vendor{ev.length === 1 ? "" : "s"}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 ring-1 ring-border">{going} attending</span>
                  {req > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700">{req} request{req === 1 ? "" : "s"}</span>}
                  {isPastEvent(e) && <span className="rounded-full bg-white px-2.5 py-0.5 ring-1 ring-border">{e.post_event_leads || 0} leads</span>}
                  <SampleBadge show={e.is_sample} />
                  <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-primary">{money(ev.reduce((t, v) => t + toNum(v.fee), 0))}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
