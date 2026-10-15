"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/components/auth/AccessProvider";
import { Field, ModuleNav, PageTitle, Panel, selectClass } from "@/components/innovation/ui";
import { EVENT_STATUSES } from "@/lib/innovation/constants";
import { INNOVATION_THEMES } from "@/lib/constants";
import { errorText, logActivity } from "@/lib/innovation/data";

export default function NewEventPage() {
  const router = useRouter();
  const { realUser } = useAccess();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    location: "",
    event_date: "",
    theme: "AI",
    target_audience: "",
    capacity: "100",
    registration_link: "",
    cost_to_attendees: "",
    notes: "",
    status: "Planned",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Give the event a name.");
    setSaving(true);
    const base = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      event_date: form.event_date || null,
      theme: form.theme,
      target_audience: form.target_audience.trim() || null,
      registration_link: form.registration_link.trim() || null,
      cost_to_attendees: form.cost_to_attendees ? Number(form.cost_to_attendees.replace(/[$,]/g, "")) || 0 : null,
      notes: form.notes.trim() || null,
      status: form.status,
    };
    // capacity only exists after the module's database update; fall back gracefully.
    let res = await supabase.from("events").insert([{ ...base, capacity: Number(form.capacity) || null }]).select("id").single();
    if (res.error && /capacity/.test(res.error.message || "")) res = await supabase.from("events").insert([base]).select("id").single();
    if (res.error || !res.data) {
      setSaving(false);
      setError(errorText(res.error, "Could not create the event."));
      return;
    }
    const id = res.data.id as string;
    await supabase.from("event_tasks").insert([{ event_id: id, title: "Publish the vendor fee disclosure on the event page" }]);
    await logActivity(`Event created: ${base.name}`, "event", id, realUser?.full_name);
    toast.success("Event created");
    router.push(`/innovation/events/${id}`);
  }

  return (
    <div className="space-y-6">
      <ModuleNav />
      <PageTitle title="New showcase event" subtitle="After you create it you can add approved vendors, invite localities and track payments, leads and tasks." />
      <Panel className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name" className="sm:col-span-2"><Input value={form.name} onChange={set("name")} aria-invalid={error && !form.name.trim() ? true : undefined} /></Field>
          <Field label="Date"><Input type="date" value={form.event_date} onChange={set("event_date")} /></Field>
          <Field label="Location"><Input placeholder="City, VA" value={form.location} onChange={set("location")} /></Field>
          <Field label="Theme">
            <select className={selectClass} value={form.theme} onChange={set("theme")}>
              {INNOVATION_THEMES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={selectClass} value={form.status} onChange={set("status")}>
              {EVENT_STATUSES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Target audience" className="sm:col-span-2"><Input placeholder="City managers, CIOs, procurement" value={form.target_audience} onChange={set("target_audience")} /></Field>
          <Field label="Capacity"><Input inputMode="numeric" value={form.capacity} onChange={set("capacity")} /></Field>
          <Field label="Cost to attendees" hint="blank = free"><Input inputMode="decimal" value={form.cost_to_attendees} onChange={set("cost_to_attendees")} /></Field>
          <Field label="Registration link" className="sm:col-span-2"><Input inputMode="url" value={form.registration_link} onChange={set("registration_link")} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={form.notes} onChange={set("notes")} /></Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">Vendor fees come from each sponsorship tier when you add vendors (Showcase $2,500, Premium Sponsor $5,000, Strategic Partner $10,000), and you can change any fee.</p>
          {error && <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving} className="h-11"><Plus className="h-4 w-4" /> {saving ? "Creating…" : "Create event"}</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
