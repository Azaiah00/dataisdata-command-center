import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Keep only what a number can contain. People naturally type "$45,000",
 * "45 000" or "12.5%"; a browser number box silently turns those into an
 * empty value, which then saved as blank. We accept them and keep the digits.
 */
export function cleanNumericInput(raw: string): string {
  let s = String(raw ?? "").replace(/[^0-9.\-]/g, "")
  // a single leading minus
  const negative = s.startsWith("-")
  s = s.replace(/-/g, "")
  // a single decimal point
  const firstDot = s.indexOf(".")
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "")
  return (negative ? "-" : "") + s
}

function Input({ className, type, onChange, inputMode, step: _step, min, max, ...props }: React.ComponentProps<"input">) {
  const isNumber = type === "number"

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumber) {
        const cleaned = cleanNumericInput(e.target.value)
        if (cleaned !== e.target.value) e.target.value = cleaned
      }
      onChange?.(e)
    },
    [isNumber, onChange]
  )

  return (
    <input
      // Number fields render as text so "$45,000" is accepted instead of silently becoming blank.
      type={isNumber ? "text" : type}
      inputMode={isNumber ? inputMode || "decimal" : inputMode}
      autoComplete={isNumber ? "off" : props.autoComplete}
      data-slot="input"
      data-numeric={isNumber ? "" : undefined}
      aria-valuemin={isNumber && min !== undefined ? Number(min) : undefined}
      aria-valuemax={isNumber && max !== undefined ? Number(max) : undefined}
      min={isNumber ? undefined : min}
      max={isNumber ? undefined : max}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-10 w-full min-w-0 rounded-xl border bg-[var(--field)] px-3.5 py-1 text-base shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-[color,box-shadow,border-color,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-[var(--field-border-hover)] focus-visible:border-ring focus-visible:bg-card focus-visible:ring-ring/25 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        isNumber && "tabular-nums",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
