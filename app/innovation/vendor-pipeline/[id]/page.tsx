"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Copy, ExternalLink, RotateCcw, Send, Star, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/components/auth/AccessProvider";
import { Chips, Empty, KV, ModuleNav, Panel, SampleBadge, SetupNotice, StageTracker, StatusBadge } from "@/components/innovation/ui";
import { Scorecard } from "@/components/innovation/Scorecard";
import { PortalLogin } from "@/components/innovation/PortalLogin";
import { DECISIONS, INQUIRY_STATUS, isApprovedStatus } from "@/lib/innovation/constants";
import { errorText, inviteEmail, inviteUrl, logActivity, money, newInviteToken, shortDate, timeAgo } from "@/lib/innovation/data";
import type { EventRow, EventVendor, VendorApplication, VendorInquiry } from "@/lib/innovation/types";
import { formatDate } from "@/lib/utils";

type EventLink = EventVendor & { events: Pick<EventRow, "id" | "name" | "event_date" | "status"> | null };

async function copy(text: string, ok: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast.error("Copy isn’t available here. Select the text and copy it.");
  }
}

export default function VendorRecordPage() {
  const { id } = useParams<{ id: string }>();
  const { can, realUser } = useAccess();
  const actor = realUser?.full_name || "DataIsData";
  const [loading, setLoading] = useState(true);
  const [inq, setInq] = useState<VendorInquiry | null>(null);
  const [app, setApp] = useState<VendorApplication | null>(null);
  const [events, setEvents] = useState<EventLink[]>([]);
  const [rescoring, setRescoring] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("vendor_inquiries").select("*").eq("id", id).maybeSingle();
    if (error) console.error(error);
    const row = (data as VendorInquiry) || null;
    setInq(row);
    if (row) {
      const { data: apps } = await supabase.from("vendor_applications").select("*").eq("inquiry_id", row.id).order("created_at", { ascending: false }).limit(1);
      const a = ((apps as VendorApplication[]) || [])[0] || null;
      setApp(a);
      const pid = a?.partner_id || row.partner_id;
      if (pid) {
        const { data: ev } = await supabase.from("event_vendors").select("*, events(id, name, event_date, status)").eq("partner_id", pid);
        setEvents((ev as unknown as EventLink[]) || []);
      } else setEvents([]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function invite() {
    if (!inq) return;
    setBusy(true);
    const token = inq.invite_token || newInviteToken();
    const { error } = await supabase
      .from("vendor_inquiries")
      .update({ status: INQUIRY_STATUS.invited, invite_token: token, invited_at: new Date().toISOString(), invited_by: actor })
      .eq("id", inq.id);
    setBusy(false);
    if (error) return toast.error(errorText(error, "Could not create the invitation."));
    await logActivity(`${inq.company_name} invited to apply`, "vendor_inquiry", inq.id, actor);
    toast.success("Invitation ready");
    await load();
    setInviteOpen(true);
  }

  async function close(reopen = false) {
    if (!inq) return;
    setBusy(true);
    const patch = reopen
      ? { status: INQUIRY_STATUS.unscreened, closed_at: null, close_reason: null }
      : { status: INQUIRY_STATUS.closed, closed_at: new Date().toISOString(), close_reason: "Not a fit for the current ecosystem. Thanked and closed." };
    const { error } = await supabase.from("vendor_inquiries").update(patch).eq("id", inq.id);
    setBusy(false);
    if (error) return toast.error(errorText(error));
    await logActivity(reopen ? `${inq.company_name}: inquiry re-opened` : `${inq.company_name}: inquiry closed (not a fit right now)`, "vendor_inquiry", inq.id, actor);
    toast.success(reopen ? "Inquiry re-opened" : "Inquiry closed");
    load();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!inq) {
    return (
      <div className="space-y-6">
        <ModuleNav />
        <Empty>
          That vendor no longer exists. <Link className="font-semibold text-primary" href="/innovation/vendor-pipeline">Back to the pipeline</Link>
        </Empty>
      </div>
    );
  }

  const status = app?.status || inq.status || INQUIRY_STATUS.unscreened;
  const decided = !!app && (DECISIONS as readonly string[]).includes(app.status || "");
  const closed = inq.status === INQUIRY_STATUS.closed;
  const at = closed ? 0 : app ? (decided ? 3 : 2) : inq.status === INQUIRY_STATUS.invited ? 1 : 0;
  const steps = [
    { label: "Interest form", detail: formatDate(inq.created_at) },
    { label: "Invited to apply", detail: inq.invited_at ? formatDate(inq.invited_at) : "Not yet" },
    { label: "Application", detail: app ? formatDate(app.created_at) : "Not yet" },
    { label: "Decision", detail: decided ? status : closed ? "Closed" : "Not yet" },
  ].map((s, i) => ({ ...s, state: (i < at || (i === 3 && decided) ? "done" : i === at && !closed ? "current" : "todo") as "done" | "current" | "todo" }));
  const partnerId = app?.partner_id || inq.partner_id || null;
  const canInvite = can("vendor_inquiries", "create");
  const canScore = can("vendor_applications", "edit");
  const showScorecard = !!app && canScore && (!decided || rescoring);

  return (
    <div className="space-y-6">
      <ModuleNav />
      <Link href="/innovation/vendor-pipeline" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary">
        <ArrowLeft className="h-4 w-4" /> Vendor pipeline
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{inq.core_service_category || "Vendor"}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111827] break-words">{inq.company_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={status} />
            <SampleBadge show={inq.is_sample} />
            <span>
              {inq.primary_contact || "No contact"}
              {inq.title ? `, ${inq.title}` : ""}
            </span>
          </div>
        </div>
        {app?.score != null && decided && (
          <div className="shrink-0 rounded-3xl bg-white px-6 py-3 text-center shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Vendor score</p>
            <p className="text-4xl font-bold tracking-tight">{app.score}</p>
          </div>
        )}
      </div>
      <SetupNotice />
      <Panel>
        <StageTracker steps={steps} />
      </Panel>

      {/* Next step for this stage */}
      {!app && !closed && inq.status !== INQUIRY_STATUS.invited && (
        <Panel className="ring-2 ring-accent">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Part 1 → Part 2</p>
          <h2 className="mt-1 text-lg font-bold">Is this company worth a closer look?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inviting creates a private application link and a ready-to-send email. Closing ends the inquiry politely. Either way, it’s logged.</p>
          {canInvite ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={invite} disabled={busy} className="h-10"><Send className="h-4 w-4" /> Invite to apply</Button>
              <Button variant="outline" onClick={() => close(false)} disabled={busy} className="h-10 border-red-200 text-red-700 hover:bg-red-50"><XCircle className="h-4 w-4" /> Not a fit right now</Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Your seat can view inquiries but not invite.</p>
          )}
        </Panel>
      )}
      {!app && inq.status === INQUIRY_STATUS.invited && (
        <Panel className="ring-2 ring-violet-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Invitation sent {timeAgo(inq.invited_at)}{inq.invited_by ? ` by ${inq.invited_by}` : ""}</p>
          <h2 className="mt-1 text-lg font-bold">Waiting for their application</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only someone with the private link can open the application. When they submit, this moves to Pending review.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={() => setInviteOpen(true)}><Copy className="h-4 w-4" /> View invitation email</Button>
            <a href={inviteUrl(inq.invite_token || "")} target="_blank" rel="noopener noreferrer"><Button className="h-10"><ExternalLink className="h-4 w-4" /> Open their application link</Button></a>
          </div>
        </Panel>
      )}
      {closed && (
        <Panel>
          <h2 className="text-lg font-bold">Inquiry closed</h2>
          <p className="mt-1 text-sm text-muted-foreground">{inq.close_reason || "Closed."} {inq.closed_at ? `(${formatDate(inq.closed_at)})` : ""}</p>
          {canInvite && <Button variant="outline" className="mt-4 h-10" onClick={() => close(true)} disabled={busy}><RotateCcw className="h-4 w-4" /> Re-open inquiry</Button>}
        </Panel>
      )}
      {app && status === "Pending Review" && !canScore && (
        <Panel><p className="text-sm text-muted-foreground">Application received {timeAgo(app.created_at)}. Your seat can’t score applications.</p></Panel>
      )}
      {app && decided && !rescoring && (
        <Panel>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Decision</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={status} className="text-sm" />
            <span>{formatDate(app.decided_at)}{app.reviewed_by ? ` · ${app.reviewed_by}` : ""}</span>
            {partnerId && <Link href={`/partners/${partnerId}`} className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-semibold text-foreground ring-1 ring-border hover:bg-muted">In CRM › Partners</Link>}
          </div>
          {app.decision_notes && <p className="mt-3 text-sm text-foreground">{app.decision_notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {isApprovedStatus(status) && can("events", "edit") && (
              <Link href="/innovation/events"><Button className="h-10"><CalendarDays className="h-4 w-4" /> Add to an event</Button></Link>
            )}
            {canScore && <Button variant="outline" className="h-10" onClick={() => setRescoring(true)}><Star className="h-4 w-4" /> Re-open scoring</Button>}
          </div>
          {isApprovedStatus(status) && (
            <div className="mt-4">
              <PortalLogin kind="vendor" partnerId={partnerId} orgName={inq.company_name} defaultName={inq.primary_contact} defaultEmail={inq.email} defaultTitle={inq.title} />
            </div>
          )}
        </Panel>
      )}
      {showScorecard && app && (
        <Scorecard
          inquiry={inq}
          application={app}
          reviewer={actor}
          onSaved={() => {
            setRescoring(false);
            load();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onCancel={rescoring ? () => setRescoring(false) : undefined}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Part 1 · Interest form">
          <KV
            rows={[
              ["Email", inq.email],
              ["Website", inq.website],
              ["Public sector", inq.worked_public_sector ? "Yes" : "Not yet"],
              ["States", inq.states],
              ["Interested in", <Chips key="i" items={inq.interested_in} />],
              ["Description", inq.brief_description],
              ["Received", `${formatDate(inq.created_at)}${inq.source === "public" ? " · public form" : ""}`],
            ]}
          />
        </Panel>
        <Panel title="Part 2 · Application">
          {app ? (
            <KV
              rows={[
                ["Years in business", app.years_in_business],
                ["Legal structure", app.legal_structure],
                ["Certifications", (app.certifications || []).join(", ")],
                ["Insurance", app.insurance_coverage],
                ["Contract vehicles", app.contract_vehicles],
                ["References", app.public_sector_references],
                ["Core offerings", app.core_offerings],
                ["Problem solved", app.problem_solved],
                ["Government clients", app.existing_gov_clients],
                ["Differentiator", app.differentiator],
                ["Stack & integrations", [app.technology_stack, app.integration_capabilities].filter(Boolean).join("; ")],
                ["Revenue range", app.annual_revenue_range],
                ["2-year growth", app.growth_pct != null && app.growth_pct !== "" ? `${app.growth_pct}%` : null],
                ["Bonding", app.bonding_capacity],
                ["Cuts cost by", app.cost_reduction_explanation],
                ["Alignment", app.strategic_alignment],
                ["Revenue share", app.open_to_revenue_share == null ? "Open to discussion" : app.open_to_revenue_share ? "Yes" : "No"],
                ["Compliance", app.compliance_standards],
                ["Security certifications", app.security_certifications],
                ["Data handling", app.data_handling_practices],
              ]}
            />
          ) : (
            <Empty>{inq.status === INQUIRY_STATUS.invited ? "Invitation sent. No application yet." : "Not invited yet. The application only opens from a private link."}</Empty>
          )}
        </Panel>
      </div>

      {events.length > 0 && (
        <Panel title="Events">
          <div className="flex flex-wrap gap-2">
            {events.map((e) => (
              <Link key={e.event_id} href={`/innovation/events/${e.event_id}`} className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary hover:bg-accent">
                {e.events?.name || "Event"} · {shortDate(e.events?.event_date || null, false)} · {e.sponsorship_tier || "Showcase"} {money(e.fee)} · {e.paid ? "Paid" : "Invoice sent"}
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Invitation email</DialogTitle>
            <DialogDescription>Ready to send to {inq.email || "the vendor"}. Copy it into your email.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[40dvh] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-muted p-4 font-sans text-sm leading-relaxed">{inviteEmail(inq, actor)}</pre>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => copy(inviteEmail(inq, actor), "Email copied")}><Copy className="h-4 w-4" /> Copy email</Button>
            <Button variant="outline" onClick={() => copy(inviteUrl(inq.invite_token || ""), "Link copied")}><Copy className="h-4 w-4" /> Copy link only</Button>
            {inq.email && (
              <a href={`mailto:${encodeURIComponent(inq.email)}?subject=${encodeURIComponent("Your invitation to apply: DataIsData Innovation Partner Program")}&body=${encodeURIComponent(inviteEmail(inq, actor).split("\n").slice(2).join("\n"))}`}>
                <Button variant="outline"><Send className="h-4 w-4" /> Open in my email</Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
