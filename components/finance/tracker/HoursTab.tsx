"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import type { PlacementHours } from "@/lib/finance/types";
import { loadedCostRate } from "@/lib/finance/calc";
import { addDaysISO, parseDate, toISODate, todayISO } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { exportListPdf } from "@/lib/pdf/reports";
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, Receipt, Trash2, Wallet } from "lucide-react";

function lastWeekRange() {
  const t = parseDate(todayISO())!;
  const day = t.getDay(); // 0 Sun
  const monday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((day + 6) % 7) - 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
}

export function HoursTab({ data, reload }: { data: FinanceData; reload: () => Promise<void> }) {
  const { can, realUser } = useAccess();
  const placements = data.placements.filter((p) => p.status !== "Ended");
  const byId = useMemo(() => new Map(data.placements.map((p) => [p.id, p])), [data.placements]);
  const invById = useMemo(() => new Map(data.invoices.map((i) => [i.id, i])), [data.invoices]);
  const [filter, setFilter] = useState<"unbilled" | "invoiced" | "all">("unbilled");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [recordPay, setRecordPay] = useState(true);
  const range = lastWeekRange();
  const [form, setForm] = useState({ placement_id: placements[0]?.id || "", period_start: range.start, period_end: range.end, hours: "", notes: "" });

  const rows = data.hours.filter((h) => (filter === "all" ? true : filter === "unbilled" ? !h.invoice_id : !!h.invoice_id));
  const selectedRows = data.hours.filter((h) => selected.includes(h.id));
  const selValue = selectedRows.reduce((t, h) => t + num(h.hours) * num(h.bill_rate), 0);

  async function logHours(e: React.FormEvent) {
    e.preventDefault();
    const p = byId.get(form.placement_id);
    if (!p) return toast.error("Choose a placement");
    const hours = num(form.hours || p.weekly_hours);
    if (hours <= 0) return toast.error("Enter the hours worked");
    if (form.period_end < form.period_start) return toast.error("Period end is before start");
    const overlap = data.hours.find((h) => h.placement_id === p.id && h.period_start <= form.period_end && h.period_end >= form.period_start);
    if (overlap && !confirm(`Hours are already logged for ${formatDate(overlap.period_start)}–${formatDate(overlap.period_end)} on this placement. Log anyway?`)) return;
    setBusy(true);
    const { error } = await supabase.from("placement_hours").insert({
      placement_id: p.id,
      period_start: form.period_start,
      period_end: form.period_end,
      hours,
      bill_rate: num(p.bill_rate),
      pay_rate: num(p.pay_rate),
      burden_pct: num(p.burden_pct),
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${hours} hours logged`);
    setForm({ ...form, hours: "", notes: "", period_start: addDaysISO(form.period_start, 7), period_end: addDaysISO(form.period_end, 7) });
    await reload();
  }

  async function removeHours(h: PlacementHours) {
    if (h.invoice_id) return toast.error("This time is already on an invoice. Delete or edit the invoice first.");
    const { error } = await supabase.from("placement_hours").delete().eq("id", h.id);
    if (error) return toast.error(error.message);
    setSelected((s) => s.filter((x) => x !== h.id));
    toast.success("Entry removed");
    await reload();
  }

  async function recordPayFor(list: PlacementHours[]) {
    let created = 0;
    for (const h of list) {
      if (h.expense_id) continue;
      const p = byId.get(h.placement_id);
      const amount = Math.round(num(h.hours) * loadedCostRate(num(h.pay_rate), num(h.burden_pct)) * 100) / 100;
      if (amount <= 0) continue;
      const { data: exp, error } = await supabase
        .from("expenses")
        .insert({
          description: `Contractor pay — ${p?.contractors?.full_name || p?.role_title || "Placement"} (${formatDate(h.period_start)}–${formatDate(h.period_end)})`,
          category: "Labor",
          amount,
          expense_date: h.period_end,
          status: "Pending",
          contractor_id: p?.contractor_id || null,
          engagement_id: p?.engagement_id || null,
          account_id: p?.account_id || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await supabase.from("placement_hours").update({ expense_id: exp.id }).eq("id", h.id);
      created++;
    }
    return created;
  }

  async function createInvoices() {
    const missing = selectedRows.filter((h) => !byId.get(h.placement_id)?.account_id);
    if (missing.length) return toast.error("Every selected entry needs a placement linked to an agency (account).");
    setBusy(true);
    try {
      const groups = new Map<string, PlacementHours[]>();
      selectedRows.forEach((h) => {
        const acc = byId.get(h.placement_id)!.account_id!;
        groups.set(acc, [...(groups.get(acc) || []), h]);
      });
      const created: string[] = [];
      for (const [accountId, list] of groups) {
        const ps = list.map((h) => byId.get(h.placement_id)!);
        const engIds = Array.from(new Set(ps.map((p) => p.engagement_id).filter(Boolean)));
        const terms = ps.find((p) => p.payment_terms_days != null)?.payment_terms_days ?? data.settings.default_payment_terms_days;
        const subtotal = list.reduce((t, h) => t + Math.round(num(h.hours) * num(h.bill_rate) * 100) / 100, 0);
        const { data: numData, error: numErr } = await supabase.rpc("next_invoice_number");
        if (numErr) throw new Error(numErr.message);
        const today = todayISO();
        const periods = list.map((h) => h.period_start).sort();
        const ends = list.map((h) => h.period_end).sort();
        const { data: inv, error } = await supabase
          .from("invoices")
          .insert({
            invoice_number: numData,
            account_id: accountId,
            engagement_id: engIds.length === 1 ? engIds[0] : null,
            issue_date: today,
            due_date: addDaysISO(today, terms),
            payment_terms_days: terms,
            status: "Draft",
            subtotal,
            tax_amount: 0,
            total: subtotal,
            notes: `Professional services ${formatDate(periods[0])} – ${formatDate(ends[ends.length - 1])}.`,
          })
          .select("id, invoice_number")
          .single();
        if (error) throw new Error(error.message);
        const lines = list.map((h) => {
          const p = byId.get(h.placement_id)!;
          return {
            invoice_id: inv.id,
            description: `${p.role_title}${p.contractors?.full_name ? ` — ${p.contractors.full_name}` : ""} · ${formatDate(h.period_start)}–${formatDate(h.period_end)}`,
            quantity: num(h.hours),
            unit_price: num(h.bill_rate),
          };
        });
        const li = await supabase.from("invoice_line_items").insert(lines);
        const up = li.error ? null : await supabase.from("placement_hours").update({ invoice_id: inv.id }).in("id", list.map((h) => h.id));
        if (li.error || up?.error) {
          // Roll back so a retry can't double-bill the same hours.
          await supabase.from("placement_hours").update({ invoice_id: null }).eq("invoice_id", inv.id);
          await supabase.from("invoices").delete().eq("id", inv.id);
          throw new Error((li.error || up?.error)!.message);
        }
        created.push(inv.invoice_number);
      }
      let payCount = 0;
      if (recordPay && can("expenses", "create")) payCount = await recordPayFor(selectedRows);
      toast.success(`Created ${created.join(", ")}${payCount ? ` and ${payCount} contractor pay expense${payCount === 1 ? "" : "s"}` : ""}`);
      setSelected([]);
      setInvoiceOpen(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invoices");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    await exportListPdf({
      title: "Timesheet Register",
      subtitle: filter === "all" ? "All logged time" : filter === "unbilled" ? "Time not yet invoiced" : "Invoiced time",
      preparedBy: realUser?.full_name,
      landscape: true,
      columns: ["Consultant", "Role", "Agency", "Period", "Hours", "Bill rate", "Billable", "Loaded cost", "Invoice"],
      rows: rows.map((h) => {
        const p = byId.get(h.placement_id);
        return [
          p?.contractors?.full_name || "—",
          p?.role_title || "—",
          p?.accounts?.name || "—",
          `${formatDate(h.period_start)} – ${formatDate(h.period_end)}`,
          num(h.hours).toFixed(2),
          formatCurrency(h.bill_rate),
          formatCurrency(num(h.hours) * num(h.bill_rate)),
          formatCurrency(num(h.hours) * loadedCostRate(num(h.pay_rate), num(h.burden_pct))),
          h.invoice_id ? invById.get(h.invoice_id)?.invoice_number || "Invoiced" : "Not invoiced",
        ];
      }),
      foot: [["Total", "", "", "", rows.reduce((t, h) => t + num(h.hours), 0).toFixed(2), "", formatCurrency(rows.reduce((t, h) => t + num(h.hours) * num(h.bill_rate), 0)), formatCurrency(rows.reduce((t, h) => t + num(h.hours) * loadedCostRate(num(h.pay_rate), num(h.burden_pct)), 0)), ""]],
      alignRight: [4, 5, 6, 7],
      filename: "DataIsData-Timesheets",
    });
  }

  return (
    <div className="space-y-6">
      {can("finance_tracker", "create") && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Log hours
            </CardTitle>
            <CardDescription>Rates are copied from the placement at the moment you log, so later rate changes never rewrite history.</CardDescription>
          </CardHeader>
          <CardContent>
            {placements.length ? (
              <form onSubmit={logHours} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Placement</Label>
                  <Select value={form.placement_id} onValueChange={(v) => setForm({ ...form, placement_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {placements.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.contractors?.full_name || "Unassigned"} · {p.role_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="h-start">Period start</Label>
                  <Input id="h-start" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="h-end">Period end</Label>
                  <Input id="h-end" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="h-hours">Hours</Label>
                  <Input id="h-hours" type="number" step="0.25" min="0" placeholder={String(byId.get(form.placement_id)?.weekly_hours ?? 40)} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy}>
                  Log hours
                </Button>
                <div className="md:col-span-6">
                  <Input placeholder="Notes (optional) — e.g. includes 4 hrs approved overtime" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Add a placement first, then log its hours here.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["unbilled", "invoiced", "all"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setFilter(k);
                setSelected([]);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                filter === k ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40"
              )}
            >
              {k === "unbilled" ? "Not invoiced" : k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfButton onExport={exportPdf} />
          {can("expenses", "create") && (
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedRows.some((h) => !h.expense_id) || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const n = await recordPayFor(selectedRows);
                  toast.success(n ? `Recorded ${n} contractor pay expense${n === 1 ? "" : "s"}` : "Pay was already recorded for the selected time");
                  setSelected([]);
                  await reload();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not record pay");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Wallet className="w-4 h-4" /> Record contractor pay
            </Button>
          )}
          {can("invoices", "create") && (
            <Button size="sm" disabled={!selectedRows.length || selectedRows.some((h) => h.invoice_id) || busy} onClick={() => setInvoiceOpen(true)}>
              <Receipt className="w-4 h-4" /> Invoice selected ({selectedRows.length})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox
                  aria-label="Select all"
                  checked={rows.length > 0 && rows.filter((h) => !h.invoice_id).every((h) => selected.includes(h.id)) && rows.some((h) => !h.invoice_id)}
                  onCheckedChange={(v) => setSelected(v ? rows.filter((h) => !h.invoice_id).map((h) => h.id) : [])}
                />
              </th>
              <th className="text-left px-3 py-3">Consultant</th>
              <th className="text-left px-3 py-3">Period</th>
              <th className="text-right px-3 py-3">Hours</th>
              <th className="text-right px-3 py-3">Billable</th>
              <th className="text-right px-3 py-3">Loaded cost</th>
              <th className="text-left px-3 py-3">Invoice</th>
              <th className="text-left px-3 py-3">Pay</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((h) => {
              const p = byId.get(h.placement_id);
              const inv = h.invoice_id ? invById.get(h.invoice_id) : null;
              return (
                <tr key={h.id} className={cn("hover:bg-muted/30", selected.includes(h.id) && "bg-primary/5")}>
                  <td className="px-4 py-3">
                    <Checkbox
                      aria-label="Select entry"
                      checked={selected.includes(h.id)}
                      onCheckedChange={(v) => setSelected((s) => (v ? [...s, h.id] : s.filter((x) => x !== h.id)))}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{p?.contractors?.full_name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p?.role_title} · {p?.accounts?.name || "No agency"}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(h.period_start)} – {formatDate(h.period_end)}
                    {h.notes && <span className="block italic">{h.notes}</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{num(h.hours).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(num(h.hours) * num(h.bill_rate))}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{formatCurrency(num(h.hours) * loadedCostRate(num(h.pay_rate), num(h.burden_pct)))}</td>
                  <td className="px-3 py-3">
                    {inv ? (
                      <Link href={`/finance/invoices/${inv.id}`} className="text-primary font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
                    ) : (
                      <Badge className="border-none bg-amber-50 text-amber-700">Not invoiced</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {h.expense_id ? (
                      <Link href={`/finance/expenses/${h.expense_id}`} className="text-xs text-primary hover:underline">
                        Recorded
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {can("finance_tracker", "delete") && !h.invoice_id && (
                      <Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => removeHours(h)} aria-label="Delete entry">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  {filter === "unbilled" ? "Nothing waiting to be invoiced." : "No time logged yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create invoice{new Set(selectedRows.map((h) => byId.get(h.placement_id)?.account_id)).size > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              {selectedRows.length} timesheet{selectedRows.length === 1 ? "" : "s"} · {formatCurrency(selValue)}. One draft invoice is created per agency with a line per timesheet, due on each placement&apos;s payment terms.
            </DialogDescription>
          </DialogHeader>
          {can("expenses", "create") && (
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
              <Checkbox checked={recordPay} onCheckedChange={(v) => setRecordPay(!!v)} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">Also record contractor pay as Labor expenses</span>
                <span className="block text-xs text-muted-foreground">Hours × pay rate × (1 + burden), linked to the contractor and engagement so P&amp;L and margin stay exact.</span>
              </span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createInvoices} disabled={busy}>
              {busy ? "Creating…" : "Create draft invoice(s)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
