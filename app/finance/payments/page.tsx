"use client";

import { Can } from "@/components/auth/AccessProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfButton } from "@/components/ui/PdfButton";
import { exportListPdf } from "@/lib/pdf/reports";
import { useAccess } from "@/components/auth/AccessProvider";
import { supabase } from "@/lib/supabase";
import { Payment } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Banknote } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, num } from "@/lib/utils";

export default function PaymentsPage() {
  const router = useRouter();
  const { realUser } = useAccess();
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
          <span className="font-bold text-foreground text-sm">{p.invoices?.invoice_number || "—"}</span>
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "account",
      cell: (p: Payment) => (
        <span className="text-sm text-muted-foreground">{p.invoices?.accounts?.name || "—"}</span>
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
        <span className="text-sm text-muted-foreground">{p.payment_method}</span>
      ),
    },
    {
      header: "Date",
      accessorKey: "payment_date",
      cell: (p: Payment) => (
        <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</span>
      ),
    },
    {
      header: "Reference",
      accessorKey: "reference_number",
      cell: (p: Payment) => (
        <span className="text-xs text-muted-foreground">{p.reference_number || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stack title and buttons on phones (same pattern as the Invoices page). */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">All payments received against invoices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <PdfButton
          onExport={() =>
            exportListPdf({
              title: "Payments Received",
              preparedBy: realUser?.full_name,
              kpis: [
                { label: "Payments", value: String(payments.length) },
                { label: "Total received", value: formatCurrency(payments.reduce((t, p) => t + num(p.amount), 0)), tone: "good" },
              ],
              columns: ["Date", "Invoice", "Account", "Method", "Reference", "Amount"],
              rows: payments.map((p) => [formatDate(p.payment_date), p.invoices?.invoice_number || "—", p.invoices?.accounts?.name || "—", p.payment_method, p.reference_number || "—", formatCurrency(p.amount)]),
              foot: [["Total", "", "", "", "", formatCurrency(payments.reduce((t, p) => t + num(p.amount), 0))]],
              alignRight: [5],
              filename: "DataIsData-Payments",
            })
          }
        />
        <Can module="payments" action="create">
        <Link href="/finance/payments/new">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </Link>
        </Can>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <DataTable columns={columns} data={payments} onRowClick={(p) => router.push(`/finance/invoices/${p.invoice_id}`)} />
      )}
    </div>
  );
}
