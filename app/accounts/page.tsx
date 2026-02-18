"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Account } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{account.name}</span>
          <span className="text-xs text-slate-500">{account.account_type}</span>
        </div>
      ),
    },
    {
      header: "Region",
      accessorKey: "region_locality",
      cell: (account: Account) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <MapPin className="w-3 h-3" />
          {account.region_locality}, {account.region_state}
        </div>
      ),
    },
    {
      header: "Primary Focus",
      accessorKey: "primary_focus",
      cell: (account: Account) => (
        <div className="flex items-center gap-1 text-slate-600 text-sm">
          <Tag className="w-3 h-3" />
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
            "font-medium border-none",
            STATUS_COLORS[account.status]
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
        <span className="text-sm text-slate-600">{account.owner || "Unassigned"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Accounts</h1>
          <p className="text-slate-500 mt-1">Manage your public-sector clients and partners.</p>
        </div>
        <Link href="/accounts/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
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
