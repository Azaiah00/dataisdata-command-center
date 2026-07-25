"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  theme: string | null;
  target_audience: string | null;
  status: string | null;
  post_event_leads: number | null;
  revenue_generated: number | null;
};

type PartnerRow = { id: string; name: string };
type EventVendorRow = { partner_id: string; sponsorship_tier: string | null; fee: number | null; partners?: { name: string } | null };

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [eventVendors, setEventVendors] = useState<EventVendorRow[]>([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [tier, setTier] = useState("Showcase");
  const [fee, setFee] = useState("");
  const [leads, setLeads] = useState("");
  const [revenue, setRevenue] = useState("");

  async function loadData() {
    const [{ data: eventData }, { data: partnerRows }, { data: vendorRows }] = await Promise.all([
      supabase.from("events").select("*").eq("id", params.id).single(),
      supabase.from("partners").select("id, name").in("vendor_status", ["Approved Innovation Partner", "Approved Event Participant"]).order("name"),
      supabase.from("event_vendors").select("partner_id, sponsorship_tier, fee, partners(name)").eq("event_id", params.id),
    ]);
    setEvent((eventData as EventRow) || null);
    setLeads(String(eventData?.post_event_leads || ""));
    setRevenue(String(eventData?.revenue_generated || ""));
    setPartners((partnerRows as PartnerRow[]) || []);
    setEventVendors((vendorRows as unknown as EventVendorRow[]) || []);
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function addVendor() {
    if (!selectedPartner) return;
    const { error } = await supabase.from("event_vendors").insert([{
      event_id: params.id,
      partner_id: selectedPartner,
      sponsorship_tier: tier,
      fee: fee ? Number(fee) : null,
    }]);
    if (error) {
      toast.error("Could not add vendor");
      return;
    }
    toast.success("Vendor added");
    loadData();
  }

  async function updateMetrics() {
    const { error } = await supabase
      .from("events")
      .update({ post_event_leads: leads ? Number(leads) : null, revenue_generated: revenue ? Number(revenue) : null })
      .eq("id", params.id);
    if (error) {
      toast.error("Could not update metrics");
      return;
    }
    toast.success("Metrics updated");
    loadData();
  }

  if (!event) return <p className="text-sm text-[#6B7280]">Loading event...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">{event.name}</h1>
        <p className="text-[#6B7280]">{formatDate(event.event_date)} • {event.theme || "No theme"}</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <p><strong>Location:</strong> {event.location || "N/A"}</p>
          <p><strong>Target Audience:</strong> {event.target_audience || "N/A"}</p>
          <p><strong>Status:</strong> {event.status || "Planned"}</p>
          <p><strong>Current Revenue:</strong> {formatCurrency(event.revenue_generated)}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Participating Vendors</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
              <option value="">Select partner</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
              <option>Showcase</option>
              <option>Premium Sponsor</option>
              <option>Strategic Partner</option>
            </select>
            <Input placeholder="Fee" value={fee} onChange={(e) => setFee(e.target.value)} />
            <Button onClick={addVendor} className="bg-blue-600 hover:bg-blue-700">Add Vendor</Button>
          </div>
          <div className="space-y-2">
            {eventVendors.length === 0 && <p className="text-sm text-[#6B7280]">No vendors added yet.</p>}
            {eventVendors.map((row, idx) => (
              <div key={`${row.partner_id}-${idx}`} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm">
                <span>{row.partners?.name || "Unknown Partner"}</span>
                <span>{row.sponsorship_tier || "Showcase"} • {formatCurrency(row.fee)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle>Post-Event Metrics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>Leads Generated</Label><Input value={leads} onChange={(e) => setLeads(e.target.value)} /></div>
          <div><Label>Revenue Generated</Label><Input value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
          <div className="pt-6"><Button onClick={updateMetrics} className="w-full bg-blue-600 hover:bg-blue-700">Save Metrics</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
