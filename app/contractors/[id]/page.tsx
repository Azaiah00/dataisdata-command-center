"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Contractor, Engagement } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate, getStatusColor } from "@/lib/utils";
import {
  HardHat,
  Mail,
  Phone,
  Briefcase,
  Pencil,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [engagements, setEngagements] = useState<(Engagement & { accounts?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: cData } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", id)
        .single();
      if (cData) setContractor(cData);

      // Fetch linked engagements via junction table
      const { data: links } = await supabase
        .from("engagement_contractors")
        .select("engagements(*, accounts(name))")
        .eq("contractor_id", id);

      const mapped = (links || [])
        .map((l: any) => l.engagements)
        .filter(Boolean);
      setEngagements(mapped);

      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("contractors").delete().eq("id", id);
    setDeleting(false);
    setDeleteDialogOpen(false);
    if (error) { toast.error("Failed to delete contractor"); return; }
    toast.success("Contractor deleted");
    router.push("/contractors");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Contractor not found</h2>
        <Link href="/contractors" className="text-blue-600 hover:underline mt-4 inline-block">Return to Contractors</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
        <Link href="/contractors" className="hover:text-blue-600 transition-colors">Contractors</Link>
        <span>/</span>
        <span className="text-[#111827]">{contractor.full_name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
              <HardHat className="w-8 h-8 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#111827]">{contractor.full_name}</h1>
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2",
                  contractor.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                )}>
                  {contractor.status}
                </Badge>
              </div>
              {contractor.title_role && (
                <p className="text-sm text-[#6B7280] mt-1">{contractor.title_role}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/contractors/${id}/edit`}>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 bg-white">
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
                  <DialogTitle>Delete Contractor</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{contractor.full_name}&quot;? This cannot be undone.
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
            <CardTitle className="text-lg font-bold text-[#111827]">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{contractor.email || "No email"}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm">{contractor.phone || "No phone"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-slate-100">
              <span className="text-sm text-[#6B7280]">Created</span>
              <span className="font-bold text-[#111827]">{formatDate(contractor.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827]">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4B5563] whitespace-pre-wrap">
              {contractor.notes || "No notes for this contractor."}
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
    </div>
  );
}
