"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CRITERIA, DECISIONS, type CriteriaScores, type Decision, defaultScores, suggestDecision, weightedScore } from "@/lib/innovation/constants";
import { errorText, logActivity, recordDecision } from "@/lib/innovation/data";
import type { VendorApplication, VendorInquiry } from "@/lib/innovation/types";
import { Field, StatusBadge, selectClass } from "./ui";

/** Part 3: the weighted 0–100 vendor score and the recorded decision. */
export function Scorecard({
  inquiry,
  application,
  reviewer,
  onSaved,
  onCancel,
}: {
  inquiry: VendorInquiry | null;
  application: VendorApplication;
  reviewer: string;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const initial = useMemo<CriteriaScores>(() => ({ ...defaultScores(), ...(application.criteria_scores || {}) }), [application.criteria_scores]);
  const [scores, setScores] = useState<CriteriaScores>(initial);
  const total = weightedScore(scores);
  const suggested = suggestDecision(total);
  const reviewed = !!application.decided_at;
  const [decision, setDecision] = useState<Decision>((reviewed && (DECISIONS as readonly string[]).includes(application.status || "") ? application.status : suggested) as Decision);
  const [touched, setTouched] = useState(reviewed);
  const [notes, setNotes] = useState(application.decision_notes || "");
  const [by, setBy] = useState(application.reviewed_by || reviewer);
  const [coi, setCoi] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setScore = (k: keyof CriteriaScores, v: number) => {
    const next = { ...scores, [k]: v };
    setScores(next);
    if (!touched) setDecision(suggestDecision(weightedScore(next)));
  };

  async function save() {
    setError("");
    if (!by.trim()) return setError("Add the reviewer's name.");
    if (!notes.trim()) return setError("Add a short reason for the record.");
    if (!coi) return setError("Confirm the conflict-of-interest check before recording a decision.");
    setSaving(true);
    try {
      const res = await recordDecision({ inquiry, application, scores, total, decision, notes: notes.trim(), reviewer: by.trim() });
      const company = inquiry?.company_name || "Vendor";
      await logActivity(`${company}: ${decision} (score ${total}, ${by.trim()})`, "vendor_inquiry", inquiry?.id, by.trim());
      if (res.createdPartner) await logActivity(`Partner record created for ${company} in CRM › Partners`, "partner", res.partnerId, by.trim());
      toast.success("Decision recorded");
      onSaved();
    } catch (e) {
      setError(errorText(e, "Could not save the decision."));
    }
    setSaving(false);
  }

  return (
    <section id="scorecard" className="rounded-3xl bg-white p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Part 3 · Weighted vendor score</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Score {inquiry?.company_name || "this application"}</h2>
        </div>
        <span className="text-xs text-muted-foreground">Same six criteria and weights as before</span>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="divide-y divide-border">
          {CRITERIA.map((c) => (
            <div key={c.key} className="py-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <label htmlFor={`sc-${c.key}`} className="font-medium text-foreground">{c.label}</label>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.weight}% · <b className="text-foreground tabular-nums">{scores[c.key]}</b> / 100
                </span>
              </div>
              <input
                id={`sc-${c.key}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={scores[c.key]}
                onChange={(e) => setScore(c.key, Number(e.target.value))}
                aria-describedby={`sh-${c.key}`}
                className="mt-2 h-7 w-full cursor-pointer accent-[var(--primary)]"
              />
              <p id={`sh-${c.key}`} className="text-xs text-muted-foreground">{c.hint}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-muted/70 p-5">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Weighted total</p>
            <p className="mt-1 text-6xl font-bold tracking-tight tabular-nums text-foreground" aria-live="polite">{total}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-green-bright to-primary transition-all" style={{ width: `${total}%` }} />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Suggested status</p>
          <div className="mt-1"><StatusBadge status={suggested} className="text-sm" /></div>
          <p className="mt-2 text-xs text-muted-foreground">80+ Innovation Partner · 65–79 Event Participant · 50–64 Conditional · under 50 Not Approved</p>
          <div className="mt-4 grid gap-3">
            <Field label="Decision">
              <select className={selectClass} value={decision} onChange={(e) => { setDecision(e.target.value as Decision); setTouched(true); }}>
                {DECISIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Reviewed by"><Input value={by} onChange={(e) => { setBy(e.target.value); setError(""); }} autoComplete="name" /></Field>
            <Field label="Reason for the record"><Textarea rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setError(""); }} placeholder="Why this decision? What would change it?" /></Field>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={coi} onChange={(e) => { setCoi(e.target.checked); setError(""); }} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
              <span>I have no financial interest in this company beyond published event fees.</span>
            </label>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <Button onClick={save} disabled={saving} className="h-11 w-full">
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Record decision"}
            </Button>
            <p className="text-xs text-muted-foreground">Approving also creates or updates the vendor’s record in CRM › Partners with its score and status.</p>
            {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
          </div>
        </div>
      </div>
    </section>
  );
}
