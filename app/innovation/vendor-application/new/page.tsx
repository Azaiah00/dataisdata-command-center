"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Inquiry = { id: string; company_name: string };

export default function VendorApplicationNewPage() {
  const searchParams = useSearchParams();
  const preselectedInquiryId = searchParams.get("inquiry_id") || "";
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    inquiry_id: preselectedInquiryId,
    years_in_business: "",
    legal_structure: "",
    certifications: "",
    insurance_coverage: "",
    contract_vehicles: "",
    public_sector_references: "",
    core_offerings: "",
    problem_solved: "",
    existing_gov_clients: "",
    differentiator: "",
    technology_stack: "",
    integration_capabilities: "",
    annual_revenue_range: "",
    bonding_capacity: "",
    growth_pct: "",
    cost_reduction_explanation: "",
    strategic_alignment: "",
    open_to_revenue_share: false,
    security_certifications: "",
    data_handling_practices: "",
    compliance_standards: "",
  });

  useEffect(() => {
    async function loadInquiries() {
      const { data } = await supabase.from("vendor_inquiries").select("id, company_name").order("company_name");
      setInquiries((data as Inquiry[]) || []);
    }
    loadInquiries();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
      certifications: form.certifications ? form.certifications.split(",").map((x) => x.trim()) : null,
      growth_pct: form.growth_pct ? Number(form.growth_pct) : null,
      status: "Pending Review",
    };
    const { error } = await supabase.from("vendor_applications").insert([payload]);
    setSaving(false);
    if (error) {
      toast.error("Could not submit application");
      return;
    }
    toast.success("Application submitted");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>DataIsData Strategic Partner Enrollment Application</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Related Inquiry</Label>
              <select value={form.inquiry_id} onChange={(e) => setForm({ ...form, inquiry_id: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm">
                <option value="">None</option>
                {inquiries.map((i) => <option key={i.id} value={i.id}>{i.company_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Years in Business</Label><Input value={form.years_in_business} onChange={(e) => setForm({ ...form, years_in_business: e.target.value })} /></div>
              <div><Label>Legal Structure</Label><Input value={form.legal_structure} onChange={(e) => setForm({ ...form, legal_structure: e.target.value })} /></div>
              <div><Label>Certifications (comma-separated)</Label><Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} /></div>
              <div><Label>Insurance Coverage</Label><Input value={form.insurance_coverage} onChange={(e) => setForm({ ...form, insurance_coverage: e.target.value })} /></div>
              <div><Label>Contract Vehicles</Label><Input value={form.contract_vehicles} onChange={(e) => setForm({ ...form, contract_vehicles: e.target.value })} /></div>
              <div><Label>Annual Revenue Range</Label><Input value={form.annual_revenue_range} onChange={(e) => setForm({ ...form, annual_revenue_range: e.target.value })} /></div>
              <div><Label>Bonding Capacity</Label><Input value={form.bonding_capacity} onChange={(e) => setForm({ ...form, bonding_capacity: e.target.value })} /></div>
              <div><Label>Past 2-year Growth %</Label><Input value={form.growth_pct} onChange={(e) => setForm({ ...form, growth_pct: e.target.value })} /></div>
            </div>

            <div><Label>Public Sector References</Label><Textarea value={form.public_sector_references} onChange={(e) => setForm({ ...form, public_sector_references: e.target.value })} /></div>
            <div><Label>Core Offerings</Label><Textarea value={form.core_offerings} onChange={(e) => setForm({ ...form, core_offerings: e.target.value })} /></div>
            <div><Label>What problem do you solve?</Label><Textarea value={form.problem_solved} onChange={(e) => setForm({ ...form, problem_solved: e.target.value })} /></div>
            <div><Label>Existing Government Clients</Label><Textarea value={form.existing_gov_clients} onChange={(e) => setForm({ ...form, existing_gov_clients: e.target.value })} /></div>
            <div><Label>Differentiator</Label><Textarea value={form.differentiator} onChange={(e) => setForm({ ...form, differentiator: e.target.value })} /></div>
            <div><Label>Technology Stack</Label><Textarea value={form.technology_stack} onChange={(e) => setForm({ ...form, technology_stack: e.target.value })} /></div>
            <div><Label>Integration Capabilities</Label><Textarea value={form.integration_capabilities} onChange={(e) => setForm({ ...form, integration_capabilities: e.target.value })} /></div>
            <div><Label>Cost Reduction for Municipalities</Label><Textarea value={form.cost_reduction_explanation} onChange={(e) => setForm({ ...form, cost_reduction_explanation: e.target.value })} /></div>
            <div><Label>Strategic Alignment (Cyber/Broadband/AI/Resiliency)</Label><Textarea value={form.strategic_alignment} onChange={(e) => setForm({ ...form, strategic_alignment: e.target.value })} /></div>
            <div><Label>Security Certifications</Label><Textarea value={form.security_certifications} onChange={(e) => setForm({ ...form, security_certifications: e.target.value })} /></div>
            <div><Label>Data Handling Practices</Label><Textarea value={form.data_handling_practices} onChange={(e) => setForm({ ...form, data_handling_practices: e.target.value })} /></div>
            <div><Label>Compliance Standards</Label><Textarea value={form.compliance_standards} onChange={(e) => setForm({ ...form, compliance_standards: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.open_to_revenue_share} onChange={(e) => setForm({ ...form, open_to_revenue_share: e.target.checked })} />Open to revenue share models</label>

            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Submitting..." : "Submit Application"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
