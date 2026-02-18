"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search accounts, contacts, projects..."
            className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-900">Tony Wood</span>
          <span className="text-xs text-slate-500">Admin</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
          A
        </div>
      </div>
    </header>
  );
}
