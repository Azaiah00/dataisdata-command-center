import { cn } from "@/lib/utils";

/**
 * DataIsData brand mark — the official silver "D" monogram set on the portal's
 * deep-green tile, so it sits naturally next to the green UI.
 */
export function BrandMark({
  size = 32,
  className,
  rounded = "rounded-lg",
}: {
  size?: number;
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted shadow-sm ring-1 ring-black/5",
        rounded,
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/dataisdata-mark-silver.png"
        alt=""
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        className="select-none"
        draggable={false}
      />
    </span>
  );
}

/** Mark + wordmark lockup used in the header and sign-in screens. */
export function BrandLockup({
  size = 32,
  subtitle,
  className,
  textClassName,
}: {
  size?: number;
  subtitle?: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-xl font-bold tracking-tight text-foreground font-mono", textClassName)}>DataIsData</span>
        {subtitle && <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</span>}
      </span>
    </span>
  );
}
