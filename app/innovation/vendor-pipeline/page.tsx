"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/AccessProvider";
import { Empty, HowItWorks, ModuleNav, PageTitle, SampleBadge, SetupNotice, StatusBadge } from "@/components/innovation/ui";
import { PIPELINE_COLUMNS, isApprovedStatus } from "@/lib/innovation/constants";
import { publicUrl, stageOf, timeAgo } from "@/lib/innovation/data";
import type { VendorApplication, VendorInquiry } from "@/lib/innovation/types";
import { cn } from "@/lib/utils";

type AppLite = Pick<VendorApplication, "id" | "inquiry_id" | "status" | "score" | "created_at" | "decided_at">;

export default function VendorPipelinePage() {
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<VendorInquiry[]>([]);
  const [apps, setApps] = useState<AppLite[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const [inq, ap] = await Promise.all([
        supabase.from("vendor_inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("vendor_applications").select("id, inquiry_id, status, score, created_at, decided_at").order("created_at", { ascending: false }),
      ]);
      if (!live) return;
      if (inq.error) console.error("Error loading inquiries:", inq.error);
      setInquiries((inq.data as VendorInquiry[]) || []);
      setApps((ap.data as AppLite[]) || []);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const appByInquiry = useMemo(() => {
    const m = new Map<string, AppLite>();
    for (const a of apps) if (a.inquiry_id && !m.has(a.inquiry_id)) m.set(a.inquiry_id, a);
    return m;
  }, [apps]);

  const filtered = inquiries.filter((i) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [i.company_name, i.primary_contact, i.core_service_category, i.email].some((x) => (x || "").toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle
        title="Vendor pipeline"
        subtitle="Every company starts as an unscreened inquiry. Open a card to invite, score or decide. This board brings the Vendor Inquiries and Vendor Applications lists together by stage."
        actions={
          <>
            <a href={publicUrl("/join/partner")} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-10">
                <ExternalLink className="h-4 w-4" /> Public interest form
              </Button>
            </a>
            <Can module="vendor_inquiries" action="create">
              <Link href="/innovation/vendor-inquiry/new">
                <Button className="h-10">
                  <Plus className="h-4 w-4" /> Add inquiry
                </Button>
              </Link>
            </Can>
          </>
        }
      />
      <SetupNotice />
      <HowItWorks
        id="pipeline"
        title="Who gets in, and why"
        steps={[
          "Vendors fill out the public interest form. They appear in Unscreened inquiries.",
          "Open one and press Invite to apply. That creates a private link and an email you can send.",
          "When they submit the application it moves to Pending review. Open it and score it.",
          "Your decision moves it to Approved or to Conditional / not approved. Approved vendors can join events.",
        ]}
        whatsNew={["One board for every stage", "Private invite links", "Search across companies, contacts and categories"]}
        tourStep={2}
      />
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" aria-label="Search companies" className="pl-9" />
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {PIPELINE_COLUMNS.map((col) => {
            const items = filtered.filter((i) => stageOf(i, appByInquiry.get(i.id)) === col.key);
            return (
              <section key={col.key} aria-label={col.title} className="min-w-0 rounded-3xl bg-muted/80 p-3">
                <h2 className="flex items-center gap-2 px-1.5 pb-1 text-sm font-semibold text-foreground">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  {col.title}
                  <span className="ml-auto font-medium text-muted-foreground">{items.length}</span>
                </h2>
                <p className="px-1.5 pb-3 text-xs text-muted-foreground">{col.help}</p>
                <div className="space-y-2.5">
                  {items.length === 0 && <Empty>Nothing here</Empty>}
                  {items.map((i) => {
                    const a = appByInquiry.get(i.id);
                    const when =
                      col.key === "unscreened" ? `Inquired ${timeAgo(i.created_at)}` : col.key === "invited" ? `Invited ${timeAgo(i.invited_at)}` : col.key === "pending" ? `Applied ${timeAgo(a?.created_at)}` : `Updated ${timeAgo(a?.decided_at || i.closed_at || i.created_at)}`;
                    return (
                      <Link
                        key={i.id}
                        href={`/innovation/vendor-pipeline/${i.id}`}
                        className="block rounded-2xl border border-transparent bg-white p-3.5 shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <p className="text-[15px] font-semibold leading-snug text-[#111827]">{i.company_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {i.primary_contact || "No contact"} · {when}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {i.core_service_category && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold ring-1 ring-border">{i.core_service_category}</span>}
                          {(col.key === "approved" || col.key === "other") && <StatusBadge status={a?.status || i.status} className="text-[11px]" />}
                          <SampleBadge show={i.is_sample} />
                          {a?.score != null && (isApprovedStatus(a.status) || col.key === "other") && (
                            <span className="ml-auto inline-flex h-6 min-w-9 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white" title="Vendor score">
                              {a.score}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
