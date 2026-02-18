"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Partner } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, Tag, FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PARTNER_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
      header: "Partner Name",
      accessorKey: "name",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-900">{partner.name}</span>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "partner_type",
      cell: (partner: Partner) => (
        <Badge variant="outline" className="font-medium">
          {partner.partner_type}
        </Badge>
      ),
    },
    {
      header: "Capabilities",
      accessorKey: "capabilities",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm max-w-xs truncate">
          <Tag className="w-3 h-3" />
          {partner.capabilities || "N/A"}
        </div>
      ),
    },
    {
      header: "Contract Vehicles",
      accessorKey: "contract_vehicles",
      cell: (partner: Partner) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm truncate max-w-xs">
          <FileText className="w-3 h-3" />
          {partner.contract_vehicles || "None"}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Partners</h1>
          <p className="text-slate-500 mt-1">Manage vendor, prime, sub, and university ecosystem.</p>
        </div>
        <Link href="/partners/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
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
