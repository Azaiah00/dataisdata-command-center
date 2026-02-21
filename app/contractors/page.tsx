"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Contractor } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, HardHat, Mail, ArrowUpRight, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContractors() {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .order("full_name");

      if (error) console.error("Error fetching contractors:", error);
      setContractors(data ?? []);
      setLoading(false);
    }
    fetchContractors();
  }, []);

  const columns = [
    {
      header: "Contractor",
      accessorKey: "full_name",
      cell: (c: Contractor) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
            {c.full_name.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111827] text-sm truncate">{c.full_name}</span>
            <span className="text-xs text-[#6B7280]">{c.title_role || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (c: Contractor) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <Mail className="w-3.5 h-3.5" />
          {c.email || "N/A"}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (c: Contractor) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            c.status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {c.status}
        </Badge>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (c: Contractor) => (
        <div className="flex justify-end gap-2">
          <Link href={`/contractors/${c.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-primary hover:bg-primary/10">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href={`/contractors/${c.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-white hover:bg-primary">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Contractors</h1>
          <p className="text-[#6B7280]">Manage contractors placed at client accounts.</p>
        </div>
        <Link href="/contractors/new">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Contractor
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={contractors}
          onRowClick={(c) => { window.location.href = `/contractors/${c.id}`; }}
        />
      )}
    </div>
  );
}
