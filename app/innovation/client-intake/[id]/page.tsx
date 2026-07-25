"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Intake = {
  id: string;
  organization_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  top_challenges: string[] | null;
  current_initiatives: string | null;
  assigned_tier: string | null;
  advisory_estimate: number | null;
  readiness_score: number | null;
  status: string | null;
  account_id: string | null;
};

export default function ClientIntakeDetailPage() {
  const params = useParams<{ id: string }>();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [tier, setTier] = useState("Dashboard Only");
  const [estimate, setEstimate] = useState("");
  const [readiness, setReadiness] = useState("");
  const [status, setStatus] = useState("Reviewing");

  async function loadData() {
    const { data, error } = await supabase.from("client_intakes").select("*").eq("id", params.id).single();
    if (error) {
      console.error("Error loading intake:", error);
      return;
    }
    const row = data as Intake;
    setIntake(row);
    setTier(row.assigned_tier || "Dashboard Only");
    setEstimate(String(row.advisory_estimate || ""));
    setReadiness(String(row.readiness_score || ""));
    setStatus(row.status || "Reviewing");
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function saveInternalReview() {
    const { error } = await supabase
      .from("client_intakes")
      .update({
        assigned_tier: tier,
        advisory_estimate: estimate ? Number(estimate) : null,
        readiness_score: readiness ? Number(readiness) : null,
        status,
      })
      .eq("id", params.id);
    if (error) {
      toast.error("Could not save review");
      return;
    }
    toast.success("Review saved");
    loadData();
  }

  async function convertToAccount() {
    if (!intake) return;
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert([{
        name: intake.organization_name,
        account_type: "City",
        status: "Prospect",
        owner: "Tony Wood",
        innovation_tier: tier,
        readiness_score: readiness ? Number(readiness) : null,
      }])
      .select("id")
      .single();
    if (accountError) {
      toast.error("Could not create account");
      return;
    }

    if (intake.contact_name) {
      await supabase.from("contacts").insert([{
        full_name: intake.contact_name,
        title_role: intake.contact_title,
        email: intake.contact_email,
        account_id: account.id,
      }]);
    }

    const { error } = await supabase.from("client_intakes").update({ account_id: account.id, status: "Converted" }).eq("id", params.id);
    if (error) {
      toast.error("Account created but intake link failed");
      return;
    }
    toast.success("Converted to account");
    loadData();
  }

  if (!intake) return <p className="text-sm text-[#6B7280]">Loading intake...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">{intake.organization_name}</h1>
        <p className="text-[#6B7280]">Client intake review and conversion</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Submitted Intake</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>Contact:</strong> {intake.contact_name || "N/A"} ({intake.contact_title || "N/A"})</p>
          <p><strong>Email:</strong> {intake.contact_email || "N/A"}</p>
          <p><strong>Top Challenges:</strong> {(intake.top_challenges || []).join(", ") || "N/A"}</p>
          <div><Label>Current Initiatives</Label><Textarea value={intake.current_initiatives || ""} readOnly /></div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Internal Review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Assigned Tier</Label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm">
              <option>Dashboard Only</option>
              <option>Advisory</option>
              <option>Full IaaS</option>
            </select>
          </div>
          <div><Label>Advisory Estimate</Label><Input value={estimate} onChange={(e) => setEstimate(e.target.value)} /></div>
          <div><Label>Readiness Score (0-100)</Label><Input value={readiness} onChange={(e) => setReadiness(e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm">
              <option>New</option>
              <option>Reviewing</option>
              <option>Qualified</option>
              <option>Converted</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveInternalReview}>Save Review</Button>
            <Button onClick={convertToAccount} className="bg-blue-600 hover:bg-blue-700">Convert to Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
