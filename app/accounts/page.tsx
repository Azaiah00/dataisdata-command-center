"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Account } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Tag, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor } from "@/lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching accounts:", error);
      } else {
        setAccounts(data || []);
      }
      setLoading(false);
    }

    fetchAccounts();
  }, []);

  const columns = [
    {
      header: "Account Name",
      accessorKey: "name",
      cell: (account: Account) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111827] text-sm truncate">{account.name}</span>
            <span className="text-xs text-[#6B7280]">{account.account_type}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Region",
      accessorKey: "region_locality",
      cell: (account: Account) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <MapPin className="w-3.5 h-3.5" />
          {account.region_locality}, {account.region_state}
        </div>
      ),
    },
    {
      header: "Primary Focus",
      accessorKey: "primary_focus",
      cell: (account: Account) => (
        <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
          <Tag className="w-3.5 h-3.5" />
          {account.primary_focus || "Not specified"}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (account: Account) => (
        <Badge
          className={cn(
            "font-medium border-none text-[10px] h-5 px-2",
            getStatusColor(account.status)
          )}
        >
          {account.status}
        </Badge>
      ),
    },
    {
      header: "Owner",
      accessorKey: "owner",
      cell: (account: Account) => (
        <span className="text-xs font-medium text-[#111827]">{account.owner || "Unassigned"}</span>
      ),
    },
    {
      header: "",
      accessorKey: "actions",
      cell: (account: Account) => (
        <div className="flex justify-end">
          <Link href={`/accounts/${account.id}`}>
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
          <h1 className="text-2xl font-bold text-[#111827]">Accounts</h1>
          <p className="text-[#6B7280]">Manage your public-sector clients and partners.</p>
        </div>
        <Link href="/accounts/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Account
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
          data={accounts}
          onRowClick={(account) => {
            window.location.href = `/accounts/${account.id}`;
          }}
        />
      )}
    </div>
  );
}
