"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, BookOpen, Eye, EyeOff, ListChecks, Plus, Save, Trash2, TriangleAlert } from "lucide-react";
import { useAccess } from "@/components/auth/AccessProvider";
import { NewBadge } from "@/components/engagements/Classification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page";
import {
  CLASSIFICATION_FIELDS,
  STATUS_PHASES,
  type ClassificationKey,
  type FieldOption,
  type Phase,
  useFieldOptions,
} from "@/lib/engagementClassification";
import { addOption, deleteOption, moveOption, updateOption, usageCounts } from "@/lib/fieldOptionsAdmin";
import { cn } from "@/lib/utils";

type StatusPhase = Exclude<Phase, "Not set">;
type Draft = { value: string; description: string; phase: StatusPhase | null };
const rowKey = (r: FieldOption) => r.id || `default:${r.value}`;

/**
 * Admin > Field Options: Owner and Admin seats manage the dropdown choices for the four
 * engagement classification fields. Every form, filter, report and the Glossary use these lists.
 */
export default function FieldOptionsPage() {
  const { realUser, isAdmin } = useAccess();
  const live = useFieldOptions();
  const [tab, setTab] = useState<ClassificationKey>("engagement_type");
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rename, setRename] = useState<{ row: FieldOption; draft: Draft; count: number } | null>(null);
  const [removing, setRemoving] = useState<FieldOption | null>(null);
  const [adding, setAdding] = useState<Draft>({ value: "", description: "", phase: "In development" });

  const actor = useMemo(() => ({ id: realUser?.id || null, name: realUser?.full_name || null }), [realUser]);
  const field = CLASSIFICATION_FIELDS.find((f) => f.key === tab)!;
  const rows = live.rows[tab];
  const editable = live.source === "database" && isAdmin;
  const isStatus = tab === "engagement_status";

  const refreshUsage = useCallback(() => {
    usageCounts(tab).then(setUsage);
  }, [tab]);
  useEffect(() => {
    refreshUsage();
    setDrafts({});
  }, [refreshUsage]);

  const draftOf = (r: FieldOption): Draft => drafts[rowKey(r)] || { value: r.value, description: r.description || "", phase: r.phase };
  const isDirty = (r: FieldOption) => {
    const d = drafts[rowKey(r)];
    return !!d && (d.value.trim() !== r.value || d.description.trim() !== (r.description || "") || (isStatus && d.phase !== r.phase));
  };
  const setDraft = (r: FieldOption, patch: Partial<Draft>) => setDrafts((p) => ({ ...p, [rowKey(r)]: { ...draftOf(r), ...patch } }));
  const clearDraft = (r: FieldOption) =>
    setDrafts((p) => {
      const n = { ...p };
      delete n[rowKey(r)];
      return n;
    });

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function save(r: FieldOption, opts: { updateEngagements?: boolean } = {}) {
    const d = draftOf(r);
    await run(rowKey(r), async () => {
      const res = await updateOption(tab, r, { value: d.value, description: d.description, ...(isStatus ? { phase: d.phase } : {}) }, actor, opts);
      clearDraft(r);
      toast.success(res.updatedEngagements ? `Saved. ${res.updatedEngagements} engagement${res.updatedEngagements === 1 ? "" : "s"} updated.` : "Saved.");
      refreshUsage();
    });
  }

  function onSave(r: FieldOption) {
    const d = draftOf(r);
    const renamed = d.value.trim() !== r.value;
    const count = usage[r.value] || 0;
    if (renamed && count > 0) setRename({ row: r, draft: d, count });
    else void save(r);
  }

  const visibleCount = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            Field Options <NewBadge />
          </span>
        }
        description="The choices in the engagement classification dropdowns. Changes apply everywhere at once: the New and Edit forms, the Engagements filters, Reports and the Glossary."
        actions={
          <Link href="/glossary">
            <Button variant="outline">
              <BookOpen className="w-4 h-4" /> Glossary
            </Button>
          </Link>
        }
      />

      {live.source === "defaults" && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            These are the built-in lists and can&apos;t be edited yet. Run <strong>supabase/2026-11-field-options.sql</strong> in the Supabase SQL
            Editor once, then refresh this page.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Field" data-tour="field-options">
        {CLASSIFICATION_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={tab === f.key}
            onClick={() => setTab(f.key)}
            className={cn("filter-pill", tab === f.key && "is-active")}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70 tabular-nums">{live.rows[f.key].filter((r) => r.active).length}</span>
          </button>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#1e2c40] flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" /> {field.label}
          </CardTitle>
          <CardDescription>
            {field.hint}. {visibleCount} shown in the dropdown{rows.length > visibleCount ? `, ${rows.length - visibleCount} hidden` : ""}. Hiding or removing a choice
            never changes an engagement: records that already use it keep it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r, i) => {
            const d = draftOf(r);
            const k = rowKey(r);
            const n = usage[r.value] || 0;
            return (
              <div key={k} className={cn("rounded-2xl border border-slate-200/80 bg-white/70 p-3 sm:p-4", !r.active && "opacity-70")}>
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex lg:flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Move ${r.value} up`}
                      disabled={!editable || i === 0 || !!busy}
                      onClick={() => run(k, () => moveOption(tab, r, -1, actor))}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Move ${r.value} down`}
                      disabled={!editable || i === rows.length - 1 || !!busy}
                      onClick={() => run(k, () => moveOption(tab, r, 1, actor))}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,16rem)_1fr] gap-3 flex-1 min-w-0">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor={`v-${k}`} className="text-xs text-[#4f6178]">Choice</Label>
                      <Input id={`v-${k}`} value={d.value} disabled={!editable} onChange={(e) => setDraft(r, { value: e.target.value })} />
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#4f6178]">
                        <span className="classification-chip">{n} engagement{n === 1 ? "" : "s"}</span>
                        {!r.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">Hidden</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor={`d-${k}`} className="text-xs text-[#4f6178]">Definition (shown in the Glossary)</Label>
                      <Textarea
                        id={`d-${k}`}
                        rows={2}
                        value={d.description}
                        disabled={!editable}
                        placeholder="What this choice means"
                        onChange={(e) => setDraft(r, { description: e.target.value })}
                      />
                      {isStatus && (
                        <div className="flex items-center gap-2 pt-1">
                          <Label className="text-xs text-[#4f6178] shrink-0">Reports as</Label>
                          <Select value={d.phase || "In development"} disabled={!editable} onValueChange={(v) => setDraft(r, { phase: v as StatusPhase })}>
                            <SelectTrigger className="h-8 w-52">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_PHASES.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0">
                    <label className="flex items-center gap-2 text-xs font-medium text-[#4f6178]">
                      {r.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {r.active ? "Shown" : "Hidden"}
                      <Switch
                        checked={r.active}
                        disabled={!editable || !!busy}
                        aria-label={`${r.active ? "Hide" : "Show"} ${r.value}`}
                        onCheckedChange={(v) =>
                          run(k, async () => {
                            await updateOption(tab, r, { active: v }, actor);
                            toast.success(v ? `"${r.value}" is back in the dropdown.` : `"${r.value}" is hidden from the dropdown.`);
                          })
                        }
                      />
                    </label>
                    <div className="flex gap-2">
                      {isDirty(r) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => clearDraft(r)} disabled={busy === k}>
                            Undo
                          </Button>
                          <Button size="sm" onClick={() => onSave(r)} disabled={!editable || busy === k}>
                            <Save className="w-4 h-4" /> {busy === k ? "Saving…" : "Save"}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${r.value}`}
                        disabled={!editable || !!busy || rows.length <= 1}
                        onClick={() => setRemoving(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add a choice */}
          <div className="rounded-2xl border border-dashed border-primary/40 bg-[var(--teal-50)]/60 p-3 sm:p-4">
            <p className="text-sm font-semibold text-[#1e2c40] mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add a choice to {field.label}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,16rem)_1fr_auto] gap-3 items-start">
              <Input
                value={adding.value}
                disabled={!editable}
                placeholder="Name"
                aria-label="New choice name"
                onChange={(e) => setAdding((a) => ({ ...a, value: e.target.value }))}
              />
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={adding.description}
                  disabled={!editable}
                  placeholder="Definition (optional, shown in the Glossary)"
                  aria-label="New choice definition"
                  onChange={(e) => setAdding((a) => ({ ...a, description: e.target.value }))}
                />
                {isStatus && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#4f6178] shrink-0">Reports as</Label>
                    <Select value={adding.phase || "In development"} disabled={!editable} onValueChange={(v) => setAdding((a) => ({ ...a, phase: v as StatusPhase }))}>
                      <SelectTrigger className="h-8 w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_PHASES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button
                disabled={!editable || !adding.value.trim() || busy === "add"}
                onClick={() =>
                  run("add", async () => {
                    await addOption(tab, adding, actor);
                    toast.success(`"${adding.value.trim()}" added to ${field.label}.`);
                    setAdding({ value: "", description: "", phase: "In development" });
                  })
                }
              >
                <Plus className="w-4 h-4" /> {busy === "add" ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rename: offer to carry the new name onto the engagements that use the old one. */}
      <Dialog open={!!rename} onOpenChange={(o) => !o && setRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename &ldquo;{rename?.row.value}&rdquo;?</DialogTitle>
            <DialogDescription>
              {rename?.count === 1
                ? `1 engagement uses "${rename.row.value}". You can change it to "${rename.draft.value.trim()}" too, or rename the choice only and leave that engagement as it is (it keeps showing "${rename.row.value}" until someone edits it).`
                : `${rename?.count} engagements use "${rename?.row.value}". You can change them to "${rename?.draft.value.trim()}" too, or rename the choice only and leave those engagements as they are (they keep showing "${rename?.row.value}" until someone edits them).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <Button variant="ghost" onClick={() => setRename(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const r = rename!;
                setRename(null);
                void save(r.row, { updateEngagements: false });
              }}
            >
              Rename choice only
            </Button>
            <Button
              onClick={() => {
                const r = rename!;
                setRename(null);
                void save(r.row, { updateEngagements: true });
              }}
            >
              Rename and update {rename?.count}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove &ldquo;{removing?.value}&rdquo; from {field.label}?</DialogTitle>
            <DialogDescription>
              It disappears from the dropdown, the filters and the Glossary.
              {removing && (usage[removing.value] || 0) > 0
                ? ` The ${usage[removing.value]} engagement${usage[removing.value] === 1 ? " that uses" : "s that use"} it keep${usage[removing.value] === 1 ? "s" : ""} the value; nothing on ${usage[removing.value] === 1 ? "that record" : "those records"} changes.`
                : " No engagements use it."}{" "}
              To take it out of the dropdown but keep it available, hide it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const r = removing!;
                setRemoving(null);
                void run(rowKey(r), async () => {
                  await deleteOption(tab, r, actor);
                  toast.success(`"${r.value}" removed from ${field.label}.`);
                });
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
