"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileAttachments } from "@/components/ui/FileAttachments";
import { CustomFieldInputs } from "@/components/finance/CustomFields";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/lib/constants";
import { RECURRENCES, type CustomField } from "@/lib/finance/types";
import { num } from "@/lib/utils";

export const NONE = "none";

export interface ExpenseFormState {
  description: string;
  category: string;
  amount: string;
  expense_date: string;
  status: string;
  vendor: string;
  recurrence: string;
  engagement_id: string;
  account_id: string;
  contractor_id: string;
  receipt_urls: string[];
  notes: string;
  custom_fields: Record<string, unknown>;
}

export function expenseFormToPayload(f: ExpenseFormState, includeExtended: boolean) {
  const base = {
    description: f.description.trim(),
    category: f.category,
    amount: Math.round(num(f.amount) * 100) / 100,
    expense_date: f.expense_date,
    status: f.status,
    engagement_id: f.engagement_id && f.engagement_id !== NONE ? f.engagement_id : null,
    account_id: f.account_id && f.account_id !== NONE ? f.account_id : null,
    contractor_id: f.contractor_id && f.contractor_id !== NONE ? f.contractor_id : null,
    receipt_url: f.receipt_urls[0] || null,
  };
  if (!includeExtended) return base;
  return {
    ...base,
    vendor: f.vendor.trim() || null,
    notes: f.notes.trim() || null,
    recurrence: f.recurrence || "none",
    custom_fields: f.custom_fields,
  };
}

/** Is this error caused by the October 2026 columns not existing yet? */
export function isMissingExtendedColumn(message: string) {
  return /vendor|notes|recurrence|custom_fields/.test(message) && /column|schema cache/i.test(message);
}

export function ExpenseFormFields({ value, onChange }: { value: ExpenseFormState; onChange: (v: ExpenseFormState) => void }) {
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [engagements, setEngagements] = useState<{ id: string; name: string; account_id: string | null }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; full_name: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const set = (patch: Partial<ExpenseFormState>) => onChange({ ...value, ...patch });

  useEffect(() => {
    (async () => {
      const [accRes, engRes, cRes, bRes, cfRes] = await Promise.all([
        supabase.from("accounts").select("id, name").order("name"),
        supabase.from("engagements").select("id, name, account_id").order("name"),
        supabase.from("contractors").select("id, full_name").order("full_name"),
        supabase.from("finance_budgets").select("category"),
        supabase.from("finance_custom_fields").select("*").eq("entity", "expense").eq("is_active", true).order("sort_order"),
      ]);
      setAccounts(accRes.data || []);
      setEngagements(engRes.data || []);
      setContractors(cRes.data || []);
      setCategories(Array.from(new Set([...EXPENSE_CATEGORIES, ...((bRes.data || []) as { category: string }[]).map((b) => b.category)])));
      if (!cfRes.error) setFields((cfRes.data || []) as CustomField[]);
    })();
  }, []);

  const engOptions = value.account_id && value.account_id !== NONE ? engagements.filter((e) => e.account_id === value.account_id) : engagements;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">Description *</Label>
        <Input id="exp-desc" value={value.description} onChange={(e) => set({ description: e.target.value })} placeholder="What was this expense for?" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categories.includes(value.category) ? value.category : value.category || "Other"} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set([...categories, value.category].filter(Boolean))).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-amount">Amount ($) *</Label>
          <Input id="exp-amount" type="number" step="0.01" min="0" placeholder="0.00" value={value.amount} onChange={(e) => set({ amount: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-date">Date *</Label>
          <Input id="exp-date" type="date" value={value.expense_date} onChange={(e) => set({ expense_date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-vendor">Vendor / payee</Label>
          <Input id="exp-vendor" value={value.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder="e.g. Gusto, Microsoft, Hartford" />
        </div>
        <div className="space-y-1.5">
          <Label>Repeats</Label>
          <Select value={value.recurrence} onValueChange={(v) => set({ recurrence: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Recurring expenses are projected forward in the Finance Tracker forecast.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={value.account_id || NONE} onValueChange={(v) => set({ account_id: v, engagement_id: v !== NONE && engagements.find((e) => e.id === value.engagement_id)?.account_id !== v ? NONE : value.engagement_id })}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {accounts.map((a) => (
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
            value={value.engagement_id || NONE}
            onValueChange={(v) => {
              const eng = engagements.find((e) => e.id === v);
              set({ engagement_id: v, account_id: eng?.account_id || value.account_id });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {engOptions.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contractor</Label>
          <Select value={value.contractor_id || NONE} onValueChange={(v) => set({ contractor_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exp-notes">Notes</Label>
        <Textarea id="exp-notes" rows={2} value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      {fields.length > 0 && <CustomFieldInputs fields={fields} values={value.custom_fields} onChange={(v) => set({ custom_fields: v })} base={{ amount: num(value.amount) }} />}

      <FileAttachments label="Receipt" value={value.receipt_urls} onChange={(urls) => set({ receipt_urls: urls })} />
    </div>
  );
}
