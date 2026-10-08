"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Branded "Download PDF" button. `onExport` builds and saves the PDF. */
export function PdfButton({
  onExport,
  label = "Download PDF",
  variant = "outline",
  size = "sm",
  className,
  disabled,
}: {
  onExport: () => Promise<void>;
  label?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "icon";
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("print:hidden", className)}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (e) {
          console.error(e);
          toast.error("Could not create the PDF. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {size !== "icon" && <span>{busy ? "Preparing…" : label}</span>}
    </Button>
  );
}
