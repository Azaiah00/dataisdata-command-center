"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Handshake,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const mainNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/accounts", label: "Accounts", icon: Building2, count: 8 },
  { path: "/contacts", label: "Contacts", icon: Users, count: 10 },
  { path: "/engagements", label: "Engagements", icon: Briefcase, count: 5 },
  { path: "/activities", label: "Activities", icon: Calendar, count: 7 },
  { path: "/pipeline", label: "Pipeline", icon: TrendingUp, count: 8 },
  { path: "/partners", label: "Partners", icon: Handshake, count: 6 },
];

const quickActions = [
  { label: "New Activity", icon: Plus, href: "/activities/new" },
  { label: "Reports", icon: BarChart3, href: "#" },
  { label: "Documents", icon: FileText, href: "#" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-40 bg-slate-950 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button - styled for dark theme */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-4 h-6 w-6 rounded-full bg-slate-950 border border-slate-800 shadow-sm hover:bg-slate-900 text-slate-400 hover:text-slate-100 z-50"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      <div className="flex flex-col h-full py-4">
        {/* Main Navigation */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== "/" && pathname?.startsWith(item.path));
            
            const navItem = (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.count && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-800 text-slate-400 border-none">
                        {item.count}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {navItem}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2 bg-slate-900 text-slate-100 border-slate-800">
                    {item.label}
                    {item.count && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-800 text-slate-400 border-none">
                        {item.count}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{navItem}</div>;
          })}
        </nav>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
              Quick Actions
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="px-2 py-2 border-t border-slate-800">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full text-slate-400 hover:text-slate-100 hover:bg-slate-900">
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-slate-100 border-slate-800">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
