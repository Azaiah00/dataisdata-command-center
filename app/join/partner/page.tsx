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
import { CATEGORIES, INQUIRY_INTERESTS } from "@/lib/innovation/constants";
import { errorText } from "@/lib/innovation/data";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function PartnerInterestPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    website: "",
    primary_contact: "",
    title: "",
    email: "",
    core_service_category: "",
    worked_public_sector: "yes",
    states: "",
    brief_description: "",
    interested_in: [] as string[],
    company_fax: "", // honeypot: real people never see or fill this
  });
  const formRef = useRef<HTMLFormElement>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setInvalid((x) => x.filter((n) => n !== k));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const bad: string[] = [];
    if (!form.company_name.trim()) bad.push("company_name");
    if (!form.primary_contact.trim()) bad.push("primary_contact");
    if (!EMAIL.test(form.email.trim())) bad.push("email");
    if (!form.core_service_category) bad.push("core_service_category");
    if (!form.brief_description.trim()) bad.push("brief_description");
    setInvalid(bad);
    if (bad.length) {
      setError(bad.includes("email") && form.email.trim() ? "Please enter a valid email address." : "Please complete the highlighted fields.");
      formRef.current?.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    if (form.company_fax) {
      router.push("/join/partner/thanks");
      return;
    }
    setSaving(true);
    const { error: err } = await supabaseRaw.rpc("submit_vendor_inquiry", {
      p: { ...form, worked_public_sector: form.worked_public_sector === "yes" },
    });
    setSaving(false);
    if (err) {
      setError(errorText(err));
      return;
    }
    try {
      sessionStorage.setItem("did-join-name", form.primary_contact.trim().split(/\s+/)[0] || "");
    } catch {
      /* ignore */
    }
    router.push("/join/partner/thanks");
  }

  const inv = (k: string) => (invalid.includes(k) ? "true" : undefined);

  return (
    <PublicShell>
      <PublicHero eyebrow="Innovation Partner Interest Form" title="Bring your technology to the localities that need it.">
        DataIsData connects proven vendors with Virginia cities, counties and agencies through curated showcase events and partnerships. Tell us about your
        company. If there’s a fit, we’ll invite you to apply.
      </PublicHero>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-5 rounded-3xl bg-white p-5 shadow-md sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <Input name="company_name" autoComplete="organization" value={form.company_name} onChange={set("company_name")} aria-invalid={inv("company_name")} />
          </Field>
          <Field label="Website">
            <Input name="website" inputMode="url" placeholder="yourcompany.com" value={form.website} onChange={set("website")} />
          </Field>
          <Field label="Primary contact">
            <Input name="primary_contact" autoComplete="name" value={form.primary_contact} onChange={set("primary_contact")} aria-invalid={inv("primary_contact")} />
          </Field>
          <Field label="Title">
            <Input name="title" autoComplete="organization-title" value={form.title} onChange={set("title")} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={inv("email")} />
          </Field>
          <Field label="Core service category">
            <select name="core_service_category" className={selectClass} value={form.core_service_category} onChange={set("core_service_category")} aria-invalid={inv("core_service_category")}>
              <option value="">Choose one</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Worked with the public sector?">
            <select name="worked_public_sector" className={selectClass} value={form.worked_public_sector} onChange={set("worked_public_sector")}>
              <option value="yes">Yes</option>
              <option value="no">Not yet</option>
            </select>
          </Field>
          <Field label="States you operate in">
            <Input name="states" placeholder="Virginia, Maryland" value={form.states} onChange={set("states")} />
          </Field>
          <Field label="Brief description" hint="What you do and who you do it for" className="sm:col-span-2">
            <Textarea name="brief_description" maxLength={500} rows={4} value={form.brief_description} onChange={set("brief_description")} aria-invalid={inv("brief_description")} />
            <span className="justify-self-end text-xs font-normal text-muted-foreground">{form.brief_description.length} / 500</span>
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Interested in</legend>
            <OptionChips name="interested_in" options={INQUIRY_INTERESTS} value={form.interested_in} onChange={(v) => setForm((f) => ({ ...f, interested_in: v }))} />
          </fieldset>
          <div aria-hidden="true" className="sr-only">
            <label>
              Company fax
              <input tabIndex={-1} autoComplete="off" name="company_fax" value={form.company_fax} onChange={set("company_fax")} />
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} className="h-11 px-5">
            <Send className="h-4 w-4" /> {saving ? "Submitting…" : "Submit interest"}
          </Button>
          <span className="text-xs text-muted-foreground">We review every inquiry. Submitting doesn’t guarantee an invitation.</span>
        </div>
      </form>
    </PublicShell>
  );
}
