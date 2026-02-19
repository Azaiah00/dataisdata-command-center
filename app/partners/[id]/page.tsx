"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Partner, Engagement, Opportunity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  ChevronLeft,
  ShieldCheck,
  Tag,
  FileText,
  Briefcase,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [engagements, setEngagements] = useState<(Engagement & { accounts?: { name: string } })[]>([]);
  const [opportunities, setOpportunities] = useState<(Opportunity & { accounts?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Fetch partner
      const { data: partnerData } = await supabase
        .from("partners")
        .select("*")
        .eq("id", id)
        .single();

      if (partnerData) setPartner(partnerData);

      // Fetch linked engagements via junction table
      const { data: engLinks } = await supabase
        .from("engagement_partners")
        .select("engagements(*, accounts(name))")
        .eq("partner_id", id);

      const mappedEngs = (engLinks || [])
        .map((link: any) => link.engagements)
        .filter(Boolean);
      setEngagements(mappedEngs);

      // Fetch linked opportunities via junction table
      const { data: oppLinks } = await supabase
        .from("opportunity_partners")
        .select("opportunities(*, accounts(name))")
        .eq("partner_id", id);

      const mappedOpps = (oppLinks || [])
        .map((link: any) => link.opportunities)
        .filter(Boolean);
      setOpportunities(mappedOpps);

      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("partners").delete().eq("id", id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    if (error) {
      toast.error("Failed to delete partner");
      return;
    }
    toast.success("Partner deleted");
    router.push("/partners");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Partner not found</h2>
        <Link href="/partners" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Partners
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/partners" className="hover:text-blue-600 transition-colors">Partners</Link>
        <span>/</span>
        <span className="text-[#111827]">{partner.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E8F1FB] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#111827]">{partner.name}</h1>
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(partner.partner_type))}>
                  {partner.partner_type}
                </Badge>
              </div>
              {partner.capabilities && (
                <div className="flex items-center gap-1.5 mt-2 text-[#6B7280] text-sm">
                  <Tag className="w-4 h-4" />
                  {partner.capabilities}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Partner</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{partner.name}&quot;? This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
                  <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Partner Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Type</span>
              <span className="font-bold text-[#111827]">{partner.partner_type}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Capabilities</span>
              <span className="font-bold text-[#111827] text-right max-w-[200px]">{partner.capabilities || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Contract Vehicles</span>
              <span className="font-bold text-[#111827] text-right max-w-[200px]">{partner.contract_vehicles || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#6B7280]">Created</span>
              <span className="font-bold text-[#111827]">{formatDate(partner.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap">
              {partner.notes || "No additional notes for this partner."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linked Engagements */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#111827]">
            Linked Engagements ({engagements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {engagements.length > 0 ? (
            <div className="space-y-3">
              {engagements.map((eng) => (
                <Link key={eng.id} href={`/engagements/${eng.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-slate-100 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{eng.name}</p>
                        <p className="text-xs text-[#6B7280]">{eng.accounts?.name}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] h-5 px-2 border-none", getStatusColor(eng.status))}>
                      {eng.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-8">No linked engagements.</p>
          )}
        </CardContent>
      </Card>

      {/* Linked Opportunities */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#111827]">
            Linked Opportunities ({opportunities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <Link key={opp.id} href={`/pipeline/${opp.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-slate-100 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-bold text-[#111827]">{opp.name}</p>
                        <p className="text-xs text-[#6B7280]">{opp.accounts?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-600">{formatCurrency(opp.estimated_value)}</span>
                      <Badge className={cn("text-[10px] h-5 px-2 border-none", getStatusColor(opp.stage))}>
                        {opp.stage}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-8">No linked opportunities.</p>
          )}
        </CardContent>
      </Card>

      {/* Attachments */}
      {partner.attachments && partner.attachments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {partner.attachments.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {decodeURIComponent(url.split("/").pop() || "file")}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
