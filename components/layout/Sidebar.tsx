"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Handshake,
  HardHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  BarChart3,
  Settings,
  Rocket,
  Gauge,
  ClipboardList,
  FileCheck,
  CalendarDays,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
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

const mainNavItems: { path: string; label: string; icon: typeof Building2; countKey?: string }[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/accounts", label: "Accounts", icon: Building2, countKey: "accounts" },
  { path: "/contacts", label: "Contacts", icon: Users, countKey: "contacts" },
  { path: "/engagements", label: "Engagements", icon: Briefcase, countKey: "engagements" },
  { path: "/activities", label: "Activities", icon: Calendar, countKey: "activities" },
  { path: "/pipeline", label: "Pipeline", icon: TrendingUp, countKey: "opportunities" },
  { path: "/partners", label: "Partners", icon: Handshake, countKey: "partners" },
  { path: "/contractors", label: "Contractors", icon: HardHat, countKey: "contractors" },
];

const quickActions = [
  { label: "New Activity", icon: Plus, href: "/activities/new" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Documents", icon: FileText, href: "/documents" },
];

const financeNavItems: { path: string; label: string; icon: typeof Building2; countKey?: string }[] = [
  { path: "/finance", label: "Finance Dashboard", icon: DollarSign },
  { path: "/finance/invoices", label: "Invoices", icon: Receipt, countKey: "invoices" },
  { path: "/finance/expenses", label: "Expenses", icon: CreditCard, countKey: "expenses" },
  { path: "/finance/payments", label: "Payments", icon: Banknote, countKey: "payments" },
  { path: "/finance/pnl", label: "Profit & Loss", icon: TrendingUp },
];

const innovationNavItems: { path: string; label: string; icon: typeof Building2 }[] = [
  { path: "/innovation", label: "Executive Portfolio", icon: Rocket },
  { path: "/innovation/maturity", label: "Maturity Index", icon: Gauge },
  { path: "/innovation/vendor-inquiry", label: "Vendor Inquiries", icon: ClipboardList },
  { path: "/innovation/vendor-application", label: "Vendor Applications", icon: FileCheck },
  { path: "/innovation/events", label: "Events", icon: CalendarDays },
  { path: "/innovation/client-intake", label: "Client Intake", icon: Building2 },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchCounts() {
      const keys = ["accounts", "contacts", "engagements", "activities", "opportunities", "partners", "contractors", "invoices", "expenses", "payments"];
      const tableNames = ["accounts", "contacts", "engagements", "activities", "opportunities", "partners", "contractors", "invoices", "expenses", "payments"];
      const result: Record<string, number> = {};
      await Promise.all(
        tableNames.map(async (table, i) => {
          const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
          result[keys[i]] = error ? 0 : count ?? 0;
        })
      );
      setCounts(result);
    }
    fetchCounts();
  }, []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-gray-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-4 h-6 w-6 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-900 z-50"
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
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.countKey != null && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 border-none">
                        {counts[item.countKey] ?? "—"}
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
                  <TooltipContent side="right" className="flex items-center gap-2 bg-gray-900 text-white border-gray-800">
                    {item.label}
                    {item.countKey != null && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 border-none">
                        {counts[item.countKey] ?? "—"}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{navItem}</div>;
          })}

          {/* Finance section */}
          {!collapsed && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2 px-3">
              Finance
            </p>
          )}

          {financeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== "/finance" && pathname?.startsWith(item.path));

            const navItem = (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.countKey != null && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 border-none">
                        {counts[item.countKey] ?? "—"}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2 bg-gray-900 text-white border-gray-800">
                    {item.label}
                    {item.countKey != null && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 border-none">
                        {counts[item.countKey] ?? "—"}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{navItem}</div>;
          })}

          {!collapsed && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2 px-3">
              Innovation Hub
            </p>
          )}

          {innovationNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);

            const navItem = (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{navItem}</div>;
          })}
        </nav>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
              Quick Actions
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
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
        <div className="px-2 py-2 border-t border-gray-200">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
