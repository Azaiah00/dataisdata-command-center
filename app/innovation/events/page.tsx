"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  theme: string | null;
  status: string | null;
  revenue_generated: number | null;
  vendor_count?: number;
};

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    async function loadData() {
      const [{ data: eventRows }, { data: eventVendors }] = await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("event_vendors").select("event_id"),
      ]);

      const counts = (eventVendors || []).reduce<Record<string, number>>((acc, row) => {
        acc[row.event_id] = (acc[row.event_id] || 0) + 1;
        return acc;
      }, {});

      setEvents(((eventRows as EventRow[]) || []).map((row) => ({ ...row, vendor_count: counts[row.id] || 0 })));
      setLoading(false);
    }
    loadData();
  }, []);

  const columns = [
    { header: "Event", accessorKey: "name" },
    { header: "Date", accessorKey: "event_date", cell: (item: EventRow) => formatDate(item.event_date) },
    { header: "Theme", accessorKey: "theme" },
    { header: "Status", accessorKey: "status", cell: (item: EventRow) => <Badge variant="outline">{item.status || "Planned"}</Badge> },
    { header: "Vendors", accessorKey: "vendor_count" },
    { header: "Revenue", accessorKey: "revenue_generated", cell: (item: EventRow) => formatCurrency(item.revenue_generated) },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: EventRow) => (
        <Link href={`/innovation/events/${item.id}`}>
          <Button size="sm" className="bg-primary hover:bg-primary/90">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Vendor Showcase Events</h1>
          <p className="text-[#6B7280]">Track event strategy, sponsors, and outcomes.</p>
        </div>
        <Link href="/innovation/events/new">
          <Button className="bg-primary hover:bg-primary/90">New Event</Button>
        </Link>
      </div>
      {loading ? <p className="text-sm text-[#6B7280]">Loading...</p> : <DataTable columns={columns} data={events} />}
    </div>
  );
}
