"use client";

import { MoveToTrashButton } from "@/components/trash/MoveToTrashButton";

type Props = {
  accountId: string;
  accountName: string;
  variant?: "icon" | "button";
  onDeleted?: () => void;
};

export function DeleteAccountButton(props: Props) {
  return (
    <MoveToTrashButton
      entityType="accounts"
      entityId={props.accountId}
      entityLabel={props.accountName}
      variant={props.variant}
      onDeleted={props.onDeleted}
      redirectAfter="/accounts"
    />
  );
}
