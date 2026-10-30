"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiPicker, type PickerOption } from "@/components/ui/multi-picker";
import { syncLinks } from "@/lib/links";
import { supabase } from "@/lib/supabase";

export interface LinkedItem {
  id: string;
  label: string;
  sub?: string | null;
  right?: React.ReactNode;
}

/**
 * One card for any many-to-many link (engagement ↔ contractors / contacts / partners,
 * opportunity ↔ partners). Reads and writes the same link table, so whatever is
 * added here shows on the other record too.
 */
export function LinkedRecordsCard({
  title,
  description,
  icon: Icon,
  table,
  ownerColumn,
  ownerId,
  otherColumn,
  hrefBase,
  items,
  loadOptions,
  canEdit,
  emptyText,
  onChanged,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  table: string;
  ownerColumn: string;
  ownerId: string;
  otherColumn: string;
  hrefBase: string;
  items: LinkedItem[];
  loadOptions: () => Promise<PickerOption[]>;
  canEdit: boolean;
  emptyText: string;
  onChanged: () => void | Promise<void>;
}) {
  const [managing, setManaging] = useState(false);
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [selected, setSelected] = useState<string[]>(items.map((i) => i.id));
  const [saving, setSaving] = useState(false);
  async function startManage() {
    setSelected(items.map((i) => i.id));
    setManaging(true);
    const opts = await loadOptions();
    // Keep anything already linked selectable even if the option list filters it out.
    const have = new Set(opts.map((o) => o.id));
    setOptions([...opts, ...items.filter((i) => !have.has(i.id)).map((i) => ({ id: i.id, label: i.label, hint: i.sub || undefined }))]);
  }

  async function save() {
    setSaving(true);
    const res = await syncLinks({ table, ownerColumn, ownerId, otherColumn, desiredIds: selected });
    setSaving(false);
    if (res.error) {
      toast.error(`${title} not updated: ${res.error}`);
      return;
    }
    toast.success(`${title} updated`);
    setManaging(false);
    await onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" /> {title} ({managing ? selected.length : items.length})
          </CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {canEdit &&
          (managing ? (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelected(items.map((i) => i.id));
                  setManaging(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startManage} className="shrink-0">
              <Settings2 className="w-4 h-4" /> Manage
            </Button>
          ))}
      </CardHeader>
      <CardContent>
        {managing ? (
          <MultiPicker options={options} value={selected} onChange={setSelected} placeholder={`Add to ${title.toLowerCase()}…`} emptyText="Everything is already linked" />
        ) : items.length ? (
          <div className="space-y-2">
            {items.map((i) => (
              <Link key={i.id} href={`${hrefBase}/${i.id}`} className="list-row">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="avatar-chip">{i.label.charAt(0)}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{i.label}</span>
                    {i.sub && <span className="block text-xs text-muted-foreground truncate">{i.sub}</span>}
                  </span>
                </span>
                {i.right}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* Option loaders shared by pages */
export async function contractorOptions(): Promise<PickerOption[]> {
  const { data } = await supabase.from("contractors").select("id, full_name, title_role, status").order("full_name");
  return (data || []).map((c) => ({ id: c.id, label: c.full_name, hint: [c.title_role, c.status === "Inactive" ? "inactive" : null].filter(Boolean).join(" · ") || undefined }));
}
export async function partnerOptions(): Promise<PickerOption[]> {
  const { data } = await supabase.from("partners").select("id, name, partner_type").order("name");
  return (data || []).map((p) => ({ id: p.id, label: p.name, hint: p.partner_type || undefined }));
}
export async function contactOptions(accountIds: string[]): Promise<PickerOption[]> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [all, acc] = await Promise.all([
    supabase.from("contacts").select("id, full_name, title_role, account_id, accounts!contacts_account_id_fkey(name)").order("full_name"),
    accountIds.length ? supabase.from("account_contacts").select("contact_id").in("account_id", accountIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const atAccount = new Set([...(acc.data || []).map((r: any) => r.contact_id)]);
  const rows = ((all.data || []) as any[]).map((c) => {
    const a = Array.isArray(c.accounts) ? c.accounts[0] : c.accounts;
    return { id: c.id as string, label: c.full_name as string, hint: [c.title_role, a?.name].filter(Boolean).join(" · ") || undefined, first: atAccount.has(c.id) || accountIds.includes(c.account_id) };
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  // People at this engagement's account come first.
  return [...rows.filter((r) => r.first), ...rows.filter((r) => !r.first)].map(({ id, label, hint }) => ({ id, label, hint }));
}
