"use client";

import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
}

/** Chips for what's picked plus a dropdown to add more. Used for every many-to-many link in the portal. */
export function MultiPicker({
  options,
  value,
  onChange,
  placeholder = "Add…",
  emptyText = "Nothing to add",
  disabled,
}: {
  options: PickerOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const byId = Object.fromEntries(options.map((o) => [o.id, o]));
  const remaining = options.filter((o) => !value.includes(o.id));
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#eaf5f5] text-[#2a3b52] px-3 py-1 text-xs font-medium max-w-full">
              <span className="truncate">{byId[id]?.label || "Unknown"}</span>
              {!disabled && (
                <button type="button" className="ml-0.5 rounded-full hover:text-destructive" onClick={() => onChange(value.filter((x) => x !== id))} aria-label={`Remove ${byId[id]?.label || "item"}`}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <Select value="" onValueChange={(v) => v && !value.includes(v) && onChange([...value, v])} disabled={!remaining.length}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={remaining.length ? placeholder : emptyText} />
          </SelectTrigger>
          <SelectContent>
            {remaining.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
                {o.hint ? <span className="text-muted-foreground"> — {o.hint}</span> : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
