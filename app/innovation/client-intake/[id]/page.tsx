"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, Check, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/components/auth/AccessProvider";
import { OptionChips } from "@/components/innovation/PublicShell";
import { PortalLogin } from "@/components/innovation/PortalLogin";
import { Chips, Empty, Field, KV, ModuleNav, Panel, SampleBadge, SetupNotice, StatusBadge, selectClass } from "@/components/innovation/ui";
import { APPROVED, CHALLENGES, INNOVATION_TIERS, TIER_DESCRIPTIONS } from "@/lib/innovation/constants";
import { errorText, isPastEvent, logActivity, money, shortDate, toNum } from "@/lib/innovation/data";
import type { ClientIntake, EventAttendee, EventRow, PartnerLite } from "@/lib/innovation/types";
import { cn, formatDate } from "@/lib/utils";

const STATUSES = ["New", "Reviewing", "Qualified", "Converted"];

export default function ClientIntakeDetailPage() {
  const params = useParams<{ id: string }>();
  const { can, realUser } = useAccess();
  const actor = realUser?.full_name || "DataIsData";
  const canEdit = can("client_intake", "edit");
  const [intake, setIntake] = useState<(ClientIntake & { is_sample?: boolean | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerLite[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [invites, setInvites] = useState<EventAttendee[]>([]);
  const [tier, setTier] = useState("");
  const [readiness, setReadiness] = useState(50);
  const [estimate, setEstimate] = useState("");
  const [advisory, setAdvisory] = useState(false);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Reviewing");
  const [inviteEvent, setInviteEvent] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("client_intakes").select("*").eq("id", params.id).maybeSingle();
    if (error) console.error("Error loading intake:", error);
    const row = (data as ClientIntake) || null;
    setIntake(row);
    if (row) {
      setTier(row.assigned_tier || "");
      setReadiness(row.readiness_score ?? 50);
      setEstimate(row.advisory_estimate != null ? String(toNum(row.advisory_estimate)) : "");
      setAdvisory(!!row.advisory_engagement);
      setChallenges((row.top_challenges || []).slice(0, 3));
      setNotes(row.review_notes || "");
      setStatus(!row.status || row.status === "New" ? "Reviewing" : row.status);
      const [pa, ev, at] = await Promise.all([
        supabase.from("partners").select("id, name, vendor_status, vendor_score, innovation_category, capabilities, public_description"),
        supabase.from("events").select("*").order("event_date"),
        row.account_id ? supabase.from("event_attendees").select("*").eq("account_id", row.account_id) : Promise.resolve({ data: [], error: null }),
      ]);
      setPartners(pa.error ? [] : ((pa.data as PartnerLite[]) || []));
      setEvents((ev.data as EventRow[]) || []);
      setInvites(at.error ? [] : ((at.data as EventAttendee[]) || []));
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const matches = useMemo(
    () => partners.filter((p) => APPROVED.includes(p.vendor_status || "") && challenges.includes(p.innovation_category || "")).sort((a, b) => (b.vendor_score || 0) - (a.vendor_score || 0)),
    [partners, challenges]
  );
  const invitable = events.filter((e) => !isPastEvent(e) && !invites.some((i) => i.event_id === e.id));
  const inviteId = invitable.some((e) => e.id === inviteEvent) ? inviteEvent : invitable[0]?.id || "";

  async function saveReview() {
    if (!intake) return;
    if (!tier) return toast.error("Choose an innovation tier first");
    setBusy(true);
    const est = estimate.replace(/[^0-9.]/g, "");
    const base = {
      assigned_tier: tier,
      readiness_score: readiness,
      advisory_estimate: est ? Number(est) : null,
      status,
      top_challenges: challenges.length ? challenges : intake.top_challenges,
    };
    let res = await supabase
      .from("client_intakes")
      .update({ ...base, advisory_engagement: advisory, review_notes: notes.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by: actor })
      .eq("id", intake.id);
    if (res.error && /advisory_engagement|review_notes|reviewed_/.test(res.error.message || "")) res = await supabase.from("client_intakes").update(base).eq("id", intake.id);
    if (!res.error && intake.account_id) {
      await supabase.from("accounts").update({ innovation_tier: tier, readiness_score: readiness, top_challenges: base.top_challenges }).eq("id", intake.account_id);
    }
    setBusy(false);
    if (res.error) return toast.error(errorText(res.error, "Could not save the review"));
    await logActivity(`${intake.organization_name} reviewed: ${tier}, readiness ${readiness}${est ? `, advisory estimate ${money(Number(est))}` : ""}`, "client_intake", intake.id, actor);
    toast.success("Review saved");
    load();
  }

  async function convertToAccount() {
    if (!intake) return;
    setBusy(true);
    const type = ["City", "County", "State Agency", "University"].includes(intake.organization_type || "") ? intake.organization_type : "City";
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert([
        {
          name: intake.organization_name,
          account_type: type,
          status: "Prospect",
          owner: actor,
          innovation_tier: tier || intake.assigned_tier,
          readiness_score: readiness,
          population_size: intake.population_size,
          annual_it_budget: intake.annual_it_budget,
          top_challenges: challenges.length ? challenges : intake.top_challenges,
          grant_funding_interest: !!intake.grant_funding_interest,
          ...(intake.is_sample ? { is_sample: true } : {}),
        },
      ])
      .select("id")
      .single();
    if (accountError) {
      setBusy(false);
      return toast.error(errorText(accountError, "Could not create the account"));
    }
    if (intake.contact_name) {
      await supabase.from("contacts").insert([{ full_name: intake.contact_name, title_role: intake.contact_title, email: intake.contact_email, account_id: account.id }]);
    }
    const { error } = await supabase.from("client_intakes").update({ account_id: account.id, status: "Converted" }).eq("id", intake.id);
    setBusy(false);
    if (error) return toast.error("Account created but the intake link failed");
    await logActivity(`${intake.organization_name} converted to a client account`, "account", account.id, actor);
    toast.success("Converted to a client account");
    load();
  }

  async function inviteTo() {
    if (!intake?.account_id || !inviteId) return;
    setBusy(true);
    const { error } = await supabase.from("event_attendees").insert([{ event_id: inviteId, account_id: intake.account_id }]);
    setBusy(false);
    if (error) return toast.error(errorText(error));
    const ev = events.find((e) => e.id === inviteId);
    await logActivity(`${intake.organization_name} invited to ${ev?.name || "an event"}`, "event", inviteId, actor);
    toast.success("Invitation sent");
    load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!intake) {
    return (
      <div className="space-y-6">
        <ModuleNav />
        <Empty>Intake not found. <Link href="/innovation/client-intake" className="font-semibold text-primary">Back to client intake</Link></Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleNav />
      <Link href="/innovation/client-intake" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> Client intake</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Innovation Assessment · {formatDate(intake.created_at)}{intake.source === "public" ? " · public form" : ""}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111827] break-words">{intake.organization_name}</h1>
          <p className="mt-1 text-[#6B7280] break-words">{[intake.contact_name, intake.contact_title, intake.contact_email].filter(Boolean).join(" · ") || "No contact"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={intake.status || "New"} className="text-sm" />
          <SampleBadge show={intake.is_sample} />
        </div>
      </div>
      <SetupNotice />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What they told us">
          <KV
            rows={[
              ["Type", intake.organization_type],
              ["Population", intake.population_size ? intake.population_size.toLocaleString("en-US") : null],
              ["Annual IT budget", intake.annual_it_budget != null ? money(intake.annual_it_budget) : null],
              ["Top challenges", (intake.top_challenges || []).map((x, i) => `${i + 1}. ${x}`).join("\n") || null],
              ["Current initiatives", intake.current_initiatives],
              ["Grant funding", intake.grant_funding_interest ? "Interested" : "Not indicated"],
              ["Strategic plan", intake.strategic_plan_link],
              ["Interested in", <Chips key="i" items={intake.interested_in} />],
            ]}
          />
        </Panel>
        <Panel title="DataIsData review">
          <div className="grid gap-4">
            <fieldset disabled={!canEdit}>
              <legend className="mb-2 text-sm font-medium">Innovation tier</legend>
              <div className="grid gap-2">
                {INNOVATION_TIERS.map((t) => (
                  <label key={t} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm", tier === t ? "border-primary bg-secondary/60" : "border-border")}>
                    <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
                    <span>
                      <span className="block font-semibold">{t}</span>
                      <span className="block text-xs text-muted-foreground">{TIER_DESCRIPTIONS[t]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Readiness score" hint="0–100, from the assessment and a first call">
              <span className="flex items-center gap-4">
                <input type="range" min={0} max={100} value={readiness} disabled={!canEdit} onChange={(e) => setReadiness(Number(e.target.value))} className="h-7 flex-1 cursor-pointer accent-[var(--primary)]" aria-label="Readiness score" />
                <output className="w-10 text-right text-xl font-bold tabular-nums">{readiness}</output>
              </span>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Advisory estimate" hint="per year"><Input inputMode="decimal" placeholder="$0" value={estimate} disabled={!canEdit} onChange={(e) => setEstimate(e.target.value)} /></Field>
              <Field label="Status">
                <select className={selectClass} value={status} disabled={!canEdit} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <fieldset disabled={!canEdit}>
              <legend className="mb-2 text-sm font-medium">Top challenges <span className="font-normal text-muted-foreground">used for matching (up to 3)</span></legend>
              <OptionChips name="challenges" options={CHALLENGES} value={challenges} onChange={(v) => setChallenges(v.slice(0, 3))} />
            </fieldset>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={advisory} disabled={!canEdit} onChange={(e) => setAdvisory(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
              <span>DataIsData has a paid advisory engagement with this locality</span>
            </label>
            <Field label="Review notes"><Textarea rows={2} value={notes} disabled={!canEdit} onChange={(e) => setNotes(e.target.value)} /></Field>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveReview} disabled={busy} className="h-10"><Check className="h-4 w-4" /> Save review</Button>
                {!intake.account_id && can("accounts", "create") && (
                  <Button variant="outline" onClick={convertToAccount} disabled={busy} className="h-10"><Building2 className="h-4 w-4" /> Convert to client account</Button>
                )}
              </div>
            )}
            {intake.reviewed_at && <p className="text-xs text-muted-foreground">Last reviewed {formatDate(intake.reviewed_at)}{intake.reviewed_by ? ` by ${intake.reviewed_by}` : ""}.</p>}
            {intake.account_id && (
              <div className="grid gap-2">
                <p className="text-sm">
                  Client account: <Link href={`/accounts/${intake.account_id}`} className="font-semibold text-primary">open in CRM</Link>
                </p>
                <PortalLogin kind="city" accountId={intake.account_id} orgName={intake.organization_name} defaultName={intake.contact_name} defaultEmail={intake.contact_email} defaultTitle={intake.contact_title} />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={`Approved partners that fit ${intake.organization_name}`} action={<span className="text-xs text-muted-foreground">Matched on the challenges they named, ranked by vendor score</span>}>
        {advisory && (
          <p className="mb-4 flex items-start gap-2 rounded-2xl bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span><b>Independence rule applies.</b> DataIsData advises {intake.organization_name}, so it takes no revenue share on any deal between {intake.organization_name} and these vendors, and recommends at least two options for every need.</span>
          </p>
        )}
        {matches.length === 0 ? (
          <Empty>No approved partners in {challenges.join(", ") || "these categories"} yet. That’s a recruiting signal: invite vendors in these categories.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((p) => (
              <Link key={p.id} href={`/partners/${p.id}`} className="rounded-2xl border border-border p-4 transition hover:border-primary/30 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[#111827]">{p.name}</p>
                  {p.vendor_score != null && <span className="inline-flex h-6 min-w-9 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">{p.vendor_score}</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.innovation_category} · {p.vendor_status}</p>
                {(p.public_description || p.capabilities) && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.public_description || p.capabilities}</p>}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Events"
        action={
          intake.account_id && can("events", "edit") && invitable.length > 0 ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="sr-only" htmlFor="intake-ev">Event</label>
              <select id="intake-ev" className={cn(selectClass, "sm:w-64")} value={inviteId} onChange={(e) => setInviteEvent(e.target.value)}>
                {invitable.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <Button variant="outline" className="h-10" onClick={inviteTo} disabled={busy}><Send className="h-4 w-4" /> Invite</Button>
            </div>
          ) : null
        }
      >
        {!intake.account_id ? (
          <Empty>Convert this intake to a client account to invite it to events.</Empty>
        ) : invites.length === 0 ? (
          <Empty>Not invited to any events yet.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((i) => {
              const ev = events.find((e) => e.id === i.event_id);
              return (
                <li key={i.event_id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary"><CalendarDays className="h-4 w-4" /></span>
                  <Link href={`/innovation/events/${i.event_id}`} className="min-w-0 flex-1">
                    <span className="block font-semibold text-[#111827]">{ev?.name || "Event"}</span>
                    <span className="block text-xs text-muted-foreground">{shortDate(ev?.event_date || null)}{ev?.location ? ` · ${ev.location}` : ""}</span>
                  </Link>
                  <StatusBadge status={i.rsvp === "yes" ? "Attending" : i.rsvp === "no" ? "Can't attend" : "Invited, no reply"} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
