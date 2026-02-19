"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function VendorInquiryFormPage() {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    primary_contact: "",
    title: "",
    email: "",
    website: "",
    core_service_category: "",
    worked_public_sector: false,
    states: "",
    brief_description: "",
    interested_in: [] as string[],
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
    const { error } = await supabase.from("vendor_inquiries").insert([{ ...form, status: "Unscreened Inquiry" }]);
    setSaving(false);
    if (error) {
      toast.error("Could not submit inquiry");
      return;
    }
    toast.success("Inquiry submitted");
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-[#111827]">Thanks for your interest</h1>
            <p className="text-[#6B7280] mt-2">Your inquiry was received. We will review and follow up if there is a fit.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>DataIsData Innovation Partner Interest Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Company Name</Label><Input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Primary Contact</Label><Input value={form.primary_contact} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} /></div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <div><Label>Core Service Category</Label><Input value={form.core_service_category} onChange={(e) => setForm({ ...form, core_service_category: e.target.value })} /></div>
              <div><Label>States of Operation</Label><Input value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-6"><input id="publicsector" type="checkbox" checked={form.worked_public_sector} onChange={(e) => setForm({ ...form, worked_public_sector: e.target.checked })} /><Label htmlFor="publicsector">Worked with public sector?</Label></div>
            </div>

            <div><Label>Brief Description (500 chars)</Label><Textarea maxLength={500} value={form.brief_description} onChange={(e) => setForm({ ...form, brief_description: e.target.value })} /></div>

            <div className="space-y-2">
              <Label>Interested In</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {["Vendor Showcase Events", "Strategic Partnership", "Prime/Sub Opportunities", "Innovation Pilot", "Other"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input type="checkbox" checked={form.interested_in.includes(opt)} onChange={() => toggleInterest(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Submitting..." : "Submit Inquiry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
