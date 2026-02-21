"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Building2,
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Handshake,
  LayoutDashboard,
  Menu,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Rocket,
  Gauge,
  ClipboardList,
  FileCheck,
  CalendarDays,
  HardHat,
} from "lucide-react";

const crmItems = [
  { path: "/accounts", label: "Accounts", icon: Building2 },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/partners", label: "Partners", icon: Handshake },
  { path: "/contractors", label: "Contractors", icon: HardHat },
];

const workItems = [
  { path: "/engagements", label: "Engagements", icon: Briefcase },
  { path: "/activities", label: "Activities", icon: Calendar },
  { path: "/pipeline", label: "Pipeline", icon: TrendingUp },
];

const financeItems = [
  { path: "/finance", label: "Finance Dashboard", icon: DollarSign },
  { path: "/finance/invoices", label: "Invoices", icon: Receipt },
  { path: "/finance/expenses", label: "Expenses", icon: CreditCard },
  { path: "/finance/payments", label: "Payments", icon: Banknote },
  { path: "/finance/pnl", label: "Profit & Loss", icon: TrendingUp },
];

const innovationItems = [
  { path: "/innovation", label: "Executive Portfolio", icon: Rocket },
  { path: "/innovation/maturity", label: "Maturity Index", icon: Gauge },
  { path: "/innovation/vendor-inquiry", label: "Vendor Inquiries", icon: ClipboardList },
  { path: "/innovation/vendor-application", label: "Vendor Applications", icon: FileCheck },
  { path: "/innovation/events", label: "Events", icon: CalendarDays },
  { path: "/innovation/client-intake", label: "Client Intake", icon: Building2 },
];

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavLink = ({ href, label, icon: Icon, active }: any) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </Link>
  );

  const NavDropdown = ({ label, items, activePrefix }: any) => {
    const isActive = pathname?.startsWith(activePrefix);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-1 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{label}</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {items.map((item: any) => (
            <DropdownMenuItem key={item.path} asChild>
              <Link href={item.path} className="flex items-center gap-2 w-full">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* Left: Logo & Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight hidden sm:block">
              DataIsData
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />
            <NavDropdown label="CRM" items={crmItems} activePrefix="/accounts" />
            <NavDropdown label="Work" items={workItems} activePrefix="/pipeline" />
            <NavDropdown label="Finance" items={financeItems} activePrefix="/finance" />
            <NavDropdown label="Innovation" items={innovationItems} activePrefix="/innovation" />
          </nav>
        </div>

        {/* Right: Actions & Mobile Menu */}
        <div className="flex items-center gap-2">
          {/* Search (Desktop) */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 bg-muted/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all w-40 lg:w-64"
            />
          </div>

          <Button variant="ghost" size="icon" className="text-muted-foreground md:hidden">
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="w-5 h-5" />
                <Badge className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center bg-brand-green-bright text-white text-[10px] border-none">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto p-2">
                <div className="p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Activity due tomorrow</p>
                  <p className="text-xs text-muted-foreground">Follow-up with City of Richmond</p>
                </div>
                <div className="p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Opportunity moved to Proposal</p>
                  <p className="text-xs text-muted-foreground">Broadband Expansion - State Agency</p>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-muted">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-foreground leading-none">
                    Tony Wood
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Admin
                  </span>
                </div>
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-primary text-white text-xs">
                    TW
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-6 border-b text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-lg">D</span>
                  </div>
                  <span>DataIsData</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col py-4 overflow-y-auto h-[calc(100vh-5rem)]">
                <div className="px-4 py-2">
                  <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />
                </div>
                
                <div className="px-4 py-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">CRM</p>
                    {crmItems.map(item => <NavLink key={item.path} href={item.path} label={item.label} icon={item.icon} active={pathname?.startsWith(item.path)} />)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">Work</p>
                    {workItems.map(item => <NavLink key={item.path} href={item.path} label={item.label} icon={item.icon} active={pathname?.startsWith(item.path)} />)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">Finance</p>
                    {financeItems.map(item => <NavLink key={item.path} href={item.path} label={item.label} icon={item.icon} active={pathname?.startsWith(item.path)} />)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">Innovation</p>
                    {innovationItems.map(item => <NavLink key={item.path} href={item.path} label={item.label} icon={item.icon} active={pathname?.startsWith(item.path)} />)}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
