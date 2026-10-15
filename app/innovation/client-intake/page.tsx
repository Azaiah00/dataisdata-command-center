"use client";

import { Can } from "@/components/auth/AccessProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ClipboardList, ExternalLink, FileCheck, Gauge, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Empty, HowItWorks, ModuleNav, PageTitle, SampleBadge, SetupNotice, Stat, StatusBadge } from "@/components/innovation/ui";
import { APPROVED } from "@/lib/innovation/constants";
import { publicUrl, timeAgo } from "@/lib/innovation/data";
import type { ClientIntake, PartnerLite } from "@/lib/innovation/types";

type Row = ClientIntake & { is_sample?: boolean | null };

export default function ClientIntakeListPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Row[]>([]);
  const [partners, setPartners] = useState<PartnerLite[]>([]);

  useEffect(() => {
    async function loadData() {
      const [ci, pa] = await Promise.all([
        supabase.from("client_intakes").select("*").order("created_at", { ascending: false }),
        supabase.from("partners").select("id, name, vendor_status, vendor_score, innovation_category"),
      ]);
      if (ci.error) console.error("Error loading intakes:", ci.error);
      setData((ci.data as Row[]) || []);
      setPartners(pa.error ? [] : ((pa.data as PartnerLite[]) || []));
      setLoading(false);
    }
    loadData();
  }, []);

  const matches = (c: Row) => partners.filter((p) => APPROVED.includes(p.vendor_status || "") && (c.top_challenges || []).includes(p.innovation_category || "")).length;
  const scored = data.filter((c) => c.readiness_score != null);
  const sorted = [...data].sort((a, b) => Number(b.status === "New") - Number(a.status === "New"));

  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle
        title="Client Intake"
        subtitle="Cities, counties and agencies fill out the Innovation Assessment. Review it, assign a tier and readiness score, and see which approved partners fit the challenges they named."
        actions={
          <>
            <a href={publicUrl("/join/assessment")} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-10"><ExternalLink className="h-4 w-4" /> Innovation Assessment (public)</Button>
            </a>
            <Can module="client_intake" action="create">
              <Link href="/innovation/client-intake/new"><Button className="h-10"><Plus className="h-4 w-4" /> Add intake</Button></Link>
            </Can>
          </>
        }
      />
      <SetupNotice />
      <HowItWorks
        id="intake"
        title="The vendor pattern, pointed the other way"
        steps={[
          "A locality fills out the public Innovation Assessment (or you add one here). It arrives as New.",
          "Open it. Set the innovation tier, readiness score and advisory estimate, then Save review.",
          "Matching shows approved partners in the categories the locality named.",
          "Convert to client account to create the CRM account. Then invite it to events and create its city login.",
        ]}
        whatsNew={["Public assessment with no login", "Partner matching by challenge", "Independence rule when DataIsData advises the locality", "City login and event invitations"]}
        tourStep={6}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New" value={data.filter((c) => (c.status || "New") === "New").length} sub="Waiting for review" tone="warn" icon={ClipboardList} />
        <Stat label="Reviewed" value={data.filter((c) => ["Reviewing", "Qualified"].includes(c.status || "")).length} sub="Tier assigned" icon={FileCheck} />
        <Stat label="Clients" value={data.filter((c) => c.status === "Converted").length} sub="Converted to accounts" tone="ok" icon={Building2} />
        <Stat label="Average readiness" value={scored.length ? Math.round(scored.reduce((t, c) => t + (c.readiness_score || 0), 0) / scored.length) : "–"} sub="Out of 100" icon={Gauge} />
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      ) : data.length === 0 ? (
        <Empty>No intakes yet. Share the Innovation Assessment link with localities.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <Link key={c.id} href={`/innovation/client-intake/${c.id}`} className="grid content-start gap-2.5 rounded-3xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-bold leading-snug text-[#111827]">{c.organization_name}</p>
                <StatusBadge status={c.status || "New"} />
              </div>
              <p className="text-sm text-muted-foreground">
                {[c.organization_type, c.population_size ? `Pop. ${c.population_size.toLocaleString("en-US")}` : null, c.contact_name].filter(Boolean).join(" · ") || "No details"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(c.top_challenges || []).map((x) => <span key={x} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold ring-1 ring-border">{x}</span>)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-primary">{matches(c)} match{matches(c) === 1 ? "" : "es"}</span>
                {c.assigned_tier && <span className="rounded-full bg-white px-2.5 py-0.5 ring-1 ring-border">{c.assigned_tier}</span>}
                <SampleBadge show={c.is_sample} />
                <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
                {c.readiness_score != null && <span className="ml-auto inline-flex h-6 min-w-9 items-center justify-center rounded-full bg-primary px-2 text-white" title="Readiness">{c.readiness_score}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
