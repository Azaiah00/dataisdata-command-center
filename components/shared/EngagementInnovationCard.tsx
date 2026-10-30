"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parseAmount } from "@/lib/links";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLIANCE_FRAMEWORKS, FUNDING_SOURCES, FUNDING_STAGES, INNOVATION_THEMES, LIFECYCLE_STAGES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

const NONE = "__none";

type Fields = {
  innovation_theme: string | null;
  lifecycle_stage: string | null;
  strategic_plan_goal: string | null;
  council_priority: string | null;
  compliance_framework: string | null;
  existing_tool_owned: boolean | null;
  redundant_purchase_risk: boolean | null;
  annual_license_cost: number | null;
  estimated_savings: number | null;
  funding_source: string | null;
  funding_stage: string | null;
  grant_deadline: string | null;
  match_pct: number | null;
  grant_probability_pct: number | null;
  manual_process: boolean | null;
  automation_candidate: boolean | null;
  estimated_hours_saved: number | null;
  ai_impact_score: number | null;
};
const KEYS = [
  "innovation_theme", "lifecycle_stage", "strategic_plan_goal", "council_priority", "compliance_framework",
  "existing_tool_owned", "redundant_purchase_risk", "annual_license_cost", "estimated_savings",
  "funding_source", "funding_stage", "grant_deadline", "match_pct", "grant_probability_pct",
  "manual_process", "automation_candidate", "estimated_hours_saved", "ai_impact_score",
] as const;

/**
 * The innovation / funding / cost-avoidance fields that feed the Executive Portfolio
 * and the dashboard's Funding and Cost-Avoidance cards. Saves only these columns.
 */
export function EngagementInnovationCard({ engagementId, canEdit, onSaved }: { engagementId: string; canEdit: boolean; onSaved?: () => void }) {
  const [data, setData] = useState<Fields | null>(null);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: row } = await supabase.from("engagements").select(KEYS.join(", ")).eq("id", engagementId).maybeSingle();
    setData((row as unknown as Fields) || null);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  function startEdit() {
    if (!data) return;
    const d: Record<string, string | boolean> = {};
    KEYS.forEach((k) => {
      const v = data[k];
      d[k] = typeof v === "boolean" ? v : v == null ? "" : String(v);
    });
    setDraft(d);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const t = (k: string) => (String(draft[k] ?? "").trim() || null);
    const n = (k: string) => parseAmount(draft[k]);
    const i = (k: string, max?: number) => {
      const v = parseAmount(draft[k]);
      return v == null ? null : Math.round(max ? Math.max(0, Math.min(max, v)) : v);
    };
    const payload = {
      innovation_theme: t("innovation_theme"),
      lifecycle_stage: t("lifecycle_stage"),
      strategic_plan_goal: t("strategic_plan_goal"),
      council_priority: t("council_priority"),
      compliance_framework: t("compliance_framework"),
      existing_tool_owned: !!draft.existing_tool_owned,
      redundant_purchase_risk: !!draft.redundant_purchase_risk,
      annual_license_cost: n("annual_license_cost"),
      estimated_savings: n("estimated_savings"),
      funding_source: t("funding_source"),
      funding_stage: t("funding_stage"),
      grant_deadline: t("grant_deadline"),
      match_pct: n("match_pct"),
      grant_probability_pct: i("grant_probability_pct", 100),
      manual_process: !!draft.manual_process,
      automation_candidate: !!draft.automation_candidate,
      estimated_hours_saved: n("estimated_hours_saved"),
      ai_impact_score: i("ai_impact_score", 10),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("engagements").update(payload).eq("id", engagementId);
    setSaving(false);
    if (error) return toast.error(`Innovation details not saved: ${error.message}`);
    toast.success("Innovation details saved");
    setEditing(false);
    await load();
    onSaved?.();
  }

  if (!data) return null;
  const set = (k: string, v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }));
  const sel = (k: string, label: string, options: readonly string[]) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={(draft[k] as string) || NONE} onValueChange={(v) => set(k, v === NONE ? "" : v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {Array.from(new Set([...options, ...(draft[k] ? [draft[k] as string] : [])])).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  const txt = (k: string, label: string, type: "text" | "number" | "date" = "text", placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`inn-${k}`}>{label}</Label>
      <Input id={`inn-${k}`} type={type} value={(draft[k] as string) ?? ""} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  const sw = (k: string, label: string) => (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm">
      {label}
      <Switch checked={!!draft[k]} onCheckedChange={(v) => set(k, v)} />
    </label>
  );

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
  const yes = (b: boolean | null) => (b ? "Yes" : "No");
  const money = (v: number | null) => (v == null ? "—" : formatCurrency(v));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-muted-foreground" /> Innovation & funding
          </CardTitle>
          <CardDescription className="mt-1">Feeds the Executive Portfolio, Funding Tracker and Cost Avoidance cards</CardDescription>
        </div>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit} className="shrink-0">
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          ))}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sel("innovation_theme", "Innovation theme", INNOVATION_THEMES)}
              {sel("lifecycle_stage", "Lifecycle stage", LIFECYCLE_STAGES)}
              {txt("strategic_plan_goal", "Strategic plan goal")}
              {txt("council_priority", "Council priority")}
              {sel("compliance_framework", "Compliance framework", COMPLIANCE_FRAMEWORKS)}
              {txt("ai_impact_score", "AI impact score (0–10)", "number")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sel("funding_source", "Funding source", FUNDING_SOURCES)}
              {sel("funding_stage", "Funding stage", FUNDING_STAGES)}
              {txt("grant_deadline", "Grant deadline", "date")}
              {txt("grant_probability_pct", "Grant probability (%)", "number")}
              {txt("match_pct", "Local match (%)", "number")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {txt("annual_license_cost", "Annual license cost ($)", "number")}
              {txt("estimated_savings", "Estimated savings ($)", "number")}
              {txt("estimated_hours_saved", "Estimated hours saved", "number")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sw("existing_tool_owned", "Already owns a tool for this")}
              {sw("redundant_purchase_risk", "Redundant purchase risk")}
              {sw("manual_process", "Currently a manual process")}
              {sw("automation_candidate", "Automation candidate")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              {row("Theme", data.innovation_theme)}
              {row("Lifecycle stage", data.lifecycle_stage)}
              {row("Strategic plan goal", data.strategic_plan_goal)}
              {row("Council priority", data.council_priority)}
              {row("Compliance", data.compliance_framework)}
              {row("AI impact score", data.ai_impact_score != null ? `${data.ai_impact_score}/10` : null)}
            </div>
            <div>
              {row("Funding", [data.funding_source, data.funding_stage].filter(Boolean).join(" · ") || null)}
              {row("Grant deadline", data.grant_deadline ? formatDate(data.grant_deadline) : null)}
              {row("Grant probability", data.grant_probability_pct != null ? `${data.grant_probability_pct}%` : null)}
              {row("License cost / savings", `${money(data.annual_license_cost)} / ${money(data.estimated_savings)}`)}
              {row("Hours saved", data.estimated_hours_saved)}
              {row("Owns tool · Redundant risk", `${yes(data.existing_tool_owned)} · ${yes(data.redundant_purchase_risk)}`)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
