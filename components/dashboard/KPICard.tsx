import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
  spark?: number[];
  href?: string;
}

/** KPI tile in the frosted reference style: label + trend chip, big number, soft area sparkline. */
export function KPICard({ title, value, change, changeType = "neutral", icon: Icon, description, spark, href }: KPICardProps) {
  const body = (
    <Card className={cn("h-full gap-0 py-0", href && "cursor-pointer")}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
          <p className="stat-label flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-[#7d8fb3] shrink-0" />
            <span>{title}</span>
          </p>
          {change && (
            <span className={cn("trend-chip shrink-0", changeType === "positive" ? "is-up" : changeType === "negative" ? "is-down" : "bg-[#eceff4] text-[#59647a]")}>
              {changeType === "positive" ? "▲ " : changeType === "negative" ? "▼ " : ""}
              {change}
            </span>
          )}
        </div>
        <p className="stat-value text-[1.75rem] mt-2">{value}</p>
        {description && <p className="stat-hint">{description}</p>}
        <div className="mt-auto pt-3">{spark && spark.length > 1 ? <Sparkline values={spark} height={44} /> : <div className="h-[44px]" />}</div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
