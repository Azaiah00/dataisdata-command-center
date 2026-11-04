"use client";

import { MoveToTrashButton } from "@/components/trash/MoveToTrashButton";
import type { TrashEntityType } from "@/lib/trash";

/**
 * Delete only appears on edit screens — tucked at the bottom, not in the main header.
 */
export function EditDangerZone({
  entityType,
  entityId,
  entityLabel,
  redirectAfter,
}: {
  entityType: TrashEntityType;
  entityId: string;
  entityLabel: string;
  redirectAfter: string;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Remove this record</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Moves <span className="font-medium text-foreground">{entityLabel}</span> to Recently Deleted. Restore anytime
            from Insights → Recently Deleted.
          </p>
        </div>
        <MoveToTrashButton
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
          variant="subtle"
          redirectAfter={redirectAfter}
        />
      </div>
    </div>
  );
}
