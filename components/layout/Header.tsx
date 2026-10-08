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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search,
  Settings,
  LogOut,
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
  Calculator,
  BarChart3,
  FolderOpen,
  ShieldCheck,
  Eye,
  Repeat,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/components/auth/AccessProvider";
import { BrandMark } from "@/components/brand/BrandMark";
import { initials, RoleBadge } from "@/components/auth/LoginScreen";
import { NotificationsMenu } from "./NotificationsMenu";
import type { ModuleKey } from "@/lib/access/modules";
import { ROLE_LABELS } from "@/lib/access/types";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "Account" | "Contact" | "Opportunity" | "Engagement" | "Partner" | "Contractor" | "Invoice";
};

type NavItem = { path: string; label: string; icon: React.ElementType; module: ModuleKey };

const crmItems: NavItem[] = [
  { path: "/accounts", label: "Accounts", icon: Building2, module: "accounts" },
  { path: "/contacts", label: "Contacts", icon: Users, module: "contacts" },
  { path: "/partners", label: "Partners", icon: Handshake, module: "partners" },
  { path: "/contractors", label: "Contractors", icon: HardHat, module: "contractors" },
];

const workItems: NavItem[] = [
  { path: "/engagements", label: "Engagements", icon: Briefcase, module: "engagements" },
  { path: "/activities", label: "Activities", icon: Calendar, module: "activities" },
  { path: "/pipeline", label: "Pipeline", icon: TrendingUp, module: "pipeline" },
];

const financeItems: NavItem[] = [
  { path: "/finance", label: "Finance Dashboard", icon: DollarSign, module: "finance_dashboard" },
  { path: "/finance/tracker", label: "Finance Tracker", icon: Calculator, module: "finance_tracker" },
  { path: "/finance/invoices", label: "Invoices", icon: Receipt, module: "invoices" },
  { path: "/finance/expenses", label: "Expenses", icon: CreditCard, module: "expenses" },
  { path: "/finance/payments", label: "Payments", icon: Banknote, module: "payments" },
  { path: "/finance/pnl", label: "Profit & Loss", icon: TrendingUp, module: "pnl" },
];

const innovationItems: NavItem[] = [
  { path: "/innovation", label: "Executive Portfolio", icon: Rocket, module: "innovation_portfolio" },
  { path: "/innovation/maturity", label: "Maturity Index", icon: Gauge, module: "innovation_maturity" },
  { path: "/innovation/vendor-inquiry", label: "Vendor Inquiries", icon: ClipboardList, module: "vendor_inquiries" },
  { path: "/innovation/vendor-application", label: "Vendor Applications", icon: FileCheck, module: "vendor_applications" },
  { path: "/innovation/events", label: "Events", icon: CalendarDays, module: "events" },
  { path: "/innovation/client-intake", label: "Client Intake", icon: Building2, module: "client_intake" },
];

const insightItems: NavItem[] = [
  { path: "/reports", label: "Reports", icon: BarChart3, module: "reports" },
  { path: "/documents", label: "Documents", icon: FolderOpen, module: "documents" },
];

const SECTIONS: { label: string; items: NavItem[]; prefixes: string[] }[] = [
  { label: "CRM", items: crmItems, prefixes: ["/accounts", "/contacts", "/partners", "/contractors"] },
  { label: "Work", items: workItems, prefixes: ["/engagements", "/activities", "/pipeline"] },
  { label: "Finance", items: financeItems, prefixes: ["/finance"] },
  { label: "Innovation", items: innovationItems, prefixes: ["/innovation"] },
  { label: "Insights", items: insightItems, prefixes: ["/reports", "/documents"] },
];

function isActivePath(pathname: string | null, path: string) {
  if (!pathname) return false;
  if (path === "/finance" || path === "/innovation") return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

function NavLink({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon?: React.ElementType; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, realUser, canSee, can, isAdmin, isRealAdmin, isPreviewing, users, startPreview, stopPreview, signOut, authMode } =
    useAccess();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => canSee(i.module)) })).filter((s) => s.items.length);
  const showDashboard = canSee("dashboard");

  const searchable = {
    accounts: can("accounts"),
    contacts: can("contacts"),
    pipeline: can("pipeline"),
    engagements: can("engagements"),
    partners: can("partners"),
    contractors: can("contractors"),
    invoices: can("invoices"),
  };
  const canSearch = Object.values(searchable).some(Boolean);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
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
    const term = query.replace(/[%,()]/g, " ");

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const empty = Promise.resolve({ data: [] as never[] });
      const [accountsRes, contactsRes, opportunitiesRes, engagementsRes, partnersRes, contractorsRes, invoicesRes] = await Promise.all([
        searchable.accounts ? supabase.from("accounts").select("id, name, account_type").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.contacts ? supabase.from("contacts").select("id, full_name, title_role").ilike("full_name", `%${term}%`).limit(4) : empty,
        searchable.pipeline ? supabase.from("opportunities").select("id, name, stage").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.engagements ? supabase.from("engagements").select("id, name, status").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.partners ? supabase.from("partners").select("id, name, partner_type").ilike("name", `%${term}%`).limit(4) : empty,
        searchable.contractors ? supabase.from("contractors").select("id, full_name, title_role").ilike("full_name", `%${term}%`).limit(4) : empty,
        searchable.invoices ? supabase.from("invoices").select("id, invoice_number, status").ilike("invoice_number", `%${term}%`).limit(4) : empty,
      ]);

      const next: SearchItem[] = [];
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (accountsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.account_type || "Account", href: `/accounts/${i.id}`, type: "Account" }));
      (contactsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.full_name, subtitle: i.title_role || "Contact", href: `/contacts/${i.id}`, type: "Contact" }));
      (opportunitiesRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.stage || "Opportunity", href: `/pipeline/${i.id}`, type: "Opportunity" }));
      (engagementsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.status || "Engagement", href: `/engagements/${i.id}`, type: "Engagement" }));
      (partnersRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.name, subtitle: i.partner_type || "Partner", href: `/partners/${i.id}`, type: "Partner" }));
      (contractorsRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.full_name, subtitle: i.title_role || "Contractor", href: `/contractors/${i.id}`, type: "Contractor" }));
      (invoicesRes.data || []).forEach((i: any) => next.push({ id: i.id, title: i.invoice_number, subtitle: i.status || "Invoice", href: `/finance/invoices/${i.id}`, type: "Invoice" }));
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setSearchResults(next.slice(0, 14));
      setSearchOpen(true);
      setSearchLoading(false);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, user?.id]);


  const searchBox = (className: string) => (
    <div ref={searchContainerRef} className={cn("items-center relative", className)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        aria-label="Search the portal"
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (searchResults.length > 0 || searchQuery.trim().length >= 2) setSearchOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && searchResults.length > 0) {
            router.push(searchResults[0].href);
            setSearchOpen(false);
            setMobileSearchOpen(false);
          }
          if (e.key === "Escape") setSearchOpen(false);
        }}
        className="pl-9 pr-4 py-1.5 bg-muted/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full"
      />
      {searchOpen && (
        <div className="absolute top-11 left-0 w-full min-w-[18rem] rounded-xl border border-border bg-white shadow-lg z-50 overflow-hidden">
          {searchLoading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">Searching...</div>
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
                    setMobileSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.type} • {result.subtitle}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">No results found.</div>
          )}
        </div>
      )}
    </div>
  );

  const previewTargets = users.filter((u) => u.id !== realUser?.id && u.status === "active");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-border shadow-sm print:hidden">
      <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* Left: Logo & Desktop Nav */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href={showDashboard ? "/" : sections[0]?.items[0]?.path || "/"} className="flex items-center gap-2.5 shrink-0" aria-label="DataIsData home">
            <BrandMark size={34} />
            <span className="text-xl font-bold text-foreground tracking-tight hidden sm:block font-mono">DataIsData</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {showDashboard && <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} />}
            {sections.map((section) => {
              const active = section.prefixes.some((p) => pathname === p || pathname?.startsWith(p + "/"));
              return (
                <DropdownMenu key={section.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 h-9 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>{section.label}</span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {section.items.map((item) => (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link href={item.path} className={cn("flex items-center gap-2 w-full", isActivePath(pathname, item.path) && "text-primary font-semibold")}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions & Mobile Menu */}
        <div className="flex items-center gap-2">
          {canSearch && searchBox("hidden md:flex w-40 lg:w-64")}

          {canSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground md:hidden"
              aria-label="Search"
              onClick={() => setMobileSearchOpen((v) => !v)}
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </Button>
          )}

          <NotificationsMenu />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-muted" aria-label="Account menu">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-foreground leading-none">{realUser?.full_name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {realUser ? ROLE_LABELS[realUser.seat_role] : ""}
                    {isPreviewing && user ? ` · viewing as ${user.full_name.split(" ")[0]}` : ""}
                  </span>
                </div>
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                  <AvatarFallback className={cn("text-white text-xs", isPreviewing ? "bg-amber-500" : "bg-primary")}>
                    {initials(realUser?.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="space-y-1">
                <span className="block text-sm font-semibold">{realUser?.full_name}</span>
                <span className="block text-xs font-normal text-muted-foreground truncate">{realUser?.email || "No email on file"}</span>
                {realUser && <RoleBadge role={realUser.seat_role} />}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" /> Profile & My View
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Users & Permissions
                  </Link>
                </DropdownMenuItem>
              )}
              {isRealAdmin && previewTargets.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Eye className="w-4 h-4 mr-2" /> Preview as…
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56">
                    {previewTargets.map((u) => (
                      <DropdownMenuItem key={u.id} onClick={() => startPreview(u.id)}>
                        <span className="truncate">{u.full_name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{ROLE_LABELS[u.seat_role]}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {isPreviewing && (
                <DropdownMenuItem onClick={stopPreview}>
                  <Eye className="w-4 h-4 mr-2" /> Exit preview
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {authMode === "demo" && (
                <DropdownMenuItem onClick={() => signOut()}>
                  <Repeat className="w-4 h-4 mr-2" /> Switch demo user
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" aria-label="Open menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-6 border-b text-left">
                <SheetTitle className="flex items-center gap-2.5">
                  <BrandMark size={32} />
                  <span className="font-mono">DataIsData</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col py-4 overflow-y-auto h-[calc(100vh-5rem)]">
                {showDashboard && (
                  <div className="px-4 py-2">
                    <NavLink href="/" label="Dashboard" icon={LayoutDashboard} active={pathname === "/"} onClick={() => setIsMobileMenuOpen(false)} />
                  </div>
                )}
                <div className="px-4 py-4 space-y-4">
                  {sections.map((section) => (
                    <div key={section.label}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">{section.label}</p>
                      {section.items.map((item) => (
                        <NavLink
                          key={item.path}
                          href={item.path}
                          label={item.label}
                          icon={item.icon}
                          active={isActivePath(pathname, item.path)}
                          onClick={() => setIsMobileMenuOpen(false)}
                        />
                      ))}
                    </div>
                  ))}
                  {isAdmin && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-3">Admin</p>
                      <NavLink href="/admin/users" label="Users & Permissions" icon={ShieldCheck} active={pathname?.startsWith("/admin")} onClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {mobileSearchOpen && canSearch && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-border p-3 shadow-sm">
          {searchBox("flex w-full")}
        </div>
      )}
    </header>
  );
}
