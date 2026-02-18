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
    <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#6B7280]">{title}</p>
            <p className="text-2xl font-bold text-[#111827]">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === "positive" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : changeType === "negative" ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    "text-xs font-medium",
                    changeType === "positive" && "text-green-600",
                    changeType === "negative" && "text-red-600",
                    changeType === "neutral" && "text-[#6B7280]"
                  )}
                >
                  {change}
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-[#6B7280]">{description}</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-[#E8F1FB]">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
