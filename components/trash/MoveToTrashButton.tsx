"use client";

import { useAccess } from "@/components/auth/AccessProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { moveToTrash, type TrashEntityType } from "@/lib/trash";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  entityType: TrashEntityType;
  entityId: string;
  entityLabel: string;
  variant?: "icon" | "button" | "subtle";
  /** After trash from a list row */
  onDeleted?: () => void;
  /** Where to go after delete from a detail page (defaults to list for type) */
  redirectAfter?: string;
};

/**
 * Owner/Admin only — moves a record to Recently Deleted (soft delete).
 * Restore from Insights → Recently Deleted puts it back in every list that filters deleted_at.
 */
export function MoveToTrashButton({
  entityType,
  entityId,
  entityLabel,
  variant = "button",
  onDeleted,
  redirectAfter,
}: Props) {
  const router = useRouter();
  const { user, isAdmin } = useAccess();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return null;

  async function confirmDelete() {
    setBusy(true);
    const res = await moveToTrash(entityType, entityId, user?.id ?? null);
    setBusy(false);
    setOpen(false);
    if (!res.ok) {
      toast.error(res.error || "Could not move to Recently Deleted");
      return;
    }
    toast.success("Moved to Recently Deleted — you can restore it anytime");
    onDeleted?.();
    if (variant === "icon") {
      router.refresh();
    } else {
      router.push(redirectAfter || "/trash");
    }
  }

  const trigger =
    variant === "icon" ? (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-[#4f6178] hover:text-red-600 hover:bg-red-50"
        aria-label={`Delete ${entityLabel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    ) : variant === "subtle" ? (
      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600 shrink-0">
        Move to Recently Deleted…
      </Button>
    ) : (
      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Move to Recently Deleted?</DialogTitle>
          <DialogDescription>
            <strong>{entityLabel}</strong> will disappear from normal lists but stay in{" "}
            <span className="font-medium">Insights → Recently Deleted</span>. Restore brings it back everywhere; Delete
            forever removes it permanently.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
            {busy ? "Moving…" : "Move to Recently Deleted"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
