"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadFinanceData, syncInvoiceStatuses, type FinanceData } from "@/lib/finance/data";
import { computeSummary, type FinanceSummary } from "@/lib/finance/summary";
import { useAccess } from "@/components/auth/AccessProvider";

/**
 * One data source for every finance screen. Statuses are synced first
 * (Sent ⇄ Overdue) so the dashboard, tracker, AR aging, notifications and PDFs
 * all agree.
 */
export function useFinance() {
  const { can } = useAccess();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      if (can("invoices", "edit")) await syncInvoiceStatuses().catch(() => undefined);
      const d = await loadFinanceData();
      setData(d);
      setError(d.errors.length ? d.errors.join(" · ") : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load finance data");
    } finally {
      setLoading(false);
    }
  }, [can]);

  useEffect(() => {
    reload();
  }, [reload]);

  const summary: FinanceSummary | null = useMemo(() => (data ? computeSummary(data) : null), [data]);
  return { data, summary, loading, error, reload, setData };
}
