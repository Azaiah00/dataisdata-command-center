"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, DollarSign, FileText, Lock, Receipt, Send, TrendingUp } from "lucide-react";
import { supabase, supabaseRaw } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import { Empty, KV, PageTitle, Panel, Stat, StageTracker, StatusBadge, selectClass } from "@/components/innovation/ui";
import { APPROVED, DECISIONS, SPONSORSHIP } from "@/lib/innovation/constants";
import { errorText, money, shortDate, toNum } from "@/lib/innovation/data";
import { formatDate } from "@/lib/utils";

type PartnerData = {
  partner: { id: string; name: string; vendor_status: string | null; category: string | null } | null;
  inquiry: { id: string; company_name: string; primary_contact: string | null; status: string | null; created_at: string; invited_at: string | null; invite_token: string | null } | null;
  application: {
    id: string;
    status: string | null;
    created_at: string;
    decided_at: string | null;
    years_in_business: number | null;
    legal_structure: string | null;
    certifications: string[] | null;
    core_offerings: string | null;
    problem_solved: string | null;
    contract_vehicles: string | null;
    compliance_standards: string | null;
  } | null;
  events: { id: string; name: string; event_date: string | null; location: string | null; status: string | null; tier: string | null; fee: number | null; paid: boolean | null; leads: number | null }[];
  open_events: { id: string; name: string; event_date: string | null; location: string | null; theme: string | null; requested_tier: string | null }[];
};

const MESSAGES: Record<string, [string, string]> = {
  "Invited to Apply": ["You’re invited to apply", "Complete the Strategic Partner Enrollment Application. It takes about 15 minutes."],
  "Pending Review": ["Application under review", "Thank you. DataIsData reviews every application against the same criteria, and you’ll hear back within two weeks."],
  "Approved Innovation Partner": ["Approved Innovation Partner", "You can join showcase events and be matched to localities for strategic partnerships."],
  "Approved Event Participant": ["Approved Event Participant", "You can join showcase events. DataIsData will revisit partner status as you build a track record with localities."],
  Conditional: ["Conditional approval", "DataIsData will follow up with what’s needed to complete your approval."],
  "Not Approved": ["Not approved at this time", "Thank you for applying. You’re welcome to reapply in six months."],
};

/** What a vendor login sees: only its own partner record. */
export default function PartnerPortalPage() {
  const { partnerId, isAdmin, user } = useAccess();
  const [selected, setSelected] = useState<string | null>(null);
  const [choices, setChoices] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tiers, setTiers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (partnerId) {
        setSelected(partnerId);
      } else if (isAdmin) {
        const { data: rows } = await supabase.from("partners").select("id, name, vendor_status").in("vendor_status", [...DECISIONS]).order("name");
        const list = ((rows as { id: string; name: string }[]) || []).map((r) => ({ id: r.id, name: r.name }));
        setChoices(list);
        setSelected(list[0]?.id || null);
        if (!list.length) setLoading(false);
      } else setLoading(false);
    })();
  }, [partnerId, isAdmin]);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const { data: d, error: err } = await supabaseRaw.rpc("partner_portal_data", { p_partner: selected });
    setError(err ? errorText(err, "Could not load your portal.") : "");
    setData((d as PartnerData) || null);
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function request(eventId: string) {
    if (!selected) return;
    setBusy(eventId);
    const tier = tiers[eventId] || SPONSORSHIP[0].tier;
    const { error: err } = await supabaseRaw.rpc("partner_portal_request_spot", { p_event: eventId, p_partner: selected, p_tier: tier, p_requested_by: user?.full_name || null });
    setBusy(null);
    if (err) return toast.error(errorText(err));
    toast.success("Request sent to DataIsData");
    load();
  }

  if (!loading && !selected) {
    return (
      <div className="space-y-6">
        <PageTitle title="Vendor Portal" subtitle="What a vendor login sees." />
        <Empty>{isAdmin ? "No vendors have been scored yet. Approve a vendor in the pipeline, then create its vendor login." : "This login isn’t linked to a vendor yet. Contact DataIsData."}</Empty>
      </div>
    );
  }

  const app = data?.application || null;
  const inq = data?.inquiry || null;
  const status = app?.status || data?.partner?.vendor_status || inq?.status || "Pending Review";
  const decided = (DECISIONS as readonly string[]).includes(status);
  const msg = MESSAGES[status] || MESSAGES["Pending Review"];
  const at = decided ? 3 : app ? 2 : inq?.status === "Invited to Apply" ? 1 : 0;
  const steps = [
    { label: "Interest form", detail: inq ? formatDate(inq.created_at) : "Received" },
    { label: "Invited to apply", detail: inq?.invited_at ? formatDate(inq.invited_at) : at > 1 ? "Done" : "Not yet" },
    { label: "Application", detail: app ? formatDate(app.created_at) : "Not yet" },
    { label: "Decision", detail: decided ? status : "Not yet" },
  ].map((s, i) => ({ ...s, state: (i < at || (i === 3 && decided) ? "done" : i === at ? "current" : "todo") as "done" | "current" | "todo" }));
  const total = (data?.events || []).reduce((t, e) => t + toNum(e.fee), 0);
  const paid = (data?.events || []).filter((e) => e.paid).reduce((t, e) => t + toNum(e.fee), 0);
  const leads = (data?.events || []).reduce((t, e) => t + (e.leads || 0), 0);
  const firstName = (user?.full_name || inq?.primary_contact || "").split(" ")[0];
  const name = data?.partner?.name || inq?.company_name || "Your company";
  const approved = APPROVED.includes(status);

  return (
    <div className="space-y-6">
      <PageTitle
        title={user?.seat_role === "guest" && firstName ? `Welcome, ${firstName}` : name}
        subtitle={`${name} · Partner portal`}
        actions={
          choices.length > 1 ? (
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Vendor</span>
              <select className={selectClass} value={selected || ""} onChange={(e) => setSelected(e.target.value)}>
                {choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null
        }
      />
      {isAdmin && user?.seat_role !== "guest" && (
        <p className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">You’re seeing a vendor’s portal as an admin. To see exactly what a vendor login sees, use See their view on the vendor’s record.</p>
      )}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      ) : (
        <>
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Your status</p>
                <h2 className="mt-1 text-xl font-bold">{msg[0]}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{msg[1]}</p>
              </div>
              {inq?.invite_token && !app && (
                <a href={`/join/apply/${inq.invite_token}`}>
                  <Button className="h-10"><FileText className="h-4 w-4" /> Complete your application</Button>
                </a>
              )}
            </div>
            <div className="mt-5"><StageTracker steps={steps} /></div>
          </Panel>
          {approved && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Events booked" value={data?.events.length || 0} sub={`${(data?.events || []).filter((e) => e.status !== "Completed").length} upcoming`} icon={CalendarDays} />
              <Stat label="Sponsorships" value={money(total)} sub={total - paid > 0 ? `${money(total - paid)} due` : "Nothing due"} tone={total - paid > 0 ? "warn" : "ok"} icon={DollarSign} />
              <Stat label="Paid" value={money(paid)} sub={paid > 0 ? "Thank you" : "Nothing paid yet"} tone={paid > 0 ? "ok" : undefined} icon={Receipt} />
              <Stat label="Leads from events" value={leads} sub="Shared after each event" icon={TrendingUp} />
            </div>
          )}
          {(data?.events.length || 0) > 0 && (
            <Panel title="Your events">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 pr-3">Event</th><th className="py-2.5 pr-3">Date</th><th className="py-2.5 pr-3">Tier</th><th className="py-2.5 pr-3 text-right">Fee</th><th className="py-2.5 pr-3">Invoice</th><th className="py-2.5 text-right">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.events.map((e) => (
                      <tr key={e.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-3 font-semibold text-[#111827]">{e.name}</td>
                        <td className="py-3 pr-3">{shortDate(e.event_date)}</td>
                        <td className="py-3 pr-3">{e.tier || "Showcase"}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{money(e.fee)}</td>
                        <td className="py-3 pr-3"><StatusBadge status={e.paid ? "Paid" : "Invoice sent"} /></td>
                        <td className="py-3 text-right tabular-nums">{e.leads ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2.5 md:hidden">
                {data!.events.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-border p-3.5">
                    <p className="font-semibold text-[#111827]">{e.name}</p>
                    <p className="text-sm text-muted-foreground">{shortDate(e.event_date)} · {e.tier || "Showcase"} · {money(e.fee)}{e.leads != null ? ` · ${e.leads} leads` : ""}</p>
                    <div className="mt-2"><StatusBadge status={e.paid ? "Paid" : "Invoice sent"} /></div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
          {approved && (
            <Panel title="Upcoming showcases you can join">
              <p className="-mt-2 mb-3 text-xs text-muted-foreground">Request a spot. DataIsData confirms it and sends the invoice.</p>
              {(data?.open_events.length || 0) === 0 ? (
                <Empty>No other upcoming showcases right now.</Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {data!.open_events.map((e) => (
                    <li key={e.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary sm:flex"><CalendarDays className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#111827]">{e.name}</p>
                        <p className="text-sm text-muted-foreground">{shortDate(e.event_date)}{e.location ? ` · ${e.location}` : ""}{e.theme ? ` · ${e.theme}` : ""}</p>
                      </div>
                      {e.requested_tier ? (
                        <StatusBadge status={`Requested: ${e.requested_tier}`} className="bg-amber-50 text-amber-700" />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <label className="sr-only" htmlFor={`rq-${e.id}`}>Sponsorship tier for {e.name}</label>
                          <select id={`rq-${e.id}`} className={`${selectClass} sm:w-56`} value={tiers[e.id] || SPONSORSHIP[0].tier} onChange={(x) => setTiers((t) => ({ ...t, [e.id]: x.target.value }))}>
                            {SPONSORSHIP.map((t) => <option key={t.tier} value={t.tier}>{t.tier} · {money(t.fee)}</option>)}
                          </select>
                          <Button className="h-10" disabled={busy === e.id} onClick={() => request(e.id)}><Send className="h-4 w-4" /> Request a spot</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {app && (
            <Panel title="Your application">
              <KV
                rows={[
                  ["Submitted", formatDate(app.created_at)],
                  ["Years in business", app.years_in_business],
                  ["Legal structure", app.legal_structure],
                  ["Certifications", (app.certifications || []).join(", ")],
                  ["Core offerings", app.core_offerings],
                  ["Problem solved", app.problem_solved],
                  ["Contract vehicles", app.contract_vehicles],
                  ["Compliance", app.compliance_standards],
                ]}
              />
            </Panel>
          )}
          <p className="flex items-start gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This login only sees {name}’s own application and events. Scores, reviewer notes and other vendors stay internal to DataIsData.</span>
          </p>
        </>
      )}
    </div>
  );
}
