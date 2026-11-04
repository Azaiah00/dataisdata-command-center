"use client";

import { useAccess } from "@/components/auth/AccessProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canPurgeTrashItem,
  listTrash,
  purgeTrashItem,
  restoreTrashItem,
  trashItemDetailHref,
  trashItemModuleKey,
  TRASH_ENTITY_LABELS,
  type TrashItem,
} from "@/lib/trash";
import { formatDate } from "@/lib/utils";
import { RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function TrashPage() {
  const { can, isAdmin } = useAccess();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { items: next, error } = await listTrash();
    setItems(next);
    setSchemaError(error);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onRestore(item: TrashItem) {
    setBusy(item.id);
    const res = await restoreTrashItem(item.id);
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error || "Could not restore");
      return;
    }
    toast.success(`Restored ${item.display_label}`);
    reload();
  }

  async function onPurgeConfirm() {
    if (!purgeTarget) return;
    setBusy(purgeTarget.id);
    const res = await purgeTrashItem(purgeTarget.id);
    setBusy(null);
    setPurgeTarget(null);
    if (!res.ok) {
      toast.error(res.error || "Could not delete permanently");
      return;
    }
    toast.success("Permanently deleted");
    reload();
  }

  function canViewEntity(item: TrashItem) {
    const mod = trashItemModuleKey(item);
    return mod ? can(mod, "view") : false;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Recently Deleted</h1>
        <p className="page-subtitle">
          Admins can restore items here — they reappear in Accounts, Pipeline, Finance, and everywhere else that lists
          them. Delete forever removes the record permanently.
        </p>
      </div>

      {schemaError && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900 text-base">Database setup needed</CardTitle>
            <CardDescription className="text-amber-800">{schemaError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center h-40">
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">Nothing in Recently Deleted.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const href = trashItemDetailHref(item);
            const typeLabel = TRASH_ENTITY_LABELS[item.entity_type] || item.entity_type;
            return (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{item.display_label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {typeLabel} · deleted {formatDate(item.deleted_at)}
                    {href && canViewEntity(item) && (
                      <>
                        {" · "}
                        <Link href={href} className="text-primary hover:underline">
                          View record
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {isAdmin && (
                    <Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => onRestore(item)}>
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Restore
                    </Button>
                  )}
                  {canPurgeTrashItem(item, isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      disabled={busy === item.id}
                      onClick={() => setPurgeTarget(item)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete forever
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!purgeTarget} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {purgeTarget && (
                <>
                  This removes <strong>{purgeTarget.display_label}</strong> permanently. You cannot undo this.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!busy} onClick={onPurgeConfirm}>
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
