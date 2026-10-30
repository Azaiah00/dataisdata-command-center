import * as React from "react";
import { cn } from "@/lib/utils";

/** Page title row used across the portal. */
export function PageHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Small glass KPI tile: label, big number, hint, optional sparkline. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  trend,
  spark,
  onClick,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  trend?: { value: string; up: boolean } | null;
  spark?: number[];
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className={cn("stat-tile text-left", onClick && "is-clickable", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="stat-label">{label}</p>
        {trend && <span className={cn("trend-chip", trend.up ? "is-up" : "is-down")}>{trend.up ? "▲" : "▼"} {trend.value}</span>}
      </div>
      <p className={cn("stat-value", tone === "warn" && "text-amber-700", tone === "bad" && "text-destructive", tone === "good" && "text-foreground")}>{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-3" />}
    </Comp>
  );
}

/** Smooth area sparkline, like the reference KPI cards. */
export function Sparkline({ values, className, height = 40 }: { values: number[]; className?: string; height?: number }) {
  const id = React.useId().replace(/:/g, "");
  const w = 160;
  const h = height;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)] as const);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height: h }} aria-hidden="true">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${id})`} />
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
