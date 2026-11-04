"use client";

import { MoveToTrashButton } from "@/components/trash/MoveToTrashButton";

type Props = {
  contactId: string;
  contactName: string;
  variant?: "icon" | "button";
  onDeleted?: () => void;
};

export function DeleteContactButton(props: Props) {
  return (
    <MoveToTrashButton
      entityType="contacts"
      entityId={props.contactId}
      entityLabel={props.contactName}
      variant={props.variant}
      onDeleted={props.onDeleted}
      redirectAfter="/contacts"
    />
  );
}
