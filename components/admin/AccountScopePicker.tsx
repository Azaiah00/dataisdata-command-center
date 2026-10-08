"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Globe, Filter, Search } from "lucide-react";
import type { ScopeMode } from "@/lib/access/types";

function ScopeOption({
  value,
  icon: Icon,
  title,
  body,
  mode,
  disabled,
  onModeChange,
}: {
  value: ScopeMode;
  icon: React.ElementType;
  title: string;
  body: string;
  mode: ScopeMode;
  disabled?: boolean;
  onModeChange: (m: ScopeMode) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onModeChange(value)}
      className={cn(
        "flex-1 rounded-2xl border p-4 text-left transition-all disabled:opacity-60",
        mode === value ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:border-primary/30"
      )}
      aria-pressed={mode === value}
    >
      <Icon className={cn("w-5 h-5 mb-2", mode === value ? "text-primary" : "text-muted-foreground")} />
      <p className="font-semibold text-sm text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
    </button>
  );
}

export function AccountScopePicker({
  mode,
  onModeChange,
  selected,
  onSelectedChange,
  accounts,
  disabled,
}: {
  mode: ScopeMode;
  onModeChange: (m: ScopeMode) => void;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  accounts: { id: string; name: string; account_type?: string | null }[];
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => accounts.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase())),
    [accounts, q]
  );


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <ScopeOption mode={mode} disabled={disabled} onModeChange={onModeChange} value="all" icon={Globe} title="All records" body="Sees every record inside the sections they can open." />
        <ScopeOption
          mode={mode}
          disabled={disabled}
          onModeChange={onModeChange}
          value="accounts"
          icon={Filter}
          title="Only specific accounts"
          body="Sees only records tied to the accounts below (engagements, pipeline, contacts, invoices…)."
        />
      </div>
      {mode === "accounts" && (
        <div className="rounded-2xl border border-border bg-white">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search accounts"
              className="h-8 border-none shadow-none focus-visible:ring-0"
            />
            <span className="text-xs font-medium text-primary whitespace-nowrap">{selected.length} selected</span>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.map((a) => {
              const checked = selected.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={cn("flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer hover:bg-muted/60", checked && "bg-primary/5")}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      onSelectedChange(v ? Array.from(new Set([...selected, a.id])) : selected.filter((x) => x !== a.id))
                    }
                  />
                  <span className="text-sm text-foreground flex-1">{a.name}</span>
                  {a.account_type && <span className="text-[10px] text-muted-foreground">{a.account_type}</span>}
                </label>
              );
            })}
            {!filtered.length && <p className="text-sm text-muted-foreground p-3">No accounts match.</p>}
          </div>
          {selected.length === 0 && (
            <p className="border-t border-border p-3 text-xs text-amber-700 bg-amber-50 rounded-b-2xl">
              No accounts selected — this person will see no account-linked records until you pick at least one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
