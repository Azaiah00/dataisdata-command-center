"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { supabaseRaw } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptionChips, PublicHero, PublicShell } from "@/components/innovation/PublicShell";
import { Field, selectClass } from "@/components/innovation/ui";
import { CHALLENGES, CLIENT_INTERESTS, ORG_TYPES } from "@/lib/innovation/constants";
import { errorText } from "@/lib/innovation/data";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function InnovationAssessmentPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [form, setForm] = useState({
    organization_name: "",
    organization_type: "City",
    contact_name: "",
    contact_title: "",
    contact_email: "",
    population_size: "",
    annual_it_budget: "",
    grant_funding_interest: "yes",
    ch1: "",
    ch2: "",
    ch3: "",
    current_initiatives: "",
    strategic_plan_link: "",
    interested_in: [] as string[],
    org_fax: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setInvalid((x) => x.filter((n) => n !== k));
  };
  const inv = (k: string) => (invalid.includes(k) ? "true" : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const bad: string[] = [];
    if (!form.organization_name.trim()) bad.push("organization_name");
    if (!form.contact_name.trim()) bad.push("contact_name");
    if (!EMAIL.test(form.contact_email.trim())) bad.push("contact_email");
    if (!form.ch1) bad.push("ch1");
    setInvalid(bad);
    if (bad.length) {
      setError(bad.includes("contact_email") && form.contact_email.trim() ? "Please enter a valid email address." : "Please complete the highlighted fields.");
      formRef.current?.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    if (form.org_fax) {
      router.push("/join/assessment/thanks");
      return;
    }
    const top = [form.ch1, form.ch2, form.ch3].filter((x, i, a) => x && a.indexOf(x) === i);
    const { ch1, ch2, ch3, org_fax, ...rest } = form;
    void ch1; void ch2; void ch3; void org_fax;
    setSaving(true);
    const { error: err } = await supabaseRaw.rpc("submit_innovation_assessment", { p: { ...rest, top_challenges: top } });
    setSaving(false);
    if (err) {
      setError(errorText(err));
      return;
    }
    try {
      sessionStorage.setItem("did-join-name", form.contact_name.trim().split(/\s+/)[0] || "");
    } catch {
      /* ignore */
    }
    router.push("/join/assessment/thanks");
  }

  return (
    <PublicShell>
      <PublicHero eyebrow="Innovation Assessment" title="Where should your locality innovate next?">
        About ten minutes. Tell us your top technology challenges and DataIsData will follow up with a readiness review and the partners worth meeting.
      </PublicHero>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-5 rounded-3xl bg-white p-5 shadow-md sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization name"><Input name="organization_name" autoComplete="organization" value={form.organization_name} onChange={set("organization_name")} aria-invalid={inv("organization_name")} /></Field>
          <Field label="Organization type">
            <select name="organization_type" className={selectClass} value={form.organization_type} onChange={set("organization_type")}>
              {ORG_TYPES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Your name"><Input name="contact_name" autoComplete="name" value={form.contact_name} onChange={set("contact_name")} aria-invalid={inv("contact_name")} /></Field>
          <Field label="Title"><Input name="contact_title" autoComplete="organization-title" value={form.contact_title} onChange={set("contact_title")} /></Field>
          <Field label="Email"><Input name="contact_email" type="email" autoComplete="email" value={form.contact_email} onChange={set("contact_email")} aria-invalid={inv("contact_email")} /></Field>
          <Field label="Population"><Input name="population_size" inputMode="numeric" placeholder="e.g. 45,000" value={form.population_size} onChange={set("population_size")} /></Field>
          <Field label="Annual IT budget"><Input name="annual_it_budget" placeholder="e.g. $2.5M" value={form.annual_it_budget} onChange={set("annual_it_budget")} /></Field>
          <Field label="Interested in grant funding?">
            <select name="grant_funding_interest" className={selectClass} value={form.grant_funding_interest} onChange={set("grant_funding_interest")}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unsure">Not sure</option>
            </select>
          </Field>
          {(["ch1", "ch2", "ch3"] as const).map((k, i) => (
            <Field key={k} label={`Top challenge ${i + 1}`} hint={i ? "optional" : undefined}>
              <select name={k} className={selectClass} value={form[k]} onChange={set(k)} aria-invalid={inv(k)}>
                <option value="">{i ? "None" : "Choose one"}</option>
                {CHALLENGES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
          ))}
          <Field label="Current innovation initiatives" className="sm:col-span-2"><Textarea name="current_initiatives" rows={3} value={form.current_initiatives} onChange={set("current_initiatives")} /></Field>
          <Field label="Strategic plan link" hint="optional" className="sm:col-span-2"><Input name="strategic_plan_link" inputMode="url" value={form.strategic_plan_link} onChange={set("strategic_plan_link")} /></Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Interested in</legend>
            <OptionChips name="interested_in" options={CLIENT_INTERESTS} value={form.interested_in} onChange={(v) => setForm((f) => ({ ...f, interested_in: v }))} />
          </fieldset>
          <div aria-hidden="true" className="sr-only">
            <label>
              Organization fax
              <input tabIndex={-1} autoComplete="off" name="org_fax" value={form.org_fax} onChange={set("org_fax")} />
            </label>
          </div>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" disabled={saving} className="h-11 px-5">
          <Send className="h-4 w-4" /> {saving ? "Submitting…" : "Submit assessment"}
        </Button>
      </form>
    </PublicShell>
  );
}
