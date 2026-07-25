"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function NewEventPage() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    event_date: "",
    theme: "",
    target_audience: "",
    registration_link: "",
    cost_to_vendor: "",
    cost_to_attendees: "",
    notes: "",
    status: "Planned",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      cost_to_vendor: form.cost_to_vendor ? Number(form.cost_to_vendor) : null,
      cost_to_attendees: form.cost_to_attendees ? Number(form.cost_to_attendees) : null,
    };
    const { error } = await supabase.from("events").insert([payload]);
    setSaving(false);
    if (error) {
      toast.error("Could not create event");
      return;
    }
    toast.success("Event created");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Create Vendor Showcase Event</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Event Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Theme</Label><Input placeholder="AI / Cyber / Broadband / Resiliency" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Target Audience</Label><Input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} /></div>
              <div><Label>Cost to Vendor</Label><Input value={form.cost_to_vendor} onChange={(e) => setForm({ ...form, cost_to_vendor: e.target.value })} /></div>
              <div><Label>Cost to Attendees</Label><Input value={form.cost_to_attendees} onChange={(e) => setForm({ ...form, cost_to_attendees: e.target.value })} /></div>
            </div>
            <div><Label>Registration Link</Label><Input value={form.registration_link} onChange={(e) => setForm({ ...form, registration_link: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Create Event"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
