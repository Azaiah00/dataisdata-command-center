import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: KPICardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-md rounded-3xl group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {change && (
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "p-1 rounded-full",
                  changeType === "positive" && "bg-green-100",
                  changeType === "negative" && "bg-red-100",
                  changeType === "neutral" && "bg-slate-100"
                )}>
                  {changeType === "positive" ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : changeType === "negative" ? (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-xs font-bold",
                    changeType === "positive" && "text-green-600",
                    changeType === "negative" && "text-red-600",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change}
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs font-medium text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
