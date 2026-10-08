"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Invoice } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PdfButton } from "@/components/ui/PdfButton";
import { Can, useAccess } from "@/components/auth/AccessProvider";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { syncInvoiceStatuses } from "@/lib/finance/data";
import { exportListPdf } from "@/lib/pdf/reports";
import { INVOICE_STATUSES } from "@/lib/constants";

type Row = Invoice & { paid: number; balance: number };

export default function InvoicesPage() {
  const router = useRouter();
  const { can, realUser } = useAccess();
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setErrorMessage(null);
      if (can("invoices", "edit")) await syncInvoiceStatuses().catch(() => undefined);
      const [{ data, error }, pays] = await Promise.all([
        supabase.from("invoices").select("*, accounts(id, name), engagements(id, name)").order("created_at", { ascending: false }),
        supabase.from("payments").select("invoice_id, amount"),
      ]);
      if (error) {
        console.error("Error fetching invoices:", error.message || error.code || String(error));
        setErrorMessage(error.message || "Could not load invoices.");
      } else {
        const paid: Record<string, number> = {};
        (pays.data || []).forEach((p: { invoice_id: string; amount: number }) => (paid[p.invoice_id] = (paid[p.invoice_id] || 0) + num(p.amount)));
        setInvoices(
          (data || []).map((i: Invoice) => ({
            ...i,
            paid: paid[i.id] || 0,
            balance: i.status === "Cancelled" ? 0 : Math.max(0, num(i.total) - (paid[i.id] || 0)),
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [can]);

  const shown = useMemo(() => (status === "all" ? invoices : status === "open" ? invoices.filter((i) => ["Sent", "Overdue"].includes(i.status)) : invoices.filter((i) => i.status === status)), [invoices, status]);
  const totals = useMemo(
    () => ({
      total: shown.filter((i) => i.status !== "Cancelled").reduce((t, i) => t + num(i.total), 0),
      // Outstanding = what has actually been billed to clients (Sent + Overdue), matching AR everywhere else.
      balance: shown.filter((i) => ["Sent", "Overdue"].includes(i.status)).reduce((t, i) => t + i.balance, 0),
    }),
    [shown]
  );

  const columns = [
    {
      header: "Invoice #",
      accessorKey: "invoice_number",
      cell: (inv: Row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground text-sm">{inv.invoice_number}</span>
        </div>
      ),
    },
    { header: "Account", accessorKey: "account_id", cell: (inv: Row) => <span className="text-sm text-muted-foreground">{inv.accounts?.name || "—"}</span> },
    { header: "Total", accessorKey: "total", cell: (inv: Row) => <span className="text-sm font-bold text-foreground">{formatCurrency(inv.total)}</span> },
    {
      header: "Balance",
      accessorKey: "balance",
      cell: (inv: Row) => <span className={cn("text-sm font-semibold", inv.balance > 0.004 ? "text-red-600" : "text-green-600")}>{formatCurrency(inv.balance)}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (inv: Row) => <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(inv.status))}>{inv.status}</Badge>,
    },
    { header: "Issue Date", accessorKey: "issue_date", cell: (inv: Row) => <span className="text-xs text-muted-foreground">{formatDate(inv.issue_date)}</span> },
    { header: "Due Date", accessorKey: "due_date", cell: (inv: Row) => <span className="text-xs text-muted-foreground">{inv.due_date ? formatDate(inv.due_date) : "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Billing for your accounts and engagements. Balances are net of partial payments.</p>
        </div>
        <div className="flex gap-2">
          <PdfButton
            onExport={() =>
              exportListPdf({
                title: "Invoice Register",
                subtitle: status === "all" ? "All invoices" : status === "open" ? "Open invoices" : `${status} invoices`,
                preparedBy: realUser?.full_name,
                kpis: [
                  { label: "Invoices", value: String(shown.length) },
                  { label: "Total billed", value: formatCurrency(totals.total) },
                  { label: "Outstanding (sent + overdue)", value: formatCurrency(totals.balance), tone: totals.balance > 0 ? "warn" : "good" },
                ],
                columns: ["Invoice #", "Account", "Engagement", "Issued", "Due", "Status", "Total", "Paid", "Balance"],
                rows: shown.map((i) => [i.invoice_number, i.accounts?.name || "—", i.engagements?.name || "—", formatDate(i.issue_date), i.due_date ? formatDate(i.due_date) : "—", i.status, formatCurrency(i.total), formatCurrency(i.paid), formatCurrency(i.balance)]),
                foot: [["Total", "", "", "", "", "", formatCurrency(totals.total), formatCurrency(shown.reduce((t, i) => t + i.paid, 0)), formatCurrency(totals.balance)]],
                alignRight: [6, 7, 8],
                filename: "DataIsData-Invoices",
              })
            }
          />
          <Can module="invoices" action="create">
            <Link href="/finance/invoices/new">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Invoice
              </Button>
            </Link>
          </Can>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["all", "open", ...INVOICE_STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", status === s ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40")}
          >
            {s === "all" ? "All" : s === "open" ? "Open (Sent + Overdue)" : s} ({s === "all" ? invoices.length : s === "open" ? invoices.filter((i) => ["Sent", "Overdue"].includes(i.status)).length : invoices.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>
      {errorMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Could not load invoices</p>
          <p className="mt-1 text-amber-700">{errorMessage}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !errorMessage ? (
        <DataTable columns={columns} data={shown} onRowClick={(inv) => router.push(`/finance/invoices/${inv.id}`)} />
      ) : null}
    </div>
  );
}
