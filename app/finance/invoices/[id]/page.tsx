"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Invoice, InvoiceLineItem, Payment } from "@/lib/types";
import { INVOICE_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { Receipt, Pencil, Trash2, Printer, Send, DollarSign, Building2 } from "lucide-react";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function fetchInvoice() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, accounts(id, name), engagements(id, name)")
      .eq("id", id)
      .single();
    if (error || !data) { setLoading(false); return; }
    setInvoice(data);
    setEditStatus(data.status);
    setEditNotes(data.notes || "");
    setEditDueDate(data.due_date || "");

    const [liRes, payRes] = await Promise.all([
      supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
    ]);
    setLineItems(liRes.data || []);
    setPayments(payRes.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchInvoice(); }, [id]);

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balanceDue = (invoice?.total || 0) - totalPaid;

  async function onSave() {
    setSaving(true);
    const { error } = await supabase.from("invoices").update({
      status: editStatus,
      notes: editNotes || null,
      due_date: editDueDate || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Invoice updated");
    setIsEditing(false);
    await fetchInvoice();
  }

  async function onDelete() {
    setDeleting(true);
    await supabase.from("invoices").delete().eq("id", id);
    setDeleting(false);
    toast.success("Invoice deleted");
    router.push("/finance/invoices");
  }

  async function markAsSent() {
    await supabase.from("invoices").update({ status: "Sent", updated_at: new Date().toISOString() }).eq("id", id);
    toast.success("Invoice marked as Sent");
    await fetchInvoice();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }
  if (!invoice) {
    return <div className="text-center py-20"><h2 className="text-2xl font-bold text-slate-900">Invoice not found</h2><Link href="/finance/invoices" className="text-blue-600 hover:underline mt-4 inline-block">Back to Invoices</Link></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" ref={printRef}>
      {/* Print-only header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-blue-600">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">DataIsData</h1>
            <p className="text-sm text-[#6B7280]">Innovation as a Service</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#111827]">INVOICE</h2>
            <p className="text-lg font-bold text-blue-600">{invoice.invoice_number}</p>
          </div>
        </div>
      </div>

      {/* Screen breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider print:hidden">
        <Link href="/finance/invoices" className="hover:text-blue-600">Invoices</Link>
        <span>/</span>
        <span className="text-[#111827]">{invoice.invoice_number}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center print:hidden">
              <Receipt className="w-7 h-7 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#111827]">{invoice.invoice_number}</h1>
                <Badge className={cn("font-medium border-none text-[10px] h-5 px-2", getStatusColor(invoice.status))}>
                  {invoice.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <Link href={`/accounts/${invoice.account_id}`} className="hover:text-blue-600 font-medium">
                    {invoice.accounts?.name}
                  </Link>
                </div>
                {invoice.engagements && (
                  <>
                    <span className="text-slate-300">|</span>
                    <Link href={`/engagements/${invoice.engagement_id}`} className="hover:text-blue-600">
                      {invoice.engagements.name}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {invoice.status === "Draft" && (
              <Button variant="outline" size="sm" onClick={markAsSent}><Send className="w-4 h-4 mr-2" />Mark Sent</Button>
            )}
            <Link href={`/finance/payments/new?invoice_id=${id}`}>
              <Button variant="outline" size="sm"><DollarSign className="w-4 h-4 mr-2" />Record Payment</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              <Pencil className="w-4 h-4 mr-2" />{isEditing ? "Cancel" : "Edit"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Delete Invoice?</DialogTitle><DialogDescription>This will permanently delete {invoice.invoice_number} and all its line items and payments.</DialogDescription></DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" disabled={deleting} onClick={onDelete}>{deleting ? "Deleting..." : "Delete"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Edit section */}
      {isEditing && (
        <Card className="border-none shadow-sm print:hidden">
          <CardHeader><CardTitle>Edit Invoice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial summary + dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Subtotal</span>
              <span className="font-bold text-[#111827]">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Tax</span>
              <span className="font-bold text-[#111827]">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Total</span>
              <span className="font-bold text-emerald-600 text-lg">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Paid</span>
              <span className="font-bold text-blue-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-[#111827]">Balance Due</span>
              <span className={cn("font-bold text-lg", balanceDue > 0 ? "text-red-600" : "text-green-600")}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Dates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Issue Date</span>
              <span className="font-bold text-[#111827]">{formatDate(invoice.issue_date)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-[#6B7280]">Due Date</span>
              <span className="font-bold text-[#111827]">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#6B7280]">Created</span>
              <span className="font-bold text-[#111827]">{formatDate(invoice.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Line Items ({lineItems.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-bold text-[#6B7280] uppercase">Description</th>
                <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Qty</th>
                <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Unit Price</th>
                <th className="text-right py-2 text-xs font-bold text-[#6B7280] uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-slate-50">
                  <td className="py-3 text-[#111827]">{li.description}</td>
                  <td className="py-3 text-right text-[#6B7280]">{li.quantity}</td>
                  <td className="py-3 text-right text-[#6B7280]">{formatCurrency(li.unit_price)}</td>
                  <td className="py-3 text-right font-bold text-[#111827]">{formatCurrency(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Payment History ({payments.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-[#6B7280]">{p.payment_method} {p.reference_number ? `• ${p.reference_number}` : ""}</p>
                  </div>
                  <span className="text-xs text-[#6B7280]">{formatDate(p.payment_date)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {!isEditing && invoice.notes && (
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#111827]">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-[#4B5563] whitespace-pre-wrap">{invoice.notes}</p></CardContent>
        </Card>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-blue-600">
        <p className="text-sm text-[#6B7280]">DataIsData Command Center | Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
