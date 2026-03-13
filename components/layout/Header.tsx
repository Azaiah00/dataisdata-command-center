"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { supabase } from "@/lib/supabase";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "Account" | "Contact" | "Opportunity" | "Engagement" | "Partner";
};

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
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);

      const [accountsRes, contactsRes, opportunitiesRes, engagementsRes, partnersRes] =
        await Promise.all([
          supabase
            .from("accounts")
            .select("id, name")
            .ilike("name", `%${query}%`)
            .limit(4),
          supabase
            .from("contacts")
            .select("id, full_name, title_role")
            .ilike("full_name", `%${query}%`)
            .limit(4),
          supabase
            .from("opportunities")
            .select("id, name, stage")
            .ilike("name", `%${query}%`)
            .limit(4),
          supabase
            .from("engagements")
            .select("id, name, status")
            .ilike("name", `%${query}%`)
            .limit(4),
          supabase
            .from("partners")
            .select("id, name, partner_type")
            .ilike("name", `%${query}%`)
            .limit(4),
        ]);

      const nextResults: SearchItem[] = [];

      (accountsRes.data || []).forEach((item: any) => {
        nextResults.push({
          id: item.id,
          title: item.name,
          subtitle: "Account",
          href: `/accounts/${item.id}`,
          type: "Account",
        });
      });

      (contactsRes.data || []).forEach((item: any) => {
        nextResults.push({
          id: item.id,
          title: item.full_name,
          subtitle: item.title_role || "Contact",
          href: `/contacts/${item.id}`,
          type: "Contact",
        });
      });

      (opportunitiesRes.data || []).forEach((item: any) => {
        nextResults.push({
          id: item.id,
          title: item.name,
          subtitle: item.stage || "Opportunity",
          href: `/pipeline/${item.id}`,
          type: "Opportunity",
        });
      });

      (engagementsRes.data || []).forEach((item: any) => {
        nextResults.push({
          id: item.id,
          title: item.name,
          subtitle: item.status || "Engagement",
          href: `/engagements/${item.id}`,
          type: "Engagement",
        });
      });

      (partnersRes.data || []).forEach((item: any) => {
        nextResults.push({
          id: item.id,
          title: item.name,
          subtitle: item.partner_type || "Partner",
          href: `/partners/${item.id}`,
          type: "Partner",
        });
      });

      setSearchResults(nextResults.slice(0, 12));
      setSearchOpen(true);
      setSearchLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
            <span className="text-xl font-bold text-foreground tracking-tight hidden sm:block font-mono">
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
          <div ref={searchContainerRef} className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0 || searchQuery.trim().length >= 2) {
                  setSearchOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  router.push(searchResults[0].href);
                  setSearchOpen(false);
                }
              }}
              className="pl-9 pr-4 py-1.5 bg-muted/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all w-40 lg:w-64"
            />
            {searchOpen && (
              <div className="absolute top-11 left-0 w-full rounded-xl border border-border bg-white shadow-lg z-50 overflow-hidden">
                {searchLoading ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          router.push(result.href);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <p className="text-sm font-semibold text-foreground truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.type} • {result.subtitle}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
              </div>
            )}
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
                  <span className="font-mono">DataIsData</span>
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
