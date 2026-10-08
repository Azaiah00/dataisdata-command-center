"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FinanceData } from "@/lib/finance/data";
import type { Aggregate, CustomEntity, CustomField, CustomFieldType, ResultFormat } from "@/lib/finance/types";
import { BUILTIN_FIELDS, formatByType, placementMetrics, resolveRecordFields } from "@/lib/finance/calc";
import { FORMULA_FUNCTIONS, validateFormula } from "@/lib/finance/formula";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccess } from "@/components/auth/AccessProvider";
import { cn, num } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, EyeOff, RotateCcw, ArrowUp, ArrowDown, Sigma, CheckCircle2, XCircle } from "lucide-react";

const ENTITIES: { key: CustomEntity; label: string; help: string }[] = [
  { key: "placement", label: "Placements", help: "Shown on the Placements table, totals, placement PDFs and the tracker report." },
  { key: "invoice", label: "Invoices", help: "Shown on invoice forms and invoice detail pages." },
  { key: "expense", label: "Expenses", help: "Shown on expense forms and expense detail pages." },
  { key: "income", label: "Other income", help: "Shown on the Other Income table and its PDF." },
];

const TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "currency", label: "Money ($)" },
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent (%)" },
  { value: "formula", label: "Calculated (formula)" },
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
];

const TEMPLATES: Record<CustomEntity, { label: string; field_type: CustomFieldType; formula?: string; result_format?: ResultFormat; options?: string[] }[]> = {
  placement: [
    { label: "PO number", field_type: "text" },
    { label: "Contract vehicle", field_type: "select", options: ["VITA SWaM", "eVA", "GSA MAS", "Direct", "Subcontract"] },
    { label: "MSP / vendor fee %", field_type: "percent" },
    { label: "Net spread after MSP fee", field_type: "formula", formula: "spread - bill_rate * msp_vendor_fee / 100", result_format: "currency" },
    { label: "Overtime value / week", field_type: "formula", formula: "if(weekly_hours > 40, (weekly_hours - 40) * bill_rate, 0)", result_format: "currency" },
    { label: "Annual GP after MSP fee", field_type: "formula", formula: "(spread - bill_rate * msp_vendor_fee / 100) * weekly_hours * 52", result_format: "currency" },
  ],
  invoice: [
    { label: "PO number", field_type: "text" },
    { label: "Prompt-pay discount %", field_type: "percent" },
    { label: "Net after discount", field_type: "formula", formula: "total * (1 - prompt_pay_discount / 100)", result_format: "currency" },
  ],
  expense: [
    { label: "Billable to client", field_type: "select", options: ["Yes", "No"] },
    { label: "Mileage", field_type: "number" },
  ],
  income: [{ label: "Grant number", field_type: "text" }],
};

function slugify(label: string) {
  const s = label
    .toLowerCase()
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(s) ? s : `f_${s}`.slice(0, 40);
}

type Draft = Omit<CustomField, "id" | "created_at" | "created_by" | "sort_order" | "is_active"> & { id?: string; optionsText: string };

export function FieldsTab({ data, reload }: { data: FinanceData; reload: () => Promise<void> }) {
  const { can, realUser } = useAccess();
  const editable = can("finance_tracker", "edit");
  const [entity, setEntity] = useState<CustomEntity>("placement");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  const fields = data.customFields.filter((f) => f.entity === entity).sort((a, b) => a.sort_order - b.sort_order);
  const active = fields.filter((f) => f.is_active);
  const removed = fields.filter((f) => !f.is_active);

  const available = useMemo(() => {
    if (!draft) return [] as { key: string; label: string }[];
    return [
      ...BUILTIN_FIELDS[entity].map((b) => ({ key: b.key, label: b.label })),
      ...active
        .filter((f) => f.field_key !== draft.field_key && ["number", "currency", "percent", "formula"].includes(f.field_type))
        .map((f) => ({ key: f.field_key, label: f.label })),
    ];
  }, [draft, entity, active]);

  const validation = draft?.field_type === "formula" ? validateFormula(draft.formula || "", available.map((a) => a.key), draft.field_key) : null;

  // Live preview against a real record when possible
  const preview = useMemo(() => {
    if (!draft || draft.field_type !== "formula" || !validation?.ok) return null;
    let base: Record<string, number> = {};
    let values: Record<string, unknown> = {};
    let label = "sample values";
    if (entity === "placement" && data.placements[0]) {
      const p = data.placements[0];
      base = placementMetrics(p, data.hours) as unknown as Record<string, number>;
      values = p.custom_fields;
      label = p.contractors?.full_name || p.role_title;
    } else if (entity === "invoice" && data.invoices[0]) {
      const i = data.invoices[0];
      base = { total: num(i.total), paid: 0, balance: num(i.total), days_outstanding: 0 };
      values = i.custom_fields || {};
      label = i.invoice_number;
    } else {
      base = Object.fromEntries(BUILTIN_FIELDS[entity].map((b) => [b.key, b.format === "percent" ? 25 : b.format === "currency" ? 1000 : 40]));
    }
    const temp: CustomField = { ...(draft as unknown as CustomField), id: "preview", is_active: true, sort_order: 999, created_at: "", created_by: null, options: [] };
    const others = active.filter((f) => f.field_key !== draft.field_key);
    const out = resolveRecordFields(base, [...others, temp], values);
    return { label, value: formatByType(out[draft.field_key], draft.result_format) };
  }, [draft, validation, entity, data, active]);

  function insertToken(token: string) {
    if (!draft) return;
    const el = formulaRef.current;
    const cur = draft.formula || "";
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + token + cur.slice(end);
    setDraft({ ...draft, formula: next });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function openNew(template?: (typeof TEMPLATES)[CustomEntity][number]) {
    const label = template?.label || "";
    setDraft({
      entity,
      label,
      field_key: label ? slugify(label) : "",
      field_type: template?.field_type || "currency",
      formula: template?.formula || "",
      result_format: template?.result_format || "currency",
      options: template?.options || [],
      optionsText: (template?.options || []).join(", "),
      aggregate: "sum",
      show_in_reports: true,
    });
  }

  async function save() {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) return toast.error("Give the field a name");
    const key = draft.id ? draft.field_key : slugify(draft.field_key || label);
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return toast.error("Field key must start with a letter and use only a-z, 0-9 and _");
    if (BUILTIN_FIELDS[entity].some((b) => b.key === key)) return toast.error("That key is a built-in field — choose another name");
    if (!draft.id && fields.some((f) => f.field_key === key)) return toast.error("A field with that key already exists (it may be removed — restore it instead)");
    if (draft.field_type === "formula" && !validation?.ok) return toast.error("Fix the formula first");
    const options = draft.field_type === "select" ? draft.optionsText.split(",").map((o) => o.trim()).filter(Boolean) : [];
    if (draft.field_type === "select" && !options.length) return toast.error("Add at least one dropdown option");
    setSaving(true);
    const payload = {
      entity,
      field_key: key,
      label,
      field_type: draft.field_type,
      formula: draft.field_type === "formula" ? (draft.formula || "").trim() : null,
      result_format: draft.field_type === "formula" ? draft.result_format : draft.field_type === "currency" ? "currency" : draft.field_type === "percent" ? "percent" : "number",
      options,
      aggregate: draft.aggregate,
      show_in_reports: draft.show_in_reports,
      updated_at: new Date().toISOString(),
    };
    const res = draft.id
      ? await supabase.from("finance_custom_fields").update(payload).eq("id", draft.id)
      : await supabase.from("finance_custom_fields").insert({ ...payload, sort_order: (fields.at(-1)?.sort_order ?? 0) + 1, is_active: true, created_by: realUser?.full_name || null });
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(draft.id ? "Field updated" : `“${label}” added`);
    setDraft(null);
    await reload();
  }

  async function setActive(f: CustomField, on: boolean) {
    if (!on) {
      const dependents = active.filter((x) => x.field_type === "formula" && x.formula && new RegExp(`\\b${f.field_key}\\b`).test(x.formula));
      if (dependents.length && !confirm(`${dependents.map((d) => d.label).join(", ")} use this field in a formula and will treat it as 0. Remove anyway?`)) return;
    }
    const { error } = await supabase.from("finance_custom_fields").update({ is_active: on, updated_at: new Date().toISOString() }).eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success(on ? "Field restored" : "Field removed — its saved values are kept and come back if you restore it");
    await reload();
  }

  async function move(f: CustomField, dir: -1 | 1) {
    const idx = active.findIndex((x) => x.id === f.id);
    const other = active[idx + dir];
    if (!other) return;
    await Promise.all([
      supabase.from("finance_custom_fields").update({ sort_order: other.sort_order }).eq("id", f.id),
      supabase.from("finance_custom_fields").update({ sort_order: f.sort_order === other.sort_order ? f.sort_order + dir : f.sort_order }).eq("id", other.id),
    ]);
    await reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setEntity(e.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              entity === e.key ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40"
            )}
          >
            {e.label} ({data.customFields.filter((f) => f.entity === e.key && f.is_active).length})
          </button>
        ))}
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{ENTITIES.find((e) => e.key === entity)?.help} Removing a field hides it everywhere but keeps its values.</p>
        {editable && (
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="w-4 h-4" /> Add field
          </Button>
        )}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Popular for DataIsData:</span>
          {TEMPLATES[entity]
            .filter((t) => !fields.some((f) => f.field_key === slugify(t.label)))
            .map((t) => (
              <button key={t.label} type="button" onClick={() => openNew(t)} className="rounded-full border border-dashed border-primary/40 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5">
                + {t.label}
              </button>
            ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white shadow-sm divide-y divide-border">
        {active.map((f, i) => (
          <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-[14rem]">
              <p className="font-medium flex items-center gap-2">
                {f.field_type === "formula" && <Sigma className="w-4 h-4 text-primary" />}
                {f.label}
                <Badge className="border-none bg-slate-100 text-slate-600 normal-case tracking-normal">{TYPES.find((t) => t.value === f.field_type)?.label}</Badge>
                {!f.show_in_reports && <Badge className="border-none bg-amber-50 text-amber-700">Hidden from PDFs</Badge>}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {f.field_key}
                {f.formula ? ` = ${f.formula}` : ""}
                {f.field_type === "select" ? ` · ${f.options.join(", ")}` : ""}
              </p>
            </div>
            {editable && (
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(f, -1)} aria-label="Move up">
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" disabled={i === active.length - 1} onClick={() => move(f, 1)} aria-label="Move down">
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setDraft({ ...f, optionsText: f.options.join(", "), formula: f.formula || "" })}
                  aria-label={`Edit ${f.label}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setActive(f, false)}>
                  <EyeOff className="w-4 h-4" /> Remove
                </Button>
              </div>
            )}
          </div>
        ))}
        {!active.length && <p className="px-4 py-10 text-center text-sm text-muted-foreground">No custom fields yet for {ENTITIES.find((e) => e.key === entity)?.label.toLowerCase()}.</p>}
      </div>

      {removed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Removed fields</p>
          <div className="flex flex-wrap gap-2">
            {removed.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs">
                {f.label}
                {editable && (
                  <button type="button" className="text-primary font-semibold inline-flex items-center gap-1" onClick={() => setActive(f, true)}>
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit field" : "Add field"}</DialogTitle>
            <DialogDescription>Fields appear in forms, tables, totals and PDFs for {ENTITIES.find((e) => e.key === entity)?.label.toLowerCase()}.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cf-label">Field name</Label>
                  <Input
                    id="cf-label"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value, field_key: draft.id ? draft.field_key : slugify(e.target.value) })}
                    placeholder="e.g. MSP vendor fee %"
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">key: {draft.field_key || "—"}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={draft.field_type} onValueChange={(v) => setDraft({ ...draft, field_type: v as CustomFieldType })} disabled={!!draft.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {draft.id && <p className="text-[11px] text-muted-foreground">Type is locked after creation to protect saved values.</p>}
                </div>
              </div>

              {draft.field_type === "select" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cf-options">Dropdown options (comma separated)</Label>
                  <Input id="cf-options" value={draft.optionsText} onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })} />
                </div>
              )}

              {draft.field_type === "formula" && (
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-formula">Formula</Label>
                    <Textarea
                      id="cf-formula"
                      ref={formulaRef}
                      rows={2}
                      className="font-mono text-sm"
                      value={draft.formula || ""}
                      onChange={(e) => setDraft({ ...draft, formula: e.target.value })}
                      placeholder="(bill_rate - pay_rate) * weekly_hours * 52"
                    />
                    {validation &&
                      (validation.ok ? (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          {preview && (
                            <span className="text-muted-foreground">
                              {" "}
                              — {preview.label}: <strong className="text-foreground">{preview.value}</strong>
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> {validation.error}
                        </p>
                      ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Fields (click to insert)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {available.map((a) => (
                        <button key={a.key} type="button" onClick={() => insertToken(a.key)} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-mono text-primary hover:bg-primary/20" title={a.label}>
                          {a.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Operators & functions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["+", "-", "*", "/", "(", ")", ">", "<", ","].map((op) => (
                        <button key={op} type="button" onClick={() => insertToken(` ${op} `.replace("( ", "(").replace(" )", ")"))} className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono hover:bg-slate-200">
                          {op}
                        </button>
                      ))}
                      {FORMULA_FUNCTIONS.map((fn) => (
                        <button key={fn} type="button" onClick={() => insertToken(`${fn}(`)} className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono hover:bg-slate-200">
                          {fn}()
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      if(condition, then, else) · round(x, digits) · pct(part, whole) returns a percentage. Division by zero safely returns 0.
                    </p>
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <Label>Show result as</Label>
                    <Select value={draft.result_format} onValueChange={(v) => setDraft({ ...draft, result_format: v as ResultFormat })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="currency">Money ($)</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["number", "currency", "percent", "formula"].includes(draft.field_type) && (
                  <div className="space-y-1.5">
                    <Label>Total row</Label>
                    <Select value={draft.aggregate} onValueChange={(v) => setDraft({ ...draft, aggregate: v as Aggregate })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                        <SelectItem value="none">Don&apos;t total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <label className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer">
                  <Switch checked={draft.show_in_reports} onCheckedChange={(v) => setDraft({ ...draft, show_in_reports: v })} />
                  <span className="text-sm">Include in PDF reports</span>
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : draft?.id ? "Save field" : "Add field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
