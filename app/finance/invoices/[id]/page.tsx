"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Invoice, InvoiceLineItem, Payment } from "@/lib/types";
import { INVOICE_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PdfButton } from "@/components/ui/PdfButton";
import { CustomFieldInputs, CustomFieldValues } from "@/components/finance/CustomFields";
import { Can, useAccess } from "@/components/auth/AccessProvider";
import { cn, formatCurrency, formatDate, getStatusColor, num } from "@/lib/utils";
import { exportInvoicePdf } from "@/lib/pdf/reports";
import { recomputeInvoiceStatus, syncInvoiceStatuses } from "@/lib/finance/data";
import { daysBetween, parseDate, todayISO } from "@/lib/finance/dates";
import type { CustomField } from "@/lib/finance/types";
import { toast } from "sonner";
import { Receipt, Pencil, Trash2, Send, DollarSign, Building2, Clock } from "lucide-react";

type InvoiceWithExtras = Invoice & { payment_terms_days?: number | null; custom_fields?: Record<string, unknown> | null; sent_at?: string | null };

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { can, realUser } = useAccess();
  const [invoice, setInvoice] = useState<InvoiceWithExtras | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [hoursCount, setHoursCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editCustom, setEditCustom] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const fetchInvoice = useCallback(async () => {
    const { data, error } = await supabase.from("invoices").select("*, accounts(id, name), engagements(id, name)").eq("id", id).single();
    if (error || !data) {
      setInvoice(null);
      setLoading(false);
      return;
    }
    setInvoice(data);
    setEditStatus(data.status);
    setEditNotes(data.notes || "");
    setEditDueDate(data.due_date || "");
    setEditCustom(data.custom_fields || {});

    const [liRes, payRes, cfRes, hrsRes] = await Promise.all([
      supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
      supabase.from("finance_custom_fields").select("*").eq("entity", "invoice").eq("is_active", true).order("sort_order"),
      supabase.from("placement_hours").select("id", { count: "exact", head: true }).eq("invoice_id", id),
    ]);
    setLineItems(liRes.data || []);
    setPayments(payRes.data || []);
    setFields(cfRes.error ? [] : ((cfRes.data || []) as CustomField[]));
    setHoursCount(hrsRes.error ? 0 : hrsRes.count || 0);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const totalPaid = payments.reduce((s, p) => s + num(p.amount), 0);
  const balanceDue = num(invoice?.total) - totalPaid;
  const due = parseDate(invoice?.due_date);
  const daysLate = due ? daysBetween(due, parseDate(todayISO())!) : 0;

  async function onSave() {
    if (editDueDate && invoice && editDueDate < invoice.issue_date) return toast.error("Due date can't be before the issue date");
    setSaving(true);
    const base = { status: editStatus, notes: editNotes || null, due_date: editDueDate || null, updated_at: new Date().toISOString() };
    let { error } = await supabase.from("invoices").update(fields.length ? { ...base, custom_fields: editCustom } : base).eq("id", id);
    if (error && /custom_fields/.test(error.message)) ({ error } = await supabase.from("invoices").update(base).eq("id", id));
    setSaving(false);
    if (error) return toast.error("Failed to save");
    await syncInvoiceStatuses().catch(() => undefined);
    toast.success("Invoice updated");
    setIsEditing(false);
    await fetchInvoice();
  }

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success(hoursCount ? "Invoice deleted — its timesheets are available to invoice again" : "Invoice deleted");
    router.push("/finance/invoices");
  }

  async function markAsSent() {
    const patch = { status: "Sent", updated_at: new Date().toISOString() };
    let { error } = await supabase.from("invoices").update({ ...patch, sent_at: new Date().toISOString() }).eq("id", id);
    if (error && /sent_at/.test(error.message)) ({ error } = await supabase.from("invoices").update(patch).eq("id", id));
    if (error) return toast.error(error.message);
    await syncInvoiceStatuses().catch(() => undefined);
    toast.success("Invoice marked as Sent");
    await fetchInvoice();
  }

  async function deletePayment(p: Payment) {
    const { error } = await supabase.from("payments").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await recomputeInvoiceStatus(id);
    setPaymentToDelete(null);
    toast.success("Payment removed and invoice balance updated");
    await fetchInvoice();
  }

  async function downloadPdf() {
    if (!invoice) return;
    await exportInvoicePdf({
      invoice: { ...invoice, payment_terms_days: invoice.payment_terms_days ?? null },
      accountName: invoice.accounts?.name || "Client",
      engagementName: invoice.engagements?.name || null,
      lines: lineItems,
      payments,
      preparedBy: realUser?.full_name,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Invoice not found</h2>
        <Link href="/finance/invoices" className="text-primary hover:underline mt-4 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Link href="/finance/invoices" className="hover:text-primary">
          Invoices
        </Link>
        <span>/</span>
        <span className="text-foreground">{invoice.invoice_number}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(invoice.status))}>{invoice.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {can("accounts") ? (
                    <Link href={`/accounts/${invoice.account_id}`} className="hover:text-primary font-medium">
                      {invoice.accounts?.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{invoice.accounts?.name}</span>
                  )}
                </span>
                {invoice.engagements && (
                  <>
                    <span className="text-slate-300">|</span>
                    {can("engagements") ? (
                      <Link href={`/engagements/${invoice.engagement_id}`} className="hover:text-primary">
                        {invoice.engagements.name}
                      </Link>
                    ) : (
                      <span>{invoice.engagements.name}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === "Draft" && can("invoices", "edit") && (
              <Button variant="outline" size="sm" onClick={markAsSent}>
                <Send className="w-4 h-4 mr-2" />
                Mark Sent
              </Button>
            )}
            {balanceDue > 0.004 && invoice.status !== "Cancelled" && (
              <Can module="payments" action="create">
                <Link href={`/finance/payments/new?invoice_id=${id}`}>
                  <Button variant="outline" size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </Link>
              </Can>
            )}
            <Can module="invoices" action="edit">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="w-4 h-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </Can>
            <PdfButton onExport={downloadPdf} label="Invoice PDF" />
            <Can module="invoices" action="delete">
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Invoice?</DialogTitle>
                    <DialogDescription>
                      This permanently deletes {invoice.invoice_number}, its line items and {payments.length} payment{payments.length === 1 ? "" : "s"}.
                      {hoursCount > 0 && ` ${hoursCount} linked timesheet${hoursCount === 1 ? "" : "s"} will become available to invoice again.`}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" disabled={deleting} onClick={onDelete}>
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Can>
          </div>
        </div>
      </div>

      {isEditing && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Edit Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Sent invoices switch to Overdue automatically after the due date.</p>
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="inv-due">
                  Due Date
                </label>
                <Input id="inv-due" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="inv-notes">
                Notes
              </label>
              <Textarea id="inv-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            {fields.length > 0 && <CustomFieldInputs fields={fields} values={editCustom} onChange={setEditCustom} base={{ total: num(invoice.total), paid: totalPaid, balance: balanceDue, days_outstanding: Math.max(0, daysLate) }} />}
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Subtotal", formatCurrency(invoice.subtotal)],
              ["Tax", formatCurrency(invoice.tax_amount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="font-bold text-foreground">{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span className="font-bold text-foreground">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-foreground">Balance Due</span>
              <span className={cn("font-bold text-lg", balanceDue > 0.004 ? "text-red-600" : "text-green-600")}>{formatCurrency(balanceDue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Dates & terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-muted-foreground">Issue Date</span>
              <span className="font-bold text-foreground">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className={cn("font-bold", daysLate > 0 && balanceDue > 0.004 && invoice.status !== "Cancelled" ? "text-red-600" : "text-foreground")}>
                {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                {daysLate > 0 && balanceDue > 0.004 && invoice.status !== "Cancelled" && invoice.status !== "Draft" ? ` · ${daysLate} days late` : ""}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-muted-foreground">Terms</span>
              <span className="font-bold text-foreground">{invoice.payment_terms_days != null ? `Net ${invoice.payment_terms_days}` : "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Sent</span>
              <span className="font-bold text-foreground">{invoice.sent_at ? formatDate(invoice.sent_at) : invoice.status === "Draft" ? "Not yet" : "—"}</span>
            </div>
            {hoursCount > 0 && (
              <Link href="/finance/tracker?tab=hours" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline pt-1">
                <Clock className="w-3.5 h-3.5" /> Built from {hoursCount} timesheet{hoursCount === 1 ? "" : "s"}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {fields.length > 0 && !isEditing && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Additional details</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomFieldValues fields={fields} values={invoice.custom_fields} base={{ total: num(invoice.total), paid: totalPaid, balance: balanceDue, days_outstanding: Math.max(0, daysLate) }} />
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Line Items ({lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase">Description</th>
                <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Qty</th>
                <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Unit Price</th>
                <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-slate-50">
                  <td className="py-3 text-foreground">{li.description}</td>
                  <td className="py-3 text-right text-muted-foreground">{li.quantity}</td>
                  <td className="py-3 text-right text-muted-foreground">{formatCurrency(li.unit_price)}</td>
                  <td className="py-3 text-right font-bold text-foreground">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Payment History ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_method} {p.reference_number ? `• ${p.reference_number}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</span>
                    {can("payments", "delete") && (
                      <Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => setPaymentToDelete(p)} aria-label="Delete payment">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isEditing && invoice.notes && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!paymentToDelete} onOpenChange={(v) => !v && setPaymentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this payment?</DialogTitle>
            <DialogDescription>
              {paymentToDelete && `${formatCurrency(paymentToDelete.amount)} on ${formatDate(paymentToDelete.payment_date)}`} will be removed and the invoice balance and status recalculated everywhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => paymentToDelete && deletePayment(paymentToDelete)}>
              Remove payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
