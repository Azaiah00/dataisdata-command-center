"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Opportunity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { TrendingUp, Building2, User, Calendar, DollarSign, Pencil, Trash2 } from "lucide-react";
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

export default function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<(Opportunity & { accounts?: { name: string }; contacts?: { full_name: string } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchOpportunity() {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, accounts(name), contacts(full_name)")
        .eq("id", id)
        .single();
      if (error || !data) {
        setOpportunity(null);
      } else {
        setOpportunity(data);
      }
      setLoading(false);
    }
    fetchOpportunity();
  }, [id]);

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    if (error) {
      toast.error("Failed to delete opportunity");
      return;
    }
    toast.success("Opportunity deleted");
    router.push("/pipeline");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Opportunity not found</h2>
        <Link href="/pipeline" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/pipeline" className="hover:text-blue-600 transition-colors">
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-[#111827] truncate">{opportunity.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#111827]">{opportunity.name}</h1>
                <Badge
                  className={cn(
                    "font-medium border-none text-[10px] h-5 px-2",
                    getStatusColor(opportunity.stage)
                  )}
                >
                  {opportunity.stage}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <Link
                    href={`/accounts/${opportunity.account_id}`}
                    className="hover:text-blue-600 font-medium"
                  >
                    {opportunity.accounts?.name ?? "Unknown account"}
                  </Link>
                </div>
                {opportunity.service_line && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>{opportunity.service_line}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/pipeline/${id}/edit`}>
              <Button variant="outline" size="sm" className="border-slate-200">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            </Link>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this opportunity?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete &quot;{opportunity.name}&quot;. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" disabled={deleting} onClick={onDelete}>
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Value & probability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Estimated value</span>
              <span className="font-bold text-[#111827]">
                {opportunity.estimated_value != null
                  ? formatCurrency(opportunity.estimated_value)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Weighted value</span>
              <span className="font-bold text-emerald-600">
                {opportunity.weighted_value != null
                  ? formatCurrency(opportunity.weighted_value)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#6B7280]">Probability</span>
              <span className="font-bold text-[#111827]">
                {opportunity.probability_pct != null ? `${opportunity.probability_pct}%` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Dates & contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Expected start</span>
              <span className="font-bold text-[#111827]">
                {opportunity.expected_start ? formatDate(opportunity.expected_start) : "TBD"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Expected end</span>
              <span className="font-bold text-[#111827]">
                {opportunity.expected_end ? formatDate(opportunity.expected_end) : "TBD"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Primary contact</span>
              <span className="font-bold text-[#111827]">
                {opportunity.contacts?.full_name ? (
                  <Link href={`/contacts/${opportunity.primary_contact_id}`} className="hover:text-blue-600">
                    {opportunity.contacts.full_name}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#6B7280]">Funding source</span>
              <span className="font-bold text-[#111827]">{opportunity.funding_source || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next step */}
      {(opportunity.next_step || opportunity.next_step_due) && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Next step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunity.next_step && (
              <p className="text-sm text-[#4B5563]">{opportunity.next_step}</p>
            )}
            {opportunity.next_step_due && (
              <p className="text-xs text-[#6B7280]">
                Due: {formatDate(opportunity.next_step_due)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {opportunity.notes && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap">{opportunity.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {opportunity.attachments && opportunity.attachments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {opportunity.attachments.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
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
