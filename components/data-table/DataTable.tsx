"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
            {columns.map((column, index) => (
              <TableHead key={index} className="h-12 px-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(
                  "border-b border-slate-100 last:border-0",
                  onRowClick && "cursor-pointer hover:bg-blue-50/30 transition-colors"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className="px-4 py-3">
                    {column.cell
                      ? column.cell(item)
                      : (item[column.accessorKey as keyof T] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-[#6B7280] text-sm"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
