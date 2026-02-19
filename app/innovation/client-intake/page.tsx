"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Intake = {
  id: string;
  organization_name: string;
  contact_name: string | null;
  status: string | null;
  assigned_tier: string | null;
  readiness_score: number | null;
  created_at: string;
};

export default function ClientIntakeListPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Intake[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from("client_intakes").select("*").order("created_at", { ascending: false });
      if (error) console.error("Error loading intakes:", error);
      setData((data as Intake[]) || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const columns = [
    { header: "Organization", accessorKey: "organization_name" },
    { header: "Contact", accessorKey: "contact_name" },
    { header: "Status", accessorKey: "status", cell: (item: Intake) => <Badge variant="outline">{item.status || "New"}</Badge> },
    { header: "Tier", accessorKey: "assigned_tier", cell: (item: Intake) => item.assigned_tier || "Unassigned" },
    { header: "Readiness", accessorKey: "readiness_score", cell: (item: Intake) => item.readiness_score ?? "-" },
    { header: "Date", accessorKey: "created_at", cell: (item: Intake) => formatDateTime(item.created_at) },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: Intake) => (
        <Link href={`/innovation/client-intake/${item.id}`}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Review</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Client Intake</h1>
          <p className="text-[#6B7280]">Assess city/agency interest and readiness.</p>
        </div>
        <Link href="/innovation/client-intake/new">
          <Button className="bg-blue-600 hover:bg-blue-700">Open Public Form</Button>
        </Link>
      </div>
      {loading ? <p className="text-sm text-[#6B7280]">Loading...</p> : <DataTable columns={columns} data={data} />}
    </div>
  );
}
