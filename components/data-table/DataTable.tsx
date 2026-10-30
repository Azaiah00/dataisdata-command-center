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
    <div className={cn("rounded-[1.125rem] border border-[var(--card-border)] bg-white/95 overflow-hidden shadow-[var(--shadow-soft)]", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-[#e6eaf1]">
            {columns.map((column, index) => (
              <TableHead key={index} className="h-11 px-4 whitespace-nowrap">
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
                  "border-b border-[#eef1f6] last:border-0",
                  onRowClick && "cursor-pointer hover:bg-[#f5f7fb] transition-colors"
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
