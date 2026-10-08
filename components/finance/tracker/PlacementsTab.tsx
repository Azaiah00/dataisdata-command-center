"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import { PLACEMENT_STATUSES, PAY_TYPES, type Placement, type PlacementStatus, type PayType } from "@/lib/finance/types";
import { aggregate, fieldFormat, formatByType, placementMetrics, resolveRecordFields, billRateForMargin } from "@/lib/finance/calc";
import { todayISO } from "@/lib/finance/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomFieldInputs } from "@/components/finance/CustomFields";
import { PdfButton } from "@/components/ui/PdfButton";
import { useAccess } from "@/components/auth/AccessProvider";
import { exportListPdf } from "@/lib/pdf/reports";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUpDown, Users, Sigma } from "lucide-react";

type SortKey = "name" | "account" | "margin" | "monthly_profit" | "end_date" | "bill_rate";

const NONE = "__none";

interface FormState {
  id?: string;
  contractor_id: string;
  account_id: string;
  engagement_id: string;
  role_title: string;
  status: PlacementStatus;
  start_date: string;
  end_date: string;
  bill_rate: string;
  pay_rate: string;
  pay_type: PayType;
  burden_pct: string;
  weekly_hours: string;
  payment_terms_days: string;
  notes: string;
  custom_fields: Record<string, unknown>;
}

function SortBtn({
  k,
  sort,
  setSort,
  children,
  className,
}: {
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  setSort: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: 1 | -1 }>>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-1 hover:text-foreground", sort.key === k && "text-foreground", className)}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : -1 }))}
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );
}

export function PlacementsTab({ data, reload }: { data: FinanceData; reload: () => Promise<void> }) {
  const { can, realUser } = useAccess();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "monthly_profit", dir: -1 });
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Placement | null>(null);
  const today = todayISO();
  const fields = data.customFields.filter((f) => f.entity === "placement" && f.is_active);

  const rows = useMemo(() => {
    const list = data.placements
      .filter((p) => (statusFilter === "all" ? true : statusFilter === "open" ? p.status !== "Ended" : p.status === statusFilter))
      .map((p) => {
        const m = placementMetrics(p, data.hours, today);
        const vars = resolveRecordFields(m as unknown as Record<string, number>, fields, p.custom_fields);
        return { p, m, vars };
      });
    const val = (r: (typeof list)[number]) => {
      switch (sort.key) {
        case "name":
          return (r.p.contractors?.full_name || r.p.role_title).toLowerCase();
        case "account":
          return (r.p.accounts?.name || "").toLowerCase();
        case "margin":
          return r.m.margin_pct;
        case "bill_rate":
          return r.m.bill_rate;
        case "end_date":
          return r.p.end_date || "9999";
        default:
          return r.m.monthly_profit;
      }
    };
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [data, statusFilter, sort, today, fields]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.p.status === "Active");
    const wRev = active.reduce((t, r) => t + r.m.weekly_revenue, 0);
    const wProfit = active.reduce((t, r) => t + r.m.weekly_profit, 0);
    return {
      monthlyRevenue: active.reduce((t, r) => t + r.m.monthly_revenue, 0),
      monthlyProfit: active.reduce((t, r) => t + r.m.monthly_profit, 0),
      remaining: rows.reduce((t, r) => t + r.m.remaining_profit, 0),
      margin: wRev > 0 ? (wProfit / wRev) * 100 : null,
      custom: Object.fromEntries(
        fields.map((f) => [
          f.field_key,
          ["number", "currency", "percent", "formula"].includes(f.field_type) ? aggregate(rows.map((r) => r.vars[f.field_key] || 0), f.aggregate) : null,
        ])
      ),
    };
  }, [rows, fields]);

  const target = num(data.settings.target_gross_margin_pct);

  function openNew() {
    setEditing({
      contractor_id: NONE,
      account_id: NONE,
      engagement_id: NONE,
      role_title: "",
      status: "Active",
      start_date: today,
      end_date: "",
      bill_rate: "",
      pay_rate: "",
      pay_type: "W2",
      burden_pct: String(data.settings.default_burden_pct),
      weekly_hours: "40",
      payment_terms_days: String(data.settings.default_payment_terms_days),
      notes: "",
      custom_fields: {},
    });
  }

  function openEdit(p: Placement) {
    setEditing({
      id: p.id,
      contractor_id: p.contractor_id || NONE,
      account_id: p.account_id || NONE,
      engagement_id: p.engagement_id || NONE,
      role_title: p.role_title,
      status: p.status,
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      bill_rate: String(p.bill_rate ?? ""),
      pay_rate: String(p.pay_rate ?? ""),
      pay_type: p.pay_type,
      burden_pct: String(p.burden_pct ?? 0),
      weekly_hours: String(p.weekly_hours ?? 40),
      payment_terms_days: p.payment_terms_days != null ? String(p.payment_terms_days) : "",
      notes: p.notes || "",
      custom_fields: p.custom_fields || {},
    });
  }

  async function remove(p: Placement) {
    const { error } = await supabase.from("placements").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Placement deleted");
    setDeleting(null);
    await reload();
  }

  async function exportPdf() {
    await exportListPdf({
      title: "Placements & Margin",
      subtitle: statusFilter === "all" ? "All placements" : statusFilter === "open" ? "Active, pending & on-hold placements" : `${statusFilter} placements`,
      preparedBy: realUser?.full_name,
      landscape: true,
      kpis: [
        { label: "Monthly revenue (active)", value: formatCurrency(totals.monthlyRevenue) },
        { label: "Monthly gross profit", value: formatCurrency(totals.monthlyProfit), tone: "good" },
        { label: "Blended margin", value: totals.margin !== null ? `${totals.margin.toFixed(1)}%` : "—", tone: totals.margin !== null && totals.margin < target ? "warn" : "default" },
        { label: "Remaining contracted GP", value: formatCurrency(totals.remaining) },
      ],
      columns: ["Consultant", "Role", "Agency", "Status", "Start", "End", "Bill", "Pay", "Loaded", "Margin", "Monthly GP", ...fields.filter((f) => f.show_in_reports).map((f) => f.label)],
      rows: rows.map(({ p, m, vars }) => [
        p.contractors?.full_name || "Unassigned",
        p.role_title,
        p.accounts?.name || "—",
        p.status,
        p.start_date ? formatDate(p.start_date) : "—",
        p.end_date ? formatDate(p.end_date) : "—",
        formatCurrency(m.bill_rate),
        `${formatCurrency(m.pay_rate)} ${p.pay_type}`,
        formatCurrency(m.loaded_cost),
        `${m.margin_pct.toFixed(1)}%`,
        formatCurrency(m.monthly_profit),
        ...fields
          .filter((f) => f.show_in_reports)
          .map((f) => formatByType(["number", "currency", "percent", "formula"].includes(f.field_type) ? vars[f.field_key] : p.custom_fields?.[f.field_key], fieldFormat(f))),
      ]),
      alignRight: [6, 7, 8, 9, 10],
      filename: "DataIsData-Placements",
      notes: [`Loaded cost = pay rate x (1 + burden %). Target gross margin: ${target}%.`],
    });
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["open", "Active", "Pending", "On Hold", "Ended", "all"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                statusFilter === s ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40"
              )}
            >
              {s === "open" ? "Current" : s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <PdfButton onExport={exportPdf} />
          {can("finance_tracker", "create") && (
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4" /> Add placement
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly revenue</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.monthlyRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly gross profit</p>
            <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(totals.monthlyProfit)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Blended margin</p>
            <p className={cn("text-xl font-bold mt-1", totals.margin !== null && totals.margin < target ? "text-amber-600" : "")}>
              {totals.margin !== null ? `${totals.margin.toFixed(1)}%` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">Target {target}%</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remaining contracted GP</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.remaining)}</p>
            <p className="text-[11px] text-muted-foreground">Until each end date</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">
                <SortBtn sort={sort} setSort={setSort} k="name">Consultant</SortBtn>
              </th>
              <th className="text-left px-3 py-3">
                <SortBtn sort={sort} setSort={setSort} k="account">Agency</SortBtn>
              </th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-left px-3 py-3">
                <SortBtn sort={sort} setSort={setSort} k="end_date">Dates</SortBtn>
              </th>
              <th className="text-right px-3 py-3">
                <SortBtn sort={sort} setSort={setSort} k="bill_rate" className="justify-end">Bill</SortBtn>
              </th>
              <th className="text-right px-3 py-3">Pay / loaded</th>
              <th className="text-right px-3 py-3">
                <SortBtn sort={sort} setSort={setSort} k="margin" className="justify-end">Margin</SortBtn>
              </th>
              <th className="text-right px-3 py-3">
                <SortBtn sort={sort} setSort={setSort} k="monthly_profit" className="justify-end">Monthly GP</SortBtn>
              </th>
              {fields.map((f) => (
                <th key={f.id} className="text-right px-3 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {f.field_type === "formula" && <Sigma className="w-3 h-3" />}
                    {f.label}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ p, m, vars }) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  {p.contractor_id ? (
                    <Link href={`/contractors/${p.contractor_id}`} className="font-semibold text-foreground hover:text-primary">
                      {p.contractors?.full_name || "Contractor"}
                    </Link>
                  ) : (
                    <span className="font-semibold text-muted-foreground">Unassigned</span>
                  )}
                  <p className="text-xs text-muted-foreground">{p.role_title}</p>
                </td>
                <td className="px-3 py-3">
                  {p.account_id ? (
                    <Link href={`/accounts/${p.account_id}`} className="hover:text-primary">
                      {p.accounts?.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {p.engagement_id && (
                    <Link href={`/engagements/${p.engagement_id}`} className="block text-xs text-muted-foreground hover:text-primary truncate max-w-[14rem]">
                      {p.engagements?.name}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge className={cn("border-none", getStatusColor(p.status === "Active" ? "active" : p.status === "Ended" ? "complete" : "pending"))}>{p.status}</Badge>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {p.start_date ? formatDate(p.start_date) : "—"} → {p.end_date ? formatDate(p.end_date) : "open"}
                  {m.remaining_weeks > 0 && <span className="block">{Math.round(m.remaining_weeks)} wks left</span>}
                </td>
                <td className="px-3 py-3 text-right font-semibold">{formatCurrency(m.bill_rate)}</td>
                <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                  {formatCurrency(m.pay_rate)} <span className="text-[10px]">{p.pay_type}</span>
                  <span className="block text-xs">{formatCurrency(m.loaded_cost)} loaded</span>
                </td>
                <td className={cn("px-3 py-3 text-right font-semibold", m.spread < 0 ? "text-red-600" : m.margin_pct < target ? "text-amber-600" : "text-primary")}>
                  {m.margin_pct.toFixed(1)}%<span className="block text-xs font-normal text-muted-foreground">{formatCurrency(m.spread)}/hr</span>
                </td>
                <td className="px-3 py-3 text-right font-semibold">{formatCurrency(m.monthly_profit)}</td>
                {fields.map((f) => (
                  <td key={f.id} className="px-3 py-3 text-right whitespace-nowrap">
                    {formatByType(["number", "currency", "percent", "formula"].includes(f.field_type) ? vars[f.field_key] : p.custom_fields?.[f.field_key], fieldFormat(f))}
                  </td>
                ))}
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {can("finance_tracker", "edit") && (
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.role_title}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {can("finance_tracker", "delete") && (
                    <Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(p)} aria-label={`Delete ${p.role_title}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9 + fields.length} className="px-4 py-14 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No placements here yet. Add each consultant you bill an agency for — margin, forecasts and invoices build from them.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-secondary/60 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={6}>
                  Totals ({rows.length})
                </td>
                <td className="px-3 py-3 text-right">{totals.margin !== null ? `${totals.margin.toFixed(1)}%` : "—"}</td>
                <td className="px-3 py-3 text-right">{formatCurrency(totals.monthlyProfit)}</td>
                {fields.map((f) => (
                  <td key={f.id} className="px-3 py-3 text-right">
                    {totals.custom[f.field_key] !== null && totals.custom[f.field_key] !== undefined ? formatByType(totals.custom[f.field_key], fieldFormat(f)) : ""}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editing && <PlacementDialog data={data} state={editing} onClose={() => setEditing(null)} onSaved={reload} />}

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this placement?</DialogTitle>
            <DialogDescription>
              Its logged hours are deleted too. Invoices and expenses already created from those hours stay in place. To keep history, set the status to Ended instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleting && remove(deleting)}>
              Delete placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlacementDialog({ data, state, onClose, onSaved }: { data: FinanceData; state: FormState; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState<FormState>(state);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(state), [state]);
  const fields = data.customFields.filter((x) => x.entity === "placement" && x.is_active);
  const target = num(data.settings.target_gross_margin_pct);

  const preview = placementMetrics(
    {
      id: "preview",
      contractor_id: null,
      account_id: null,
      engagement_id: null,
      role_title: f.role_title,
      status: f.status,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      bill_rate: num(f.bill_rate),
      pay_rate: num(f.pay_rate),
      pay_type: f.pay_type,
      burden_pct: num(f.burden_pct),
      weekly_hours: num(f.weekly_hours),
      payment_terms_days: null,
      notes: null,
      custom_fields: f.custom_fields,
      created_at: "",
      updated_at: "",
    },
    []
  );
  const suggested = billRateForMargin(num(f.pay_rate), num(f.burden_pct), target);
  const engagementsForAccount = f.account_id !== NONE ? data.engagements.filter((e) => e.account_id === f.account_id) : data.engagements;

  async function save() {
    if (!f.role_title.trim()) return toast.error("Role title is required");
    if (num(f.bill_rate) < 0 || num(f.pay_rate) < 0) return toast.error("Rates can't be negative");
    if (f.start_date && f.end_date && f.end_date < f.start_date) return toast.error("End date is before start date");
    setSaving(true);
    const payload = {
      contractor_id: f.contractor_id === NONE ? null : f.contractor_id,
      account_id: f.account_id === NONE ? null : f.account_id,
      engagement_id: f.engagement_id === NONE ? null : f.engagement_id,
      role_title: f.role_title.trim(),
      status: f.status,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      bill_rate: num(f.bill_rate),
      pay_rate: num(f.pay_rate),
      pay_type: f.pay_type,
      burden_pct: num(f.burden_pct),
      weekly_hours: num(f.weekly_hours),
      payment_terms_days: f.payment_terms_days === "" ? null : Math.round(num(f.payment_terms_days)),
      notes: f.notes.trim() || null,
      custom_fields: f.custom_fields,
      updated_at: new Date().toISOString(),
    };
    const res = f.id ? await supabase.from("placements").update(payload).eq("id", f.id) : await supabase.from("placements").insert(payload);
    if (res.error) {
      setSaving(false);
      return toast.error(res.error.message);
    }
    // Keep the CRM in sync: make sure the contractor is linked to the engagement.
    if (payload.contractor_id && payload.engagement_id) {
      await supabase
        .from("engagement_contractors")
        .upsert({ engagement_id: payload.engagement_id, contractor_id: payload.contractor_id }, { onConflict: "engagement_id,contractor_id", ignoreDuplicates: true });
    }
    setSaving(false);
    toast.success(f.id ? "Placement updated" : "Placement added");
    onClose();
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? "Edit placement" : "Add placement"}</DialogTitle>
          <DialogDescription>One consultant billed to one agency. Rates drive margin, forecasts, invoices and contractor pay.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="pl-role">Role title *</Label>
            <Input id="pl-role" value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="e.g. Business Analyst 3" />
          </div>
          <div className="space-y-1.5">
            <Label>Consultant</Label>
            <Select value={f.contractor_id} onValueChange={(v) => setF({ ...f, contractor_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {data.contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as PlacementStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACEMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Agency (account)</Label>
            <Select value={f.account_id} onValueChange={(v) => setF({ ...f, account_id: v, engagement_id: NONE })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {data.accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Engagement</Label>
            <Select
              value={f.engagement_id}
              onValueChange={(v) => {
                const eng = data.engagements.find((e) => e.id === v);
                setF({
                  ...f,
                  engagement_id: v,
                  account_id: eng?.account_id || f.account_id,
                  role_title: f.role_title || eng?.name || "",
                  start_date: f.start_date || eng?.start_date || "",
                  end_date: f.end_date || eng?.end_date || "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {engagementsForAccount.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-start">Start date</Label>
            <Input id="pl-start" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-end">End date</Label>
            <Input id="pl-end" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-4">
          <p className="text-sm font-semibold">Rates</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pl-bill">Bill rate ($/hr)</Label>
              <Input id="pl-bill" type="number" step="0.01" min="0" value={f.bill_rate} onChange={(e) => setF({ ...f, bill_rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-pay">Pay rate ($/hr)</Label>
              <Input id="pl-pay" type="number" step="0.01" min="0" value={f.pay_rate} onChange={(e) => setF({ ...f, pay_rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Pay type</Label>
              <Select
                value={f.pay_type}
                onValueChange={(v) =>
                  setF({ ...f, pay_type: v as PayType, burden_pct: v === "W2" ? String(data.settings.default_burden_pct) : f.pay_type === "W2" ? "0" : f.burden_pct })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-burden">Burden %</Label>
              <Input id="pl-burden" type="number" step="0.1" min="0" value={f.burden_pct} onChange={(e) => setF({ ...f, burden_pct: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-hours">Hours / week</Label>
              <Input id="pl-hours" type="number" step="0.5" min="0" value={f.weekly_hours} onChange={(e) => setF({ ...f, weekly_hours: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Burden covers employer payroll taxes, workers&apos; comp, benefits and insurance on W2 pay. 1099 and C2C usually carry little or none.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-muted/50 p-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Loaded cost</p>
              <p className="font-semibold">{formatCurrency(preview.loaded_cost)}/hr</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Spread</p>
              <p className={cn("font-semibold", preview.spread < 0 && "text-red-600")}>{formatCurrency(preview.spread)}/hr</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Gross margin</p>
              <p className={cn("font-semibold", preview.margin_pct < target ? "text-amber-600" : "text-primary")}>{preview.margin_pct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Monthly GP</p>
              <p className="font-semibold">{formatCurrency(preview.monthly_profit)}</p>
            </div>
          </div>
          {num(f.pay_rate) > 0 && (
            <p className="text-xs text-muted-foreground">
              To hit your {target}% target margin at this pay rate, bill at least <strong className="text-foreground">{formatCurrency(suggested)}/hr</strong>.
              {num(f.bill_rate) === 0 && (
                <button type="button" className="ml-2 font-semibold text-primary hover:underline" onClick={() => setF({ ...f, bill_rate: suggested.toFixed(2) })}>
                  Use it
                </button>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-terms">Payment terms (days)</Label>
            <Input id="pl-terms" type="number" min="0" value={f.payment_terms_days} onChange={(e) => setF({ ...f, payment_terms_days: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-notes">Notes</Label>
            <Textarea id="pl-notes" rows={1} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="PO #, contract vehicle, extension history…" />
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Custom fields</p>
            <CustomFieldInputs fields={fields} values={f.custom_fields} onChange={(v) => setF({ ...f, custom_fields: v })} base={preview as unknown as Record<string, number>} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : f.id ? "Save changes" : "Add placement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
