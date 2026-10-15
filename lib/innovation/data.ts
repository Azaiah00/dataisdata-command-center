/**
 * Vendor & Event Module — data helpers shared by the Innovation pages.
 * Team pages read and write tables through the scoped `supabase` client;
 * public pages and the city/vendor portals go through the SECURITY DEFINER
 * functions in supabase/2026-10-vendor-event-module.sql.
 */
import { supabase } from "@/lib/supabase";
import { APPROVED, INQUIRY_STATUS, type CriteriaScores, type Decision, type PipelineStage, isApprovedStatus } from "./constants";
import type { VendorApplication, VendorInquiry } from "./types";

/** Whole-dollar currency for fees and sponsorship totals. */
export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    typeof v === "number" && isFinite(v) ? v : 0
  );
}

export const toNum = (n: number | string | null | undefined): number => {
  const v = typeof n === "string" ? Number(n) : n;
  return typeof v === "number" && isFinite(v) ? v : 0;
};

/** Friendly text from a Supabase/PostgREST error. */
export function errorText(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string };
  if (e.code === "PGRST202" || e.code === "42883" || /could not find the function/i.test(e.message || "")) {
    return "This feature needs the Vendor & Event Module database update. Ask an admin to run supabase/2026-10-vendor-event-module.sql.";
  }
  if (e.code === "PGRST205" || e.code === "42P01" || e.code === "42703" || /does not exist|schema cache/i.test(e.message || "")) {
    return "The Vendor & Event Module database update has not been run yet (supabase/2026-10-vendor-event-module.sql).";
  }
  return e.message || fallback;
}

let readyCache: boolean | null = null;
/** True once supabase/2026-10-vendor-event-module.sql has been run. */
export async function moduleSchemaReady(force = false): Promise<boolean> {
  if (readyCache !== null && !force) return readyCache;
  const [a, b] = await Promise.all([
    supabase.from("vendor_inquiries").select("invite_token, is_sample").limit(1),
    supabase.from("event_tasks").select("id").limit(1),
  ]);
  readyCache = !a.error && !b.error;
  return readyCache;
}

/** Add a line to the module's activity log. Never blocks the action itself. */
export async function logActivity(message: string, refType?: string, refId?: string | null, actor?: string | null) {
  try {
    await supabase.from("innovation_activity").insert([{ message: message.slice(0, 500), ref_type: refType || null, ref_id: refId || null, actor_name: actor || null }]);
  } catch {
    /* best effort */
  }
}

/** Unguessable private link token (24 random bytes, URL-safe). */
export function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
}

export function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/apply/${token}`;
}

export function publicUrl(path: "/join/partner" | "/join/assessment"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${path}`;
}

export function inviteEmail(inq: Pick<VendorInquiry, "company_name" | "primary_contact" | "email" | "invite_token">, sender: string): string {
  const firstName = (inq.primary_contact || "").trim().split(/\s+/)[0] || "there";
  return [
    "Subject: Your invitation to apply: DataIsData Innovation Partner Program",
    "",
    `Hi ${firstName},`,
    "",
    `Thank you for your interest in DataIsData. After reviewing ${inq.company_name}, we would like to invite you to complete our Strategic Partner Enrollment Application.`,
    "",
    "Your private link:",
    inviteUrl(inq.invite_token || ""),
    "",
    "It takes about 15 minutes. Every applicant is reviewed against the same criteria, and you will hear from us within two weeks of submitting.",
    "",
    sender || "DataIsData",
    "DataIsData LLC",
    "info@dataisdata.com | 1.888.292.DATA",
  ].join("\n");
}

/** Which pipeline column an inquiry belongs in. */
export function stageOf(inq: VendorInquiry, app: Pick<VendorApplication, "status"> | null | undefined): PipelineStage {
  if (inq.status === INQUIRY_STATUS.closed) return "other";
  if (app) {
    if (isApprovedStatus(app.status)) return "approved";
    if (app.status === "Conditional" || app.status === "Not Approved") return "other";
    return "pending";
  }
  if (inq.status === INQUIRY_STATUS.invited) return "invited";
  if (inq.status === INQUIRY_STATUS.submitted) return "pending";
  if (isApprovedStatus(inq.status)) return "approved";
  if (inq.status === "Conditional" || inq.status === "Not Approved") return "other";
  return "unscreened";
}

/**
 * Save a scoring decision. Approved vendors get (or keep) a Partner record in
 * CRM › Partners with their score, status and category — the same thing the
 * "Approve and Create Partner" button on the old review page did.
 */
export async function recordDecision(opts: {
  inquiry: VendorInquiry | null;
  application: VendorApplication;
  scores: CriteriaScores;
  total: number;
  decision: Decision;
  notes: string;
  reviewer: string;
}): Promise<{ partnerId: string | null; createdPartner: boolean }> {
  const { inquiry, application, scores, total, decision, notes, reviewer } = opts;
  const now = new Date().toISOString();
  let partnerId = application.partner_id || inquiry?.partner_id || null;
  let createdPartner = false;
  const approved = APPROVED.includes(decision);

  if (approved && !partnerId) {
    const { data, error } = await supabase
      .from("partners")
      .insert([
        {
          name: inquiry?.company_name || "New partner",
          partner_type: "Vendor",
          capabilities: application.core_offerings,
          contract_vehicles: application.contract_vehicles,
          notes: application.strategic_alignment,
          vendor_score: total,
          vendor_status: decision,
          innovation_category: inquiry?.core_service_category || null,
          website: inquiry?.website || null,
          public_description: inquiry?.brief_description || null,
          is_sample: !!inquiry?.is_sample,
        },
      ])
      .select("id")
      .single();
    if (error) throw error;
    partnerId = data.id as string;
    createdPartner = true;
  } else if (partnerId) {
    const { error } = await supabase
      .from("partners")
      .update({ vendor_score: total, vendor_status: decision, innovation_category: inquiry?.core_service_category || null })
      .eq("id", partnerId);
    if (error) throw error;
  }

  const { error: appErr } = await supabase
    .from("vendor_applications")
    .update({
      score: total,
      criteria_scores: scores,
      status: decision,
      reviewed_by: reviewer,
      decision_notes: notes,
      coi_confirmed: true,
      decided_at: now,
      partner_id: partnerId,
    })
    .eq("id", application.id);
  if (appErr) throw appErr;

  if (inquiry) {
    const { error: inqErr } = await supabase.from("vendor_inquiries").update({ status: decision, partner_id: partnerId }).eq("id", inquiry.id);
    if (inqErr) throw inqErr;
  }
  return { partnerId, createdPartner };
}

/** Keep events.revenue_generated equal to the sponsorship fees marked paid. */
export async function syncEventRevenue(eventId: string) {
  const { data } = await supabase.from("event_vendors").select("fee, paid").eq("event_id", eventId);
  const collected = (data || []).filter((r: { paid?: boolean | null }) => r.paid).reduce((t: number, r: { fee: number | string | null }) => t + toNum(r.fee), 0);
  await supabase.from("events").update({ revenue_generated: collected }).eq("id", eventId);
}

export const isPastEvent = (e: { status: string | null; event_date: string | null }) => {
  if (e.status === "Completed") return true;
  if (!e.event_date) return false;
  const d = new Date(e.event_date + "T23:59:59");
  return d.getTime() < Date.now();
};

export function shortDate(d: string | null | undefined, withYear = true): string {
  if (!d) return "Date to be set";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00") : new Date(d);
  if (isNaN(date.getTime())) return "Date to be set";
  return date.toLocaleDateString("en-US", withYear ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
}

export function timeAgo(d: string | null | undefined): string {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const n = Math.floor(s / 86400);
  return n === 1 ? "yesterday" : `${n} days ago`;
}
