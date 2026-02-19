"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Inquiry = {
  id: string;
  company_name: string;
  primary_contact: string | null;
  core_service_category: string | null;
  status: string | null;
  created_at: string;
};

export default function VendorInquiryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Inquiry[]>([]);

  async function loadData() {
    const { data: rows, error } = await supabase.from("vendor_inquiries").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error loading vendor inquiries:", error);
    setData((rows as Inquiry[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function inviteToApply(item: Inquiry) {
    const { error } = await supabase.from("vendor_inquiries").update({ status: "Invited to Apply" }).eq("id", item.id);
    if (error) {
      toast.error("Could not update inquiry status");
      return;
    }
    toast.success("Inquiry marked as invited");
    loadData();
  }

  const columns = [
    { header: "Company", accessorKey: "company_name" },
    { header: "Primary Contact", accessorKey: "primary_contact" },
    { header: "Category", accessorKey: "core_service_category" },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item: Inquiry) => <Badge variant="outline">{item.status || "Unscreened Inquiry"}</Badge>,
    },
    { header: "Submitted", accessorKey: "created_at", cell: (item: Inquiry) => formatDateTime(item.created_at) },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: Inquiry) => (
        <div className="flex gap-2">
          <Link href={`/innovation/vendor-application/new?inquiry_id=${item.id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={(e) => { e.stopPropagation(); inviteToApply(item); }}>
            Invite to Apply
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Vendor Inquiries</h1>
          <p className="text-[#6B7280]">Stage 1 of partner enrollment.</p>
        </div>
        <Link href="/innovation/vendor-inquiry/new">
          <Button className="bg-blue-600 hover:bg-blue-700">Open Public Form</Button>
        </Link>
      </div>
      {loading ? <p className="text-sm text-[#6B7280]">Loading...</p> : <DataTable columns={columns} data={data} />}
    </div>
  );
}
