"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomField } from "@/lib/finance/types";
import { fieldFormat, formatByType, resolveRecordFields } from "@/lib/finance/calc";
import { Sigma } from "lucide-react";

/** Editable inputs for the active custom fields of an entity (formula fields are shown read-only). */
export function CustomFieldInputs({
  fields,
  values,
  onChange,
  base = {},
  disabled,
}: {
  fields: CustomField[];
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  base?: Record<string, number>;
  disabled?: boolean;
}) {
  const active = fields.filter((f) => f.is_active);
  if (!active.length) return null;
  const resolved = resolveRecordFields(base, active, values);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {active.map((f) => {
        const id = `cf-${f.entity}-${f.field_key}`;
        if (f.field_type === "formula") {
          return (
            <div key={f.id} className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-primary" /> {f.label}
              </Label>
              <div className="h-9 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 flex items-center text-sm font-semibold text-primary" title={f.formula || ""}>
                {formatByType(resolved[f.field_key], f.result_format)}
              </div>
            </div>
          );
        }
        if (f.field_type === "select") {
          return (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={id}>{f.label}</Label>
              <Select value={(values[f.field_key] as string) || "__none"} onValueChange={(v) => onChange({ ...values, [f.field_key]: v === "__none" ? null : v })} disabled={disabled}>
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        const numeric = f.field_type === "number" || f.field_type === "currency" || f.field_type === "percent";
        return (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.field_type === "currency" && !f.label.includes("$") ? " ($)" : f.field_type === "percent" && !f.label.includes("%") ? " (%)" : ""}
            </Label>
            <Input
              id={id}
              type={numeric ? "number" : f.field_type === "date" ? "date" : "text"}
              step={numeric ? "any" : undefined}
              value={(values[f.field_key] as string | number | undefined) ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ ...values, [f.field_key]: numeric ? (raw === "" ? null : Number(raw)) : raw || null });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Read-only key/value rows for custom fields on a detail page. */
export function CustomFieldValues({
  fields,
  values,
  base = {},
}: {
  fields: CustomField[];
  values: Record<string, unknown> | null | undefined;
  base?: Record<string, number>;
}) {
  const active = fields.filter((f) => f.is_active);
  if (!active.length) return null;
  const resolved = resolveRecordFields(base, active, values || {});
  return (
    <div className="space-y-0">
      {active.map((f) => {
        const isNum = ["number", "currency", "percent", "formula"].includes(f.field_type);
        const v = isNum ? resolved[f.field_key] : values?.[f.field_key];
        return (
          <div key={f.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              {f.field_type === "formula" && <Sigma className="w-3.5 h-3.5 text-primary" />}
              {f.label}
            </span>
            <span className="font-semibold text-foreground">{formatByType(v, fieldFormat(f))}</span>
          </div>
        );
      })}
    </div>
  );
}
