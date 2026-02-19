"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VendorApplication = {
  id: string;
  status: string | null;
  score: number | null;
  inquiry_id: string | null;
  core_offerings: string | null;
  contract_vehicles: string | null;
  strategic_alignment: string | null;
  vendor_inquiries?: { company_name: string | null } | null;
};

const weights = {
  public_sector_experience: 20,
  financial_stability: 15,
  strategic_fit: 20,
  innovation_value: 15,
  compliance_security: 15,
  ecosystem_complement: 15,
} as const;

export default function VendorApplicationReviewPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [status, setStatus] = useState("Pending Review");
  const [reviewer, setReviewer] = useState("Tony Wood");
  const [scores, setScores] = useState<Record<keyof typeof weights, number>>({
    public_sector_experience: 50,
    financial_stability: 50,
    strategic_fit: 50,
    innovation_value: 50,
    compliance_security: 50,
    ecosystem_complement: 50,
  });

  async function loadApplication() {
    const { data, error } = await supabase
      .from("vendor_applications")
      .select("id, status, score, inquiry_id, core_offerings, contract_vehicles, strategic_alignment, vendor_inquiries(company_name)")
      .eq("id", params.id)
      .single();
    if (error) {
      console.error("Error loading application:", error);
      return;
    }
    const row = data as unknown as VendorApplication;
    setApplication(row);
    setStatus(row.status || "Pending Review");
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadApplication();
    }, 0);
    return () => clearTimeout(timer);
  }, [params.id]);

  const weightedTotal = useMemo(() => {
    return Math.round(
      (scores.public_sector_experience * weights.public_sector_experience +
        scores.financial_stability * weights.financial_stability +
        scores.strategic_fit * weights.strategic_fit +
        scores.innovation_value * weights.innovation_value +
        scores.compliance_security * weights.compliance_security +
        scores.ecosystem_complement * weights.ecosystem_complement) / 100
    );
  }, [scores]);

  async function saveReview() {
    const { error } = await supabase
      .from("vendor_applications")
      .update({ score: weightedTotal, status, reviewed_by: reviewer })
      .eq("id", params.id);
    if (error) {
      toast.error("Could not save review");
      return;
    }
    toast.success("Review saved");
    loadApplication();
  }

  async function approveAndCreatePartner() {
    if (!application) return;
    const companyName = application.vendor_inquiries?.company_name || "New Partner";
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .insert([{
        name: companyName,
        partner_type: "Vendor",
        capabilities: application.core_offerings,
        contract_vehicles: application.contract_vehicles,
        notes: application.strategic_alignment,
        vendor_score: weightedTotal,
        vendor_status: status,
      }])
      .select("id")
      .single();

    if (partnerError) {
      toast.error("Could not create partner");
      return;
    }

    const { error } = await supabase
      .from("vendor_applications")
      .update({ partner_id: partner.id, score: weightedTotal, status, reviewed_by: reviewer })
      .eq("id", params.id);
    if (error) {
      toast.error("Partner created but application link failed");
      return;
    }
    toast.success("Partner approved and linked");
    loadApplication();
  }

  if (!application) return <p className="text-sm text-[#6B7280]">Loading application...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Vendor Application Review</h1>
        <p className="text-[#6B7280]">{application.vendor_inquiries?.company_name || "Unlinked application"}</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Scoring Model (Weighted)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(Object.keys(weights) as Array<keyof typeof weights>).map((key) => (
              <div key={key}>
                <Label className="text-xs capitalize">{key.replaceAll("_", " ")} ({weights[key]}%)</Label>
                <Input type="number" min={0} max={100} value={scores[key]} onChange={(e) => setScores((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))} />
              </div>
            ))}
          </div>
          <p className="text-xl font-bold text-[#111827]">Weighted Total: {weightedTotal}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Approval Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm">
            <option>Approved Innovation Partner</option>
            <option>Approved Event Participant</option>
            <option>Conditional</option>
            <option>Not Approved</option>
            <option>Pending Review</option>
          </select>
          <div>
            <Label>Reviewed By</Label>
            <Input value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveReview} variant="outline">Save Review</Button>
            <Button onClick={approveAndCreatePartner} className="bg-blue-600 hover:bg-blue-700">Approve and Create Partner</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Application Notes</CardTitle></CardHeader>
        <CardContent>
          <Label>Strategic Alignment</Label>
          <Textarea value={application.strategic_alignment || ""} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
