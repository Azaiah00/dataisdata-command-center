"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

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
            <span className="font-bold text-[#111827] text-sm block">{e.description}</span>
            {e.engagements?.name && <span className="text-[10px] text-[#6B7280]">{e.engagements.name}</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (e: Expense) => <span className="text-sm text-[#6B7280]">{e.category}</span>,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (e: Expense) => <span className="text-sm font-bold text-red-600">{formatCurrency(e.amount)}</span>,
    },
    {
      header: "Contractor",
      accessorKey: "contractor_id",
      cell: (e: Expense) => <span className="text-sm text-[#6B7280]">{e.contractors?.full_name || "—"}</span>,
    },
    {
      header: "Date",
      accessorKey: "expense_date",
      cell: (e: Expense) => <span className="text-xs text-[#6B7280]">{formatDate(e.expense_date)}</span>,
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
          <h1 className="text-2xl font-bold text-[#111827]">Expenses</h1>
          <p className="text-[#6B7280]">Track project costs, contractor payments, and overhead.</p>
        </div>
        <Link href="/finance/expenses/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Expense
          </Button>
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <DataTable columns={columns} data={expenses} onRowClick={(e) => { window.location.href = `/finance/expenses/${e.id}`; }} />
      )}
    </div>
  );
}
