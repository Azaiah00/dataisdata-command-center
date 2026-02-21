"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Payment } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Banknote } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("payments")
        .select("*, invoices(id, invoice_number, account_id, accounts(name))")
        .order("payment_date", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const columns = [
    {
      header: "Invoice",
      accessorKey: "invoice_id",
      cell: (p: Payment) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Banknote className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-[#111827] text-sm">{p.invoices?.invoice_number || "—"}</span>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account",
      cell: (p: Payment) => (
        <span className="text-sm text-[#6B7280]">{p.invoices?.accounts?.name || "—"}</span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (p: Payment) => (
        <span className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
      ),
    },
    {
      header: "Method",
      accessorKey: "payment_method",
      cell: (p: Payment) => (
        <span className="text-sm text-[#6B7280]">{p.payment_method}</span>
      ),
    },
    {
      header: "Date",
      accessorKey: "payment_date",
      cell: (p: Payment) => (
        <span className="text-xs text-[#6B7280]">{formatDate(p.payment_date)}</span>
      ),
    },
    {
      header: "Reference",
      accessorKey: "reference_number",
      cell: (p: Payment) => (
        <span className="text-xs text-[#6B7280]">{p.reference_number || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Payments</h1>
          <p className="text-[#6B7280]">All payments received against invoices.</p>
        </div>
        <Link href="/finance/payments/new">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <DataTable columns={columns} data={payments} onRowClick={(p) => { window.location.href = `/finance/invoices/${p.invoice_id}`; }} />
      )}
    </div>
  );
}
