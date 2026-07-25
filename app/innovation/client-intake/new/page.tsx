"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ClientIntakeNewPage() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    organization_name: "",
    population_size: "",
    annual_it_budget: "",
    top_challenges: "",
    current_initiatives: "",
    grant_funding_interest: false,
    strategic_plan_link: "",
    interested_in: [] as string[],
    contact_name: "",
    contact_email: "",
    contact_title: "",
  });

  function toggleInterest(value: string) {
    setForm((prev) => ({
      ...prev,
      interested_in: prev.interested_in.includes(value)
        ? prev.interested_in.filter((item) => item !== value)
        : [...prev.interested_in, value],
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      population_size: form.population_size ? Number(form.population_size) : null,
      annual_it_budget: form.annual_it_budget ? Number(form.annual_it_budget) : null,
      top_challenges: form.top_challenges ? form.top_challenges.split(",").map((x) => x.trim()) : null,
      status: "New",
    };
    const { error } = await supabase.from("client_intakes").insert([payload]);
    setSaving(false);
    if (error) {
      toast.error("Could not submit intake");
      return;
    }
    toast.success("Intake submitted");
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-[#111827]">Thanks for your interest</h1>
            <p className="text-[#6B7280] mt-2">Your intake has been received. DataIsData will follow up with next steps.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Innovation Assessment Intake Form</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Organization Name</Label><Input required value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Population Size</Label><Input value={form.population_size} onChange={(e) => setForm({ ...form, population_size: e.target.value })} /></div>
              <div><Label>Annual IT Budget</Label><Input value={form.annual_it_budget} onChange={(e) => setForm({ ...form, annual_it_budget: e.target.value })} /></div>
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Contact Title</Label><Input value={form.contact_title} onChange={(e) => setForm({ ...form, contact_title: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={form.grant_funding_interest} onChange={(e) => setForm({ ...form, grant_funding_interest: e.target.checked })} /><Label>Grant Funding Interest</Label></div>
            </div>

            <div><Label>Top 3 Technology Challenges (comma-separated)</Label><Input value={form.top_challenges} onChange={(e) => setForm({ ...form, top_challenges: e.target.value })} /></div>
            <div><Label>Current Innovation Initiatives</Label><Textarea value={form.current_initiatives} onChange={(e) => setForm({ ...form, current_initiatives: e.target.value })} /></div>
            <div><Label>Strategic Plan Link</Label><Input value={form.strategic_plan_link} onChange={(e) => setForm({ ...form, strategic_plan_link: e.target.value })} /></div>

            <div className="space-y-2">
              <Label>Interested In</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {["Innovation Dashboard", "Advisory Services", "Managed IaaS", "Broadband Strategy", "Cyber Assessment"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input type="checkbox" checked={form.interested_in.includes(opt)} onChange={() => toggleInterest(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Submitting..." : "Submit Intake"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
