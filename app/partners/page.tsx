"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Partner } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, Tag, FileText, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor } from "@/lib/utils";

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartners() {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching partners:", error);
      } else {
        setPartners(data || []);
      }
      setLoading(false);
    }

    fetchPartners();
  }, []);

  const columns = [
    {
      header: "Partner",
      accessorKey: "name",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-bold text-[#111827] text-sm truncate">{partner.name}</span>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "partner_type",
      cell: (partner: Partner) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            getStatusColor(partner.partner_type)
          )}
        >
          {partner.partner_type}
        </Badge>
      ),
    },
    {
      header: "Capabilities",
      accessorKey: "capabilities",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs max-w-xs truncate">
          <Tag className="w-3.5 h-3.5" />
          <span className="truncate">{partner.capabilities || "N/A"}</span>
        </div>
      ),
    },
    {
      header: "Contract Vehicles",
      accessorKey: "contract_vehicles",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs truncate max-w-xs">
          <FileText className="w-3.5 h-3.5" />
          <span className="truncate">{partner.contract_vehicles || "None"}</span>
        </div>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (partner: Partner) => (
        <div className="flex justify-end">
          <Link href={`/partners/${partner.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-blue-600 hover:bg-blue-50">
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
          <h1 className="text-2xl font-bold text-[#111827]">Partners</h1>
          <p className="text-[#6B7280]">Manage vendor, prime, sub, and university ecosystem.</p>
        </div>
        <Link href="/partners/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Partner
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={partners}
          onRowClick={(partner) => {
            window.location.href = `/partners/${partner.id}`;
          }}
        />
      )}
    </div>
  );
}
