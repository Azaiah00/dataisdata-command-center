"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type VendorApplicationRow = {
  id: string;
  inquiry_id: string | null;
  score: number | null;
  status: string | null;
  created_at: string;
  vendor_inquiries?: { company_name: string | null } | null;
};

export default function VendorApplicationListPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendorApplicationRow[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("vendor_applications")
        .select("id, inquiry_id, score, status, created_at, vendor_inquiries(company_name)")
        .order("created_at", { ascending: false });
      if (error) console.error("Error loading applications:", error);
      setData((data as unknown as VendorApplicationRow[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const columns = [
    { header: "Company", accessorKey: "company", cell: (item: VendorApplicationRow) => item.vendor_inquiries?.company_name || "Unknown" },
    { header: "Score", accessorKey: "score", cell: (item: VendorApplicationRow) => item.score ?? "Not scored" },
    { header: "Status", accessorKey: "status", cell: (item: VendorApplicationRow) => <Badge variant="outline">{item.status || "Pending Review"}</Badge> },
    { header: "Submitted", accessorKey: "created_at", cell: (item: VendorApplicationRow) => formatDateTime(item.created_at) },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: VendorApplicationRow) => (
        <Link href={`/innovation/vendor-application/${item.id}`}>
          <Button size="sm" className="bg-primary hover:bg-primary/90">Review</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Vendor Applications</h1>
          <p className="text-[#6B7280]">Stage 2 and 3 of partner enrollment.</p>
        </div>
        <Link href="/innovation/vendor-application/new">
          <Button className="bg-primary hover:bg-primary/90">New Application</Button>
        </Link>
      </div>
      {loading ? <p className="text-sm text-[#6B7280]">Loading...</p> : <DataTable columns={columns} data={data} />}
    </div>
  );
}
