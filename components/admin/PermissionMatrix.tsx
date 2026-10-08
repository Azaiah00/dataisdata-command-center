"use client";

import { useMemo, useState } from "react";
import { GROUPS, MODULES, modulesInGroup, type Action, type GroupKey, type ModuleKey } from "@/lib/access/modules";
import type { ModulePermission, PermissionMap } from "@/lib/access/types";
import { NO_PERMISSION, normalizePermission } from "@/lib/access/permissions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, Lock, Eye, Plus, Pencil, Trash2, Filter } from "lucide-react";

const ACTION_META: { key: Action; label: string; icon: React.ElementType; help: string }[] = [
  { key: "view", label: "See", icon: Eye, help: "Can open and read this section" },
  { key: "create", label: "Add", icon: Plus, help: "Can create new records" },
  { key: "edit", label: "Edit", icon: Pencil, help: "Can change existing records" },
  { key: "delete", label: "Delete", icon: Trash2, help: "Can permanently delete records" },
];

export function PermissionMatrix({
  value,
  onChange,
  disabled,
  lockedReason,
  scoped,
}: {
  value: PermissionMap;
  onChange: (next: PermissionMap) => void;
  disabled?: boolean;
  lockedReason?: string;
  scoped?: boolean;
}) {
  const [open, setOpen] = useState<Record<GroupKey, boolean>>({ overview: true, crm: true, work: true, finance: true, innovation: true });

  const get = (m: ModuleKey): ModulePermission => value[m] || NO_PERMISSION;

  const setModule = (m: ModuleKey, p: ModulePermission) => onChange({ ...value, [m]: normalizePermission(m, p) });

  const toggle = (m: ModuleKey, action: Action, on: boolean) => {
    const cur = get(m);
    if (action === "view") {
      setModule(m, on ? { ...cur, view: true } : NO_PERMISSION);
    } else {
      setModule(m, { ...cur, [action]: on, view: on ? true : cur.view });
    }
  };

  const setGroup = (g: GroupKey, mode: "none" | "view" | "full") => {
    const next = { ...value };
    for (const m of modulesInGroup(g)) {
      next[m.key] =
        mode === "none"
          ? NO_PERMISSION
          : normalizePermission(m.key, { view: true, create: mode === "full", edit: mode === "full", delete: mode === "full" });
    }
    onChange(next);
  };

  const counts = useMemo(() => {
    const out: Record<string, { visible: number; total: number }> = {};
    for (const g of GROUPS) {
      const mods = modulesInGroup(g.key);
      out[g.key] = { visible: mods.filter((m) => value[m.key]?.view).length, total: mods.length };
    }
    return out;
  }, [value]);

  if (lockedReason) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex gap-3 text-sm">
        <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Full access</p>
          <p className="text-muted-foreground">{lockedReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden md:grid grid-cols-[1fr_repeat(4,4.5rem)] gap-2 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Section</span>
        {ACTION_META.map((a) => (
          <span key={a.key} className="text-center" title={a.help}>
            {a.label}
          </span>
        ))}
      </div>
      {GROUPS.map((g) => {
        const mods = modulesInGroup(g.key);
        const c = counts[g.key];
        const allOn = c.visible === c.total;
        return (
          <div key={g.key} className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted/40">
              <button
                type="button"
                onClick={() => setOpen({ ...open, [g.key]: !open[g.key] })}
                className="flex items-center gap-2 text-left flex-1 min-w-[12rem]"
                aria-expanded={open[g.key]}
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", !open[g.key] && "-rotate-90")} />
                <span>
                  <span className="block font-semibold text-foreground">{g.label}</span>
                  <span className="block text-xs text-muted-foreground">{g.description}</span>
                </span>
              </button>
              <Badge className={cn("border-none", c.visible ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500")}>
                {c.visible}/{c.total} visible
              </Badge>
              <div className="flex items-center gap-1">
                <button type="button" disabled={disabled} onClick={() => setGroup(g.key, "none")} className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-white disabled:opacity-50">
                  None
                </button>
                <button type="button" disabled={disabled} onClick={() => setGroup(g.key, "view")} className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-white disabled:opacity-50">
                  View only
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setGroup(g.key, "full")}
                  className={cn("rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-white disabled:opacity-50", allOn ? "text-primary" : "text-muted-foreground")}
                >
                  Full
                </button>
              </div>
            </div>
            {open[g.key] && (
              <div className="divide-y divide-border">
                {mods.map((m) => {
                  const p = get(m.key);
                  return (
                    <div key={m.key} className="grid grid-cols-1 md:grid-cols-[1fr_repeat(4,4.5rem)] gap-2 md:gap-2 px-4 py-3 items-center">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                          {m.label}
                          {m.sensitive && <Badge className="border-none bg-amber-50 text-amber-700">Sensitive</Badge>}
                          {scoped && m.scopeable && p.view && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                              <Filter className="w-3 h-3" /> limited to chosen accounts
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                      {ACTION_META.map((a) => {
                        const supported = m.actions.includes(a.key);
                        return (
                          <div key={a.key} className="flex md:justify-center items-center gap-2">
                            <span className="md:hidden w-14 text-xs text-muted-foreground">{a.label}</span>
                            {supported ? (
                              <Switch
                                checked={!!p[a.key]}
                                disabled={disabled}
                                onCheckedChange={(v) => toggle(m.key, a.key, v)}
                                aria-label={`${a.label} ${m.label}`}
                              />
                            ) : (
                              <span className="text-xs text-slate-300" title="Not applicable for this section">
                                —
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground px-1">
        {MODULES.length} sections. Turning off <strong>See</strong> removes the section from the menu, search, dashboard widgets and
        notifications, and blocks its pages even if someone has the link.
      </p>
    </div>
  );
}
