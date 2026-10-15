"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Gauge, Handshake, Layers, Lock, Receipt, TrendingUp } from "lucide-react";
import { supabase, supabaseRaw } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import { Chips, Empty, KV, PageTitle, Panel, Stat, selectClass } from "@/components/innovation/ui";
import { TIER_DESCRIPTIONS } from "@/lib/innovation/constants";
import { errorText, money, shortDate, toNum } from "@/lib/innovation/data";
import { formatDate } from "@/lib/utils";

type CityData = {
  account: { id: string; name: string; innovation_tier: string | null; readiness_score: number | null } | null;
  intake: {
    id: string;
    organization_name: string;
    contact_name: string | null;
    status: string | null;
    assigned_tier: string | null;
    readiness_score: number | null;
    top_challenges: string[] | null;
    current_initiatives: string | null;
    interested_in: string[] | null;
    advisory_engagement: boolean | null;
    created_at: string;
  } | null;
  events: { id: string; name: string; event_date: string | null; location: string | null; theme: string | null; status: string | null; cost_to_attendees: number | null; rsvp: "yes" | "no" | null; sponsors: { name: string; tier: string | null; fee: number | null }[] }[];
  matches: { name: string; category: string | null; status: string | null; description: string | null }[];
};

const past = (e: { status: string | null; event_date: string | null }) => e.status === "Completed" || (!!e.event_date && new Date(e.event_date + "T23:59:59").getTime() < Date.now());

/** What a city login sees: only its own account. */
export default function CityPortalPage() {
  const { scopedAccountIds, isAdmin, user } = useAccess();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [choices, setChoices] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Which account(s) this seat may open.
  useEffect(() => {
    (async () => {
      if (scopedAccountIds && scopedAccountIds.length) {
        const { data: rows } = await supabase.from("accounts").select("id, name").in("id", scopedAccountIds);
        const list = (rows as { id: string; name: string }[]) || [];
        setChoices(list);
        setAccountId(list[0]?.id || scopedAccountIds[0]);
      } else if (isAdmin) {
        const { data: rows } = await supabase.from("client_intakes").select("account_id, organization_name").not("account_id", "is", null);
        const list = ((rows as { account_id: string; organization_name: string }[]) || []).map((r) => ({ id: r.account_id, name: r.organization_name }));
        const uniq = list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i);
        setChoices(uniq);
        setAccountId(uniq[0]?.id || null);
        if (!uniq.length) setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, [scopedAccountIds, isAdmin]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data: d, error: err } = await supabaseRaw.rpc("city_portal_data", { p_account: accountId });
    if (err) setError(errorText(err, "Could not load your portal."));
    else setError("");
    setData((d as CityData) || null);
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function rsvp(eventId: string, value: "yes" | "no", current: "yes" | "no" | null) {
    if (!accountId) return;
    setBusy(eventId);
    const next = current === value ? null : value;
    const { error: err } = await supabaseRaw.rpc("city_portal_rsvp", { p_event: eventId, p_account: accountId, p_rsvp: next });
    setBusy(null);
    if (err) return toast.error(errorText(err));
    toast.success(next === "yes" ? "See you there" : next === "no" ? "Reply sent" : "Reply cleared");
    load();
  }

  if (!loading && !accountId) {
    return (
      <div className="space-y-6">
        <PageTitle title="City Portal" subtitle="What a city login sees." />
        <Empty>{isAdmin ? "No client accounts yet. Convert a client intake to an account, then create its city login." : "This login isn’t linked to a city account yet. Contact DataIsData."}</Empty>
      </div>
    );
  }

  const intake = data?.intake || null;
  const tier = intake?.assigned_tier || data?.account?.innovation_tier || null;
  const readiness = intake?.readiness_score ?? data?.account?.readiness_score ?? null;
  const upcoming = (data?.events || []).filter((e) => !past(e));
  const done = (data?.events || []).filter(past);
  const firstName = (user?.full_name || intake?.contact_name || "").split(" ")[0];
  const name = data?.account?.name || intake?.organization_name || "Your city";

  return (
    <div className="space-y-6">
      <PageTitle
        title={user?.seat_role === "guest" && firstName ? `Welcome, ${firstName}` : name}
        subtitle={`${name} · Innovation portal`}
        actions={
          choices.length > 1 ? (
            <label className="grid gap-1 text-sm font-medium">
              <span className="sr-only">Account</span>
              <select className={selectClass} value={accountId || ""} onChange={(e) => setAccountId(e.target.value)}>
                {choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null
        }
      />
      {isAdmin && user?.seat_role !== "guest" && (
        <p className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">You’re seeing a city’s portal as an admin. To see exactly what a city login sees, use Preview as… in your account menu or See their view on the intake.</p>
      )}
      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      ) : (
        <>
          {(!intake || intake.status === "New") && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">DataIsData is reviewing your Innovation Assessment. Your tier, readiness score and matched partners will appear here when it’s done.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Innovation tier" value={tier || "–"} sub={tier ? TIER_DESCRIPTIONS[tier] : "Being reviewed"} icon={Layers} />
            <Stat label="Readiness score" value={readiness ?? "–"} sub="Out of 100" icon={Gauge} />
            <Stat label="Upcoming events" value={upcoming.length} sub={`${upcoming.filter((e) => e.rsvp === "yes").length} attending`} icon={CalendarDays} />
            <Stat label="Matched partners" value={intake && intake.status !== "New" ? data?.matches.length || 0 : "–"} sub="Approved by DataIsData" icon={Handshake} />
          </div>
          <Panel title="Your event invitations">
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">Vendor fees are published, so you always know who paid to be in the room.</p>
            {upcoming.length === 0 ? (
              <Empty>No upcoming invitations yet.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary sm:flex"><CalendarDays className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{e.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {shortDate(e.event_date)}
                        {e.location ? ` · ${e.location}` : ""} · {toNum(e.cost_to_attendees) ? money(e.cost_to_attendees) : "Free for public sector"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {e.sponsors.length ? (
                          e.sponsors.map((s) => (
                            <span key={s.name} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold ring-1 ring-border">{s.name} · {s.tier || "Showcase"} {money(s.fee)}</span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Sponsors to be announced</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" className="h-10" variant={e.rsvp === "yes" ? "default" : "outline"} aria-pressed={e.rsvp === "yes"} disabled={busy === e.id} onClick={() => rsvp(e.id, "yes", e.rsvp)}>
                        {e.rsvp === "yes" ? <><Check className="h-4 w-4" /> Attending</> : "We’ll attend"}
                      </Button>
                      <Button size="sm" className={e.rsvp === "no" ? "h-10 border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "h-10"} variant="outline" aria-pressed={e.rsvp === "no"} disabled={busy === e.id} onClick={() => rsvp(e.id, "no", e.rsvp)}>
                        Can’t make it
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {done.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Past: {done.map((e) => `${e.name} (${shortDate(e.event_date)})`).join(", ")}</p>}
          </Panel>
          {intake && intake.status !== "New" && (
            <Panel title="Partners matched to your priorities">
              <p className="-mt-2 mb-3 text-xs text-muted-foreground">
                Approved by DataIsData for {(intake.top_challenges || []).join(", ") || "your priorities"}.
                {intake.advisory_engagement ? " Because DataIsData advises you, it takes no revenue share on any deal with these vendors and recommends at least two options for every need." : ""}
              </p>
              {data?.matches.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.matches.map((m) => (
                    <div key={m.name} className="rounded-2xl border border-border p-4">
                      <p className="font-semibold text-[#111827]">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category} · {m.status}</p>
                      {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>DataIsData is recruiting partners for your priorities.</Empty>
              )}
            </Panel>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Your assessment">
              {intake ? (
                <KV
                  rows={[
                    ["Top challenges", (intake.top_challenges || []).map((x, i) => `${i + 1}. ${x}`).join("\n") || null],
                    ["Initiatives", intake.current_initiatives],
                    ["Interested in", <Chips key="c" items={intake.interested_in} />],
                    ["Submitted", formatDate(intake.created_at)],
                  ]}
                />
              ) : (
                <Empty>No assessment on file.</Empty>
              )}
            </Panel>
            <section className="rounded-3xl border-2 border-dashed border-border p-5 sm:p-6">
              <h2 className="text-base font-bold">Coming next in your portal</h2>
              <ul className="mt-3 divide-y divide-border">
                {[
                  ["Projects & cost avoidance", "Every project with the money it saved you", TrendingUp],
                  ["Quarterly report", "A plain-language summary for council", Receipt],
                  ["Maturity score", "How you compare with similar localities", Gauge],
                ].map(([t, d, Icon]) => {
                  const I = Icon as React.ElementType;
                  return (
                    <li key={t as string} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><I className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t as string}</span><span className="block text-xs text-muted-foreground">{d as string}</span></span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Next phase</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
          <p className="flex items-start gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This login only sees {name}. Other localities, vendor scores and DataIsData’s internal notes aren’t visible here.</span>
          </p>
        </>
      )}
    </div>
  );
}
