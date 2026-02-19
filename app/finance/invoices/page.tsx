"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, accounts(id, name), engagements(id, name)")
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching invoices:", error);
      setInvoices(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const columns = [
    {
      header: "Invoice #",
      accessorKey: "invoice_number",
      cell: (inv: Invoice) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-bold text-[#111827] text-sm">{inv.invoice_number}</span>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account_id",
      cell: (inv: Invoice) => (
        <span className="text-sm text-[#6B7280]">{inv.accounts?.name || "—"}</span>
      ),
    },
    {
      header: "Total",
      accessorKey: "total",
      cell: (inv: Invoice) => (
        <span className="text-sm font-bold text-[#111827]">{formatCurrency(inv.total)}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (inv: Invoice) => (
        <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(inv.status))}>
          {inv.status}
        </Badge>
      ),
    },
    {
      header: "Issue Date",
      accessorKey: "issue_date",
      cell: (inv: Invoice) => (
        <span className="text-xs text-[#6B7280]">{formatDate(inv.issue_date)}</span>
      ),
    },
    {
      header: "Due Date",
      accessorKey: "due_date",
      cell: (inv: Invoice) => (
        <span className="text-xs text-[#6B7280]">{inv.due_date ? formatDate(inv.due_date) : "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Invoices</h1>
          <p className="text-[#6B7280]">Manage invoices for your accounts and engagements.</p>
        </div>
        <Link href="/finance/invoices/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          onRowClick={(inv) => { window.location.href = `/finance/invoices/${inv.id}`; }}
        />
      )}
    </div>
  );
}
