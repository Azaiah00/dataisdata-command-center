"use client";

import { MoveToTrashButton } from "@/components/trash/MoveToTrashButton";

type Props = {
  partnerId: string;
  partnerName: string;
  variant?: "icon" | "button";
  onDeleted?: () => void;
};

export function DeletePartnerButton(props: Props) {
  return (
    <MoveToTrashButton
      entityType="partners"
      entityId={props.partnerId}
      entityLabel={props.partnerName}
      variant={props.variant}
      onDeleted={props.onDeleted}
      redirectAfter="/partners"
    />
  );
}
