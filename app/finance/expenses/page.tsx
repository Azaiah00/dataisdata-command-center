"use client";

import { Can } from "@/components/auth/AccessProvider";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfButton } from "@/components/ui/PdfButton";
import { exportListPdf } from "@/lib/pdf/reports";
import { useAccess } from "@/components/auth/AccessProvider";
import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export default function ExpensesPage() {
  const router = useRouter();
  const { realUser } = useAccess();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => Array.from(new Set([...EXPENSE_CATEGORIES, ...expenses.map((e) => e.category)])), [expenses]);
  const shown = useMemo(() => (category === "all" ? expenses : expenses.filter((e) => e.category === category)), [expenses, category]);
  const total = shown.reduce((t, e) => t + num(e.amount), 0);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("expenses")
        .select("*, accounts(name), engagements(name), contractors(full_name)")
        .order("expense_date", { ascending: false });
      setExpenses(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const columns = [
    {
      header: "Description",
      accessorKey: "description",
      cell: (e: Expense) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm block">{e.description}</span>
            {e.engagements?.name && <span className="text-[10px] text-muted-foreground">{e.engagements.name}</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (e: Expense) => <span className="text-sm text-muted-foreground">{e.category}</span>,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (e: Expense) => <span className="text-sm font-bold text-red-600">{formatCurrency(e.amount)}</span>,
    },
    {
      header: "Contractor",
      accessorKey: "contractor_id",
      cell: (e: Expense) => <span className="text-sm text-muted-foreground">{e.contractors?.full_name || "—"}</span>,
    },
    {
      header: "Date",
      accessorKey: "expense_date",
      cell: (e: Expense) => <span className="text-xs text-muted-foreground">{formatDate(e.expense_date)}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (e: Expense) => (
        <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(e.status))}>
          {e.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">Track project costs, contractor payments, and overhead.</p>
        </div>
        <div className="flex gap-2">
        <PdfButton
          onExport={() =>
            exportListPdf({
              title: "Expense Register",
              subtitle: category === "all" ? "All expenses" : `${category} expenses`,
              preparedBy: realUser?.full_name,
              kpis: [
                { label: "Expenses", value: String(shown.length) },
                { label: "Total", value: formatCurrency(total) },
                { label: "Pending approval", value: formatCurrency(shown.filter((e) => e.status === "Pending").reduce((t, e) => t + num(e.amount), 0)) },
              ],
              columns: ["Date", "Description", "Category", "Engagement", "Contractor", "Status", "Receipt", "Amount"],
              rows: shown.map((e) => [formatDate(e.expense_date), e.description, e.category, e.engagements?.name || "—", e.contractors?.full_name || "—", e.status, e.receipt_url ? "Yes" : "No", formatCurrency(e.amount)]),
              foot: [["Total", "", "", "", "", "", "", formatCurrency(total)]],
              alignRight: [7],
              filename: "DataIsData-Expenses",
            })
          }
        />
        <Can module="expenses" action="create">
        <Link href="/finance/expenses/new">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Expense
            </Button>
          </Link>
        </Can>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {["all", ...categories].map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", category === c ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40")}>
                {c === "all" ? "All" : c}
              </button>
            ))}
            <span className="ml-auto text-sm font-semibold text-foreground">{formatCurrency(total)}</span>
          </div>
          <DataTable columns={columns} data={shown} onRowClick={(e) => router.push(`/finance/expenses/${e.id}`)} />
        </>
      )}
    </div>
  );
}
