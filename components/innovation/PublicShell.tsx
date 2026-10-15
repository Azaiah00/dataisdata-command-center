"use client";

import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";

/** Frame for the public pages (no PIN, no login): interest form, application, assessment. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="https://dataisdata.com" className="flex min-h-11 items-center gap-2.5" aria-label="DataIsData website">
            <BrandMark size={34} />
            <span className="flex flex-col leading-none">
              <span className="font-mono text-lg font-bold tracking-tight text-foreground">DataIsData</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Innovation Partners</span>
            </span>
          </a>
          <span className="hidden text-xs text-muted-foreground sm:block">The people, tech, &amp; intelligence matchmakers.</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>DataIsData LLC · Chesterfield, Virginia</span>
          <span>info@dataisdata.com · 1.888.292.DATA</span>
        </div>
      </footer>
    </div>
  );
}

export function PublicHero({ eyebrow, title, children, className }: { eyebrow: string; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green-dark via-primary to-brand-green-muted p-6 text-white shadow-lg sm:p-9",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/dataisdata-mark-silver.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 hidden w-56 opacity-10 sm:block" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-[#9FD8AE]">{eyebrow}</p>
      <h1 className="relative mt-2 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="relative mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{children}</div>}
    </section>
  );
}

export function OptionChips({
  name,
  options,
  value,
  onChange,
  type = "checkbox",
}: {
  name: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  type?: "checkbox" | "radio";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <label
            key={o}
            className={cn(
              "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary/30",
              on ? "border-primary bg-secondary text-primary" : "border-border bg-white text-foreground hover:bg-muted"
            )}
          >
            <input
              type={type}
              name={name}
              value={o}
              checked={on}
              onChange={() => onChange(type === "radio" ? [o] : on ? value.filter((x) => x !== o) : [...value, o])}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            {o}
          </label>
        );
      })}
    </div>
  );
}
