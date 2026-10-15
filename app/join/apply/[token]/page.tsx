"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { supabaseRaw } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptionChips, PublicHero, PublicShell } from "@/components/innovation/PublicShell";
import { Field, selectClass } from "@/components/innovation/ui";
import { CERTIFICATIONS, COMPLIANCE, LEGAL_STRUCTURES, REVENUE_RANGES } from "@/lib/innovation/constants";
import { errorText } from "@/lib/innovation/data";

type Invitation = { inquiry_id: string; company_name: string; primary_contact: string | null; email: string | null; can_apply: boolean };

const EMPTY = {
  years_in_business: "",
  legal_structure: "",
  certifications: [] as string[],
  insurance_coverage: "",
  contract_vehicles: "",
  public_sector_references: "",
  core_offerings: "",
  problem_solved: "",
  existing_gov_clients: "",
  technology_stack: "",
  differentiator: "",
  integration_capabilities: "",
  annual_revenue_range: REVENUE_RANGES[0],
  growth_pct: "",
  bonding_capacity: "",
  cost_reduction_explanation: "",
  strategic_alignment: "",
  open_to_revenue_share: "yes",
  compliance: [] as string[],
  security_certifications: "",
  data_handling_practices: "",
};
const REQUIRED: (keyof typeof EMPTY)[] = ["years_in_business", "legal_structure", "core_offerings", "problem_solved", "cost_reduction_explanation"];

export default function VendorApplicationPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let live = true;
    supabaseRaw.rpc("get_vendor_invitation", { p_token: token }).then(({ data, error: err }) => {
      if (!live) return;
      if (err) setError(errorText(err));
      setInvite(((data as Invitation[] | null) || [])[0] || null);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [token]);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setInvalid((x) => x.filter((n) => n !== k));
  };
  const inv = (k: string) => (invalid.includes(k) ? "true" : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const bad = REQUIRED.filter((k) => !String(form[k]).trim());
    if (form.years_in_business.trim() && !/^\d{1,3}$/.test(form.years_in_business.trim())) bad.unshift("years_in_business");
    setInvalid(bad);
    if (bad.length) {
      setError(bad[0] === "years_in_business" && form.years_in_business.trim() ? "Years in business should be a whole number." : "Please complete the highlighted fields.");
      formRef.current?.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    setSaving(true);
    const { compliance, growth_pct, ...rest } = form;
    const { error: err } = await supabaseRaw.rpc("submit_vendor_application", {
      p_token: token,
      p: { ...rest, growth_pct: growth_pct.replace(/[%\s]/g, ""), compliance_standards: compliance.join(", ") },
    });
    setSaving(false);
    if (err) {
      setError(errorText(err));
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  if (loading) {
    return (
      <PublicShell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </PublicShell>
    );
  }

  if (done || !invite || !invite.can_apply) {
    const title = done ? `Thank you${invite?.primary_contact ? `, ${invite.primary_contact.split(" ")[0]}` : ""}. Your application is in.` : invite ? "This application has already been submitted." : "This link isn’t valid.";
    const body = done
      ? "The DataIsData team reviews every application against the same criteria. You’ll hear from us within two weeks."
      : invite
        ? "Thank you. The DataIsData team is reviewing it."
        : "The application is by invitation only. If you received an invitation, open the exact link from the email.";
    return (
      <PublicShell>
        <PublicHero eyebrow="Strategic Partner Enrollment" title={title}>
          {body}
        </PublicHero>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </PublicShell>
    );
  }

  const section = (n: number, title: string, children: React.ReactNode) => (
    <fieldset className="border-t border-border pt-5 first:border-0 first:pt-0">
      <legend className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">{n}</span>
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );

  return (
    <PublicShell>
      <p className="mb-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/70 px-4 py-3 text-sm text-brand-green-dark">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This private application was sent to <strong>{invite.email || invite.company_name}</strong>. Please don’t share the link.
        </span>
      </p>
      <PublicHero eyebrow="Strategic Partner Enrollment Application" title={`${invite.company_name}, you’re invited.`}>
        About 15 minutes. Every applicant is reviewed by the DataIsData team against the same six criteria.
      </PublicHero>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-6 rounded-3xl bg-white p-5 shadow-md sm:p-7">
        {section(1, "Company profile", (
          <>
            <Field label="Years in business"><Input name="years_in_business" inputMode="numeric" value={form.years_in_business} onChange={set("years_in_business")} aria-invalid={inv("years_in_business")} /></Field>
            <Field label="Legal structure">
              <select name="legal_structure" className={selectClass} value={form.legal_structure} onChange={set("legal_structure")} aria-invalid={inv("legal_structure")}>
                <option value="">Choose</option>
                {LEGAL_STRUCTURES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Certifications</legend>
              <OptionChips name="certifications" options={CERTIFICATIONS} value={form.certifications} onChange={(v) => setForm((f) => ({ ...f, certifications: v }))} />
            </fieldset>
            <Field label="Insurance coverage"><Input name="insurance_coverage" placeholder="General liability, cyber liability" value={form.insurance_coverage} onChange={set("insurance_coverage")} /></Field>
            <Field label="Contract vehicles"><Input name="contract_vehicles" placeholder="State contracts, GSA, cooperatives" value={form.contract_vehicles} onChange={set("contract_vehicles")} /></Field>
            <Field label="Public sector references" hint="Three, with what you delivered" className="sm:col-span-2"><Textarea name="public_sector_references" rows={3} value={form.public_sector_references} onChange={set("public_sector_references")} /></Field>
          </>
        ))}
        {section(2, "Capability", (
          <>
            <Field label="Core offerings" className="sm:col-span-2"><Input name="core_offerings" value={form.core_offerings} onChange={set("core_offerings")} aria-invalid={inv("core_offerings")} /></Field>
            <Field label="What problem do you solve?" className="sm:col-span-2"><Textarea name="problem_solved" rows={3} value={form.problem_solved} onChange={set("problem_solved")} aria-invalid={inv("problem_solved")} /></Field>
            <Field label="Existing government clients"><Input name="existing_gov_clients" value={form.existing_gov_clients} onChange={set("existing_gov_clients")} /></Field>
            <Field label="Technology stack"><Input name="technology_stack" value={form.technology_stack} onChange={set("technology_stack")} /></Field>
            <Field label="Differentiator"><Input name="differentiator" value={form.differentiator} onChange={set("differentiator")} /></Field>
            <Field label="Integration capabilities"><Input name="integration_capabilities" value={form.integration_capabilities} onChange={set("integration_capabilities")} /></Field>
          </>
        ))}
        {section(3, "Financial stability", (
          <>
            <Field label="Annual revenue range">
              <select name="annual_revenue_range" className={selectClass} value={form.annual_revenue_range} onChange={set("annual_revenue_range")}>
                {REVENUE_RANGES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Growth over the past 2 years" hint="%"><Input name="growth_pct" inputMode="decimal" placeholder="e.g. 25" value={form.growth_pct} onChange={set("growth_pct")} /></Field>
            <Field label="Bonding capacity" hint="if relevant"><Input name="bonding_capacity" value={form.bonding_capacity} onChange={set("bonding_capacity")} /></Field>
          </>
        ))}
        {section(4, "Strategic alignment", (
          <>
            <Field label="How does your service cut cost for municipalities?" className="sm:col-span-2"><Textarea name="cost_reduction_explanation" rows={3} value={form.cost_reduction_explanation} onChange={set("cost_reduction_explanation")} aria-invalid={inv("cost_reduction_explanation")} /></Field>
            <Field label="How does it align with Cyber, Broadband, AI or Resiliency?" className="sm:col-span-2"><Textarea name="strategic_alignment" rows={3} value={form.strategic_alignment} onChange={set("strategic_alignment")} /></Field>
            <Field label="Open to revenue share models?">
              <select name="open_to_revenue_share" className={selectClass} value={form.open_to_revenue_share} onChange={set("open_to_revenue_share")}>
                <option value="yes">Yes</option>
                <option value="maybe">Open to discussion</option>
                <option value="no">No</option>
              </select>
            </Field>
          </>
        ))}
        {section(5, "Risk & governance", (
          <>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Compliance standards</legend>
              <OptionChips name="compliance" options={COMPLIANCE} value={form.compliance} onChange={(v) => setForm((f) => ({ ...f, compliance: v }))} />
            </fieldset>
            <Field label="Security certifications" className="sm:col-span-2"><Input name="security_certifications" placeholder="e.g. SOC 2 Type II (2025)" value={form.security_certifications} onChange={set("security_certifications")} /></Field>
            <Field label="Data handling practices" className="sm:col-span-2"><Textarea name="data_handling_practices" rows={3} placeholder="Where data lives, who can access it, how it’s protected" value={form.data_handling_practices} onChange={set("data_handling_practices")} /></Field>
          </>
        ))}
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} className="h-11 px-5">
            <Send className="h-4 w-4" /> {saving ? "Submitting…" : "Submit application"}
          </Button>
          <span className="text-xs text-muted-foreground">DataIsData may ask for documents later. Don’t include anything sensitive here.</span>
        </div>
      </form>
    </PublicShell>
  );
}
