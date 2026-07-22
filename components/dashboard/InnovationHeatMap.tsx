"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils";

interface HeatMapItem {
  theme: string;
  count: number;
  spend: number;
}

interface InnovationHeatMapProps {
  data: HeatMapItem[];
}

export function InnovationHeatMap({ data }: InnovationHeatMapProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#0a0a0a]">Innovation Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.map((item) => (
            <div key={item.theme} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">{item.theme}</p>
              <p className="mt-2 text-2xl font-bold text-[#0a0a0a]">{item.count}</p>
              <p className="mt-1 text-sm text-[#737373]">{formatCompactCurrency(item.spend)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
