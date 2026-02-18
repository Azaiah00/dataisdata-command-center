"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  GitBranch,
  CalendarDays,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Accounts", href: "/accounts", icon: Building2 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Engagements", href: "/engagements", icon: Briefcase },
  { name: "Pipeline", href: "/pipeline", icon: GitBranch },
  { name: "Activities", href: "/activities", icon: CalendarDays },
  { name: "Partners", href: "/partners", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-slate-950 text-slate-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && <span className="text-xl font-bold tracking-tight">DataIsData</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg transition-colors group",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                  {!collapsed && <span className="font-medium whitespace-nowrap">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        {!collapsed && (
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Command Center v1.0
          </div>
        )}
      </div>
    </div>
  );
}
